import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, hashPassword } from '@/lib/auth';

// GET /api/users — list all users (admin only)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req, ['admin']);
  if (authResult instanceof NextResponse) return authResult;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ data: users });
}

// POST /api/users — create user (admin only)
export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req, ['admin']);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const { username, displayName, email, password, role } = await req.json();

    if (!username || !displayName || !password) {
      return NextResponse.json({ error: 'username, displayName, and password are required' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const validRoles = ['admin', 'accountant', 'data_entry'];
    if (role && !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        email: email || null,
        passwordHash,
        role: role || 'data_entry',
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
