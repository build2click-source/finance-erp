/**
 * GET /api/payments — List all outgoing vendor payments
 * POST /api/payments — Record a new vendor payment
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { postPayment, CreatePaymentInput } from '@/lib/banking';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const PaymentSchema = z.object({
  clientId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  date: z.string(),
  amount: z.number().positive(),
  paymentMode: z.enum(['UPI', 'NEFT', 'RTGS', 'IMPS', 'Cheque', 'Cash']),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  vendorBillId: z.string().uuid().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        include: {
          client: { select: { id: true, name: true, type: true } },
          bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      prisma.payment.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: payments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const json = await req.json();
    const result = PaymentSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Validation Error', issues: result.error.issues }, { status: 400 });
    }

    const data = result.data;

    // Find AP account
    const apAccount = await prisma.account.findFirst({
      where: { name: { contains: 'Payable' } },
    });

    if (!apAccount) {
      return NextResponse.json({ success: false, error: 'No Accounts Payable ledger account found' }, { status: 500 });
    }

    const input: CreatePaymentInput = {
      clientId: data.clientId,
      bankAccountId: data.bankAccountId,
      date: data.date,
      amount: data.amount,
      paymentMode: data.paymentMode,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      vendorBillId: data.vendorBillId,
      apAccountId: apAccount.id,
    };

    const postedResult = await postPayment(input);

    return NextResponse.json({ success: true, data: postedResult }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
