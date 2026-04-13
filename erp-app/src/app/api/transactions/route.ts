/**
 * POST /api/transactions — Create a balanced ledger transaction
 * GET  /api/transactions — List transactions with filters
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { createTransaction, PostingError } from '@/lib/ledger';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

// POST — Create a new ledger transaction with balanced journal entries
// ... (omitting schema for brevity, will include in TargetContent)
const JournalLineSchema = z.object({
  accountId: z.string().uuid(),
  amount: z.number().refine((n) => n !== 0, 'Amount must be non-zero'),
  entryType: z.enum(['Dr', 'Cr']),
  taxCode: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
  costLayerId: z.string().uuid().optional(),
});

const CreateTransactionSchema = z.object({
  description: z.string().optional(),
  referenceId: z.string().optional(),
  invoiceId: z.string().uuid().optional(),
  createdBy: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  lines: z.array(JournalLineSchema).min(2, 'At least 2 journal entries required'),
  postImmediately: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parsed = CreateTransactionSchema.parse(body);

    const result = await createTransaction(parsed);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof PostingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      );
    }
    console.error('POST /api/transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create transaction' },
      { status: 500 }
    );
  }
}

// GET — List transactions with optional filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const posted = searchParams.get('posted'); // 'true' | 'false'
    const clientId = searchParams.get('clientId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = {};
    if (posted === 'true') where.postedAt = { not: null };
    if (posted === 'false') where.postedAt = null;
    if (clientId) {
      where.OR = [
        { invoice: { clientId } },
        { receipt: { clientId } },
      ];
    }
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          invoice: { select: { clientId: true } },
          receipt: { select: { clientId: true } },
          journalEntries: {
            include: {
              account: { select: { code: true, name: true, type: true } },
            },
          },
        },
      }),
      prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/transactions error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transactions' },
      { status: 500 }
    );
  }
}
