import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'Invalid items format' }, { status: 400 });
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    // Process in a single transaction if possible, or sequential for robustness
    // For large uploads, we should probably use createMany but we need to handle history too
    for (const item of items) {
      try {
        if (!item.name || !item.code) {
           results.failed++;
           results.errors.push(`Missing name or code for row`);
           continue;
        }

        await prisma.$transaction(async (tx) => {
          const clientId = uuidv4();
          await tx.client.create({
            data: {
              id: clientId,
              code: item.code,
              name: item.name,
              type: item.type || 'Both',
              email: item.email || null,
              contact: item.contact || null,
              address: item.address || null,
              gstin: item.gstin || null,
              status: 'active',
            }
          });

          await tx.clientHistory.create({
            data: {
              id: uuidv4(),
              clientId: clientId,
              changeType: 'created',
              payload: { bulk_import: true, ...item }
            }
          });
        });
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`${item.name || 'Unknown'}: ${err.message}`);
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('POST /api/clients/bulk error:', error);
    return NextResponse.json({ success: false, error: 'Failed to process bulk upload' }, { status: 500 });
  }
}
