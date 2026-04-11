/**
 * GET /api/reports/pl — Profit & Loss Statement
 * 
 * Sums all Revenue and Expense accounts for a given period.
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();
    const fromDate = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = toParam ? new Date(toParam) : now;
    // Set toDate to end of day
    toDate.setHours(23, 59, 59, 999);

    // Get all Revenue and Expense accounts with their balances for the period
    const revenueAccounts = await prisma.account.findMany({
      where: { type: 'Revenue' },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, type: true },
    });

    const expenseAccounts = await prisma.account.findMany({
      where: { type: 'Expense' },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, type: true },
    });

    // Sum journal entries within period for each account
    const getAccountPeriodBalance = async (accountId: string): Promise<number> => {
      const result = await prisma.journalEntry.aggregate({
        _sum: { amount: true },
        where: {
          accountId,
          createdAt: { gte: fromDate, lte: toDate },
          transaction: { postedAt: { not: null } },
        },
      });
      return Number(result._sum.amount || 0);
    };

    const revenueRows = await Promise.all(
      revenueAccounts.map(async (acc) => ({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: await getAccountPeriodBalance(acc.id),
      }))
    );

    const expenseRows = await Promise.all(
      expenseAccounts.map(async (acc) => ({
        accountId: acc.id,
        accountCode: acc.code,
        accountName: acc.name,
        amount: await getAccountPeriodBalance(acc.id),
      }))
    );

    // Revenue is typically credit (negative in double-entry), so we negate
    const totalRevenue = revenueRows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const totalExpenses = expenseRows.reduce((sum, r) => sum + Math.abs(r.amount), 0);
    const netProfit = totalRevenue - totalExpenses;

    return NextResponse.json({
      success: true,
      data: {
        period: { from: fromDate.toISOString(), to: toDate.toISOString() },
        revenue: revenueRows.map(r => ({ ...r, amount: Math.abs(r.amount) })),
        expenses: expenseRows.map(r => ({ ...r, amount: Math.abs(r.amount) })),
        totalRevenue,
        totalExpenses,
        netProfit,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/pl error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute P&L' },
      { status: 500 }
    );
  }
}
