import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { COOKIE, verifySession } from '@/lib/auth';

export async function currentUser() {
  const session = await verifySession((await cookies()).get(COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.id, active: true },
    select: { id: true, name: true, email: true, registration: true, role: true, mustChangePassword: true },
  });
}
