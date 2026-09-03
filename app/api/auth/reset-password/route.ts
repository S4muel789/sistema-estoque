import { timingSafeEqual } from 'crypto';
import { hash } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().email(),
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
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user) return NextResponse.json({ ok: false, message: 'Usuário não encontrado.' }, { status: 404 });
    await prisma.user.update({ where: { id: user.id }, data: { password: await hash(body.newPassword, 12) } });
    return NextResponse.json({ ok: true, message: 'Senha atualizada. Faça o login.' });
  } catch (error) {
    console.error('[reset-password] Falha:', error);
    return NextResponse.json({ ok: false, message: 'Não foi possível atualizar a senha.' }, { status: 400 });
  }
}
