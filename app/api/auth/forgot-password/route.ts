import { SignJWT } from 'jose';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const schema = z.object({ email: z.string().trim().email().max(160) });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[char] ?? char);
}

export async function POST(req: Request) {
  try {
    const { email } = schema.parse(await req.json());
    const user = await prisma.user.findFirst({
      where: { email: { equals: email.toLowerCase(), mode: 'insensitive' }, active: true },
    });

    if (!user?.email) {
      return NextResponse.json({ ok: true, message: 'Se o e-mail estiver cadastrado, você receberá as instruções em alguns minutos.' });
    }

    const authSecret = process.env.AUTH_SECRET;
    const resendKey = process.env.RESEND_API_KEY;
    if (!authSecret || authSecret.length < 32 || !resendKey) {
      console.error('[forgot-password] AUTH_SECRET ou RESEND_API_KEY não configurado.');
      return NextResponse.json({ ok: false, message: 'O envio por e-mail ainda não foi configurado pelo administrador.' }, { status: 503 });
    }

    const token = await new SignJWT({ purpose: 'password-reset', version: user.sessionVersion })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(new TextEncoder().encode(authSecret));

    const baseUrl = (process.env.APP_URL || new URL(req.url).origin).replace(/\/$/, '');
    const resetUrl = `${baseUrl}/login?reset=${encodeURIComponent(token)}`;
    const from = process.env.EMAIL_FROM || 'Sistema de Estoque <onboarding@resend.dev>';

    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `password-reset-${user.id}-${user.sessionVersion}`,
      },
      body: JSON.stringify({
        from,
        to: [user.email],
        subject: 'Recuperação de acesso — Sistema de Estoque',
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
          <h2>Recuperação de acesso</h2>
          <p>Olá, ${escapeHtml(user.name)}.</p>
          <p>Recebemos uma solicitação para criar uma nova senha no Sistema de Estoque.</p>
          <p><a href="${resetUrl}" style="display:inline-block;background:#2454c6;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">Criar nova senha</a></p>
          <p>Este link expira em 15 minutos e funciona somente uma vez.</p>
          <p>Se você não solicitou a recuperação, ignore esta mensagem.</p>
        </div>`,
      }),
    });

    if (!result.ok) {
      console.error('[forgot-password] Falha no serviço de e-mail:', result.status, await result.text());
      return NextResponse.json({ ok: false, message: 'Não foi possível enviar o e-mail agora. Use o código administrativo de emergência.' }, { status: 502 });
    }

    await prisma.auditLog.create({
      data: {
        action: 'PASSWORD_RECOVERY_EMAIL_SENT',
        actorId: user.id,
        actorName: user.name,
        actorRegistration: user.registration,
        targetId: user.id,
        details: 'Link temporário de recuperação enviado ao e-mail cadastrado.',
      },
    });

    return NextResponse.json({ ok: true, message: 'Se o e-mail estiver cadastrado, você receberá as instruções em alguns minutos.' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: 'Informe um endereço de e-mail válido.' }, { status: 400 });
    }
    console.error('[forgot-password] Falha:', error);
    return NextResponse.json({ ok: false, message: 'Não foi possível solicitar a recuperação.' }, { status: 500 });
  }
}
