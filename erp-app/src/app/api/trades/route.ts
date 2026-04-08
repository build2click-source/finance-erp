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

    const trades = await prisma.trade.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        seller: { select: { id: true, name: true, code: true } },
        buyer: { select: { id: true, name: true, code: true } },
        product: { select: { id: true, name: true, sku: true } },
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

    const trade = await prisma.trade.create({
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

    return NextResponse.json({ success: true, data: trade }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('POST /api/trades error:', error);
    return NextResponse.json({ success: false, error: 'Failed to record trade' }, { status: 500 });
  }
}
