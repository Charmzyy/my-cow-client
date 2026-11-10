import { describe, expect, it } from 'vitest';
import { isActive, isHealthType, toDays, toHours, withdrawalText } from './health';

describe('toHours', () => {
  it('reads hours or days from the drug label', () => {
    expect(toHours({ value: '72', unit: 'hours' })).toBe(72);
    expect(toHours({ value: '3', unit: 'days' })).toBe(72);
    expect(toHours({ value: '0', unit: 'days' })).toBe(0);
    expect(toHours({ value: '', unit: 'days' })).toBeNull();
  });

  it('rejects what the API would refuse', () => {
    expect(toHours({ value: '-1', unit: 'hours' })).toBeNaN();
    expect(toHours({ value: '91', unit: 'days' })).toBeNaN();     // over 90 days
    expect(toHours({ value: '1.5', unit: 'hours' })).toBeNaN();   // whole hours only
    expect(toHours({ value: 'abc', unit: 'hours' })).toBeNaN();
  });

  it('accepts half days as whole hours', () => {
    expect(toHours({ value: '2,5', unit: 'days' })).toBe(60);
  });
});

describe('toDays', () => {
  it('takes whole days within the limit', () => {
    expect(toDays('14')).toBe(14);
    expect(toDays('')).toBeNull();
    expect(toDays('400')).toBeNaN();
    expect(toDays('1.5')).toBeNaN();
  });
});

describe('isActive', () => {
  it('is active until the clear day itself', () => {
    expect(isActive('2026-11-12', '2026-11-11')).toBe(true);
    expect(isActive('2026-11-12', '2026-11-12')).toBe(false);
    expect(isActive(null, '2026-11-12')).toBe(false);
  });
});

describe('withdrawalText', () => {
  it('names the day and the product', () => {
    const text = withdrawalText('2026-11-12', 'Penstrep');
    expect(text).toMatch(/^Milk withdrawal until /);
    expect(text).toMatch(/12/);
    expect(text).toMatch(/· Penstrep$/);
  });
});

describe('isHealthType', () => {
  it('only treatments, vaccinations and deworming', () => {
    expect(isHealthType('treatment')).toBe(true);
    expect(isHealthType('calving')).toBe(false);
  });
});
