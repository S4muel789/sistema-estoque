import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, COOKIE } from '@/lib/auth';

const schema = z.object({ email: z.string().email(), password: z.string().min(1) });
export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await compare(body.password, user.password))) return NextResponse.json({ ok:false, message:'E-mail ou senha inválidos.' }, { status:401 });
    const token = await createSession({ id:user.id, name:user.name, email:user.email });
    const res = NextResponse.json({ ok:true, user:{ id:user.id, name:user.name, email:user.email } });
    res.cookies.set(COOKIE, token, { httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', path:'/', maxAge:60*60*24*7 });
    return res;
  } catch { return NextResponse.json({ ok:false, message:'Dados inválidos.' }, { status:400 }); }
}
