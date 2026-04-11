import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

// PUT /api/users/[id] — update role / active status / displayName (admin only)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, ['admin']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const { role, isActive, displayName, email } = await req.json();

    const validRoles = ['admin', 'accountant', 'data_entry'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Prevent the last admin from being demoted
    if (role && role !== 'admin') {
      const target = await prisma.user.findUnique({ where: { id } });
      if (target?.role === 'admin') {
        const adminCount = await prisma.user.count({ where: { role: 'admin', isActive: true } });
        if (adminCount <= 1) {
          return NextResponse.json({ error: 'Cannot demote the last active admin' }, { status: 400 });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
        ...(displayName !== undefined && { displayName }),
        ...(email !== undefined && { email: email || null }),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ data: user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/users/[id] — deactivate user (admin only, not hard delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAuth(req, ['admin']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { id } = await params;
    const session = authResult;

    if (session.userId === id) {
      return NextResponse.json({ error: 'You cannot deactivate your own account' }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id },
      data: { isActive: false },
      select: { id: true, username: true, isActive: true },
    });

    return NextResponse.json({ data: user });
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
