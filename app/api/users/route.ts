import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  name: z.string().trim().min(2),
  registration: z.string().trim().min(3),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  role: z.enum(['ADMIN', 'OPERATOR', 'VIEWER']),
  password: z.string().min(8),
});

export async function GET() {
  const admin = await currentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ ok: false, message: 'Acesso restrito ao administrador.' }, { status: 403 });
  const data = await prisma.user.findMany({ select: { id:true,name:true,registration:true,email:true,role:true,active:true,mustChangePassword:true,createdAt:true }, orderBy:{name:'asc'} });
  return NextResponse.json({ ok: true, data });
}

export async function POST(request: Request) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ ok: false, message: 'Acesso restrito ao administrador.' }, { status: 403 });
  try {
    const body = schema.parse(await request.json());
    const user = await prisma.user.create({ data: { name:body.name,registration:body.registration.toUpperCase(),email:body.email?.toLowerCase()||null,role:body.role,password:await hash(body.password,12),mustChangePassword:true } });
    return NextResponse.json({ ok:true,data:{id:user.id} }, { status:201 });
  } catch (error: any) {
    return NextResponse.json({ ok:false,message:error?.code==='P2002'?'Matrícula ou e-mail já cadastrado.':'Confira os dados do usuário.' }, { status:400 });
  }
}
