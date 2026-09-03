import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/auth';

const schema = z.object({
  name: z.string().trim().min(2, 'Informe o nome do responsável.'),
  email: z.string().trim().email('Informe um e-mail válido.'),
  password: z.string().min(8, 'A senha precisa ter pelo menos 8 caracteres.'),
});

export async function GET() {
  try {
    return NextResponse.json({ ok: true, needsSetup: (await prisma.user.count()) === 0 });
  } catch (error) {
    console.error('[setup] Falha ao consultar o banco:', error);
    return NextResponse.json({ ok: false, message: 'Não foi possível conectar ao banco.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (await prisma.user.count() > 0) {
      return NextResponse.json({ ok: false, message: 'O administrador inicial já foi criado.' }, { status: 403 });
    }
    const body = schema.parse(await req.json());
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email.toLowerCase(), password: await hash(body.password, 12) },
    });
    const response = NextResponse.json({ ok: true }, { status: 201 });
    setSessionCookie(response, await createSession({ id: user.id, name: user.name, email: user.email }));
    return response;
  } catch (error) {
    console.error('[setup] Falha ao criar administrador:', error);
    return NextResponse.json({ ok: false, message: 'Confira os dados e a conexão com o banco.' }, { status: 400 });
  }
}
