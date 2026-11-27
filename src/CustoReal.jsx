import React, {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';

const brl = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
const qty = new Intl.NumberFormat('pt-BR');
const number = value => value == null || value === '' ? null : Number(value);
const currency = value => number(value) == null ? '—' : brl.format(number(value));
const count = value => qty.format(Number(value) || 0);
const apiRoot = (import.meta.env.VITE_CUSTO_API_URL || '/api/custo').replace(/\/$/, '');

async function getJSON(path, signal) {
  const response = await fetch(apiRoot + path, {credentials:'include', cache:'no-store', signal});
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('Acesso não autorizado à API de custos.');
    if (response.status === 404) throw new Error('Não há custos importados para a competência selecionada.');
    throw new Error('Não foi possível consultar a API de custos (HTTP ' + response.status + ').');
  }
  return response.json();
}

function Kpi({label, value, note}) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function Table({title, columns, rows, empty}) {
  return <section className="panel">
    <div className="section-head"><div><h2>{title}</h2><p className="muted">{count(rows.length)} registros</p></div></div>
    <div className="table-scroll" tabIndex={0} role="region" aria-label={title}>
      <table><thead><tr>{columns.map(c => <th scope="col" key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>{rows.map((row,i) => <tr key={row.id || i}>{columns.map(c =>
          <td key={c.key}>{c.render ? c.render(row) : row[c.key] == null ? '—' : row[c.key]}</td>)}</tr>)}</tbody>
      </table>
    </div>
    {!rows.length && <p className="muted">{empty || 'Nenhum registro no recorte.'}</p>}
  </section>;
}

function App() {
  const [competencias,setCompetencias] = useState([]);
  const [competencia,setCompetencia] = useState('');
  const [dados,setDados] = useState(null);
  const [sc,setSC] = useState('');
  const [busca,setBusca] = useState('');
  const [view,setView] = useState('custos');
  const [loading,setLoading] = useState(true);
  const [erro,setErro] = useState('');
  useEffect(() => {
    const ctl = new AbortController();
    (async () => {
      try {
        const res = await getJSON('/competencias', ctl.signal);
        const meses = Array.isArray(res.competencias) ? res.competencias : [];
        setCompetencias(meses); setCompetencia(meses[0] || '');
        if (!meses.length) { setErro('Nenhuma competência foi importada no banco de custos.'); setLoading(false); }
      } catch(e) { if(!ctl.signal.aborted) {setErro(e.message);setLoading(false);} }
    })();
    return () => ctl.abort();
  }, []);
  useEffect(() => {
    if(!competencia) return;
    const ctl = new AbortController();
    setLoading(true); setDados(null); setErro(''); setSC(''); setBusca('');
    getJSON('/indicadores?competencia=' + encodeURIComponent(competencia),ctl.signal)
      .then(res => {if(!ctl.signal.aborted) setDados(res);})
      .catch(e => {if(!ctl.signal.aborted) setErro(e.message);})
      .finally(() => {if(!ctl.signal.aborted) setLoading(false);});
    return () => ctl.abort();
  }, [competencia]);

  const gestores = dados?.gestores || [];
  const bases = dados?.bases || [];
  const nomesSC = gestores.map(g => g.sc).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  const filteredSC = sc ? gestores.filter(g=>g.sc===sc) : gestores;
  const filteredBases = useMemo(() => bases.filter(b => (!sc || b.sc_na_competencia === sc) &&
    (!busca || b.base.toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR')))),
    [bases,sc,busca]);
  const summary = sc ? gestores.find(g=>g.sc===sc) : dados?.total;
  const custo = sc ? summary?.custo_total : summary?.custo_total;
  const pacotes = sc ? summary?.pacotes : summary?.pacotes;
  const ticket = sc && Number(pacotes) > 0 ? Number(custo)/Number(pacotes) : summary?.ticket;
  const scRank = [...filteredSC].sort((a,b)=> Number(b.custo_total)-Number(a.custo_total));
  const baseRank = [...filteredBases].filter(b=>b.custo_parcial_estimado != null)
    .sort((a,b)=>Number(b.custo_parcial_estimado)-Number(a.custo_parcial_estimado));
  const missing = filteredBases.filter(b=>b.ticket_parcial == null).length;
  const components = [
    ['Colaboradores','colaboradores'],['Diaristas','diaristas'],
    ['Secundária','secundaria'],['Mini transferência','mini_transferencia'],
    ['Last Mile','last_mile'],['ADM e compras','adm_compras']
  ];
  const breakdown = components.map(([label,key])=>({label, value: filteredSC.reduce((sum,g)=>sum+(Number(g[key])||0),0)}))
    .sort((a,b)=>b.value-a.value);

  return <>
    <header className="masthead"><div className="shell masthead-inner">
      <div className="brand">J&amp;T <span>EXPRESS</span></div>
      <span className="masthead-label">Central de Indicadores</span></div></header>
    <main className="shell">
      <header className="hero"><div><span className="eyebrow">RM ORLEAN</span>
        <h1>Custo operacional</h1><p>Custo contábil por S/C e estimativa tarifária por base, sem misturar as fontes.</p></div>
        <div className="period"><span>Competência</span><strong>{competencia || 'Sem dados'}</strong>
          <small>Origem: JT API / PostgreSQL</small></div>
      </header>
      <section className="panel filter-panel" style={{marginTop:16}}>
        <div><h2>Filtros operacionais</h2><p className="muted">Gestão histórica da competência, sem rateios inventados.</p></div>
        <div className="filter-actions">
          <label>Competência<select value={competencia} onChange={e=>setCompetencia(e.target.value)} disabled={!competencias.length}>
            {competencias.map(m=><option value={m} key={m}>{m}</option>)}</select></label>
          <label>Supervisor / Coordenador (S/C)<select value={sc} onChange={e=>setSC(e.target.value)} disabled={!dados}>
            <option value="">Todos os S/C</option>{nomesSC.map(name=><option key={name} value={name}>{name}</option>)}
          </select></label>
        </div>
      </section>
      {loading && <section className="panel" style={{marginTop:15}}><p>Consultando o banco de custos...</p></section>}
      {erro && <section className="panel" style={{marginTop:15}} role="alert">
        <h2>Dados de custos não disponíveis</h2><p className="muted" style={{marginTop:7}}>{erro}</p>
        <p className="muted" style={{marginTop:7}}>O painel não substitui dados indisponíveis por valores fictícios.</p></section>}
      {!loading && dados && <>
        <div className="kpis" style={{marginTop:15}}>
          <Kpi label="Custo total informado" value={currency(custo)} note="Fechamento por S/C · fonte contábil" />
          <Kpi label="Ticket por pacote (contábil)" value={currency(ticket)} note="Custo total / volume do mesmo recorte" />
          <Kpi label="Volume de pacotes" value={count(pacotes)} note="Volume registrado na visão por S/C" />
          <Kpi label="Bases na competência" value={count(filteredBases.length)} note={count(missing)+' sem ticket parcial calculável'} />
        </div>
        <div className="panel" style={{marginTop:15,borderLeft:'4px solid #b91c1c'}}>
          <strong>Importante: duas fontes distintas.</strong>
          <p className="muted" style={{marginTop:6}}>Os custos totais por gestor são valores informados na fonte contábil. O valor por base é apenas a estimativa das rubricas Secundária, Mini Transferência e Last Mile. Não some os valores das duas fontes. Despesas atribuídas diretamente à regional não são redistribuídas às bases.</p>
        </div>
        <div className="tabs">
          <button aria-pressed={view==='custos'} onClick={()=>setView('custos')}>Ranking por S/C</button>
          <button aria-pressed={view==='bases'} onClick={()=>setView('bases')}>Custos parciais por base</button>
          <button aria-pressed={view==='composicao'} onClick={()=>setView('composicao')}>Composição contábil</button>
        </div>
        {view==='custos' && <Table title="Maiores custos totais por S/C" rows={scRank.map(r=>({...r,id:r.sc}))}
          columns={[
            {key:'sc',label:'Gestor S/C'}, {key:'pacotes',label:'Pacotes',render:r=>count(r.pacotes)},
            {key:'custo_total',label:'Custo total',render:r=>currency(r.custo_total)},
            {key:'ticket',label:'R$/pacote',render:r=>Number(r.pacotes)>0?currency(Number(r.custo_total)/Number(r.pacotes)):'—'},
            {key:'tipo_lancamento',label:'Tipo',render:r=>r.tipo_lancamento==='regional'?'Lançamento regional':'Gestor'}
          ]}/>}
        {view==='bases' && <div className="dashboard">
          <section className="panel">
            <div className="section-head"><div><h2>Pesquisar base</h2><p className="muted">R$/pacote aqui é parcial, não contábil.</p></div>
              <label>Base<input style={{padding:10,border:'1px solid #cdd5e1',borderRadius:8}} type="search" value={busca}
                onChange={e=>setBusca(e.target.value)} placeholder="Código da base" /></label></div>
          </section>
          <Table title="Ranking de custo parcial estimado" rows={baseRank.map(r=>({...r,id:r.base}))}
            columns={[
              {key:'base',label:'Base'}, {key:'sc_na_competencia',label:'S/C'},
              {key:'pacotes',label:'Pacotes',render:r=>count(r.pacotes)},
              {key:'ticket_parcial',label:'R$/pacote parcial',render:r=>currency(r.ticket_parcial)},
              {key:'custo_parcial_estimado',label:'Custo parcial',render:r=>currency(r.custo_parcial_estimado)},
              {key:'observacoes',label:'Observação'}
            ]}/>
          {missing>0 && <p className="muted">{count(missing)} bases neste filtro estão sem ticket parcial calculável e não foram transformadas em custo zero.</p>}
        </div>}
        {view==='composicao' && <section className="panel">
          <div className="section-head"><h2>Composição do custo informado</h2><span className="muted">Somente visão contábil dos S/C selecionados</span></div>
          <div className="table-scroll" role="region" tabIndex={0}><table>
            <thead><tr><th>Rubrica</th><th>Valor</th><th>% do custo</th></tr></thead>
            <tbody>{breakdown.map(x=><tr key={x.label}>
              <td>{x.label}</td><td>{currency(x.value)}</td>
              <td>{Number(custo)>0?(x.value/Number(custo)*100).toLocaleString('pt-BR',{maximumFractionDigits:1})+'%':'—'}</td>
            </tr>)}</tbody>
          </table></div>
          <p className="muted">Ressarcimentos não entram neste indicador. A categoria não detalhada na origem não é separada artificialmente.</p>
        </section>}
      </>}
      <footer>Feito por Erison Neto – Analista de Dados Pleno</footer>
    </main>
  </>;
}
createRoot(document.getElementById('root')).render(<App/>);
