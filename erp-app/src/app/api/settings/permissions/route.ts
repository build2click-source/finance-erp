import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { AppRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;

    const policies = await prisma.systemPolicy.findMany({
      orderBy: { role: 'asc' }
    });

    return NextResponse.json({ success: true, data: policies });
  } catch (error: any) {
    console.error('GET /api/settings/permissions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const { role, permissions, allowedViews } = body;

    if (!role || !permissions || !allowedViews) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Safety: Ensure admin always has settings view
    let finalViews = allowedViews;
    if (role === 'admin' && !allowedViews.includes('settings')) {
      finalViews = [...allowedViews, 'settings'];
    }

    const policy = await prisma.systemPolicy.upsert({
      where: { role: role as AppRole },
      update: {
        permissions,
        allowedViews: finalViews
      },
      create: {
        role: role as AppRole,
        permissions,
        allowedViews: finalViews
      }
    });

    return NextResponse.json({ success: true, data: policy });
  } catch (error: any) {
    console.error('POST /api/settings/permissions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
