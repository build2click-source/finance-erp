import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { postReceipt, postPayment, CreateReceiptInput, CreatePaymentInput } from '@/lib/banking';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const SettlementSchema = z.object({
  type: z.enum(['receipt', 'payment']),
  clientId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  date: z.string(),
  amount: z.number().positive(),
  paymentMode: z.enum(['UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Cash']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  transactionDate: z.string().optional(),
  clearingDate: z.string().optional(),
  roundOff: z.number().optional(),
  tdsAmount: z.number().optional(),
  invoiceId: z.string().uuid().optional().or(z.literal('')), // Optional or empty string
  status: z.enum(['draft', 'posted']).optional(),
  // For simplicity from UI, we no longer require Ledger accounts passed from UI
});

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const clientId = searchParams.get('clientId') || '';
    const bankId = searchParams.get('bankId') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    let receipts: any[] = [];
    let total = 0;

    if (!type || type === 'receipt') {
      const andClauses: any[] = [];
      if (clientId) andClauses.push({ clientId });
      if (bankId) andClauses.push({ bankAccountId: bankId });
      if (from || to) {
        const dateCond: any = {};
        if (from) dateCond.gte = new Date(from);
        if (to) dateCond.lte = new Date(to);
        andClauses.push({ date: dateCond });
      }
      if (search) {
        andClauses.push({
          OR: [
            { receiptNumber: { contains: search, mode: 'insensitive' } },
            { client: { name: { contains: search, mode: 'insensitive' } } },
            { referenceNumber: { contains: search, mode: 'insensitive' } },
          ],
        });
      }
      const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

      const [rows, count, sum] = await Promise.all([
        prisma.receipt.findMany({
          where,
          include: {
            client: { select: { id: true, name: true } },
            bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
            invoice: { select: { id: true, invoiceNumber: true } },
          },
          orderBy: { date: 'desc' },
          take: limit,
          skip,
        }),
        prisma.receipt.count({ where }),
        prisma.receipt.aggregate({ _sum: { amount: true } }),
      ]);
      total = count;
      receipts = rows.map(r => ({
        ...r,
        transactionDate: r.date, // alias for view compatibility
        amount: Number(r.amount),
        tdsAmount: r.tdsAmount ? Number(r.tdsAmount) : null,
        documentType: 'Receipt',
      }));

      return NextResponse.json({
        success: true,
        data: receipts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        summary: {
          totalAmount: Number(sum._sum.amount || 0)
        }
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const json = await req.json();
    const result = SettlementSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', issues: result.error.issues }, { status: 400 });
    }

    const data = result.data;
    let postedResult;

    // Look up AR and AP ledger accounts
    const allAccounts = await prisma.account.findMany();
    const arAccount = allAccounts.find(a => a.name.includes('Receivable')) || allAccounts[0];
    const apAccount = allAccounts.find(a => a.name.includes('Payable')) || allAccounts[0];

    if (!arAccount || !apAccount) {
      return NextResponse.json({ error: 'Ledger accounts not initialized' }, { status: 500 });
    }

    if (data.type === 'receipt') {
      const input: CreateReceiptInput = {
        clientId: data.clientId,
        bankAccountId: data.bankAccountId,
        date: data.date,
        amount: data.amount,
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        tdsAmount: data.tdsAmount,
        invoiceId: data.invoiceId || undefined,
        arAccountId: arAccount.id,
        createdBy: undefined, // Add auth later
        status: data.status,
      };
      postedResult = await postReceipt(input);
    } else {
      const input: CreatePaymentInput = {
        clientId: data.clientId,
        bankAccountId: data.bankAccountId,
        date: data.date,
        amount: data.amount,
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber,
        notes: data.notes,
        apAccountId: apAccount.id,
        createdBy: undefined,
      };
      postedResult = await postPayment(input);
    }

    return NextResponse.json(postedResult, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
