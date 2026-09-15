import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';

const ARCHIVE_RETENTION_MS = 21 * 24 * 60 * 60 * 1000;

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: 'Não autenticado.' }, { status: 401 });
  }
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, message: 'Apenas administradores podem excluir itens definitivamente.' }, { status: 403 });
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    return NextResponse.json({ ok: false, message: 'Equipamento não encontrado.' }, { status: 404 });
  }
  if (product.active) {
    return NextResponse.json({ ok: false, message: 'Arquive o equipamento antes da exclusão definitiva.' }, { status: 400 });
  }

  const availableAt = new Date(product.updatedAt.getTime() + ARCHIVE_RETENTION_MS);
  if (availableAt > new Date()) {
    return NextResponse.json({
      ok: false,
      message: `A exclusão definitiva será liberada em ${availableAt.toLocaleDateString('pt-BR')}.`,
      availableAt: availableAt.toISOString(),
    }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const deletedMovements = await tx.movement.deleteMany({ where: { productId: product.id } });
    await tx.product.delete({ where: { id: product.id } });
    await tx.auditLog.create({
      data: {
        action: 'PRODUCT_PERMANENTLY_DELETED',
        actorId: user.id,
        actorName: user.name,
        actorRegistration: user.registration,
        targetId: product.id,
        details: `${product.name} (${product.sku}) excluído definitivamente após 21 dias arquivado; ${deletedMovements.count} movimentação(ões) relacionada(s) removida(s).`,
      },
    });
    return deletedMovements.count;
  });

  return NextResponse.json({
    ok: true,
    message: 'Equipamento excluído definitivamente.',
    data: { deletedMovements: result },
  });
}
