// Reports: what each chart can show (matches the API's AnalyticsController::METRICS), and the
// small pure helpers behind ChartCard.vue. Kept free of Vue so Vitest can check them.
import { kenyaToday } from './milk';

export const METRICS = {
  'milk.produced': {
    label: 'Milk produced',
    unit: 'l',
    groups: { time: 'Over time', cow: 'By cow', session: 'By milking' },
    // Fixed colour slot per series, so a colour always means the same thing (palette order, see chartPalette.js)
    slots: { kept: 0, discarded: 4 },
  },
  'milk.outlets': {
    label: 'Where the milk went',
    unit: 'l',
    groups: { time: 'Over time', outlet: 'By outlet' },
    slots: { coop: 0, sale: 1, home: 2, calves: 3, rejected: 4 },
  },
  'milk.income': {
    label: 'Milk income',
    unit: 'KES',
    groups: { time: 'Over time', buyer: 'By buyer' },
    slots: { paid: 0, unpaid: 2 },
    money: true,
  },
  'herd.composition': {
    label: 'Herd',
    unit: 'animals',
    groups: { breed: 'By breed', age: 'By age', sex: 'By sex', species: 'By species' },
    slots: {},
    undated: true,
  },
  'health.events': {
    label: 'Health & breeding records',
    unit: 'records',
    groups: { time: 'Over time', type: 'By type' },
    slots: { health: 0, breeding: 1, other: 2 },
  },
};

export const RANGES = { 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days', 365: 'Last 12 months', custom: 'Custom dates' };
export const GRANULARITIES = { day: 'Day', week: 'Week', month: 'Month' };
export const CHART_TYPES = { bar: 'Bars', stacked: 'Stacked bars', line: 'Line', area: 'Area', pie: 'Pie', doughnut: 'Doughnut' };
export const MAX_DAYS = 731;

export function groupKind(group) {
  return group === 'time' ? 'time' : 'category';
}

/** Chart types that read well for a grouping. A pie of days is unreadable, so pies only for categories. */
export function typesFor(group) {
  return groupKind(group) === 'time' ? ['stacked', 'bar', 'line', 'area'] : ['bar', 'pie', 'doughnut'];
}

/** The metrics this person may pick: money only for the farm's owner and managers. */
export function metricsFor({ money = false, only = null } = {}) {
  return Object.keys(METRICS).filter((m) => (money || !METRICS[m].money) && (!only || only.includes(m)));
}

/**
 * A card's saved choice, made safe: an unknown metric, a group the metric doesn't have, or a pie
 * on a time axis falls back to the card's default (or the first valid option).
 */
export function normaliseChoice(saved, defaults, allowed = Object.keys(METRICS)) {
  const c = { range: '30', granularity: 'day', compare: false, ...defaults, ...(saved || {}) };
  if (!allowed.includes(c.metric)) c.metric = allowed.includes(defaults.metric) ? defaults.metric : allowed[0];
  const groups = Object.keys(METRICS[c.metric].groups);
  if (!groups.includes(c.group)) c.group = groups.includes(defaults.group) ? defaults.group : groups[0];
  const types = typesFor(c.group);
  if (!types.includes(c.type)) c.type = types.includes(defaults.type) ? defaults.type : types[0];
  if (!(c.range in RANGES)) c.range = '30';
  if (!(c.granularity in GRANULARITIES)) c.granularity = 'day';
  c.compare = !!c.compare && ['line', 'area'].includes(c.type) && groupKind(c.group) === 'time';
  return c;
}

function addDays(iso, n) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from, to) {
  return Math.round((new Date(`${to}T12:00:00Z`) - new Date(`${from}T12:00:00Z`)) / 86400000) + 1;
}

/** The dates a choice covers, ending today in Kenya time unless custom dates were picked. */
export function rangeDates(choice, today = kenyaToday()) {
  if (choice.range === 'custom' && choice.from && choice.to) return { from: choice.from, to: choice.to };
  const days = Number(choice.range) || 30;
  return { from: addDays(today, -(days - 1)), to: today };
}

/** The same number of days just before, for "compare with previous period". */
export function previousRange({ from, to }) {
  const days = daysBetween(from, to);
  return { from: addDays(from, -days), to: addDays(from, -1) };
}

/** A sensible bucket size for a range, used when a card first opens: days, then weeks, then months. */
export function suggestGranularity(days) {
  if (days <= 45) return 'day';
  if (days <= 200) return 'week';
  return 'month';
}

/** Axis label for a bucket start date. */
export function bucketLabel(iso, granularity, spanDays = 30) {
  const d = new Date(`${iso}T00:00:00`);
  if (granularity === 'month') return d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' });
  if (granularity === 'week') return `Wk ${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`;
  return spanDays <= 14
    ? d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' })
    : d.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

/** Keep the largest `max - 1` slices and add the rest up as "Other", so a pie never needs a colour it doesn't have. */
export function foldCategories(labels, values, max) {
  if (labels.length <= max) return { labels: [...labels], values: [...values], folded: false };
  const rows = labels.map((l, i) => [l, values[i]]).sort((a, b) => b[1] - a[1]);
  const kept = rows.slice(0, max - 1);
  const other = rows.slice(max - 1).reduce((t, r) => t + r[1], 0);
  return { labels: [...kept.map((r) => r[0]), 'Other'], values: [...kept.map((r) => r[1]), Math.round(other * 100) / 100], folded: true };
}

export function hasData(series) {
  return (series || []).some((s) => s.values.some((v) => v !== 0));
}

export function seriesTotal(series) {
  return Math.round((series || []).reduce((t, s) => t + s.values.reduce((a, v) => a + v, 0), 0) * 100) / 100;
}

export function formatValue(v, unit, digits = 1) {
  if (v == null) return '—';
  const n = Number(v).toLocaleString('en-KE', { maximumFractionDigits: unit === 'KES' ? 0 : digits });
  if (unit === 'KES') return `KES ${n}`;
  if (unit === 'l') return `${n} l`;
  return n;
}

/** The chart's numbers as a spreadsheet file (RFC 4180 quoting). */
export function toCsv(labels, series) {
  const cell = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [['', ...series.map((s) => s.label)], ...labels.map((l, i) => [l, ...series.map((s) => s.values[i])])];
  return rows.map((r) => r.map(cell).join(',')).join('\r\n');
}
