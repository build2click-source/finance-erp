/**
 * GET  /api/products — List all products
 * POST /api/products — Create a new product
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth';

// GET — List products with optional filters
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const { searchParams } = new URL(request.url);
    const stocked = searchParams.get('stocked'); // 'true' | 'false'
    const search = searchParams.get('search');

    const where: Record<string, unknown> = {};
    if (stocked === 'true') where.isStocked = true;
    if (stocked === 'false') where.isStocked = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { hsnCode: { contains: search } },
      ];
    }

    const products = await prisma.product.findMany({
      where: where as any,
      orderBy: { name: 'asc' },
      include: {
        defaultIncomeAccount: { select: { code: true, name: true } },
        _count: { select: { costLayers: true, invoiceLines: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('GET /api/products error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST — Create a new product
const CreateProductSchema = z.object({
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  hsnCode: z.string().optional(),
  defaultUom: z.string().default('PCS'),
  isStocked: z.boolean().default(true),
  defaultIncomeAccountId: z.string().uuid().optional(),
  gstRate: z.number().min(0).max(100).optional(),
  gstType: z.enum(['CGST_SGST', 'IGST']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;
    const body = await request.json();
    const parsed = CreateProductSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        id: uuidv4(),
        sku: parsed.sku,
        name: parsed.name,
        hsnCode: parsed.hsnCode,
        defaultUom: parsed.defaultUom,
        isStocked: parsed.isStocked,
        defaultIncomeAccountId: parsed.defaultIncomeAccountId,
        gstRate: parsed.gstRate !== undefined ? new (await import('@prisma/client')).Prisma.Decimal(parsed.gstRate) : undefined,
        gstType: parsed.gstType,
      },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('POST /api/products error:', error);

    // Handle unique constraint violations
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('Unique constraint')) {
      return NextResponse.json(
        { success: false, error: 'A product with this SKU already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
