'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type Product = { id: string; name: string; sku: string; category: string | null; quantity: number; minStock: number; unit: string };
type Movement = { id: string; type: 'IN' | 'OUT'; quantity: number; note: string | null; createdAt: string; product: Product; user: { name: string } };
type Role = 'ADMIN' | 'OPERATOR' | 'VIEWER';
type CurrentUser = { id: string; name: string; registration: string; role: Role };
type ManagedUser = CurrentUser & { email: string | null; active: boolean; mustChangePassword: boolean };

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [current, setCurrent] = useState<CurrentUser | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', sku: '', category: '', quantity: 0, minStock: 0, unit: 'un' });
  const [movementForm, setMovementForm] = useState({ productId: '', type: 'IN' as 'IN' | 'OUT', quantity: 1, note: '' });
  const [userForm, setUserForm] = useState({ name: '', registration: '', email: '', role: 'OPERATOR' as Role, password: '' });

  const load = useCallback(async () => {
    try {
      const meResponse = await fetch('/api/auth/me');
      if (meResponse.status === 401) { window.location.href = '/login'; return; }
      const meData = await meResponse.json();
      setCurrent(meData.user);
      const requests = [
        fetch(`/api/products?q=${encodeURIComponent(query)}`),
        fetch('/api/movements'),
      ];
      const [productResponse, movementResponse] = await Promise.all(requests);
      if (productResponse.status === 401 || movementResponse.status === 401) {
        window.location.href = '/login';
        return;
      }
      const [productData, movementData] = await Promise.all([productResponse.json(), movementResponse.json()]);
      if (!productResponse.ok) throw new Error(productData.message);
      if (!movementResponse.ok) throw new Error(movementData.message);
      setProducts(productData.data ?? []);
      setMovements(movementData.data ?? []);
      if (meData.user.role === 'ADMIN') {
        const usersResponse = await fetch('/api/users');
        const usersData = await usersResponse.json();
        if (usersResponse.ok) setUsers(usersData.data ?? []);
      }
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível carregar os dados.' });
    }
  }, [query]);

  useEffect(() => { void load(); }, [load]);

  const totals = useMemo(() => ({
    units: products.reduce((sum, product) => sum + product.quantity, 0),
    low: products.filter((product) => product.quantity <= product.minStock).length,
  }), [products]);

  async function submitProduct(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(productForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setProductForm({ name: '', sku: '', category: '', quantity: 0, minStock: 0, unit: 'un' });
      setFeedback({ kind: 'ok', text: 'Equipamento cadastrado com sucesso.' });
      await load();
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível cadastrar.' });
    } finally { setBusy(false); }
  }

  async function submitMovement(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch('/api/movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(movementForm) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setMovementForm({ ...movementForm, quantity: 1, note: '' });
      setFeedback({ kind: 'ok', text: movementForm.type === 'IN' ? 'Entrada registrada.' : 'Saída registrada.' });
      await load();
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Não foi possível movimentar o estoque.' });
    } finally { setBusy(false); }
  }

  async function submitUser(event: FormEvent) {
    event.preventDefault(); setBusy(true); setFeedback(null);
    try {
      const response = await fetch('/api/users', { method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(userForm) });
      const data = await response.json(); if(!response.ok) throw new Error(data.message);
      setUserForm({name:'',registration:'',email:'',role:'OPERATOR',password:''});
      setFeedback({kind:'ok',text:'Usuário criado. Entregue a matrícula e a senha provisória pessoalmente.'}); await load();
    } catch(error) { setFeedback({kind:'error',text:error instanceof Error?error.message:'Não foi possível criar o usuário.'}); }
    finally { setBusy(false); }
  }

  async function updateUser(id: string, change: { active?: boolean; role?: Role; password?: string }) {
    setBusy(true); setFeedback(null);
    try {
      const response=await fetch(`/api/users/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(change)});
      const data=await response.json(); if(!response.ok) throw new Error(data.message);
      setFeedback({kind:'ok',text:change.password?'Senha provisória atualizada.':'Usuário atualizado.'}); await load();
    } catch(error){setFeedback({kind:'error',text:error instanceof Error?error.message:'Não foi possível atualizar.'});}
    finally{setBusy(false);}
  }

  function resetUserPassword(user: ManagedUser) {
    const password=window.prompt(`Digite uma nova senha provisória para ${user.name} (mínimo 8 caracteres):`);
    if(password) void updateUser(user.id,{password});
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="logo">E</span><div><strong>Estoque</strong><small>Controle de equipamentos</small></div></div>
        <div className="header-actions"><span className="user-chip">{current?.name} · {current?.registration}</span><button className="button ghost" onClick={logout}>Sair</button></div>
      </header>

      <section className="hero"><div><p className="eyebrow">VISÃO GERAL</p><h1>Seu estoque, sem surpresas.</h1><p>Acompanhe saldos e registre cada movimentação.</p></div></section>

      {feedback ? <div className={`feedback ${feedback.kind}`}>{feedback.text}<button onClick={() => setFeedback(null)} aria-label="Fechar">×</button></div> : null}

      <section className="stats">
        <article><span>Equipamentos</span><strong>{products.length}</strong></article>
        <article><span>Unidades disponíveis</span><strong>{totals.units}</strong></article>
        <article className={totals.low ? 'danger' : ''}><span>Estoque baixo</span><strong>{totals.low}</strong></article>
        <article><span>Movimentações</span><strong>{movements.length}</strong></article>
      </section>

      {current?.role !== 'VIEWER' ? <section className="form-grid">
        <form className="panel" onSubmit={submitProduct}>
          <div className="panel-heading"><div><p className="eyebrow">CADASTRO</p><h2>Novo equipamento</h2></div></div>
          <label>Nome<input placeholder="Ex.: Notebook Dell" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required /></label>
          <div className="field-grid"><label>SKU / patrimônio<input placeholder="Ex.: NOTE-001" value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value.toUpperCase() })} required /></label><label>Categoria<input placeholder="Ex.: Informática" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} /></label></div>
          <div className="field-grid three"><label>Quantidade<input type="number" min="0" value={productForm.quantity} onChange={(e) => setProductForm({ ...productForm, quantity: Number(e.target.value) })} /></label><label>Estoque mínimo<input type="number" min="0" value={productForm.minStock} onChange={(e) => setProductForm({ ...productForm, minStock: Number(e.target.value) })} /></label><label>Unidade<input value={productForm.unit} onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })} required /></label></div>
          <button className="button primary" disabled={busy}>Cadastrar equipamento</button>
        </form>

        <form className="panel" onSubmit={submitMovement}>
          <div className="panel-heading"><div><p className="eyebrow">MOVIMENTAÇÃO</p><h2>Entrada ou saída</h2></div></div>
          <label>Equipamento<select value={movementForm.productId} onChange={(e) => setMovementForm({ ...movementForm, productId: e.target.value })} required><option value="">Selecione</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name} — {product.quantity} {product.unit}</option>)}</select></label>
          <div className="field-grid"><label>Tipo<select value={movementForm.type} onChange={(e) => setMovementForm({ ...movementForm, type: e.target.value as 'IN' | 'OUT' })}><option value="IN">Entrada</option><option value="OUT">Saída</option></select></label><label>Quantidade<input type="number" min="1" value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })} required /></label></div>
          <label>Observação<input placeholder="Motivo, destino ou responsável" value={movementForm.note} onChange={(e) => setMovementForm({ ...movementForm, note: e.target.value })} /></label>
          <button className={`button ${movementForm.type === 'OUT' ? 'danger-button' : 'primary'}`} disabled={busy || !products.length}>Registrar {movementForm.type === 'IN' ? 'entrada' : 'saída'}</button>
        </form>
      </section> : <div className="notice">Seu perfil é de consulta. Você pode pesquisar produtos e visualizar o histórico.</div>}

      <section className="panel">
        <div className="panel-heading search-heading"><div><p className="eyebrow">INVENTÁRIO</p><h2>Equipamentos cadastrados</h2></div><input className="search" placeholder="Pesquisar nome, SKU ou categoria" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="table-wrap"><table><thead><tr><th>Equipamento</th><th>SKU</th><th>Categoria</th><th>Saldo</th><th>Mínimo</th><th>Status</th></tr></thead><tbody>{products.length ? products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.sku}</td><td>{product.category || '—'}</td><td>{product.quantity} {product.unit}</td><td>{product.minStock} {product.unit}</td><td><span className={`status ${product.quantity <= product.minStock ? 'low' : 'normal'}`}>{product.quantity <= product.minStock ? 'Estoque baixo' : 'Normal'}</span></td></tr>) : <tr><td colSpan={6} className="empty">Nenhum equipamento encontrado.</td></tr>}</tbody></table></div>
      </section>

      {current?.role === 'ADMIN' ? <section className="panel users-panel">
        <div className="panel-heading"><div><p className="eyebrow">ADMINISTRAÇÃO</p><h2>Usuários e matrículas</h2></div></div>
        <form className="user-form" onSubmit={submitUser}>
          <label>Nome<input value={userForm.name} onChange={e=>setUserForm({...userForm,name:e.target.value})} required /></label>
          <label>Matrícula<input value={userForm.registration} onChange={e=>setUserForm({...userForm,registration:e.target.value.toUpperCase()})} required /></label>
          <label>E-mail (opcional)<input type="email" value={userForm.email} onChange={e=>setUserForm({...userForm,email:e.target.value})} /></label>
          <label>Perfil<select value={userForm.role} onChange={e=>setUserForm({...userForm,role:e.target.value as Role})}><option value="OPERATOR">Operador</option><option value="VIEWER">Consulta</option><option value="ADMIN">Administrador</option></select></label>
          <label>Senha provisória<input type="password" minLength={8} value={userForm.password} onChange={e=>setUserForm({...userForm,password:e.target.value})} required /></label>
          <button className="button primary" disabled={busy}>Criar usuário</button>
        </form>
        <div className="table-wrap"><table><thead><tr><th>Nome</th><th>Matrícula</th><th>Perfil</th><th>Situação</th><th>Ações</th></tr></thead><tbody>{users.map(user=><tr key={user.id}><td><strong>{user.name}</strong><small className="cell-subtitle">{user.email||'Sem e-mail'}</small></td><td>{user.registration}</td><td><select className="compact-select" value={user.role} disabled={busy||user.id===current.id} onChange={e=>void updateUser(user.id,{role:e.target.value as Role})}><option value="ADMIN">Administrador</option><option value="OPERATOR">Operador</option><option value="VIEWER">Consulta</option></select></td><td><span className={`status ${user.active?'normal':'low'}`}>{user.active?(user.mustChangePassword?'Senha provisória':'Ativo'):'Bloqueado'}</span></td><td><div className="row-actions"><button className="button small ghost" onClick={()=>resetUserPassword(user)} disabled={busy}>Nova senha</button><button className={`button small ${user.active?'danger-button':'primary'}`} onClick={()=>void updateUser(user.id,{active:!user.active})} disabled={busy||user.id===current.id}>{user.active?'Bloquear':'Ativar'}</button></div></td></tr>)}</tbody></table></div>
      </section> : null}

      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">AUDITORIA</p><h2>Histórico de movimentações</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Equipamento</th><th>Quantidade</th><th>Responsável</th><th>Observação</th></tr></thead><tbody>{movements.length ? movements.map((movement) => <tr key={movement.id}><td>{new Date(movement.createdAt).toLocaleString('pt-BR')}</td><td><span className={`movement ${movement.type.toLowerCase()}`}>{movement.type === 'IN' ? 'Entrada' : 'Saída'}</span></td><td>{movement.product.name}</td><td>{movement.quantity}</td><td>{movement.user.name}</td><td>{movement.note || '—'}</td></tr>) : <tr><td colSpan={6} className="empty">Nenhuma movimentação registrada.</td></tr>}</tbody></table></div>
      </section>
    </main>
  );
}
