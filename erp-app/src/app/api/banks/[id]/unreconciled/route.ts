import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [receipts, payments] = await Promise.all([
      prisma.receipt.findMany({
        where: {
          bankAccountId: id,
          status: 'posted',
        },
        include: {
          client: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.payment.findMany({
        where: {
          bankAccountId: id,
          status: 'posted',
        },
        include: {
          client: { select: { name: true } },
        },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Map to a unified format for the UI
    const transactions = [
      ...receipts.map((r) => ({
        id: r.id,
        type: 'receipt',
        date: r.date,
        amount: Number(r.amount),
        reference: r.referenceNumber || r.receiptNumber,
        party: r.client?.name || 'Unknown Client',
        transactionType: 'Deposit',
      })),
      ...payments.map((p) => ({
        id: p.id,
        type: 'payment',
        date: p.date,
        amount: Number(p.amount),
        reference: p.referenceNumber || p.paymentNumber,
        party: p.client?.name || 'Unknown Vendor',
        transactionType: 'Withdrawal',
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('GET /api/banks/[id]/unreconciled error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
