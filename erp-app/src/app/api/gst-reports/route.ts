import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const monthStr = searchParams.get('month'); // YYYY-MM
    
    if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return NextResponse.json({ error: 'Valid month parameter required in YYYY-MM format' }, { status: 400 });
    }

    const [year, month] = monthStr.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    // Fetch Outward Supplies (GSTR-1)
    const salesInvoices = await prisma.invoice.findMany({
      where: {
        status: 'posted',
        date: { gte: startDate, lt: endDate },
      },
      include: {
        client: { select: { gstin: true, type: true } }
      }
    });

    // Fetch Inward Supplies / Expenses for ITC (GSTR-3B)
    const vendorBills = await prisma.vendorBill.findMany({
      where: {
        status: 'posted',
        date: { gte: startDate, lt: endDate },
      }
    });

    // Aggregators for GSTR-1
    const gstr1 = {
      b2b: { count: 0, taxableValue: 0, igst: 0, cgst: 0, sgst: 0 }, // Registered
      b2c: { count: 0, taxableValue: 0, igst: 0, cgst: 0, sgst: 0 }, // Unregistered
    };

    let totalOutwardTaxable = 0;
    let totalOutwardIgst = 0;
    let totalOutwardCgst = 0;
    let totalOutwardSgst = 0;

    for (const inv of salesInvoices) {
      // Net Taxable = Total - Tax
      const cgst = Number(inv.cgst) || 0;
      const sgst = Number(inv.sgst) || 0;
      const igst = Number(inv.igst) || 0;
      const totalTax = cgst + sgst + igst;
      const taxableValue = Number(inv.totalAmount) - totalTax;

      totalOutwardTaxable += taxableValue;
      totalOutwardIgst += igst;
      totalOutwardCgst += cgst;
      totalOutwardSgst += sgst;

      const isB2b = !!(inv.client && inv.client.gstin && inv.client.gstin.length > 0);
      const bucket = isB2b ? gstr1.b2b : gstr1.b2c;

      bucket.count += 1;
      bucket.taxableValue += taxableValue;
      bucket.igst += igst;
      bucket.cgst += cgst;
      bucket.sgst += sgst;
    }

    // Aggregators for ITC (Vendor Bills)
    let totalItcIgst = 0;
    let totalItcCgst = 0;
    let totalItcSgst = 0;

    for (const bill of vendorBills) {
      totalItcIgst += Number(bill.igst) || 0;
      totalItcCgst += Number(bill.cgst) || 0;
      totalItcSgst += Number(bill.sgst) || 0;
    }

    // GSTR-3B Summary
    const gstr3b = {
      outward: {
         taxableValue: totalOutwardTaxable,
         igst: totalOutwardIgst,
         cgst: totalOutwardCgst,
         sgst: totalOutwardSgst
      },
      itc: {
         igst: totalItcIgst,
         cgst: totalItcCgst,
         sgst: totalItcSgst
      },
      payable: {
         igst: Math.max(0, totalOutwardIgst - totalItcIgst),
         cgst: Math.max(0, totalOutwardCgst - totalItcCgst),
         sgst: Math.max(0, totalOutwardSgst - totalItcSgst),
      }
    };

    return NextResponse.json({
      monthStr,
      gstr1,
      gstr3b
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
