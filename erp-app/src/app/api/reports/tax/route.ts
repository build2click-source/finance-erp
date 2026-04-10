/**
 * GET /api/reports/tax — Tax & Compliance Reports
 *
 * Returns:
 *  - GSTR-1 Worksheet: B2B sales breakdown (client GSTIN vs no-GSTIN)
 *  - ITC Tracker: Input Tax Credit from vendor bills
 *  - TDS Ledger: TDS deducted on receipts
 *
 * Query: ?from=YYYY-MM-DD&to=YYYY-MM-DD
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();
    const fromDate = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1);
    const toDate = toParam ? new Date(toParam) : now;
    toDate.setHours(23, 59, 59, 999);

    // ── GSTR-1 Worksheet ───────────────────────────────────────────────────
    const salesInvoices = await prisma.invoice.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        status: { notIn: ['draft', 'cancelled'] as any },
      },
      include: {
        client: { select: { id: true, name: true, gstin: true } },
      },
      orderBy: { date: 'asc' },
    });

    const gstr1Rows = salesInvoices.map((inv) => {
      const taxable = Number(inv.totalAmount) - Number(inv.totalTax);
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber || '',
        date: inv.date,
        clientName: inv.client?.name || '',
        clientGstin: inv.client?.gstin || null,
        isB2B: !!inv.client?.gstin,
        taxableAmount: taxable,
        cgst: Number(inv.cgst || 0),
        sgst: Number(inv.sgst || 0),
        igst: Number(inv.igst || 0),
        totalTax: Number(inv.totalTax || 0),
        totalAmount: Number(inv.totalAmount || 0),
      };
    });

    const b2bRows = gstr1Rows.filter((r) => r.isB2B);
    const b2cRows = gstr1Rows.filter((r) => !r.isB2B);

    // ── ITC Tracker ────────────────────────────────────────────────────────
    const vendorBills = await prisma.vendorBill.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        status: { not: 'cancelled' as any },
      },
      include: {
        vendor: { select: { id: true, name: true, gstin: true } },
      },
      orderBy: { date: 'asc' },
    });

    const itcRows = vendorBills.map((bill) => ({
      billId: bill.id,
      billNumber: bill.billNumber,
      date: bill.date,
      vendorName: bill.vendor?.name || '',
      vendorGstin: bill.vendor?.gstin || null,
      taxableAmount: Number(bill.totalAmount) - Number(bill.cgst) - Number(bill.sgst) - Number(bill.igst),
      cgst: Number(bill.cgst || 0),
      sgst: Number(bill.sgst || 0),
      igst: Number(bill.igst || 0),
      totalITC: Number(bill.cgst || 0) + Number(bill.sgst || 0) + Number(bill.igst || 0),
      totalAmount: Number(bill.totalAmount || 0),
    }));

    // ── TDS Ledger ─────────────────────────────────────────────────────────
    const tdsReceipts = await prisma.receipt.findMany({
      where: {
        date: { gte: fromDate, lte: toDate },
        tdsAmount: { gt: 0 },
      },
      include: {
        client: { select: { id: true, name: true } },
      },
      orderBy: { date: 'asc' },
    });

    const tdsRows = tdsReceipts.map((r) => ({
      receiptId: r.id,
      receiptNumber: r.receiptNumber,
      date: r.date,
      partyName: r.client?.name || '',
      tdsAmount: Number(r.tdsAmount || 0),
      netAmount: Number(r.amount || 0),
      grossAmount: Number(r.amount || 0) + Number(r.tdsAmount || 0),
    }));

    return NextResponse.json({
      success: true,
      data: {
        period: { from: fromDate.toISOString(), to: toDate.toISOString() },
        gstr1: {
          b2b: b2bRows,
          b2c: b2cRows,
          totals: {
            taxableAmount: gstr1Rows.reduce((s, r) => s + r.taxableAmount, 0),
            cgst: gstr1Rows.reduce((s, r) => s + r.cgst, 0),
            sgst: gstr1Rows.reduce((s, r) => s + r.sgst, 0),
            igst: gstr1Rows.reduce((s, r) => s + r.igst, 0),
            totalTax: gstr1Rows.reduce((s, r) => s + r.totalTax, 0),
            totalAmount: gstr1Rows.reduce((s, r) => s + r.totalAmount, 0),
          },
        },
        itc: {
          rows: itcRows,
          totals: {
            taxableAmount: itcRows.reduce((s, r) => s + r.taxableAmount, 0),
            cgst: itcRows.reduce((s, r) => s + r.cgst, 0),
            sgst: itcRows.reduce((s, r) => s + r.sgst, 0),
            igst: itcRows.reduce((s, r) => s + r.igst, 0),
            totalITC: itcRows.reduce((s, r) => s + r.totalITC, 0),
          },
        },
        tds: {
          rows: tdsRows,
          totals: {
            grossAmount: tdsRows.reduce((s, r) => s + r.grossAmount, 0),
            tdsAmount: tdsRows.reduce((s, r) => s + r.tdsAmount, 0),
            netAmount: tdsRows.reduce((s, r) => s + r.netAmount, 0),
          },
        },
      },
    });
  } catch (error) {
    console.error('GET /api/reports/tax error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to compute tax report' },
      { status: 500 }
    );
  }
}
