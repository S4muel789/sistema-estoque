import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';
import { audit } from '@/lib/audit';

const schema = z.object({ active: z.boolean().optional(), role: z.enum(['ADMIN','OPERATOR','VIEWER']).optional(), password: z.string().min(8).optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const admin = await currentUser();
  if (!admin || admin.role !== 'ADMIN') return NextResponse.json({ ok:false,message:'Acesso restrito ao administrador.' }, { status:403 });
  const { id } = await context.params;
  try {
    const body = schema.parse(await request.json());
    if (id === admin.id && body.active === false) return NextResponse.json({ ok:false,message:'Você não pode bloquear seu próprio acesso.' }, { status:400 });
    const target=await prisma.user.findUnique({where:{id}});
    if(!target) return NextResponse.json({ok:false,message:'Usuário não encontrado.'},{status:404});
    if(target.role==='ADMIN'&&target.active&&(body.active===false||body.role&&body.role!=='ADMIN')){
      const activeAdmins=await prisma.user.count({where:{role:'ADMIN',active:true}});
      if(activeAdmins<=1)return NextResponse.json({ok:false,message:'O sistema precisa manter pelo menos um administrador ativo.'},{status:400});
    }
    await prisma.user.update({ where:{id}, data:{ active:body.active,role:body.role,sessionVersion:{increment:1},failedLoginAttempts:0,lockedUntil:null,...(body.password?{password:await hash(body.password,12),mustChangePassword:true}:{}) } });
    const action=body.password?'USER_PASSWORD_RESET':body.active===false?'USER_BLOCKED':body.active===true?'USER_ACTIVATED':'USER_ROLE_CHANGED';
    await audit(admin,action,id,body.role?`Novo perfil: ${body.role}`:undefined);
    return NextResponse.json({ ok:true });
  } catch {
    return NextResponse.json({ ok:false,message:'Não foi possível atualizar o usuário.' }, { status:400 });
  }
}
