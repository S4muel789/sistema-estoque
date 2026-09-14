import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';

export const runtime = 'nodejs';

type ProductRow = {
  name: string;
  category: string | null;
  quantity: number;
  minStock: number;
  unit: string;
};

function safe(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function fit(value: string, max: number) {
  const clean = safe(value);
  return clean.length > max ? clean.slice(0, max - 3) + '...' : clean;
}

function text(font: 'F1' | 'F2', size: number, x: number, y: number, value: string, color = '0.12 0.18 0.27') {
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${safe(value)}) Tj ET`;
}

function fill(x: number, y: number, width: number, height: number, color: string) {
  return `${color} rg ${x} ${y} ${width} ${height} re f`;
}

function stroke(x: number, y: number, width: number, height: number, color = '0.82 0.86 0.91') {
  return `${color} RG 0.6 w ${x} ${y} ${width} ${height} re S`;
}

function pageContent(rows: ProductRow[], page: number, pages: number, generatedAt: string, userName: string, totalProducts: number, totalUnits: number, lowStock: number) {
  const c: string[] = [];
  c.push(fill(0, 520, 842, 75, '0.035 0.12 0.25'));
  c.push(fill(0, 516, 842, 4, '0.90 0.68 0.20'));
  c.push(text('F2', 19, 36, 558, 'FORUM - CONTROLE DE ESTOQUE', '1 1 1'));
  c.push(text('F1', 10, 36, 538, 'Relatorio organizado de equipamentos', '0.83 0.89 0.97'));
  c.push(text('F1', 8, 624, 558, `Gerado: ${generatedAt}`, '1 1 1'));
  c.push(text('F1', 8, 624, 542, fit(`Responsavel: ${userName}`, 36), '1 1 1'));

  const cards = [
    { x: 36, label: 'EQUIPAMENTOS', value: String(totalProducts), color: '0.96 0.98 1' },
    { x: 238, label: 'UNIDADES DISPONIVEIS', value: String(totalUnits), color: '0.96 0.98 1' },
    { x: 440, label: 'ESTOQUE BAIXO', value: String(lowStock), color: lowStock ? '1 0.95 0.93' : '0.94 0.99 0.96' },
    { x: 642, label: 'PAGINA', value: `${page} de ${pages}`, color: '0.96 0.98 1' },
  ];
  for (const card of cards) {
    c.push(fill(card.x, 464, 164, 38, card.color));
    c.push(stroke(card.x, 464, 164, 38));
    c.push(text('F1', 7, card.x + 10, 487, card.label, '0.35 0.42 0.52'));
    c.push(text('F2', 13, card.x + 10, 471, card.value, '0.035 0.12 0.25'));
  }

  const tableX = 36;
  const tableY = 430;
  const rowHeight = 18;
  const widths = [150, 310, 90, 90, 130];
  const labels = ['CATEGORIA', 'DESCRICAO DO EQUIPAMENTO', 'SALDO', 'MINIMO', 'STATUS'];
  const positions = [tableX, tableX + 150, tableX + 460, tableX + 550, tableX + 640];

  c.push(fill(tableX, tableY, 770, 24, '0.11 0.29 0.52'));
  labels.forEach((label, index) => c.push(text('F2', 8, positions[index] + 8, tableY + 8, label, '1 1 1')));

  if (!rows.length) {
    c.push(fill(tableX, tableY - 36, 770, 36, '0.98 0.99 1'));
    c.push(text('F1', 10, tableX + 12, tableY - 22, 'Nenhum equipamento cadastrado no estoque atual.'));
  }

  rows.forEach((product, index) => {
    const y = tableY - (index + 1) * rowHeight;
    const low = product.quantity <= product.minStock;
    c.push(fill(tableX, y, 770, rowHeight, index % 2 === 0 ? '0.98 0.99 1' : '1 1 1'));
    c.push(stroke(tableX, y, 770, rowHeight, '0.88 0.91 0.95'));
    c.push(text('F1', 8, positions[0] + 8, y + 6, fit(product.category || 'Sem categoria', 25)));
    c.push(text('F1', 8, positions[1] + 8, y + 6, fit(product.name, 52)));
    c.push(text('F1', 8, positions[2] + 8, y + 6, `${product.quantity} ${fit(product.unit, 8)}`));
    c.push(text('F1', 8, positions[3] + 8, y + 6, `${product.minStock} ${fit(product.unit, 8)}`));
    c.push(text('F2', 7.5, positions[4] + 8, y + 6, low ? 'ESTOQUE BAIXO' : 'NORMAL', low ? '0.72 0.16 0.08' : '0.08 0.46 0.25'));
  });

  c.push(fill(0, 0, 842, 34, '0.96 0.97 0.99'));
  c.push(text('F1', 7.5, 36, 14, 'Documento para consulta offline. Os dados oficiais sao os registrados no sistema.', '0.38 0.44 0.52'));
  c.push(text('F1', 7.5, 735, 14, `Pagina ${page}/${pages}`, '0.38 0.44 0.52'));
  return c.join('\n');
}

function createPdf(streams: string[]) {
  const pageCount = streams.length;
  const regularFontId = 3 + pageCount * 2;
  const boldFontId = regularFontId + 1;
  const lastId = boldFontId;
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Kids [${streams.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`;

  streams.forEach((stream, index) => {
    const pageId = 3 + index * 2;
    const streamId = pageId + 1;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${streamId} 0 R >>`;
    objects[streamId] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  });
  objects[regularFontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[boldFontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= lastId; id++) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${lastId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= lastId; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${lastId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, message: 'Nao autenticado' }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ name: 'asc' }, { category: 'asc' }],
    select: { name: true, category: true, quantity: true, minStock: true, unit: true },
  });

  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const lowStock = products.filter(product => product.quantity <= product.minStock).length;
  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' });
  const perPage = 20;
  const chunks: ProductRow[][] = [];
  for (let start = 0; start < products.length; start += perPage) chunks.push(products.slice(start, start + perPage));
  if (!chunks.length) chunks.push([]);
  const streams = chunks.map((rows, index) => pageContent(rows, index + 1, chunks.length, generatedAt, user.name, products.length, totalUnits, lowStock));
  const pdf = createPdf(streams);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="estoque-forum-${date}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
