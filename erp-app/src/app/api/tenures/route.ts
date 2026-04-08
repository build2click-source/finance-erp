/**
 * GET  /api/tenures — List all tenures with client details
 * POST /api/tenures — Create a new recurring billing tenure
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { z } from 'zod';

// GET — List tenures
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const tenures = await prisma.tenure.findMany({
      where: where as any,
      orderBy: { nextBillingDate: 'asc' },
      include: {
        client: { select: { id: true, code: true, name: true, type: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: tenures,
      count: tenures.length,
    });
  } catch (error) {
    console.error('GET /api/tenures error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tenures' },
      { status: 500 }
    );
  }
}

// POST — Create tenure
const CreateTenureSchema = z.object({
  clientId: z.string().uuid(),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  frequency: z.enum(['Monthly', 'Quarterly', 'Annually']),
  startDate: z.string(), // ISO date string
  endDate: z.string().optional(),
  gstRate: z.number().min(0).max(100).default(18),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateTenureSchema.parse(body);

    const startDate = new Date(parsed.startDate);

    const tenure = await prisma.tenure.create({
      data: {
        clientId: parsed.clientId,
        description: parsed.description,
        amount: parsed.amount,
        frequency: parsed.frequency,
        startDate,
        endDate: parsed.endDate ? new Date(parsed.endDate) : null,
        nextBillingDate: startDate,
        gstRate: parsed.gstRate,
        status: 'active',
      },
      include: {
        client: { select: { id: true, code: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: tenure }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }
    console.error('POST /api/tenures error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tenure' },
      { status: 500 }
    );
  }
}
