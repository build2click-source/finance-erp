/**
 * GET /api/accounts — List all accounts
 * POST /api/accounts — Create a new account
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

// GET — List accounts with optional type filter
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const accounts = await prisma.account.findMany({
      where: type ? { type: type as any } : undefined,
      orderBy: { code: 'asc' },
      include: {
        parent: { select: { code: true, name: true } },
        _count: { select: { journalEntries: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: accounts,
      count: accounts.length,
    });
  } catch (error) {
    console.error('GET /api/accounts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

// POST — Create a new account
const CreateAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  isPandL: z.boolean().default(false),
  parentId: z.string().uuid().optional(),
  currency: z.string().length(3).default('INR'),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parsed = CreateAccountSchema.parse(body);

    const account = await prisma.account.create({
      data: {
        id: uuidv4(),
        code: parsed.code,
        name: parsed.name,
        type: parsed.type,
        isPandL: parsed.isPandL,
        parentId: parsed.parentId,
        currency: parsed.currency,
      },
    });

    return NextResponse.json({ success: true, data: account }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('POST /api/accounts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
