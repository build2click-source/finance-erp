import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { voidReceipt } from '@/lib/banking/receipt-engine';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['admin', 'accountant']);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    
    // For receipts, 'DELETE' means 'VOID' if posted, or hard delete if draft
    const result = await voidReceipt(id, 'Voided by user request');
    
    return NextResponse.json(result);
  } catch (error) {
    console.error(`DELETE /api/receipts/[id] error:`, error);
    return NextResponse.json({ success: false, error: 'Failed to void receipt' }, { status: 500 });
  }
}
