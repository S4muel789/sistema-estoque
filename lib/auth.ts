import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');
const COOKIE = 'estoque_session';

export type Session = { id: string; name: string; email: string };
export { COOKIE };

export async function createSession(user: Session) {
  return new SignJWT(user).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret);
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try { return (await jwtVerify(token, secret)).payload as unknown as Session; } catch { return null; }
}
