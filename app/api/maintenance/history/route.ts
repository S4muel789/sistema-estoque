import { compare } from 'bcryptjs';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { audit } from '@/lib/audit';
import { currentUser } from '@/lib/current-user';
import { prisma } from '@/lib/prisma';

const yearsSchema=z.coerce.number().int().min(1).max(2);
const deleteSchema=z.object({years:yearsSchema,password:z.string().min(1),confirmation:z.literal('APAGAR HISTORICO')});
const cutoff=(years:number)=>{const date=new Date();date.setFullYear(date.getFullYear()-years);return date;};

async function admin(){const user=await currentUser();return user?.role==='ADMIN'?user:null;}

export async function GET(request:Request){
  const user=await admin();if(!user)return NextResponse.json({ok:false,message:'Acesso restrito ao administrador.'},{status:403});
  const url=new URL(request.url),years=yearsSchema.parse(url.searchParams.get('years')||'1'),before=cutoff(years);
  if(url.searchParams.get('format')==='csv'){
    const [rows,auditRows]=await prisma.$transaction([
      prisma.movement.findMany({where:{createdAt:{lt:before}},include:{product:{select:{name:true,sku:true}},user:{select:{name:true,registration:true}}},orderBy:{createdAt:'asc'}}),
      prisma.auditLog.findMany({where:{createdAt:{lt:before}},orderBy:{createdAt:'asc'}}),
    ]);
    const clean=(value:unknown)=>`"${String(value??'').replaceAll('"','""')}"`;
    const csv=['Data,Registro,Ação,Equipamento ou detalhes,SKU,Quantidade,Responsável,Matrícula,Observação',...rows.map(row=>[row.createdAt.toISOString(),'MOVIMENTAÇÃO',row.type,row.product.name,row.product.sku,row.quantity,row.user.name,row.user.registration,row.note].map(clean).join(',')),...auditRows.map(row=>[row.createdAt.toISOString(),'SEGURANÇA',row.action,row.details,'','',row.actorName,row.actorRegistration,''].map(clean).join(','))].join('\n');
    return new NextResponse(csv,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':`attachment; filename="historico-${years}-anos.csv"`}});
  }
  const [movementCount,auditCount]=await prisma.$transaction([prisma.movement.count({where:{createdAt:{lt:before}}}),prisma.auditLog.count({where:{createdAt:{lt:before}}})]);
  return NextResponse.json({ok:true,data:{years,count:movementCount+auditCount,movementCount,auditCount,before:before.toISOString()}});
}

export async function DELETE(request:Request){
  const user=await admin();if(!user)return NextResponse.json({ok:false,message:'Acesso restrito ao administrador.'},{status:403});
  try{
    const body=deleteSchema.parse(await request.json()),record=await prisma.user.findUnique({where:{id:user.id}});
    if(!record||!await compare(body.password,record.password))return NextResponse.json({ok:false,message:'Senha do administrador incorreta.'},{status:401});
    const before=cutoff(body.years),[movements,audits]=await prisma.$transaction([prisma.movement.deleteMany({where:{createdAt:{lt:before}}}),prisma.auditLog.deleteMany({where:{createdAt:{lt:before}}})]);
    const deleted=movements.count+audits.count;
    await audit(user,'OLD_HISTORY_DELETED',undefined,`${movements.count} movimentações e ${audits.count} eventos de segurança anteriores a ${before.toISOString()}`);
    return NextResponse.json({ok:true,data:{deleted,movementDeleted:movements.count,auditDeleted:audits.count}});
  }catch{return NextResponse.json({ok:false,message:'Confira o período, a senha e escreva APAGAR HISTORICO.'},{status:400});}
}
