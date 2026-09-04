import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';
import { audit } from '@/lib/audit';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Não autenticado' }, { status: 401 });
  if (user.role !== 'ADMIN') return NextResponse.json({ ok: false, message: 'Apenas o administrador pode estornar movimentações.' }, { status: 403 });

  try {
    const id = (await params).id;
    const result = await prisma.$transaction(async (tx) => {
      const original = await tx.movement.findUnique({ where: { id }, include: { product: true } });
      if (!original) throw new Error('Movimentação não encontrada.');
      if (original.note?.startsWith('ESTORNO:')) throw new Error('Um estorno não pode ser estornado novamente.');

      const duplicate = await tx.movement.findFirst({ where: { note: { startsWith: `ESTORNO:${id}` } } });
      if (duplicate) throw new Error('Esta movimentação já foi estornada.');

      const reverseType = original.type === 'IN' ? 'OUT' : 'IN';
      if (reverseType === 'OUT' && original.product.quantity < original.quantity) {
        throw new Error('Não há saldo suficiente para estornar esta entrada.');
      }

      await tx.product.update({
        where: { id: original.productId },
        data: { quantity: reverseType === 'IN' ? { increment: original.quantity } : { decrement: original.quantity } },
      });
      const movement = await tx.movement.create({
        data: {
          type: reverseType,
          quantity: original.quantity,
          note: `ESTORNO:${id} — Correção da movimentação de ${original.createdAt.toLocaleString('pt-BR')}`,
          productId: original.productId,
          userId: user.id,
        },
      });
      return { movement, productName: original.product.name };
    });
    await audit(user, 'MOVEMENT_REVERSED', id, `${result.productName}; estorno ${result.movement.id}`);
    return NextResponse.json({ ok: true, data: result.movement });
  } catch (error) {
    return NextResponse.json({ ok: false, message: error instanceof Error ? error.message : 'Não foi possível estornar.' }, { status: 400 });
  }
}
