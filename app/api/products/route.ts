import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifySession, COOKIE } from '@/lib/auth';
const schema=z.object({name:z.string().min(1),sku:z.string().min(1),category:z.string().optional().nullable(),quantity:z.number().int().min(0).default(0),minStock:z.number().int().min(0).default(0),unit:z.string().min(1).default('un')});
async function getUser(){return verifySession((await cookies()).get(COOKIE)?.value)}
export async function GET(req:Request){const u=await getUser();if(!u)return NextResponse.json({ok:false,message:'Não autenticado'},{status:401});const q=new URL(req.url).searchParams.get('q')||'';const data=await prisma.product.findMany({where:{active:true,OR:[{name:{contains:q,mode:'insensitive'}},{sku:{contains:q,mode:'insensitive'}},{category:{contains:q,mode:'insensitive'}}]},orderBy:{name:'asc'}});return NextResponse.json({ok:true,data});}
export async function POST(req:Request){const u=await getUser();if(!u)return NextResponse.json({ok:false,message:'Não autenticado'},{status:401});try{const b=schema.parse(await req.json());const p=await prisma.product.create({data:b});return NextResponse.json({ok:true,data:p},{status:201});}catch(e:any){return NextResponse.json({ok:false,message:e?.code==='P2002'?'SKU já cadastrado.':'Dados inválidos.'},{status:400});}}
