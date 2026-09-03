import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z, ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie } from '@/lib/auth';

const schema = z.object({ identifier: z.string().trim().min(1), password: z.string().min(1) });
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const identifier = body.identifier.toUpperCase();
    const user = await prisma.user.findFirst({ where: { OR: [{ registration: identifier }, { email: body.identifier.toLowerCase() }] } });
    if (!user || !user.active || !(await compare(body.password, user.password))) return NextResponse.json({ ok:false, message:'Matrícula/e-mail ou senha inválidos.' }, { status:401 });
    const token = await createSession({ id:user.id, name:user.name, email:user.email, registration:user.registration, role:user.role });
    const res = NextResponse.json({ ok:true, mustChangePassword:user.mustChangePassword, user:{ id:user.id, name:user.name, email:user.email, registration:user.registration, role:user.role } });
    setSessionCookie(res, token);
    return res;
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ ok:false, message:'Preencha a matrícula ou e-mail e a senha.' }, { status:400 });
    }

    console.error('[api/auth/login] Falha interna no login:', error);
    return NextResponse.json(
      { ok:false, message:'Erro interno ao acessar o banco. Verifique o terminal.' },
      { status:500 }
    );
  }
}
