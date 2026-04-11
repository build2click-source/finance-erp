import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;

    const count = await prisma.companyProfile.count();
    let profile;
    if (count === 0) {
      profile = await prisma.companyProfile.create({
        data: {
          name: 'ARM Enterprises',
          state: 'West Bengal',
          city: 'Kolkata',
          gstin: '19AAACA1234A1Z5',
          pincode: '700001',
          email: 'billing@armenterprises.com',
          phone: '+919999999999',
        }
      });
    } else {
      profile = await prisma.companyProfile.findFirst();
    }

    const updatedProducts = await prisma.product.updateMany({
      where: {
        OR: [
          { hsnCode: null },
          { hsnCode: '' }
        ]
      },
      data: {
        hsnCode: '997152'
      }
    });

    return NextResponse.json({ success: true, profile, updatedProducts: updatedProducts.count });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
