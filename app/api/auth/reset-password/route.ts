import { timingSafeEqual } from 'crypto';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({
  identifier: z.string().trim().max(160).optional().default(''),
  recoveryCode: z.string().min(1),
  newPassword: z.string().min(8),
});

function codesMatch(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const expected = process.env.RECOVERY_CODE;
    if (!expected || expected.length < 16 || !codesMatch(body.recoveryCode, expected)) {
      return NextResponse.json({ ok: false, message: 'Código de recuperação inválido.' }, { status: 401 });
    }

    let user;
    if (body.identifier) {
      user = await prisma.user.findFirst({
        where: {
          role: 'ADMIN',
          active: true,
          OR: [
            { registration: { equals: body.identifier, mode: 'insensitive' } },
            { email: { equals: body.identifier.toLowerCase(), mode: 'insensitive' } },
          ],
        },
      });
    } else {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', active: true },
        orderBy: { createdAt: 'asc' },
        take: 2,
      });
      if (admins.length > 1) {
        return NextResponse.json({
          ok: false,
          message: 'Existe mais de um administrador. Informe a matrícula ou o e-mail de um deles.',
        }, { status: 400 });
      }
      user = admins[0];
    }

    if (!user) {
      return NextResponse.json({ ok: false, message: 'Administrador ativo não encontrado.' }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          password: await hash(body.newPassword, 12),
          mustChangePassword: false,
          sessionVersion: { increment: 1 },
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      prisma.auditLog.create({
        data: {
          action: 'ADMIN_PASSWORD_RECOVERED',
          actorId: user.id,
          actorName: user.name,
          actorRegistration: user.registration,
          targetId: user.id,
          details: 'Senha administrativa recuperada com o código de emergência.',
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      message: 'Senha atualizada. Faça o login novamente.',
      registration: user.registration,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: 'A nova senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
    }
    console.error('[reset-password] Falha:', error);
    return NextResponse.json({ ok: false, message: 'Não foi possível atualizar a senha.' }, { status: 500 });
  }
}
