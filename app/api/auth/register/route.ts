import { NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
const schema=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(12)});
export async function POST(req:Request){try{if(await prisma.user.count()>0)return NextResponse.json({ok:false,message:'Cadastro inicial já concluído.'},{status:403});const b=schema.parse(await req.json());const email=b.email.toLowerCase();const user=await prisma.user.create({data:{name:b.name,email,password:await hash(b.password,12)}});return NextResponse.json({ok:true,user:{id:user.id,name:user.name,email:user.email}},{status:201});}catch{return NextResponse.json({ok:false,message:'Dados inválidos.'},{status:400});}}
