'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Mode = 'login' | 'setup' | 'forgot' | 'reset' | 'email-reset' | 'change';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ name: '', registration: '', identifier: '', email: '', password: '', recoveryCode: '', newPassword: '', resetToken: '' });

  useEffect(() => {
    const resetToken = new URLSearchParams(window.location.search).get('reset');
    if (resetToken) {
      setForm((current) => ({ ...current, resetToken }));
      setMode('email-reset');
    }
    fetch('/api/auth/register')
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message);
        if (data.needsSetup) setMode('setup');
        else if (resetToken) setMode('email-reset');
      })
      .catch((error) => setMessage(error.message || 'Não foi possível conectar ao banco.'))
      .finally(() => setChecking(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    const endpoint = mode === 'setup' ? '/api/auth/register' : mode === 'forgot' ? '/api/auth/forgot-password' : (mode === 'reset' || mode === 'email-reset') ? '/api/auth/reset-password' : mode === 'change' ? '/api/auth/change-password' : '/api/auth/login';
    const body = mode === 'change' ? { password: form.newPassword } : mode === 'forgot'
      ? { email: form.email }
      : mode === 'email-reset'
        ? { token: form.resetToken, newPassword: form.newPassword }
        : mode === 'reset'
          ? { identifier: form.identifier, recoveryCode: form.recoveryCode, newPassword: form.newPassword }
      : mode === 'setup'
        ? { name: form.name, registration: form.registration, email: form.email, password: form.password }
        : { identifier: form.identifier, password: form.password };
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Não foi possível continuar.');
      if (mode === 'forgot') {
        setMessage(data.message);
      } else if (mode === 'reset' || mode === 'email-reset') {
        setMode('login');
        setForm({ ...form, identifier: data.registration || form.identifier, password: '', recoveryCode: '', newPassword: '', resetToken: '' });
        setMessage(`Senha atualizada. Sua matrícula de acesso é ${data.registration}.`);
        window.history.replaceState({}, '', '/login');
      } else if (mode === 'login' && data.mustChangePassword) {
        setMode('change');
        setForm({ ...form, password: '', newPassword: '' });
        setMessage('Crie uma senha pessoal para continuar.');
      } else if (mode === 'change') {
        setMode('login');
        setForm({ ...form, identifier: '', password: '', newPassword: '' });
        setMessage('Senha pessoal criada. Entre novamente.');
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
        <Image src="/icon.svg" alt="Logo do estoque do Fórum" width={56} height={56} className="brand-logo large" priority/>
        <p className="eyebrow">CONTROLE DE EQUIPAMENTOS</p>
        <h1>Estoque organizado, decisões seguras.</h1>
        <p>Cadastre equipamentos, acompanhe entradas e saídas e saiba o saldo real em qualquer dispositivo.</p>
      </section>
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-heading"><Image src="/icon.svg" alt="Logo do estoque do Fórum" width={40} height={40} className="brand-logo" priority/><div><h2>{mode === 'setup' ? 'Primeiro acesso' : mode === 'forgot' ? 'Recuperar por e-mail' : (mode === 'reset' || mode === 'email-reset') ? 'Criar nova senha' : mode === 'change' ? 'Crie sua senha' : 'Entrar no sistema'}</h2><p>{mode === 'setup' ? 'Crie o administrador inicial.' : mode === 'forgot' ? 'Enviaremos um link ao e-mail cadastrado.' : mode === 'email-reset' ? 'O link funciona uma vez e expira em 15 minutos.' : mode === 'reset' ? 'Use o código administrativo de emergência.' : mode === 'change' ? 'Troque a senha provisória.' : 'Use sua matrícula ou e-mail.'}</p></div></div>
        {checking ? <div className="notice">Verificando o sistema…</div> : null}
        {mode === 'setup' ? <><label>Nome do responsável<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label><label>Matrícula<input value={form.registration} onChange={(e) => setForm({ ...form, registration: e.target.value.toUpperCase() })} required /></label></> : null}
        {mode === 'login' ? <label>Matrícula ou e-mail<input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} autoComplete="username" required /></label> : null}
        {(mode === 'setup' || mode === 'forgot') ? <label>E-mail cadastrado<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" required /></label> : null}
        {mode === 'reset' ? <label>Matrícula ou e-mail (opcional)<input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} autoComplete="username"/><small>Se existir somente um administrador ativo, você pode deixar este campo vazio.</small></label> : null}
        {(mode === 'login' || mode === 'setup') ? <label>Senha<input type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={mode === 'setup' ? 'new-password' : 'current-password'} required /></label> : null}
        {mode === 'reset' ? <><label>Código de recuperação<input type="password" value={form.recoveryCode} onChange={(e) => setForm({ ...form, recoveryCode: e.target.value })} required /></label><label>Nova senha<input type="password" minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" required /></label></> : null}
        {mode === 'email-reset' ? <label>Nova senha<input type="password" minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" required /></label> : null}
        {mode === 'change' ? <label>Nova senha pessoal<input type="password" minLength={8} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" required /></label> : null}
        {message ? <div className="notice">{message}</div> : null}
        <button className="button primary" disabled={loading || checking}>{loading ? 'Aguarde…' : mode === 'setup' ? 'Criar administrador' : mode === 'forgot' ? 'Enviar link por e-mail' : (mode === 'reset' || mode === 'email-reset') ? 'Atualizar senha' : mode === 'change' ? 'Salvar nova senha' : 'Entrar'}</button>
        {mode === 'login' ? <button className="link-button" type="button" onClick={() => { setMode('forgot'); setMessage(''); }}>Esqueci minha senha</button> : null}
        {mode === 'forgot' ? <button className="link-button" type="button" onClick={() => { setMode('reset'); setMessage(''); }}>Usar código de emergência</button> : null}
        {(mode === 'forgot' || mode === 'reset' || mode === 'email-reset') ? <button className="link-button" type="button" onClick={() => { setMode('login'); setMessage(''); window.history.replaceState({}, '', '/login'); }}>Voltar para o login</button> : null}
      </form>
    </main>
  );
}
