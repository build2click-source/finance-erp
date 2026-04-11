import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;
    const { id } = await params;

    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.findUnique({ where: { id } });
      if (!inv) throw new Error('Invoice not found');
      if (inv.status === 'posted') throw new Error('Invoice already finalized');

      // 1. Mark as posted
      const updated = await tx.invoice.update({
        where: { id },
        data: { status: 'posted' }
      });

      // 2. Ledger generation (future implementation / placeholder)
      // We would debit Accounts Receivable for `totalAmount`
      // We would credit Commission Income for `totalAmount - totalTax`
      // We would credit CGST/SGST/IGST Payable for `totalTax`

      return updated;
    });

    return NextResponse.json({ success: true, data: invoice });
  } catch (error: any) {
    console.error('Finalize Invoice Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
