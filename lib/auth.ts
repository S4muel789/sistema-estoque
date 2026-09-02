import { SignJWT, jwtVerify } from 'jose';

function getSecret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error('AUTH_SECRET deve ter pelo menos 32 caracteres.');
  return new TextEncoder().encode(value);
}
const COOKIE = 'estoque_session';

export type Session = { id: string; name: string; email: string };
export { COOKIE };

export async function createSession(user: Session) {
  return new SignJWT(user).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(getSecret());
}

export async function verifySession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try { return (await jwtVerify(token, getSecret())).payload as unknown as Session; } catch { return null; }
}
