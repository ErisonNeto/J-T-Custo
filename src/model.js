const currency = new Intl.NumberFormat('pt-BR', {style: 'currency', currency: 'BRL'});
export const count = new Intl.NumberFormat('pt-BR').format;
export const percent = new Intl.NumberFormat('pt-BR', {style: 'percent', maximumFractionDigits: 1}).format;
export const money = cents => cents == null ? '—' : currency.format(cents / 100);

export const expenses = [
  ['Last Mile', 'lastMile', '#d71920'],
  ['Transporte secundário', 'transport', '#f27a80'],
  ['Funcionários', 'staff', '#283952'],
  ['Mini transferência', 'transfer', '#4d668b'],
  ['Aluguel', 'rent', '#6583ac'],
  ['ADM sem detalhamento', 'admin', '#8ca1bd'],
  ['Diaristas', 'temporary', '#b2c1d4'],
];

export function toBase([code, manager, volume, cost, rent, staff, temporary, transport, transfer, lastMile, admin]) {
  return {
    code, manager, volume, cost, rent, staff, temporary, transport, transfer, lastMile, admin,
    fixed: rent == null && staff == null ? null : (rent ?? 0) + (staff ?? 0),
    rate: volume > 0 && cost != null ? cost / volume : null,
  };
}

export function summarize(rows) {
  const sum = {cost: null, fixed: null, volume: 0, coveredVolume: 0};
  for (const row of rows) {
    sum.volume += row.volume;
    if (row.fixed != null) sum.fixed = (sum.fixed ?? 0) + row.fixed;
    if (row.cost != null) {
      sum.cost = (sum.cost ?? 0) + row.cost;
      sum.coveredVolume += row.volume;
    }
  }
  return {...sum, rate: sum.coveredVolume ? sum.cost / sum.coveredVolume : null};
}

export function groupManagers(rows) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row.manager)) groups.set(row.manager, []);
    groups.get(row.manager).push(row);
  }
  return Array.from(groups, ([manager, entries]) => ({manager, size: entries.length, ...summarize(entries)}));
}

export function rank(rows, metric, label) {
  return [...rows].sort((a, b) =>
    Number(a[metric] == null) - Number(b[metric] == null) ||
    (b[metric] ?? 0) - (a[metric] ?? 0) ||
    a[label].localeCompare(b[label], 'pt-BR'));
}
