import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from './db';

export const SESSION_COOKIE = 'session_token';

function getJwtSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('AUTH_SECRET is not configured on the server.');
  }
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function createSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), { expiresIn: '30d' });
}

export function verifySessionToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, getJwtSecret()) as { sub: string };
  } catch {
    return null;
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  verified: boolean;
}

/** Reads the session cookie from the request and loads the user. Returns null if not logged in. */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = verifySessionToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return null;

  return { id: user.id, email: user.email, name: user.name, verified: user.verified };
}
