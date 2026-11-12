import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {bases, demonstracao, tarifas} from './dados.js';
import {count, expenses, groupManagers, money, percent, rank, summarize, toBase} from './model.js';
import './style.css';

const records = bases.map(toBase);
const groups = groupManagers(records);
const managerNames = groups.map(group => group.manager).sort((a, b) => a.localeCompare(b, 'pt-BR'));
const tariffBases = [...new Set(tarifas.map(row => row[0]))].sort();
const weightBands = [...new Set(tarifas.map(row => row[1]))];
const metrics = {cost: 'Custo total', fixed: 'Fixo identificado', rate: 'R$/pacote'};
const pageSize = 10;

function Kpi({label, value, note}) {
  return <article className="kpi"><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function RankCard({title, rows, label, metric, onPick, active}) {
  const top = rank(rows, metric, label).filter(row => row[metric] != null).slice(0, 5);
  const max = Math.max(0, top[0]?.[metric] ?? 0);
  return <section className="panel rank-card">
    <h3>{title}</h3>
    {top.length ? <ol>{top.map((row, index) => <li key={row[label]}>
      <button type="button" className="rank-button" aria-pressed={active === row[label]} onClick={() => onPick(row[label])}>
        <span className="position">{String(index + 1).padStart(2, '0')}</span>
        <span className="rank-name">{row[label]}</span><strong>{money(row[metric])}</strong>
        <span className="track" aria-hidden="true"><span style={{width: max ? Math.max(0, row[metric] / max * 100) + '%' : '0%'}} /></span>
      </button>
    </li>)}</ol> : <p className="muted">Sem valores para este recorte.</p>}
  </section>;
}

function Composition({rows}) {
  const items = expenses.map(([label, key, color]) => ({
    label, color, value: rows.reduce((total, row) => total + (row[key] ?? 0), 0),
  })).filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <section className="panel composition">
    <div className="section-head"><h2>Composição do custo</h2><span className="muted">Despesas detalhadas</span></div>
    {total ? <>
      <div className="segments" aria-hidden="true">{items.map(item =>
        <span key={item.label} style={{flexGrow: item.value / total, background: item.color}} />)}</div>
      <ul className="legend">{items.map(item => <li key={item.label}>
        <span className="dot" style={{background: item.color}} aria-hidden="true" />
        <span>{item.label}</span><strong>{money(item.value)}</strong><small>{percent(item.value / total)}</small>
      </li>)}</ul>
    </> : <p className="muted">Sem despesas detalhadas para este recorte.</p>}
  </section>;
}

function BaseDetail({base, onClose}) {
  return <section className="panel detail" id="base-detail" aria-labelledby="base-title">
    <div className="section-head"><div><h2 id="base-title">{base.code}</h2><p className="muted">{base.manager}</p></div>
      <button className="button" onClick={onClose}>Fechar detalhes</button></div>
    <dl className="detail-kpis">
      {[[ 'Custo total', money(base.cost)], ['Fixo identificado', money(base.fixed)], ['R$/pacote', money(base.rate)], ['Pacotes', count(base.volume)]].map(([label, value]) =>
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
    </dl>
    <dl className="expense-list">{expenses.map(([label, key]) =>
      <div key={key}><dt>{label}</dt><dd>{money(base[key])}</dd></div>)}</dl>
    <p className="muted">O fixo identificado reúne funcionários e aluguel. Internet, energia e água aparecem sem valores individualizados na fonte.</p>
  </section>;
}

function Pager({page, total, all, onPage}) {
  if (all) return <p className="muted page-status">{count(total)} registros</p>;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return <div className="pager"><button className="button" disabled={page === 0} onClick={() => onPage(page - 1)}>Anterior</button>
    <span className="muted">Página {page + 1} de {pages} · {count(total)} registros</span>
    <button className="button" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)}>Próxima</button></div>;
}

function BaseList({rows, selected, onPick, metric, onSort}) {
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(0);
  const sorted = rank(rows, metric, 'code');
  const currentPage = Math.min(page, Math.max(0, Math.ceil(rows.length / pageSize) - 1));
  const visible = all ? sorted : sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
  return <section className="panel" id="base-list">
    <div className="section-head"><div><h2>Lista de bases</h2><p className="muted">Selecione uma base para abrir as despesas.</p></div>
      <button className="button" aria-pressed={all} onClick={() => {setAll(!all); setPage(0);}}>{all ? 'Paginar bases' : 'Ver todas as bases'}</button></div>
    <div className="table-scroll" role="region" aria-label="Custos por base" tabIndex={0}>
      <table><thead><tr><th scope="col">Base</th><th scope="col">Gestor (S/C)</th><th scope="col">Pacotes</th>
        {Object.entries(metrics).map(([key, label]) => <th scope="col" key={key} aria-sort={metric === key ? 'descending' : 'none'}>
          <button className="table-link" onClick={() => {onSort(key); setPage(0);}}>{label}{metric === key ? ' ↓' : ''}</button>
        </th>)}</tr></thead>
        <tbody>{visible.map(row => <tr key={row.code} className={selected === row.code ? 'selected-row' : ''}>
          <td><button className="table-link base-link" aria-pressed={selected === row.code} onClick={() => onPick(row.code)}>{row.code}</button></td>
          <td>{row.manager}</td><td>{count(row.volume)}</td><td>{money(row.cost)}</td><td>{money(row.fixed)}</td><td>{money(row.rate)}</td>
        </tr>)}</tbody></table>
    </div>
    <Pager page={currentPage} total={rows.length} all={all} onPage={setPage} />
  </section>;
}

function ManagerList({metric, manager, onPick}) {
  return <section className="panel">
    <div className="section-head"><h2>Lista de gestores</h2><span className="muted">Regional Orlean</span></div>
    <div className="table-scroll" role="region" aria-label="Custos por gestor" tabIndex={0}>
      <table><thead><tr><th scope="col">Gestor (S/C)</th><th scope="col">Bases</th><th scope="col">Pacotes</th>
        {Object.entries(metrics).map(([key, label]) => <th scope="col" key={key} aria-sort={metric === key ? 'descending' : 'none'}>{label}</th>)}</tr></thead>
        <tbody>{rank(groups, metric, 'manager').map(row => <tr key={row.manager} className={manager === row.manager ? 'selected-row' : ''}>
          <td><button className="table-link base-link" aria-pressed={manager === row.manager} onClick={() => onPick(row.manager)}>{row.manager}</button></td>
          <td>{count(row.size)}</td><td>{count(row.volume)}</td><td>{money(row.cost)}</td><td>{money(row.fixed)}</td><td>{money(row.rate)}</td>
        </tr>)}</tbody></table>
    </div>
  </section>;
}

function TariffHistory() {
  const [base, setBase] = useState('');
  const [weight, setWeight] = useState('');
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(0);
  const filtered = tarifas.filter(row => (!base || row[0] === base) && (!weight || row[1] === weight));
  const stable = filtered.filter(row => row[2] != null && row.slice(3).every(value => value === row[2])).length;
  const visible = all ? filtered : filtered.slice(page * pageSize, (page + 1) * pageSize);
  return <section className="panel">
    <div className="section-head"><div><h2>Histórico de tarifas</h2><p className="muted">Julho a outubro · valores por base e faixa de peso</p></div></div>
    <div className="filters">
      <label>Base<select value={base} onChange={event => {setBase(event.target.value); setPage(0);}}>
        <option value="">Todas as bases</option>{tariffBases.map(code => <option key={code}>{code}</option>)}
      </select></label>
      <label>Faixa de peso<select value={weight} onChange={event => {setWeight(event.target.value); setPage(0);}}>
        <option value="">Todas as faixas</option>{weightBands.map(band => <option key={band}>{band}</option>)}
      </select></label>
    </div>
    <div className="section-head tariff-head"><p className="muted">{count(stable)} de {count(filtered.length)} tarifas sem alteração no período</p>
      <button className="button" aria-pressed={all} onClick={() => {setAll(!all); setPage(0);}}>{all ? 'Paginar tarifas' : 'Ver todas as tarifas'}</button></div>
    <div className="table-scroll" role="region" aria-label="Tarifas por mês" tabIndex={0}>
      <table><thead><tr>{['Base','Faixa de peso','Julho','Agosto','Setembro','Outubro','Variação'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{visible.map(([code, band, july, august, september, october]) => <tr key={code + band}>
          <td>{code}</td><td>{band}</td>{[july, august, september, october].map((value, index) => <td key={index}>{money(value)}</td>)}
          <td>{july > 0 && october != null ? percent((october - july) / july) : '—'}</td>
        </tr>)}</tbody></table>
    </div>
    {filtered.length ? <Pager page={page} total={filtered.length} all={all} onPage={setPage} /> : <p className="muted page-status">Nenhuma tarifa para estes filtros.</p>}
  </section>;
}

function scrollToSection(id) {
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({block: 'start'}));
}

function App() {
  const [view, setView] = useState('costs');
  const [manager, setManager] = useState('');
  const [baseCode, setBaseCode] = useState('');
  const [metric, setMetric] = useState('cost');
  const [complete, setComplete] = useState(false);
  const scoped = manager ? records.filter(row => row.manager === manager) : records;
  const summary = summarize(scoped);
  const selected = scoped.find(row => row.code === baseCode);
  function pickBase(code) {
    setBaseCode(code);
    scrollToSection('base-detail');
  }
  function pickManager(name) {
    setManager(name);
    setBaseCode('');
    scrollToSection('base-list');
  }
  return <>
    <header className="masthead"><div className="shell masthead-inner">
      <div className="brand">J&amp;T <span>EXPRESS</span></div><span className="masthead-label">Central de Indicadores</span>
    </div></header>
    <main className="shell">
      <header className="hero">
        <div><span className="eyebrow">R/M ORLEAN</span><h1>Custo operacional</h1><p>Despesas e custo por pacote das bases e dos gestores.</p></div>
        <div className="period"><span>Fechamento operacional</span><strong>{demonstracao ? 'Demonstração' : 'Setembro de 2026'}</strong><small>{demonstracao ? 'Dados fictícios' : 'Competência provável'}</small></div>
      </header>
      <nav className="tabs" aria-label="Visões do painel">
        <button aria-pressed={view === 'costs'} onClick={() => setView('costs')}>Custos operacionais</button>
        <button aria-pressed={view === 'tariffs'} onClick={() => setView('tariffs')}>Histórico de tarifas</button>
      </nav>
      <div hidden={view !== 'costs'} className="dashboard">
        <section className="panel filter-panel">
          <div><h2>Filtros operacionais</h2><p className="muted">{count(scoped.length)} bases no recorte</p></div>
          <div className="filter-actions"><label>Gestor (S/C)<select value={manager} onChange={event => {setManager(event.target.value); setBaseCode('');}}>
            <option value="">Todos os gestores</option>{managerNames.map(name => <option key={name}>{name}</option>)}
          </select></label>
          <button className="button" onClick={() => {setManager(''); setBaseCode(''); setMetric('cost');}}>Limpar filtros</button></div>
        </section>
        <div className="kpis" aria-live="polite">
          <Kpi label="Custo total" value={money(summary.cost)} note="Total registrado" />
          <Kpi label="Fixo identificado" value={money(summary.fixed)} note="Funcionários e aluguel" />
          <Kpi label="Custo por pacote" value={money(summary.rate)} note="Volume de bases com custo informado" />
          <Kpi label="Volume informado" value={count(summary.volume)} note="Pacotes no recorte" />
        </div>
        <section className="rank-section">
          <div className="section-head"><h2>Maiores custos</h2><label className="metric-control">Classificar por<select value={metric} onChange={event => setMetric(event.target.value)}>
            {Object.entries(metrics).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select></label></div>
          <div className="rank-grid">
            <RankCard title="Top 5 bases" rows={scoped} label="code" metric={metric} onPick={pickBase} active={baseCode} />
            <RankCard title="Top 5 gestores da regional" rows={groups.filter(row => row.manager !== 'Sem S/C cadastrado')} label="manager" metric={metric} onPick={pickManager} active={manager} />
          </div>
        </section>
        {selected && <BaseDetail base={selected} onClose={() => setBaseCode('')} />}
        <BaseList key={manager} rows={scoped} metric={metric} onSort={setMetric} selected={baseCode} onPick={pickBase} />
        <button className="button primary analysis-button" aria-expanded={complete} aria-controls="full-analysis" onClick={() => setComplete(!complete)}>
          {complete ? 'Recolher análise completa' : 'Ver análise completa'}
        </button>
        <div id="full-analysis" className="dashboard" hidden={!complete}><ManagerList metric={metric} manager={manager} onPick={pickManager} /><Composition rows={scoped} /></div>
      </div>
      <div hidden={view !== 'tariffs'}><TariffHistory /></div>
      <footer>Feito por Erison Neto – Analista de Dados Pleno</footer>
    </main>
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
