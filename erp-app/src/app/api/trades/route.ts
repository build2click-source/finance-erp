import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const TradeSchema = z.object({
  date: z.string(),
  sellerId: z.string().uuid(),
  buyerId: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().positive(),
  price: z.number().positive(),
  tradeType: z.string(),
  remarks: z.string().optional(),
  commissionRate: z.number().nonnegative(),
  commissionAmt: z.number().nonnegative(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const clientId = searchParams.get('clientId');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    const where: any = {};
    if (clientId) {
      where.OR = [
        { sellerId: clientId },
        { buyerId: clientId }
      ];
    }
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }

    const trades = await prisma.trade.findMany({
      where,
      orderBy: { date: 'desc' },
      take: limit,
      include: {
        seller: { select: { id: true, name: true, code: true } },
        buyer: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, sku: true } },
        invoices: { select: { id: true, invoiceNumber: true, status: true, totalAmount: true } },
      },
    });

    return NextResponse.json({ success: true, data: trades });
  } catch (error) {
    console.error('GET /api/trades error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = TradeSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Company & Client to determine GST (Intra vs Inter-state)
      const company = await tx.companyProfile.findFirst();
      const companyState = company?.state?.trim().toLowerCase() || 'west bengal';
      
      const buyer: any = await tx.client.findUnique({ where: { id: parsed.buyerId } });
      const clientState = (buyer?.placeOfSupply || buyer?.state || '').trim().toLowerCase();
      
      const isInterState = clientState !== companyState;

      // 2. Create the Trade
      const trade = await tx.trade.create({
        data: {
          date: new Date(parsed.date),
          sellerId: parsed.sellerId,
          buyerId: parsed.buyerId,
          productId: parsed.productId,
          quantity: parsed.quantity,
          price: parsed.price,
          tradeType: parsed.tradeType,
          remarks: parsed.remarks,
          commissionRate: parsed.commissionRate,
          commissionAmt: parsed.commissionAmt,
        },
        include: {
          seller: { select: { id: true, name: true } },
          buyer: { select: { id: true, name: true } },
          product: { select: { id: true, name: true } },
        }
      });

      // 3. Tax Calculation
      // Assume basic 18% total tax for Brokerage (SAC 997152) if not specified differently
      const baseAmount = parsed.commissionAmt;
      let cgst = 0;
      let sgst = 0;
      let igst = 0;
      let totalTax = 0;

      if (isInterState) {
        igst = baseAmount * 0.18;
        totalTax = igst;
      } else {
        cgst = baseAmount * 0.09;
        sgst = baseAmount * 0.09;
        totalTax = cgst + sgst;
      }

      // 4. Generate Draft Invoice
      await tx.invoice.create({
        data: {
          type: 'TaxInvoice',
          date: new Date(parsed.date),
          clientId: parsed.buyerId, // The buyer usually gets the commission invoice, or seller depending on logic. Assuming buyer for now based on standard flow.
          totalAmount: baseAmount + totalTax,
          totalTax: totalTax,
          status: 'draft',
          tradeId: trade.id,
          cgst,
          sgst,
          igst
        }
      });

      return trade;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/trades error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record trade' }, { status: 500 });
  }
}
