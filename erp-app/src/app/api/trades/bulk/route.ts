import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

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

const BulkTradeSchema = z.array(TradeSchema);

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parsed = BulkTradeSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.companyProfile.findFirst();
      const companyState = company?.state?.trim().toLowerCase() || 'west bengal';
      const createdTrades = [];

      for (const tradeData of parsed) {
        const buyer: any = await tx.client.findUnique({ where: { id: tradeData.buyerId } });
        const clientState = (buyer?.placeOfSupply || buyer?.state || '').trim().toLowerCase();
        const isInterState = clientState !== companyState;

        const trade = await tx.trade.create({
          data: {
            date: new Date(tradeData.date),
            sellerId: tradeData.sellerId,
            buyerId: tradeData.buyerId,
            productId: tradeData.productId,
            quantity: tradeData.quantity,
            price: tradeData.price,
            tradeType: tradeData.tradeType,
            remarks: tradeData.remarks,
            commissionRate: tradeData.commissionRate,
            commissionAmt: tradeData.commissionAmt,
          }
        });

        // Draft invoice generation (same logic as single trade)
        const baseAmount = tradeData.commissionAmt;
        let cgst = 0, sgst = 0, igst = 0;

        if (isInterState) {
          igst = baseAmount * 0.18;
        } else {
          cgst = baseAmount * 0.09;
          sgst = baseAmount * 0.09;
        }

        await tx.invoice.create({
          data: {
            type: 'TaxInvoice',
            date: new Date(tradeData.date),
            clientId: tradeData.buyerId,
            totalAmount: baseAmount + cgst + sgst + igst,
            totalTax: cgst + sgst + igst,
            status: 'draft',
            tradeId: trade.id,
            cgst,
            sgst,
            igst
          }
        });

        createdTrades.push(trade);
      }

      return createdTrades;
    });

    return NextResponse.json({ success: true, count: result.length }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/trades/bulk error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Bulk trade upload failed' }, { status: 500 });
  }
}
