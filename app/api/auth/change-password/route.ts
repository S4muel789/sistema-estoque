import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';

const schema = z.object({ password: z.string().min(8) });

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Não autenticado.' }, { status: 401 });
  try {
    const body = schema.parse(await request.json());
    await prisma.user.update({ where: { id: user.id }, data: { password: await hash(body.password, 12), mustChangePassword: false } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: 'A senha precisa ter pelo menos 8 caracteres.' }, { status: 400 });
  }
}
