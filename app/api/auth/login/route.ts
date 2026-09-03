import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/auth';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
    if (!user || !(await compare(body.password, user.password))) return NextResponse.json({ ok:false, message:'E-mail ou senha inválidos.' }, { status:401 });
    const token = await createSession({ id:user.id, name:user.name, email:user.email });
    const res = NextResponse.json({ ok:true, user:{ id:user.id, name:user.name, email:user.email } });
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok:false, message:'Preencha um e-mail e uma senha válidos.' }, { status:400 });
    }

    console.error('[api/auth/login] Falha interna no login:', error);
    return NextResponse.json(
      { ok:false, message:'Erro interno ao acessar o banco. Verifique o terminal.' },
      { status:500 }
    );
  }
}
