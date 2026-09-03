'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type Product = { id: string; name: string; sku: string; category: string | null; quantity: number; minStock: number; unit: string };
type Movement = { id: string; type: 'IN' | 'OUT'; quantity: number; note: string | null; createdAt: string; product: Product; user: { name: string } };

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', sku: '', category: '', quantity: 0, minStock: 0, unit: 'un' });
  const [movementForm, setMovementForm] = useState({ productId: '', type: 'IN' as 'IN' | 'OUT', quantity: 1, note: '' });

  const load = useCallback(async () => {
    try {
      const [productResponse, movementResponse] = await Promise.all([
        fetch(`/api/products?q=${encodeURIComponent(query)}`),
        fetch('/api/movements'),
      ]);
      if (productResponse.status === 401 || movementResponse.status === 401) {
        window.location.href = '/login';
        return;
      }
      const [productData, movementData] = await Promise.all([productResponse.json(), movementResponse.json()]);
      if (!productResponse.ok) throw new Error(productData.message);
      if (!movementResponse.ok) throw new Error(movementData.message);
      setProducts(productData.data ?? []);
      setMovements(movementData.data ?? []);
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

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand"><span className="logo">E</span><div><strong>Estoque</strong><small>Controle de equipamentos</small></div></div>
        <button className="button ghost" onClick={logout}>Sair</button>
      </header>

      <section className="hero"><div><p className="eyebrow">VISÃO GERAL</p><h1>Seu estoque, sem surpresas.</h1><p>Acompanhe saldos e registre cada movimentação.</p></div></section>

      {feedback ? <div className={`feedback ${feedback.kind}`}>{feedback.text}<button onClick={() => setFeedback(null)} aria-label="Fechar">×</button></div> : null}

      <section className="stats">
        <article><span>Equipamentos</span><strong>{products.length}</strong></article>
        <article><span>Unidades disponíveis</span><strong>{totals.units}</strong></article>
        <article className={totals.low ? 'danger' : ''}><span>Estoque baixo</span><strong>{totals.low}</strong></article>
        <article><span>Movimentações</span><strong>{movements.length}</strong></article>
      </section>

      <section className="form-grid">
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
      </section>

      <section className="panel">
        <div className="panel-heading search-heading"><div><p className="eyebrow">INVENTÁRIO</p><h2>Equipamentos cadastrados</h2></div><input className="search" placeholder="Pesquisar nome, SKU ou categoria" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        <div className="table-wrap"><table><thead><tr><th>Equipamento</th><th>SKU</th><th>Categoria</th><th>Saldo</th><th>Mínimo</th><th>Status</th></tr></thead><tbody>{products.length ? products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong></td><td>{product.sku}</td><td>{product.category || '—'}</td><td>{product.quantity} {product.unit}</td><td>{product.minStock} {product.unit}</td><td><span className={`status ${product.quantity <= product.minStock ? 'low' : 'normal'}`}>{product.quantity <= product.minStock ? 'Estoque baixo' : 'Normal'}</span></td></tr>) : <tr><td colSpan={6} className="empty">Nenhum equipamento encontrado.</td></tr>}</tbody></table></div>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">AUDITORIA</p><h2>Histórico de movimentações</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Data</th><th>Tipo</th><th>Equipamento</th><th>Quantidade</th><th>Responsável</th><th>Observação</th></tr></thead><tbody>{movements.length ? movements.map((movement) => <tr key={movement.id}><td>{new Date(movement.createdAt).toLocaleString('pt-BR')}</td><td><span className={`movement ${movement.type.toLowerCase()}`}>{movement.type === 'IN' ? 'Entrada' : 'Saída'}</span></td><td>{movement.product.name}</td><td>{movement.quantity}</td><td>{movement.user.name}</td><td>{movement.note || '—'}</td></tr>) : <tr><td colSpan={6} className="empty">Nenhuma movimentação registrada.</td></tr>}</tbody></table></div>
      </section>
    </main>
  );
}
