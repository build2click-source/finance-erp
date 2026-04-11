/**
 * Server-side authentication utilities.
 * Uses Web Crypto API (PBKDF2) for password hashing — no native dependencies.
 * Uses `jose` for JWT signing / verification.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'auth_token';
const TOKEN_EXPIRY_SECONDS = 86400; // 24 hours
const TOKEN_EXPIRY_STRING = '24h';

function getSecret(): Uint8Array {
  const secret = process.env.APP_SECRET;
  if (!secret) throw new Error('APP_SECRET environment variable is not set');
  return new TextEncoder().encode(secret);
}

// ── Password Hashing (PBKDF2 via Web Crypto) ─────────────────────────────────

async function deriveKey(password: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await deriveKey(plainPassword, salt);
  const saltHex = Buffer.from(salt).toString('hex');
  const hashHex = Buffer.from(hash).toString('hex');
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  try {
    const [saltHex, hashHex] = storedHash.split(':');
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const hash = await deriveKey(plainPassword, salt);
    const derivedHex = Buffer.from(hash).toString('hex');
    // Constant-time comparison
    if (derivedHex.length !== hashHex.length) return false;
    let diff = 0;
    for (let i = 0; i < derivedHex.length; i++) {
      diff |= derivedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ── JWT ───────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  userId: string;
  username: string;
  displayName: string;
  role: string;
  email?: string | null;
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY_STRING)
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// ── Cookie Helpers ────────────────────────────────────────────────────────────

export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: TOKEN_EXPIRY_SECONDS,
  });
}

export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession(req?: NextRequest): Promise<SessionPayload | null> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(COOKIE_NAME)?.value;
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;
  return verifyToken(token);
}

// ── Route Guard ────────────────────────────────────────────────────────────────

/**
 * Validates session and optionally checks role.
 * Returns the session payload or a NextResponse error (check with instanceof NextResponse).
 */
export async function requireAuth(
  req: NextRequest,
  allowedRoles?: string[],
): Promise<SessionPayload | NextResponse> {
  const session = await getSession(req);

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (allowedRoles && !allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
  }

  return session;
}
