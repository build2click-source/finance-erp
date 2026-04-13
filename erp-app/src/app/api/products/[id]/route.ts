import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await params;
    
    // Check if product has invoice lines or stock
    const linkedInvoiceLines = await prisma.invoiceLine.count({ where: { productId: id } });
    const stockCount = await prisma.costLayer.count({ where: { productId: id, remainingQty: { gt: 0 } } });

    if (linkedInvoiceLines > 0 || stockCount > 0) {
      // Deactivate instead of delete
      await prisma.product.update({
        where: { id },
        data: { isStocked: false } // Using isStocked=false as a soft-delete/deactivation for now
      });
      return NextResponse.json({ success: true, message: 'Product deactivated (has linked records or stock)' });
    }

    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error(`DELETE /api/products/[id] error:`, error);
    return NextResponse.json({ success: false, error: 'Failed to delete product' }, { status: 500 });
  }
}
