import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { postReceipt } from '@/lib/banking/receipt-engine';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid items format' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Fetch common data for performance
    const clients = await prisma.client.findMany({ select: { id: true, name: true, code: true } });
    const banks = await prisma.bankAccount.findMany({ select: { id: true, bankName: true } });
    const allAccounts = await prisma.account.findMany();
    const arAccount = allAccounts.find(a => a.name.includes('Receivable')) || allAccounts[0];

    for (const item of items) {
      try {
        const client = clients.find(c => c.name.toLowerCase() === item.client.toLowerCase() || c.code.toLowerCase() === item.client.toLowerCase());
        const bank = banks.find(b => b.bankName.toLowerCase().includes(item.bank.toLowerCase()));

        if (!client) throw new Error(`Client "${item.client}" not found`);
        if (!bank) throw new Error(`Bank "${item.bank}" not found`);

        const input = {
          clientId: client.id,
          bankAccountId: bank.id,
          date: item.date,
          amount: parseFloat(item.amount),
          paymentMode: (item.mode || 'NEFT') as any,
          referenceNumber: item.reference,
          notes: item.notes || 'Bulk Import',
          arAccountId: arAccount.id,
          status: 'posted' as const,
        };

        await postReceipt(input);
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${item.reference || 'Row'}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('POST /api/receipts/bulk error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process bulk upload' }, { status: 500 });
  }
}
