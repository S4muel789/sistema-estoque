import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';

const schema = z.object({ active: z.boolean().optional(), role: z.enum(['ADMIN','OPERATOR','VIEWER']).optional(), password: z.string().min(8).optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ ok:false,message:'Acesso restrito ao administrador.' }, { status:403 });
  const { id } = await context.params;
  try {
    const body = schema.parse(await request.json());
    if (id === admin.id && body.active === false) return NextResponse.json({ ok:false,message:'Você não pode bloquear seu próprio acesso.' }, { status:400 });
    await prisma.user.update({ where:{id}, data:{ active:body.active,role:body.role,...(body.password?{password:await hash(body.password,12),mustChangePassword:true}:{}) } });
    return NextResponse.json({ ok:true });
  } catch {
    return NextResponse.json({ ok:false,message:'Não foi possível atualizar o usuário.' }, { status:400 });
  }
}
