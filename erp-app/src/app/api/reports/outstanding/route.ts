/**
 * GET /api/reports/outstanding — AR/AP Aging & Outstanding per client
 *
 * Returns:
 *  - Per-client invoice balances (total invoiced, paid, outstanding)
 *  - Aging buckets: 0-30, 31-60, 61-90, 90+ days overdue
 *
 * Query: ?type=Buyer|Seller|all  (default: all)
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

function agingBucket(dueDate: Date | null, today: Date): '0-30' | '31-60' | '61-90' | '90+' | 'current' {
  if (!dueDate) return 'current';
  const diffMs = today.getTime() - dueDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return 'current';
  if (diffDays <= 30) return '0-30';
  if (diffDays <= 60) return '31-60';
  if (diffDays <= 90) return '61-90';
  return '90+';
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type') || 'all';
    const today = new Date();

    // Get all unpaid/partially paid invoices (non-paid, non-cancelled)
    const whereClause: any = {
      status: { notIn: ['posted', 'cancelled'] as any },
    };

    const invoices = await prisma.invoice.findMany({
      where: { status: { notIn: ['cancelled' as any] } },
      include: {
        client: { select: { id: true, name: true, type: true } },
      },
      orderBy: { date: 'asc' },
    });

    // Get all payments (receipts) to calculate collected amounts
    const receipts = await prisma.receipt.findMany({
      where: { status: { not: 'cancelled' as any } },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Aggregate per client
    const clientMap: Record<string, {
      clientId: string;
      clientName: string;
      clientType: string;
      totalInvoiced: number;
      totalCollected: number;
      outstanding: number;
      aging: { current: number; '0-30': number; '31-60': number; '61-90': number; '90+': number };
      invoices: any[];
    }> = {};

    for (const inv of invoices) {
      if (!inv.client) continue;
      const { id: clientId, name: clientName, type: clientType } = inv.client;

      if (typeFilter !== 'all' && clientType !== typeFilter) continue;

      if (!clientMap[clientId]) {
        clientMap[clientId] = {
          clientId,
          clientName,
          clientType,
          totalInvoiced: 0,
          totalCollected: 0,
          outstanding: 0,
          aging: { current: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 },
          invoices: [],
        };
      }

      const amount = Number(inv.totalAmount || 0);
      const effectiveDueDate = inv.dueDate || inv.date;
      const bucket = agingBucket(effectiveDueDate, today);
      clientMap[clientId].totalInvoiced += amount;
      clientMap[clientId].outstanding += amount;
      clientMap[clientId].aging[bucket] += amount;
      clientMap[clientId].invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        date: inv.date,
        dueDate: inv.dueDate,
        amount,
        status: inv.status,
        agingBucket: bucket,
      });
    }

    // Layer in receipts (collected amounts)
    for (const receipt of receipts) {
      if (!receipt.client) continue;
      const { id: clientId } = receipt.client;
      if (clientMap[clientId]) {
        clientMap[clientId].totalCollected += Number(receipt.amount || 0);
      }
    }

    const summary = Object.values(clientMap).map(client => {
      // Net outstanding per client
      client.outstanding = Math.max(0, client.totalInvoiced - client.totalCollected);
      
      // Basic aging adjustment: if fully paid, zero out buckets.
      // If partially paid, we keep the buckets as is for now (representing historical invoiced aging),
      // which is a common simplification unless doing true per-invoice matching.
      if (client.outstanding < 0.01) {
        client.aging = { current: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
      }
      return client;
    });

    // Total aging across all clients
    const agingTotals = summary.reduce(
      (acc, c) => {
        acc.current += c.aging.current;
        acc['0-30'] += c.aging['0-30'];
        acc['31-60'] += c.aging['31-60'];
        acc['61-90'] += c.aging['61-90'];
        acc['90+'] += c.aging['90+'];
        return acc;
      },
      { current: 0, '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
    );

    return NextResponse.json({
      success: true,
      data: {
        clients: summary,
        agingTotals,
        totalOutstanding: summary.reduce((sum, c) => sum + c.outstanding, 0),
        asOf: today.toISOString(),
      },
    });
  } catch (error) {
    console.error('GET /api/reports/outstanding error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute outstanding report' },
      { status: 500 }
    );
  }
}
