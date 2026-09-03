'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'setup' | 'reset';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', recoveryCode: '', newPassword: '' });

  useEffect(() => {
    fetch('/api/auth/register')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        if (data.needsSetup) setMode('setup');
      })
      .catch((error) => setMessage(error.message || 'Não foi possível conectar ao banco.'))
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const endpoint = mode === 'setup' ? '/api/auth/register' : mode === 'reset' ? '/api/auth/reset-password' : '/api/auth/login';
    const body = mode === 'reset'
      ? { email: form.email, recoveryCode: form.recoveryCode, newPassword: form.newPassword }
      : mode === 'setup'
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Não foi possível continuar.');
      if (mode === 'reset') {
        setMode('login');
        setForm({ ...form, password: '', recoveryCode: '', newPassword: '' });
        setMessage('Senha atualizada. Entre com a nova senha.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível continuar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand">
        <span className="brand-icon">▣</span>
        <p className="eyebrow">CONTROLE DE EQUIPAMENTOS</p>
        <h1>Estoque organizado, decisões seguras.</h1>
        <p>Cadastre equipamentos, acompanhe entradas e saídas e saiba o saldo real em qualquer dispositivo.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-heading"><span className="logo">E</span><div><h2>{mode === 'setup' ? 'Primeiro acesso' : mode === 'reset' ? 'Recuperar senha' : 'Entrar no sistema'}</h2><p>{mode === 'setup' ? 'Crie o administrador inicial.' : mode === 'reset' ? 'Use o código administrativo.' : 'Informe suas credenciais.'}</p></div></div>
        {checking ? <div className="notice">Verificando o sistema…</div> : null}
        {mode === 'setup' ? <label>Nome do responsável<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label> : null}
        <label>E-mail<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="username" required /></label>
        {mode !== 'reset' ? <label>Senha<input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} required /></label> : <><label>Código de recuperação<input type="password" value={form.recoveryCode} onChange={(e) => setForm({ ...form, recoveryCode: e.target.value })} required /></label><label>Nova senha<input type="password" minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" required /></label></>}
        {message ? <div className="notice">{message}</div> : null}
        <button className="button primary" disabled={loading || checking}>{loading ? 'Aguarde…' : mode === 'setup' ? 'Criar administrador' : mode === 'reset' ? 'Atualizar senha' : 'Entrar'}</button>
        {mode === 'login' ? <button className="link-button" type="button" onClick={() => { setMode('reset'); setMessage(''); }}>Esqueci minha senha</button> : null}
        {mode === 'reset' ? <button className="link-button" type="button" onClick={() => { setMode('login'); setMessage(''); }}>Voltar para o login</button> : null}
      </form>
    </main>
  );
}
