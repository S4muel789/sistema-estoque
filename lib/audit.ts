import { prisma } from '@/lib/prisma';

type Actor = { id: string; name: string; registration: string };

export async function audit(actor: Actor, action: string, targetId?: string, details?: string) {
  await prisma.auditLog.create({ data: { action, actorId: actor.id, actorName: actor.name, actorRegistration: actor.registration, targetId, details } });
}
