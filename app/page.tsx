const products = [
  {name:'Produto exemplo',sku:'PROD-001',quantity:18,minStock:10,category:'Geral'},
  {name:'Produto crítico',sku:'PROD-002',quantity:3,minStock:5,category:'Geral'}
];

export default function Home(){
 const low=products.filter(p=>p.quantity<=p.minStock);
 return <main className="container">
  <div className="topbar"><div><h1>Sistema de Estoque</h1><p className="muted">Controle de entradas, saídas e movimentações</p></div><div className="actions"><button className="btn">Nova entrada</button><button className="btn secondary">Nova saída</button></div></div>
  {low.length>0&&<div className="alert"><strong>Alerta:</strong> {low.length} produto(s) no estoque mínimo ou abaixo dele.</div>}
  <section className="grid" style={{marginTop:16}}><div className="card"><span className="muted">Produtos</span><h2>{products.length}</h2></div><div className="card"><span className="muted">Unidades em estoque</span><h2>{products.reduce((a,p)=>a+p.quantity,0)}</h2></div><div className="card"><span className="muted">Estoque baixo</span><h2>{low.length}</h2></div><div className="card"><span className="muted">Usuário responsável</span><h2 style={{fontSize:18}}>Administrador</h2></div></section>
  <section className="card" style={{marginTop:16}}><div className="topbar"><h2>Produtos</h2><input placeholder="Pesquisar por nome ou SKU" style={{padding:10,border:'1px solid #ddd',borderRadius:8}}/></div><div style={{overflowX:'auto'}}><table className="table"><thead><tr><th>Produto</th><th>SKU</th><th>Categoria</th><th>Estoque</th><th>Mínimo</th><th>Status</th></tr></thead><tbody>{products.map(p=><tr key={p.sku}><td>{p.name}</td><td>{p.sku}</td><td>{p.category}</td><td>{p.quantity}</td><td>{p.minStock}</td><td className={p.quantity<=p.minStock?'low':''}>{p.quantity<=p.minStock?'Baixo':'Normal'}</td></tr>)}</tbody></table></div></section>
 </main>
}