/**
 * POST /api/invoices/post — Post an invoice (atomic operation)
 * GET  /api/invoices      — List invoices with filters
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { postInvoice, InvoicingError } from '@/lib/invoicing';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

const InvoiceLineSchema = z.object({
  productId: z.string().uuid().optional(),
  description: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().min(0),
  discount: z.number().min(0).default(0),
  gstRate: z.number().min(0).max(100).optional(),
  hsnCode: z.string().optional(),
  warehouseId: z.string().uuid().optional(),
});

const PostInvoiceSchema = z.object({
  clientId: z.string().uuid(),
  type: z.enum(['TaxInvoice', 'Proforma', 'CreditNote', 'DebitNote']),
  date: z.string(),
  lines: z.array(InvoiceLineSchema).min(1),
  arAccountId: z.string().uuid(),
  revenueAccountId: z.string().uuid(),
  cgstOutputAccountId: z.string().uuid().optional(),
  sgstOutputAccountId: z.string().uuid().optional(),
  igstOutputAccountId: z.string().uuid().optional(),
  cogsAccountId: z.string().uuid().optional(),
  inventoryAccountId: z.string().uuid().optional(),
  costingMethod: z.enum(['FIFO', 'LIFO']).default('FIFO'),
  notes: z.string().optional(),
  createdBy: z.string().uuid().optional(),
  roundOff: z.number().optional(),
});

// POST — Post an invoice atomically
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parsed = PostInvoiceSchema.parse(body);

    const result = await postInvoice(parsed);

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    if (error instanceof InvoicingError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 422 }
      );
    }
    console.error('POST /api/invoices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to post invoice' },
      { status: 500 }
    );
  }
}

// GET — List invoices
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const clientId = searchParams.get('clientId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const andClauses: any[] = [];
    if (status) andClauses.push({ status });
    if (clientId) andClauses.push({ clientId });
    if (from || to) {
      const dateCond: any = {};
      if (from) dateCond.gte = new Date(from);
      if (to) dateCond.lte = new Date(to);
      andClauses.push({ date: dateCond });
    }
    if (search) {
      andClauses.push({
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
        ],
      });
    }
    const where: any = andClauses.length > 0 ? { AND: andClauses } : {};

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: where as any,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          client: { select: { code: true, name: true, gstin: true } },
          lines: {
            include: {
              product: { select: { sku: true, name: true } },
            },
          },
          receipts: { where: { status: { in: ['posted', 'reconciled'] } } },
          _count: { select: { transactions: true } },
        },
      }),
      prisma.invoice.count({ where: where as any }),
    ]);

    return NextResponse.json({
      success: true,
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('GET /api/invoices error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    );
  }
}
