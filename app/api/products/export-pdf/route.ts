import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';

export const runtime = 'nodejs';

function pdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function shorten(value: string, limit = 82) {
  return value.length > limit ? value.slice(0, limit - 3) + '...' : value;
}

function createPdf(pages: string[][]) {
  const pageCount = pages.length;
  const fontId = 3 + pageCount * 2;
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  const kids = pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ');
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`;

  pages.forEach((lines, index) => {
    const pageId = 3 + index * 2;
    const streamId = pageId + 1;
    const commands = lines.map((line, lineIndex) => {
      const size = lineIndex === 0 ? 17 : lineIndex === 1 ? 10 : 9;
      const y = 805 - lineIndex * 17;
      return `BT /F1 ${size} Tf 42 ${y} Td (${pdfText(line)}) Tj ET`;
    }).join('\n');
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${streamId} 0 R >>`;
    objects[streamId] = `<< /Length ${Buffer.byteLength(commands, 'latin1')} >>\nstream\n${commands}\nendstream`;
  });
  objects[fontId] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';

  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= fontId; id++) {
    offsets[id] = Buffer.byteLength(pdf, 'latin1');
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${fontId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= fontId; id++) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${fontId + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, message: 'Nao autenticado' }, { status: 401 });

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ name: 'asc' }, { category: 'asc' }],
  });

  const totalUnits = products.reduce((sum, product) => sum + product.quantity, 0);
  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' });
  const pages: string[][] = [];
  const perPage = 20;

  for (let start = 0; start < Math.max(products.length, 1); start += perPage) {
    const pageNumber = pages.length + 1;
    const lines = [
      'RELATORIO DE ESTOQUE DE EQUIPAMENTOS',
      `Gerado em ${generatedAt} | Por: ${user.name} | Pagina ${pageNumber}`,
      `Equipamentos: ${products.length} | Unidades disponiveis: ${totalUnits}`,
      ' ',
    ];
    const slice = products.slice(start, start + perPage);
    if (!slice.length) lines.push('Nenhum equipamento cadastrado no estoque atual.');
    slice.forEach((product, index) => {
      const status = product.quantity <= product.minStock ? 'ESTOQUE BAIXO' : 'NORMAL';
      lines.push(shorten(`${start + index + 1}. ${product.category || 'Sem categoria'} - ${product.name}`));
      lines.push(shorten(`   Saldo: ${product.quantity} ${product.unit} | Minimo: ${product.minStock} ${product.unit} | Status: ${status}`));
    });
    lines.push(' ');
    lines.push('Documento para consulta. Os dados oficiais sao os registrados no sistema.');
    pages.push(lines);
  }

  const pdf = createPdf(pages);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="estoque-${date}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
