import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const BankAccountSchema = z.object({
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  ifscCode: z.string().optional(),
  branch: z.string().optional(),
  currency: z.string().default('INR'),
  // Since banks are tied to the ledger, the client must specify the GL Account ID
  accountId: z.string().uuid('Valid Ledger Account ID required'),
});

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;
    const banks = await prisma.bankAccount.findMany({
      include: {
        account: {
          select: { name: true, code: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform to match the UI shape expected by BankView
    const formattedBanks = banks.map(b => ({
      id: b.id,
      bankName: b.bankName,
      accountNumber: b.accountNumber,
      ifsc: b.ifscCode,
      branch: b.branch,
      balance: 0, // Should be fetched from AccountSnapshot or live Balance engine
      currency: b.currency,
      status: b.isActive ? 'Active' : 'Inactive',
    }));
    return NextResponse.json({ success: true, data: formattedBanks });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const json = await req.json();
    const result = BankAccountSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', issues: result.error.issues }, { status: 400 });
    }

    const newBank = await prisma.bankAccount.create({
      data: {
        bankName: result.data.bankName,
        accountNumber: result.data.accountNumber,
        ifscCode: result.data.ifscCode,
        branch: result.data.branch,
        currency: result.data.currency,
        accountId: result.data.accountId,
      }
    });

    return NextResponse.json(newBank, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
