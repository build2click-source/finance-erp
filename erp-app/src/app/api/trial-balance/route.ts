/**
 * GET /api/trial-balance — Get the trial balance for all accounts
 * 
 * Returns debit and credit totals which must be equal
 * (A = L + E verification).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getTrialBalance } from '@/lib/ledger';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const asOfParam = searchParams.get('asOf');
    const asOf = asOfParam ? new Date(asOfParam) : undefined;

    const trialBalance = await getTrialBalance(asOf);

    return NextResponse.json({
      success: true,
      data: trialBalance,
    });
  } catch (error) {
    console.error('GET /api/trial-balance error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute trial balance' },
      { status: 500 }
    );
  }
}
