import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';
import { inventoryKey, normalizeCategory, normalizeProductName } from '@/lib/categories';

const schema = z.object({
  name: z.string().min(1),
  sku: z.string().optional(),
  category: z.string().trim().min(1, 'Informe uma categoria.'),
  quantity: z.number().int().min(0).default(0),
  minStock: z.number().int().min(2, 'O estoque mínimo deve ser pelo menos 2.'),
  unit: z.string().min(1).default('un'),
});

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Não autenticado' }, { status: 401 });

  const search = new URL(req.url).searchParams;
  const q = search.get('q') || '';
  const archived = search.get('archived') === 'true';
  if (archived && user.role !== 'ADMIN') {
    return NextResponse.json({ ok: false, message: 'Acesso restrito ao administrador.' }, { status: 403 });
  }

  const data = await prisma.product.findMany({
    where: {
      active: !archived,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { sku: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ],
    },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json({ ok: true, data });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Não autenticado' }, { status: 401 });
  if (user.role === 'VIEWER') {
    return NextResponse.json({ ok: false, message: 'Seu perfil permite apenas consultas.' }, { status: 403 });
  }

  try {
    const body = schema.parse(await req.json());
    const normalizedCategory = normalizeCategory(body.category);
    const normalizedName = normalizeProductName(body.name);
    const key = inventoryKey(normalizedName);
    const unit = body.unit.trim();

    const categoryMatch = await prisma.product.findFirst({
      where: { category: { equals: normalizedCategory, mode: 'insensitive' } },
      select: { category: true },
    });
    const category = categoryMatch?.category || normalizedCategory;

    const result = await prisma.$transaction(async (tx) => {
      // Impede dois cadastros simultâneos do mesmo equipamento de criarem linhas diferentes.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${inventoryKey(category) + '|' + key}))`;

      const candidates = await tx.product.findMany({
        where: { category: { equals: category, mode: 'insensitive' } },
        orderBy: { createdAt: 'asc' },
      });
      const matches = candidates.filter((product) => inventoryKey(product.name) === key);
      const existing = matches[0];

      if (existing) {
        if (!existing.active) {
          throw new Error('Este equipamento já existe nos arquivados. Restaure-o antes de registrar um novo lote.');
        }
        if (existing.unit.toLocaleLowerCase('pt-BR') !== unit.toLocaleLowerCase('pt-BR')) {
          throw new Error(`Este equipamento já usa a unidade “${existing.unit}”. Registre o lote com a mesma unidade.`);
        }

        const duplicates = matches.slice(1);
        const duplicateQuantity = duplicates.reduce((sum, product) => sum + product.quantity, 0);
        for (const duplicate of duplicates) {
          await tx.movement.updateMany({ where: { productId: duplicate.id }, data: { productId: existing.id } });
          await tx.product.delete({ where: { id: duplicate.id } });
        }

        const increment = duplicateQuantity + body.quantity;
        const product = increment > 0
          ? await tx.product.update({
              where: { id: existing.id },
              data: { quantity: { increment }, name: normalizedName },
            })
          : existing;

        if (body.quantity > 0) {
          await tx.movement.create({
            data: {
              type: 'IN',
              quantity: body.quantity,
              note: 'Entrada de novo lote pelo cadastro',
              productId: existing.id,
              userId: user.id,
            },
          });
        }

        if (duplicates.length > 0) {
          await tx.auditLog.create({
            data: {
              action: 'PRODUCT_DUPLICATES_MERGED',
              actorId: user.id,
              actorName: user.name,
              actorRegistration: user.registration,
              targetId: existing.id,
              details: `${normalizedName}: ${duplicates.length + 1} linhas unificadas; saldo preservado.`,
            },
          });
        }
        return { product, consolidated: true };
      }

      const product = await tx.product.create({
        data: {
          ...body,
          name: normalizedName,
          category,
          unit,
          sku: body.sku?.trim() || `EQ-${randomUUID().slice(0, 8).toUpperCase()}`,
        },
      });
      if (body.quantity > 0) {
        await tx.movement.create({
          data: {
            type: 'IN',
            quantity: body.quantity,
            note: 'Estoque inicial',
            productId: product.id,
            userId: user.id,
          },
        });
      }
      return { product, consolidated: false };
    }, { isolationLevel: 'Serializable' });

    return NextResponse.json(
      { ok: true, data: result.product, consolidated: result.consolidated },
      { status: result.consolidated ? 200 : 201 },
    );
  } catch (error: unknown) {
    console.error('[products] Falha ao cadastrar:', error);
    const parsed = error as { issues?: Array<{ message?: string }>; message?: string };
    const safeMessage = parsed.issues?.[0]?.message
      || (parsed.message?.startsWith('Este equipamento') ? parsed.message : null)
      || 'Confira os dados do equipamento.';
    return NextResponse.json({ ok: false, message: safeMessage }, { status: 400 });
  }
}
