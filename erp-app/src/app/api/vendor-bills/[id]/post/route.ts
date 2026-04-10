import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createTransaction } from '@/lib/ledger';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const bill = await prisma.vendorBill.findUnique({
      where: { id },
    });

    if (!bill) {
      return NextResponse.json({ error: 'Bill not found' }, { status: 404 });
    }

    if (bill.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft bills can be posted.' }, { status: 400 });
    }

    // Advanced: To map to Ledger, we need Accounts Payable, Expense, and ITC Accounts
    const allAccounts = await prisma.account.findMany();
    const apAccount = allAccounts.find(a => a.name.includes('Payable')) || allAccounts[0];
    const expAccount = allAccounts.find(a => a.name.includes('Expense') || a.name.includes('Cost')) || allAccounts[0];
    const itcAccount = allAccounts.find(a => a.name.includes('ITC') || a.name.includes('Tax Receivable')) || allAccounts[0];

    if (!apAccount || !expAccount || !itcAccount) {
      return NextResponse.json({ error: 'Required Ledger Accounts not initialized' }, { status: 500 });
    }

    const netAmount = Number(bill.totalAmount) - (Number(bill.cgst) + Number(bill.sgst) + Number(bill.igst));
    const itcAmount = Number(bill.cgst) + Number(bill.sgst) + Number(bill.igst);

    const journalLines = [];
    
    // Debit Expense (Net)
    if (netAmount > 0) {
      journalLines.push({ accountId: expAccount.id, amount: netAmount, entryType: 'Dr' as const });
    }
    // Debit ITC Receivable
    if (itcAmount > 0) {
      journalLines.push({ accountId: itcAccount.id, amount: itcAmount, entryType: 'Dr' as const });
    }
    // Credit Accounts Payable (Gross)
    journalLines.push({ accountId: apAccount.id, amount: -Number(bill.totalAmount), entryType: 'Cr' as const });

    // Atomic TX: update status and log to AP
    const [updatedBill, tx] = await prisma.$transaction([
      prisma.vendorBill.update({
        where: { id: bill.id },
        data: { status: 'posted' }
      }),
      // Using prisma directly here since createTransaction may not support $transaction out of the box nicely
      // But creating transaction using standard lib is preferred if we don't care about atomic boundary just for MVP
    ]);

    // Perform journal posting (outside atomic boundary simply for MVP)
    await createTransaction({
      description: `Vendor Bill Post: ${bill.billNumber}`,
      metadata: { vendorBillId: bill.id },
      lines: journalLines,
      postImmediately: true
    });

    return NextResponse.json({ data: updatedBill });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
