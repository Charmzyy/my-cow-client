import { describe, expect, it } from 'vitest';
import {
  METRICS, bucketLabel, daysBetween, foldCategories, metricsFor, normaliseChoice, previousRange, rangeDates,
  seriesTotal, suggestGranularity, toCsv, typesFor,
} from './analytics';
import { PALETTES, slotCount } from './chartPalette';

describe('chart choices', () => {
  const defaults = { metric: 'milk.produced', group: 'time', type: 'stacked' };

  it('only offers pies for categories, never for a time axis', () => {
    expect(typesFor('time')).not.toContain('pie');
    expect(typesFor('time')).not.toContain('doughnut');
    expect(typesFor('breed')).toEqual(['bar', 'pie', 'doughnut']);
  });

  it('repairs a saved choice that no longer fits', () => {
    expect(normaliseChoice({ group: 'time', type: 'pie' }, defaults).type).toBe('stacked');
    expect(normaliseChoice({ metric: 'milk.secret' }, defaults).metric).toBe('milk.produced');
    expect(normaliseChoice({ metric: 'herd.composition', group: 'time' }, defaults).group).toBe('breed');
    expect(normaliseChoice({ type: 'bar', compare: true }, defaults).compare).toBe(false);   // compare is for lines
    expect(normaliseChoice({ type: 'line', compare: true }, defaults).compare).toBe(true);
  });

  it('hides money from people who may not see it', () => {
    expect(metricsFor({ money: false })).not.toContain('milk.income');
    expect(metricsFor({ money: true })).toContain('milk.income');
    expect(normaliseChoice({ metric: 'milk.income' }, defaults, metricsFor({ money: false })).metric).toBe('milk.produced');
  });

  it('gives every series a colour slot the palette has', () => {
    for (const m of Object.values(METRICS)) {
      for (const slot of Object.values(m.slots)) expect(slot).toBeLessThan(slotCount('farm'));
    }
  });
});

describe('dates', () => {
  it('ends ranges today and counts days inclusively', () => {
    expect(rangeDates({ range: '7' }, '2026-11-12')).toEqual({ from: '2026-11-06', to: '2026-11-12' });
    expect(rangeDates({ range: 'custom', from: '2026-01-01', to: '2026-01-31' }, '2026-11-12')).toEqual({ from: '2026-01-01', to: '2026-01-31' });
    expect(daysBetween('2026-11-06', '2026-11-12')).toBe(7);
  });

  it('compares with the same number of days just before', () => {
    expect(previousRange({ from: '2026-11-06', to: '2026-11-12' })).toEqual({ from: '2026-10-30', to: '2026-11-05' });
  });

  it('suggests days, then weeks, then months', () => {
    expect(suggestGranularity(30)).toBe('day');
    expect(suggestGranularity(90)).toBe('week');
    expect(suggestGranularity(365)).toBe('month');
  });

  it('labels buckets by their size', () => {
    expect(bucketLabel('2026-10-01', 'month')).toMatch(/Oct/);
    expect(bucketLabel('2026-11-02', 'week')).toMatch(/^Wk /);
  });
});

describe('shaping', () => {
  it('folds small slices into Other so a pie never runs out of colours', () => {
    const f = foldCategories(['a', 'b', 'c', 'd', 'e', 'f', 'g'], [1, 9, 3, 7, 2, 8, 4], 5);
    expect(f.labels).toEqual(['b', 'f', 'd', 'g', 'Other']);
    expect(f.values).toEqual([9, 8, 7, 4, 6]);
    expect(foldCategories(['a', 'b'], [1, 2], 5).folded).toBe(false);
  });

  it('adds up every series', () => {
    expect(seriesTotal([{ values: [1.1, 2.2] }, { values: [3.3] }])).toBe(6.6);
  });

  it('writes a CSV that spreadsheets read', () => {
    expect(toCsv(['Mon', 'Tue'], [{ label: 'Co-op, Githunguri', values: [10, 12] }])).toBe(',"Co-op, Githunguri"\r\nMon,10\r\nTue,12');
  });
});

describe('palettes', () => {
  it('has the same number of steps in light and dark, all hex', () => {
    for (const p of Object.values(PALETTES)) {
      expect(p.light.length).toBe(p.dark.length);
      for (const c of [...p.light, ...p.dark]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
