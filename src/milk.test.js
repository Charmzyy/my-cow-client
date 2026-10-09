import { describe, expect, it } from 'vitest';
import { changedEntries, codeFromScan, kenyaToday, parseLitres, sheetTotal } from './milk';

describe('parseLitres', () => {
  it('accepts dots, commas and blanks', () => {
    expect(parseLitres('8.5')).toBe(8.5);
    expect(parseLitres(' 8,5 ')).toBe(8.5);
    expect(parseLitres('0')).toBe(0);
    expect(parseLitres('')).toBeNull();
    expect(parseLitres(null)).toBeNull();
  });

  it('rejects what a cow cannot give in one milking', () => {
    expect(parseLitres('75')).toBeNaN();
    expect(parseLitres('-1')).toBeNaN();
    expect(parseLitres('abc')).toBeNaN();
  });
});

describe('changedEntries', () => {
  const rows = [
    { id: 'a', log: { litres: 8, discarded: false } },
    { id: 'b', log: null },
    { id: 'c', log: { litres: 5, discarded: false } },
    { id: 'd', log: null },
  ];

  it('sends only what changed, including cleared entries', () => {
    const edits = {
      a: { text: '8', discarded: false },  // unchanged
      b: { text: '6.5', discarded: false }, // new
      c: { text: '', discarded: false },   // cleared
      d: { text: '', discarded: false },   // still empty
    };
    expect(changedEntries(rows, edits)).toEqual([
      { animal_id: 'b', litres: 6.5, discarded: false },
      { animal_id: 'c', litres: null, discarded: false },
    ]);
  });

  it('treats a discard toggle as a change', () => {
    expect(changedEntries(rows, { a: { text: '8', discarded: true } })).toEqual([{ animal_id: 'a', litres: 8, discarded: true }]);
  });

  it('skips entries that are not valid numbers', () => {
    expect(changedEntries(rows, { b: { text: '99' } })).toEqual([]);
  });
});

describe('sheetTotal', () => {
  it('adds saved and typed values, typed winning', () => {
    const rows = [{ id: 'a', log: { litres: 8 } }, { id: 'b', log: { litres: 4 } }, { id: 'c', log: null }];
    expect(sheetTotal(rows, { b: { text: '5,5' }, c: { text: '2' } })).toBe(15.5);
  });
});

describe('codeFromScan', () => {
  it('reads the code from the sticker URL or typed text', () => {
    expect(codeFromScan('https://mycow.example/c/ABCD2345')).toBe('ABCD2345');
    expect(codeFromScan('http://192.168.1.5:8080/c/abcd2345/')).toBe('ABCD2345');
    expect(codeFromScan('abcd-2345')).toBe('ABCD2345');
  });

  it('ignores other QR codes', () => {
    expect(codeFromScan('https://example.com/verify/XYZ')).toBeNull();
    expect(codeFromScan('hello')).toBeNull();
  });
});

describe('kenyaToday', () => {
  it('is already tomorrow in Nairobi late in the UTC evening', () => {
    expect(kenyaToday(new Date('2026-10-09T22:30:00Z'))).toBe('2026-10-10');
    expect(kenyaToday(new Date('2026-10-09T20:00:00Z'))).toBe('2026-10-09');
  });
});
