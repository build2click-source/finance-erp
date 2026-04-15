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

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const andClauses: any[] = [];
    if (search) {
      andClauses.push({
        OR: [
          { billNumber: { contains: search, mode: 'insensitive' } },
          { vendor: { name: { contains: search, mode: 'insensitive' } } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

    const [bills, total] = await Promise.all([
      prisma.vendorBill.findMany({
        where,
        include: {
          vendor: {
            select: { name: true, gstin: true }
          }
        },
        orderBy: { date: 'desc' },
        take: limit,
        skip,
      }),
      prisma.vendorBill.count({ where }),
    ]);
    
    return NextResponse.json({ 
      success: true,
      data: bills,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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
