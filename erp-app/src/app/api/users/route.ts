import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth, hashPassword } from '@/lib/auth';
import { z } from 'zod';

const CreateUserSchema = z.object({
  username: z.string().min(2).max(40).regex(/^[a-z0-9._-]+$/, 'Lowercase letters, numbers, . _ - only'),
  displayName: z.string().min(1).max(80),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'accountant', 'data_entry']).default('data_entry'),
});

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
    const body = await req.json();
    const parsed = CreateUserSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', issues: parsed.error.issues }, { status: 400 });
    }
    const { username, displayName, email, password, role } = parsed.data;

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        displayName,
        email: email || null,
        passwordHash,
        role,
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
