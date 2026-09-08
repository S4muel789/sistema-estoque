import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';

const productActions = ['PRODUCT_EDITED', 'PRODUCT_ARCHIVED', 'PRODUCT_RESTORED'];

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Não autenticado' }, { status: 401 });

  const data = await prisma.auditLog.findMany({
    where: { action: { in: productActions } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return NextResponse.json({ ok: true, data });
}
