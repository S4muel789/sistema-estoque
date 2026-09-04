import { NextResponse } from 'next/server';

const supportMessage = 'Olá, Samuel. Preciso de suporte no Sistema de Estoque.';

export function GET(request: Request) {
  const phone = process.env.SUPPORT_WHATSAPP?.replace(/\D/g, '');

  if (!phone) {
    return NextResponse.redirect(new URL('https://www.linkedin.com/in/samuel-ladeia', request.url));
  }

  const whatsapp = new URL(`https://wa.me/${phone}`);
  whatsapp.searchParams.set('text', supportMessage);
  return NextResponse.redirect(whatsapp);
}
