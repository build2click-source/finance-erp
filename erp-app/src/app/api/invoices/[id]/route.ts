import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';
import { voidInvoice } from '@/lib/invoicing/invoice-engine';
import { requireAuth } from '@/lib/auth';

// Schema for updating a draft invoice
const UpdateInvoiceSchema = z.object({
  date: z.string().optional(),
  type: z.enum(['TaxInvoice', 'Proforma', 'CreditNote', 'DebitNote']).optional(),
  clientId: z.string().uuid().optional(),
  consigneeId: z.string().uuid().optional().nullable(),
  buyerId: z.string().uuid().optional().nullable(),
  deliveryNote: z.string().optional().nullable(),
  deliveryNoteDate: z.string().optional().nullable(),
  paymentTerms: z.string().optional().nullable(),
  suppliersRef: z.string().optional().nullable(),
  otherRef: z.string().optional().nullable(),
  buyersOrderNo: z.string().optional().nullable(),
  buyersOrderDate: z.string().optional().nullable(),
  dispatchDocNo: z.string().optional().nullable(),
  dispatchedThrough: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  termsOfDelivery: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  lines: z.array(z.object({
    id: z.string().uuid().optional(),
    productId: z.string().uuid().optional().nullable(),
    description: z.string(),
    qty: z.number(),
    unitPrice: z.number(),
    per: z.string().optional().nullable(),
    discount: z.number().optional(),
    gstRate: z.number().optional().nullable(),
    hsnCode: z.string().optional().nullable(),
  })).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Find by ID or invoice number
    const invoice = await prisma.invoice.findFirst({
      where: {
        OR: [
          { id },
          { invoiceNumber: id }
        ]
      },
      include: {
        client: true,
        consignee: true,
        buyer: true,
        lines: {
          include: {
            product: true
          }
        }
      }
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: invoice });
  } catch (error) {
    console.error('GET /api/invoices/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch invoice' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = UpdateInvoiceSchema.parse(body);

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
    }

    if (invoice.status !== 'draft') {
      return NextResponse.json({ success: false, error: 'Only draft invoices can be edited' }, { status: 403 });
    }

    // Update the invoice main record
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: {
        date: parsed.date ? new Date(parsed.date) : undefined,
        type: parsed.type,
        clientId: parsed.clientId,
        consigneeId: parsed.consigneeId,
        buyerId: parsed.buyerId,
        deliveryNote: parsed.deliveryNote,
        deliveryNoteDate: parsed.deliveryNoteDate ? new Date(parsed.deliveryNoteDate) : undefined,
        paymentTerms: parsed.paymentTerms,
        suppliersRef: parsed.suppliersRef,
        otherRef: parsed.otherRef,
        buyersOrderNo: parsed.buyersOrderNo,
        buyersOrderDate: parsed.buyersOrderDate ? new Date(parsed.buyersOrderDate) : undefined,
        dispatchDocNo: parsed.dispatchDocNo,
        dispatchedThrough: parsed.dispatchedThrough,
        destination: parsed.destination,
        termsOfDelivery: parsed.termsOfDelivery,
        notes: parsed.notes,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : undefined,
      }
    });

    // If lines are provided, handle them (simplest is: delete and recreate for drafts)
    if (parsed.lines) {
      await prisma.invoiceLine.deleteMany({
        where: { invoiceId: id }
      });

      for (const line of parsed.lines) {
        const lineNet = (line.qty * line.unitPrice) - (line.discount || 0);
        // Simple CGST/SGST/IGST logic for now or we can compute detailed tax if needed
        const gstAmount = lineNet * ((line.gstRate || 0) / 100);
        
        await prisma.invoiceLine.create({
          data: {
            invoiceId: id,
            productId: line.productId,
            description: line.description,
            qty: line.qty,
            unitPrice: line.unitPrice,
            per: line.per,
            discount: line.discount || 0,
            lineNet,
            gstRate: line.gstRate,
            gstAmount,
            hsnCode: line.hsnCode,
          }
        });
      }
      
      // Update totals on main invoice
      const allLines = await prisma.invoiceLine.findMany({ where: { invoiceId: id } });
      const totalAmount = allLines.reduce((sum, l) => sum + Number(l.lineNet) + Number(l.gstAmount), 0);
      const totalTax = allLines.reduce((sum, l) => sum + Number(l.gstAmount), 0);
      
      // Determine interstate for tax splitting
      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      const clientId = parsed.clientId || updatedInvoice.clientId;
      const client = clientId ? await prisma.client.findUnique({ where: { id: clientId } }) : null;
      const company = await prisma.companyProfile.findFirst();
      
      const companyState = company?.state || 'West Bengal';
      const clientState = client?.state || companyState;
      const isInterState = companyState.toLowerCase() !== clientState.toLowerCase();

      if (isInterState) {
        igst = totalTax;
      } else {
        cgst = totalTax / 2;
        sgst = totalTax / 2;
      }
      
      await prisma.invoice.update({
        where: { id },
        data: {
          totalAmount,
          totalTax,
          cgst,
          sgst,
          igst
        }
      });
    }

    return NextResponse.json({ success: true, data: updatedInvoice });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    console.error('PATCH /api/invoices/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    const result = await voidInvoice(id, 'Voided by user request');
    return NextResponse.json(result);
  } catch (error) {
    console.error('DELETE /api/invoices/[id] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to void invoice' }, { status: 500 });
  }
}
