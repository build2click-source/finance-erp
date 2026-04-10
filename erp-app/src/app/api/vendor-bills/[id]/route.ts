/**
 * GET  /api/vendor-bills/[id]  — Get single vendor bill
 * PUT  /api/vendor-bills/[id]  — Update a draft vendor bill
 * DELETE /api/vendor-bills/[id] — Cancel/delete a draft vendor bill
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

const UpdateBillSchema = z.object({
  vendorId: z.string().uuid().optional(),
  billNumber: z.string().min(1).optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  totalAmount: z.number().optional(),
  cgst: z.number().optional(),
  sgst: z.number().optional(),
  igst: z.number().optional(),
  hsnSac: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bill = await prisma.vendorBill.findUnique({
      where: { id },
      include: { vendor: { select: { id: true, name: true, gstin: true } } },
    });
    if (!bill) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: bill });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Only allow editing draft bills
    const existing = await prisma.vendorBill.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
    if (existing.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: `Cannot edit a ${existing.status} bill. Only draft bills can be edited.` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = UpdateBillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Validation error', issues: parsed.error.issues }, { status: 400 });
    }

    const data = parsed.data;
    const updated = await prisma.vendorBill.update({
      where: { id },
      data: {
        ...(data.vendorId && { vendorId: data.vendorId }),
        ...(data.billNumber && { billNumber: data.billNumber }),
        ...(data.date && { date: new Date(data.date) }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.totalAmount !== undefined && { totalAmount: data.totalAmount }),
        ...(data.cgst !== undefined && { cgst: data.cgst }),
        ...(data.sgst !== undefined && { sgst: data.sgst }),
        ...(data.igst !== undefined && { igst: data.igst }),
        ...(data.hsnSac !== undefined && { hsnSac: data.hsnSac }),
      },
      include: { vendor: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('PUT /api/vendor-bills/[id] error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
