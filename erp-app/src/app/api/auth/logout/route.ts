import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST(_req: NextRequest) {
  await clearAuthCookie();
  return NextResponse.json({ success: true });
}
