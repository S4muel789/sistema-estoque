import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.productId || !['IN','OUT'].includes(body.type) || !Number.isInteger(body.quantity) || body.quantity <= 0) {
    return NextResponse.json({ok:false,error:'Movimentação inválida'},{status:400});
  }
  return NextResponse.json({ok:true,data:{...body,createdAt:new Date().toISOString()}},{status:201});
}

export async function GET() {
  return NextResponse.json({ok:true,data:[]});
}
