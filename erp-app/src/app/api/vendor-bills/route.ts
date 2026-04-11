import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const VendorBillSchema = z.object({
  vendorId: z.string().uuid(),
  billNumber: z.string().min(1),
  date: z.string(),
  description: z.string().optional(),
  totalAmount: z.number().positive(),
  cgst: z.number().min(0).default(0),
  sgst: z.number().min(0).default(0),
  igst: z.number().min(0).default(0),
  hsnSac: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const bills = await prisma.vendorBill.findMany({
      include: {
        vendor: {
          select: { name: true, gstin: true }
        }
      },
      orderBy: { date: 'desc' }
    });
    
    return NextResponse.json({ data: bills });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;
    const json = await req.json();
    const result = VendorBillSchema.safeParse(json);
    
    if (!result.success) {
      return NextResponse.json({ error: 'Validation Error', issues: result.error.issues }, { status: 400 });
    }
    
    const data = result.data;
    
    // Check if unique constraint would be violated
    const existing = await prisma.vendorBill.findFirst({
      where: {
        vendorId: data.vendorId,
        billNumber: data.billNumber
      }
    });
    
    if (existing) {
      return NextResponse.json({ error: 'A bill with this number already exists for this vendor.' }, { status: 409 });
    }
    
    const bill = await prisma.vendorBill.create({
      data: {
        vendorId: data.vendorId,
        billNumber: data.billNumber,
        date: new Date(data.date),
        description: data.description,
        totalAmount: data.totalAmount,
        cgst: data.cgst,
        sgst: data.sgst,
        igst: data.igst,
        hsnSac: data.hsnSac,
        status: 'draft',
      }
    });
    
    return NextResponse.json({ data: bill }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
