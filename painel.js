(() => {
  const data = bases;
  const tariffs = tarifas;
  const root = document.getElementById('jt-orlean-cost');
  const byId = id => root.querySelector('#jt-' + id);
  const money = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
  const number = new Intl.NumberFormat('pt-BR');
  const fixed = row => row[4] == null && row[5] == null ? null : (row[4] ?? 0) + (row[5] ?? 0);
  const brl = cents => cents == null ? '—' : money.format(cents / 100);
  const manager = byId('manager');
  const search = byId('base-search');
  const metric = byId('rank-metric');
  const detail = byId('base-detail');
  const orderButtons = Array.from(root.querySelectorAll('[data-order]'));
  const managers = [...new Set(data.map(row => row[1]))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  managers.forEach(name => manager.add(new Option(name, name)));
  let page = 0;
  let allBases = false;
  const analysis = byId('analysis');
  const analysisToggle = byId('analysis-toggle');
  function setAnalysis(open) {
    analysis.hidden = !open;
    analysisToggle.setAttribute('aria-expanded', String(open));
    analysisToggle.textContent = open ? 'Recolher análise completa' : 'Ver análise completa';
  }
  analysisToggle.addEventListener('click', () => setAnalysis(analysis.hidden));
  let order = 3;
  let direction = -1;
  const pageSize = 10;
  function totals(rows) {
    return rows.reduce((sum, row) => {
      sum.volume += row[2];
      if (row[3] != null) {
        sum.cost = (sum.cost ?? 0) + row[3];
        sum.coveredVolume += row[2];
      }
      const knownFixed = fixed(row);
      if (knownFixed != null) sum.fixed = (sum.fixed ?? 0) + knownFixed;
      return sum;
    }, {volume:0, coveredVolume:0, cost:null, fixed:null});
  }
  function addRow(body, values) {
    const tr = body.insertRow();
    values.forEach((value,index) => {
      const td = tr.insertCell();
      if (index > 0) td.className = 'text-end text-nowrap tabular-nums';
      if (value instanceof Node) td.append(value);
      else td.textContent = value;
    });
  }
  function stat(label, value, context) {
    const card = document.createElement('div');
    card.className = 'card viz-stat';
    const caption = document.createElement('span');
    caption.className = 'text-muted';
    caption.textContent = label;
    const amount = document.createElement('div');
    amount.className = 'viz-stat-value tabular-nums';
    amount.textContent = value;
    const note = document.createElement('small');
    note.textContent = context;
    card.append(caption, amount, note);
    return card;
  }
  function openDetail(row) {
    detail.hidden = false;
    const title = document.createElement('h3');
    title.textContent = row[0] + ' · ' + row[1];
    const summary = document.createElement('p');
    summary.textContent = (row[3] == null ? 'Custo não informado' : brl(row[3])) + ' · custo total · ' + number.format(row[2]) + ' pacotes · ' + brl(perBase(row)) + ' por pacote';
    const grid = document.createElement('dl');
    grid.className = 'viz-row';
    const fields = expenseFields;
    fields.forEach(([label,index]) => {
      const field = document.createElement('div');
      const caption = document.createElement('dt');
      const amount = document.createElement('dd');
      caption.textContent = label;
      amount.textContent = brl(row[index]);
      amount.className = 'metric tabular-nums';
      field.append(caption, amount);
      grid.append(field);
    });
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'btn';
    close.textContent = 'Fechar detalhes';
    close.addEventListener('click', () => { detail.hidden = true; });
    const head = document.createElement('div');
    head.className = 'viz-row list-controls';
    head.append(title, close);
    detail.replaceChildren(head, summary, grid);
  }
  const perBase = row => row[2] > 0 && row[3] != null ? row[3] / row[2] : null;
  const perGroup = total => total.coveredVolume > 0 ? total.cost / total.coveredVolume : null;
  const normalized = value => value.toUpperCase().replace(/\s/g, '');
  function ranking(list, entries) {
    list.replaceChildren();
    const ranked = entries.filter(entry => entry.value != null)
      .sort((a,b) => b.value - a.value || a.label.localeCompare(b.label, 'pt-BR')).slice(0,5);
    if (!ranked.length) {
      const empty = document.createElement('li');
      empty.textContent = 'Sem dados para este recorte';
      list.append(empty);
      return;
    }
    const maximum = ranked[0].value;
    ranked.forEach(entry => {
      const item = document.createElement('li');
      const line = document.createElement('div');
      line.className = 'rank-line';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-ghost';
      button.textContent = entry.label;
      button.addEventListener('click', entry.select);
      const amount = document.createElement('span');
      amount.className = 'amount tabular-nums';
      amount.textContent = brl(entry.value);
      line.append(button, amount);
      const track = document.createElement('div');
      track.className = 'progress';
      track.setAttribute('aria-hidden', 'true');
      const bar = document.createElement('div');
      bar.className = 'progress-bar';
      bar.style.width = (maximum > 0 ? Math.max(0, entry.value / maximum * 100) : 0) + '%';
      track.append(bar);
      item.append(line, track);
      list.append(item);
    });
  }
  const expenseFields = [
    ['Last Mile', 9], ['Transporte secundário', 7], ['Funcionários', 5],
    ['Mini transferência', 8], ['Aluguel', 4], ['ADM sem detalhamento', 10], ['Diaristas', 6]
  ];
  function renderComposition(rows) {
    const chart = byId('composition');
    chart.replaceChildren();
    const expenses = expenseFields.map(([label, index]) => ({
      label,
      amount: rows.reduce((total, row) => total + (row[index] ?? 0), 0)
    })).filter(item => item.amount > 0).sort((a, b) => b.amount - a.amount);
    if (!expenses.length) {
      chart.textContent = 'Sem despesas detalhadas para este recorte.';
      return;
    }
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const percentage = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 });
    const colors = ['#d71920', '#ee5960', '#a92041', '#355887', '#597aa5', '#7e93ad', '#a4b3c7'];
    const track = document.createElement('div');
    track.className = 'composition-track';
    track.setAttribute('aria-hidden', 'true');
    const legend = document.createElement('ul');
    legend.className = 'composition-legend';
    expenses.forEach(({ label, amount }, index) => {
      const share = amount / total;
      const segment = document.createElement('span');
      segment.style.flexGrow = share;
      segment.style.backgroundColor = colors[index];
      track.append(segment);
      const item = document.createElement('li');
      const key = document.createElement('span');
      key.className = 'legend-key';
      key.style.backgroundColor = colors[index];
      key.setAttribute('aria-hidden', 'true');
      const name = document.createElement('span');
      name.textContent = label;
      const value = document.createElement('strong');
      value.textContent = brl(amount) + ' · ' + percentage.format(share);
      item.append(key, name, value);
      legend.append(item);
    });
    chart.append(track, legend);
  }

  function render() {
    const term = normalized(search.value);
    const matching = data.filter(row => normalized(row[0]).includes(term));
    const scoped = matching.filter(row => !manager.value || row[1] === manager.value);
    const sum = totals(scoped);
    byId('summary').replaceChildren(
      stat('Custo total registrado', brl(sum.cost), number.format(scoped.length) + ' bases no recorte'),
      stat('Fixo identificado', brl(sum.fixed), 'Funcionários e aluguel'),
      stat('Custo por pacote', brl(perGroup(sum)), 'Volume de bases com custo informado'),
      stat('Volume informado', number.format(sum.volume), 'Pacotes no recorte')
    );
    renderComposition(scoped);
    const sortValue = row => order === 10 ? perBase(row) : order === 4 ? fixed(row) : row[order];
    scoped.sort((a,b) => {
      const x = sortValue(a), y = sortValue(b);
      if (x == null || y == null) return Number(x == null) - Number(y == null);
      return (x - y) * direction || a[0].localeCompare(b[0], 'pt-BR');
    });
    orderButtons.forEach(th => th.setAttribute('aria-sort', Number(th.dataset.order) === order ? (direction < 0 ? 'descending' : 'ascending') : 'none'));
    const baseRows = byId('base-rows');
    baseRows.replaceChildren();
    const visible = allBases ? scoped : scoped.slice(page * pageSize, (page + 1) * pageSize);
    visible.forEach(row => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-ghost';
      button.textContent = row[0];
      button.addEventListener('click', () => {
        openDetail(row);
        detail.scrollIntoView({block:'nearest'});
      });
      addRow(baseRows, [button, number.format(row[2]), brl(row[3]), brl(fixed(row)), brl(perBase(row))]);
    });
    byId('page').textContent = scoped.length ? (page * pageSize + 1) + '–' + Math.min((page + 1) * pageSize, scoped.length) + ' de ' + scoped.length + ' bases' : 'Nenhuma base encontrada';
    if (allBases && scoped.length) byId('page').textContent = scoped.length + ' bases no filtro';
    byId('prev').hidden = allBases;
    byId('next').hidden = allBases;
    byId('prev').disabled = page === 0;
    byId('next').disabled = (page + 1) * pageSize >= scoped.length;
    const groupTotals = rows => managers.filter(name => name !== 'Sem S/C cadastrado').map(name => {
      const group = rows.filter(row => row[1] === name);
      return {name, rows:group, sum:totals(group)};
    }).filter(group => group.rows.length);
    const baseValue = {cost:row => row[3], fixed, rate:perBase}[metric.value || 'cost'];
    const groupValue = {cost:total => total.cost, fixed:total => total.fixed, rate:perGroup}[metric.value || 'cost'];
    ranking(byId('rank-bases'), scoped.map(row => ({
      label:row[0], value:baseValue(row), select:() => {
        openDetail(row);
        detail.scrollIntoView({block:'nearest'});
      }
    })));
    ranking(byId('rank-managers'), groupTotals(data).map(group => ({
      label:group.name, value:groupValue(group.sum), select:() => {
        manager.value = group.name;
        search.value = '';
        setAnalysis(true);
        changePage(0);
      }
    })));
    const managerRows = byId('manager-rows');
    managerRows.replaceChildren();
    managers.map(name => {
      const rows = matching.filter(row => row[1] === name);
      return {name, rows, sum:totals(rows)};
    }).filter(group => group.rows.length).sort((a,b) => (b.sum.cost ?? -1) - (a.sum.cost ?? -1)).forEach(group => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-ghost';
      button.textContent = group.name;
      button.addEventListener('click', () => {
        manager.value = group.name;
        changePage(0);
        byId('base-rows').closest('table').scrollIntoView({block:'nearest'});
      });
      addRow(managerRows, [button, number.format(group.rows.length), brl(group.sum.cost), brl(group.sum.fixed), brl(perGroup(group.sum))]);
    });
  }
  function changePage(value) {
    page = value;
    detail.hidden = true;
    render();
  }
  const basesAll = byId('bases-all');
  basesAll.addEventListener('click', () => {
    allBases = !allBases;
    basesAll.setAttribute('aria-pressed', String(allBases));
    basesAll.textContent = allBases ? 'Paginar bases' : 'Ver todas as bases';
    changePage(0);
  });
  byId('reset').addEventListener('click', () => {
    manager.value = '';
    search.value = '';
    metric.value = 'cost';
    order = 3;
    direction = -1;
    changePage(0);
  });
  metric.addEventListener('change', render);
  manager.addEventListener('change', () => changePage(0));
  search.addEventListener('input', () => changePage(0));
  byId('prev').addEventListener('click', () => changePage(page - 1));
  byId('next').addEventListener('click', () => changePage(page + 1));
  orderButtons.forEach(th => th.querySelector('button').addEventListener('click', () => {
    const nextOrder = Number(th.dataset.order);
    direction = order === nextOrder ? -direction : -1;
    order = nextOrder;
    changePage(0);
  }));
  render();

  const tariffBase = byId('tariff-base');
  const tariffWeight = byId('tariff-weight');
  const tariffBody = byId('tariff-rows');
  const tariffPrev = byId('tariff-prev');
  const tariffNext = byId('tariff-next');
  const percent = new Intl.NumberFormat('pt-BR', {style:'percent', maximumFractionDigits:1, signDisplay:'exceptZero'});
  let tariffPage = 0;
  let allTariffs = false;
  const weights = ['Entre 0 a 3kg', 'Entre 3,01 a 5kg', 'Entre 5,01 a 10kg', 'Acima de 10kg'];
  const tariffBases = [...new Set(tariffs.map(row => row[0]))].sort((a,b) => a.localeCompare(b, 'pt-BR'));
  tariffBases.forEach(name => tariffBase.add(new Option(name,name)));
  weights.forEach(weight => tariffWeight.add(new Option(weight,weight)));
  tariffs.sort((a,b) => a[0].localeCompare(b[0], 'pt-BR') || weights.indexOf(a[1]) - weights.indexOf(b[1]));
  function renderTariffs() {
    const selected = tariffs.filter(row => (!tariffBase.value || row[0] === tariffBase.value) &&
      (!tariffWeight.value || row[1] === tariffWeight.value));
    const stable = selected.filter(row => row[2] != null && row.slice(3).every(value => value === row[2])).length;
    const count = new Set(selected.map(row => row[0])).size;
    byId('tariff-summary').textContent = count + (count === 1 ? ' base' : ' bases') + ' · ' +
      stable + ' de ' + selected.length + ' tarifas sem alteração de julho a outubro';
    tariffBody.replaceChildren();
    const start = tariffPage * pageSize;
    const visible = allTariffs ? selected : selected.slice(start, start + pageSize);
    visible.forEach(row => {
      const change = row[2] > 0 && row[5] != null ? percent.format((row[5] - row[2]) / row[2]) : '—';
      addRow(tariffBody, [row[0], row[1], ...row.slice(2).map(brl), change]);
    });
    byId('tariff-page').textContent = selected.length
      ? (start + 1) + '–' + Math.min(start + pageSize, selected.length) + ' de ' + selected.length + ' registros'
      : 'Nenhuma tarifa para este filtro';
    if (allTariffs && selected.length) byId('tariff-page').textContent = selected.length + ' registros no filtro';
    tariffPrev.hidden = allTariffs;
    tariffNext.hidden = allTariffs;
    tariffPrev.disabled = tariffPage === 0;
    tariffNext.disabled = start + pageSize >= selected.length;
  }
  const tariffsAll = byId('tariffs-all');
  tariffsAll.addEventListener('click', () => {
    allTariffs = !allTariffs;
    tariffsAll.setAttribute('aria-pressed', String(allTariffs));
    tariffsAll.textContent = allTariffs ? 'Paginar tarifas' : 'Ver todas as tarifas';
    tariffPage = 0;
    renderTariffs();
  });
  [tariffBase,tariffWeight].forEach(control => control.addEventListener('change', () => {
    tariffPage = 0;
    renderTariffs();
  }));
  tariffPrev.addEventListener('click', () => {tariffPage--; renderTariffs();});
  tariffNext.addEventListener('click', () => {tariffPage++; renderTariffs();});
  function showTariffs(active) {
    byId('operation').hidden = active;
    byId('tariffs').hidden = !active;
    byId('show-operation').setAttribute('aria-pressed', String(!active));
    byId('show-tariffs').setAttribute('aria-pressed', String(active));
  }
  byId('show-operation').addEventListener('click', () => showTariffs(false));
  byId('show-tariffs').addEventListener('click', () => showTariffs(true));
  renderTariffs();
})();
