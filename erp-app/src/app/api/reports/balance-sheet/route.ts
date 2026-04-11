/**
 * GET /api/reports/balance-sheet — Balance Sheet
 * 
 * Point-in-time snapshot of Assets, Liabilities, and Equity.
 * Query: ?asOf=YYYY-MM-DD
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBalancesByType } from '@/lib/ledger/balance';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const asOfParam = searchParams.get('asOf');
    const asOf = asOfParam ? new Date(asOfParam) : new Date();
    asOf.setHours(23, 59, 59, 999);

    const [assets, liabilities, equity] = await Promise.all([
      getBalancesByType('Asset', asOf),
      getBalancesByType('Liability', asOf),
      getBalancesByType('Equity', asOf),
    ]);

    const totalAssets = assets.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalEquity = equity.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    return NextResponse.json({
      success: true,
      data: {
        asOf: asOf.toISOString(),
        assets: assets.map(a => ({ ...a, balance: Math.abs(a.balance) })),
        liabilities: liabilities.map(a => ({ ...a, balance: Math.abs(a.balance) })),
        equity: equity.map(a => ({ ...a, balance: Math.abs(a.balance) })),
        totalAssets,
        totalLiabilities,
        totalEquity,
        isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
      },
    });
  } catch (error) {
    console.error('GET /api/reports/balance-sheet error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute Balance Sheet' },
      { status: 500 }
    );
  }
}
