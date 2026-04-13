import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const UpdateClientSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['Customer', 'Vendor', 'Both']).optional(),
  defaultPaymentTerms: z.string().optional(),
  gstin: z.string().length(15).optional().or(z.literal('')),
  placeOfSupply: z.string().optional(),
  email: z.string().email('Valid email is required').optional().or(z.literal('')),
  contact: z.string().regex(/^\+?[0-9]{10,14}$/, 'Valid phone number is required').optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  status: z.enum(['prospect', 'active', 'onboarded', 'inactive']).optional(),
  changedBy: z.string().uuid().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateClientSchema.parse(body);

    const client = await prisma.$transaction(async (tx) => {
      // Fetch existing
      const existing = await tx.client.findUnique({ where: { id } });
      if (!existing) {
        throw new Error('Not Found');
      }

      // Prepare updates
      const updateData: any = {};
      
      if (parsed.name !== undefined) updateData.name = parsed.name;
      if (parsed.type !== undefined) updateData.type = parsed.type;
      if (parsed.defaultPaymentTerms !== undefined) updateData.defaultPaymentTerms = parsed.defaultPaymentTerms;
      if (parsed.gstin !== undefined) updateData.gstin = parsed.gstin === '' ? null : parsed.gstin;
      if (parsed.placeOfSupply !== undefined || parsed.state !== undefined) {
        updateData.placeOfSupply = parsed.placeOfSupply || parsed.state || existing.placeOfSupply;
      }
      if (parsed.email !== undefined) updateData.email = parsed.email === '' ? null : parsed.email;
      if (parsed.contact !== undefined) updateData.contact = parsed.contact === '' ? null : parsed.contact;
      if (parsed.address !== undefined) updateData.address = parsed.address;
      if (parsed.city !== undefined) updateData.city = parsed.city;
      if (parsed.state !== undefined) updateData.state = parsed.state;
      if (parsed.pincode !== undefined) updateData.pincode = parsed.pincode;
      if (parsed.status !== undefined) updateData.status = parsed.status;

      // Update client
      const updated = await tx.client.update({
        where: { id },
        data: updateData,
      });

      // Maintain History
      await tx.clientHistory.create({
        data: {
          id: uuidv4(),
          clientId: id,
          changedBy: parsed.changedBy,
          changeType: 'updated',
          payload: updateData,
        },
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: client });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    
    const msg = error instanceof Error ? error.message : '';
    if (msg === 'Not Found') {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }
    
    console.error(`PUT /api/clients/[id] error:`, error);
    return NextResponse.json({ success: false, error: 'Failed to update client' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Check if client has invoices or other linked data
    const linkedInvoices = await prisma.invoice.count({ where: { clientId: id } });
    if (linkedInvoices > 0) {
      // If linked data exists, we should probably archive/deactivate instead of hard delete
      await prisma.client.update({
        where: { id },
        data: { status: 'inactive' }
      });
      return NextResponse.json({ success: true, message: 'Client deactivated (has linked records)' });
    }

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Client deleted' });
  } catch (error) {
    console.error(`DELETE /api/clients/[id] error:`, error);
    return NextResponse.json({ success: false, error: 'Failed to delete client' }, { status: 500 });
  }
}
