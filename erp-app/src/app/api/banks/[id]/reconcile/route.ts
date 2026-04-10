import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { receiptIds, paymentIds } = await request.json();

    if (!Array.isArray(receiptIds) || !Array.isArray(paymentIds)) {
      return NextResponse.json({ success: false, error: 'Ids must be arrays' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.receipt.updateMany({
        where: {
          id: { in: receiptIds },
          bankAccountId: id,
        },
        data: { status: 'reconciled' },
      }),
      prisma.payment.updateMany({
        where: {
          id: { in: paymentIds },
          bankAccountId: id,
        },
        data: { status: 'reconciled' },
      }),
    ]);

    return NextResponse.json({ success: true, message: 'Transactions reconciled successfully' });
  } catch (error: any) {
    console.error('POST /api/banks/[id]/reconcile error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
