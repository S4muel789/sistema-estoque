import { prisma } from '@/lib/prisma';
import { currentUser } from '@/lib/current-user';

export const runtime = 'nodejs';

function safe(value: string) {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, ' ').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}
function text(font: 'F1' | 'F2', size: number, x: number, y: number, value: string, color = '0.12 0.18 0.27') {
  return `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${y} Tm (${safe(value)}) Tj ET`;
}
function fill(x: number, y: number, width: number, height: number, color: string) {
  return `${color} rg ${x} ${y} ${width} ${height} re f`;
}
function stroke(x: number, y: number, width: number, height: number, color = '0.82 0.86 0.91') {
  return `${color} RG 0.8 w ${x} ${y} ${width} ${height} re S`;
}
function details(note: string | null) {
  if (note?.startsWith('SETOR:')) {
    const [sectorAndRecipient, ...observationParts] = note.replace('SETOR:', '').split('| OBS:');
    const [sector, ...recipientParts] = sectorAndRecipient.split('| RECEBEDOR:');
    return { sector: sector.trim() || '-', recipient: recipientParts.join('| RECEBEDOR:').trim() || '-', observation: observationParts.join('| OBS:').trim() || '-' };
  }
  if (note?.startsWith('DESTINO:')) {
    const [destination, ...rest] = note.replace('DESTINO:', '').split('| OBS:');
    return { sector: '-', recipient: destination.trim() || '-', observation: rest.join('| OBS:').trim() || '-' };
  }
  return { sector: '-', recipient: '-', observation: note || '-' };
}
function createPdf(stream: string) {
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
  objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>';
  objects[4] = `<< /Length ${Buffer.byteLength(stream, 'latin1')} >>\nstream\n${stream}\nendstream`;
  objects[5] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[6] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
  const offsets: number[] = [0];
  for (let id = 1; id <= 6; id++) { offsets[id] = Buffer.byteLength(pdf, 'latin1'); pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf, 'latin1');
  pdf += 'xref\n0 7\n0000000000 65535 f \n';
  for (let id = 1; id <= 6; id++) pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'latin1');
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return Response.json({ ok: false, message: 'Nao autenticado' }, { status: 401 });
  const { id } = await params;
  const movement = await prisma.movement.findUnique({
    where: { id },
    include: { product: true, user: { select: { name: true, registration: true } } },
  });
  if (!movement) return Response.json({ ok: false, message: 'Movimentacao nao encontrada' }, { status: 404 });
  if (movement.type !== 'OUT' || movement.note?.startsWith('ESTORNO:')) return Response.json({ ok: false, message: 'Comprovante disponivel somente para saidas' }, { status: 400 });

  const info = details(movement.note);
  const c: string[] = [];
  c.push(fill(0, 742, 595, 100, '0.035 0.12 0.25'));
  c.push(fill(0, 736, 595, 6, '0.90 0.68 0.20'));
  c.push(text('F2', 22, 42, 795, 'COMPROVANTE DE SAIDA', '1 1 1'));
  c.push(text('F1', 11, 42, 772, 'Forum - Controle de Estoque', '0.83 0.89 0.97'));
  c.push(text('F1', 9, 398, 795, `N. ${movement.id.slice(0, 12).toUpperCase()}`, '1 1 1'));
  c.push(fill(42, 672, 511, 42, '0.95 0.97 1'));
  c.push(stroke(42, 672, 511, 42));
  c.push(text('F1', 9, 56, 697, 'DATA E HORARIO DA SAIDA', '0.38 0.44 0.52'));
  c.push(text('F2', 12, 56, 680, movement.createdAt.toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' }), '0.035 0.12 0.25'));

  const rows = [
    ['Equipamento', movement.product.name],
    ['Quantidade', `${movement.quantity} ${movement.product.unit}`],
    ['Categoria', movement.product.category || 'Sem categoria'],
    ['Setor de destino', info.sector],
    ['Recebido por', info.recipient],
    ['Registrado por', `${movement.user.name} - ${movement.user.registration}`],
    ['Observacao', info.observation],
  ];
  let y = 632;
  for (const [label, value] of rows) {
    c.push(text('F2', 9, 48, y, label.toUpperCase(), '0.35 0.42 0.52'));
    c.push(fill(185, y - 9, 368, 26, '0.985 0.99 1'));
    c.push(stroke(185, y - 9, 368, 26, '0.88 0.91 0.95'));
    c.push(text('F1', 10, 197, y, value.length > 62 ? value.slice(0, 59) + '...' : value));
    y -= 48;
  }
  c.push(stroke(42, 230, 511, 82, '0.70 0.75 0.82'));
  c.push(text('F1', 9, 56, 291, 'CONFIRMACAO DE RECEBIMENTO', '0.35 0.42 0.52'));
  c.push(text('F1', 9, 56, 250, 'Assinatura do recebedor: __________________________________________'));
  c.push(fill(0, 0, 595, 52, '0.96 0.97 0.99'));
  c.push(text('F1', 8, 42, 31, 'Documento emitido pelo Sistema de Estoque. Consulte o historico para validar o registro.', '0.38 0.44 0.52'));
  c.push(text('F1', 8, 42, 17, `Emitido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Cuiaba' })}`, '0.38 0.44 0.52'));

  const pdf = createPdf(c.join('\n'));
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="comprovante-saida-${movement.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
