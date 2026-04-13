import { NextRequest, NextResponse } from 'next/server';
import { getSession, signToken, setAuthCookie } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // Fetch dynamic policy for this role
  let policy = null;
  try {
    policy = await prisma.systemPolicy.findUnique({
      where: { role: session.role as any }
    });
  } catch (err) {
    console.error('Failed to fetch policy:', err);
  }

  // Rolling refresh: re-issue a fresh 24-hour cookie on every /me call
  const freshToken = await signToken({
    userId: session.userId,
    username: session.username,
    displayName: session.displayName,
    role: session.role,
    email: session.email,
  });
  await setAuthCookie(freshToken);

  return NextResponse.json({
    data: {
      userId: session.userId,
      username: session.username,
      displayName: session.displayName,
      role: session.role,
      email: session.email,
      policy: policy ? {
        permissions: policy.permissions,
        allowedViews: policy.allowedViews
      } : null
    },
  });
}
