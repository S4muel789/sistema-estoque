import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { COOKIE } from '@/lib/auth';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  newAdminId: z.string().min(1),
  password: z.string().min(1),
  confirmation: z.literal('TRANSFERIR ADMINISTRACAO'),
});

export async function POST(request: Request) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, message: 'Acesso restrito ao administrador.' }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());
    if (body.newAdminId === admin.id) {
      return NextResponse.json({ ok: false, message: 'Selecione outro usuário para liderar o sistema.' }, { status: 400 });
    }

    const [currentAccount, successor] = await Promise.all([
      prisma.user.findUnique({ where: { id: admin.id } }),
      prisma.user.findUnique({ where: { id: body.newAdminId } }),
    ]);

    if (!currentAccount || !(await compare(body.password, currentAccount.password))) {
      return NextResponse.json({ ok: false, message: 'Senha do administrador incorreta.' }, { status: 401 });
    }
    if (!successor || !successor.active) {
      return NextResponse.json({ ok: false, message: 'O novo responsável precisa ser um usuário ativo.' }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: successor.id },
        data: { role: 'ADMIN', sessionVersion: { increment: 1 }, failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.user.update({
        where: { id: admin.id },
        data: { role: 'OPERATOR', active: false, sessionVersion: { increment: 1 } },
      }),
      prisma.auditLog.create({
        data: {
          action: 'ADMINISTRATION_TRANSFERRED',
          actorId: admin.id,
          actorName: admin.name,
          actorRegistration: admin.registration,
          targetId: successor.id,
          details: `Administração transferida para ${successor.name} (${successor.registration}). Conta anterior desativada.`,
        },
      }),
    ]);

    const response = NextResponse.json({
      ok: true,
      message: `${successor.name} agora é o administrador responsável.`,
    });
    response.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: 'Confira o usuário, a senha e a confirmação.' }, { status: 400 });
    }
    console.error('[transfer-admin] Falha ao transferir administração:', error);
    return NextResponse.json({ ok: false, message: 'Não foi possível transferir a administração.' }, { status: 500 });
  }
}
