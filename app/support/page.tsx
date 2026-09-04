'use client';

import { useState } from 'react';

const message = 'Olá, Samuel! Preciso de suporte no Sistema de Estoque de Equipamentos.';
const linkedIn = 'https://www.linkedin.com/in/samuel-ladeia';

export default function SupportPage() {
  const [copied, setCopied] = useState(false);

  async function copyAndOpenLinkedIn() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    window.open(linkedIn, '_blank', 'noopener,noreferrer');
  }

  return (
    <main className="support-page">
      <section className="support-card">
        <span className="support-icon" aria-hidden="true">S</span>
        <p className="eyebrow">SUPORTE E MANUTENÇÃO</p>
        <h1>Fale com Samuel Ladeia</h1>
        <p>Copie a mensagem abaixo e envie pelo LinkedIn.</p>
        <div className="support-message" aria-label="Mensagem para suporte">{message}</div>
        <div className="support-actions">
          <button className="button primary" type="button" onClick={copyAndOpenLinkedIn}>
            {copied ? 'Mensagem copiada — abrir LinkedIn' : 'Copiar mensagem e abrir LinkedIn'}
          </button>
          <a className="button ghost" href="/">Voltar ao sistema</a>
        </div>
        <small>O LinkedIn poderá solicitar login. Depois, clique em “Mensagem” no perfil e cole o texto.</small>
      </section>
    </main>
  );
}
