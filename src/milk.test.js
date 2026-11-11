import { describe, expect, it } from 'vitest';
import {
  changedEntries, codeFromScan, currentSession, initialEdits, kenyaToday, offlineSheet, overlayWaiting, parseLitres,
  sheetForOffline, sheetTotal,
} from './milk';

describe('the milking sheet with no signal', () => {
  const online = {
    farm: { id: 'f1', name: 'Kamau farm' }, day: '2026-11-10', session: 'am', sessions: ['am', 'pm'], today: '2026-11-10',
    cows: [
      { id: 'c1', name: 'Daisy', tag_number: 'KE-1', qr_code: 'AAAA1111', status: 'milking', days_in_milk: 40, last_litres: 8, log: { litres: 8 }, withdrawal: { until: '2026-11-12', product: 'Pen-strep' } },
      { id: 'c2', name: 'Zawadi', tag_number: 'KE-2', qr_code: 'BBBB2222', status: 'milking', days_in_milk: 90, last_litres: 6, log: null, withdrawal: null },
    ],
  };

  it('keeps the cow list but not the day’s entries', () => {
    const saved = sheetForOffline(online);
    expect(saved.cows[0]).not.toHaveProperty('log');
    expect(saved.cows.map((c) => c.id)).toEqual(['c1', 'c2']);
  });

  it('rebuilds an empty sheet for another day, with withdrawals that still apply', () => {
    const saved = sheetForOffline(online);
    expect(offlineSheet(saved, '2026-11-11', 'pm').cows[0].withdrawal).not.toBeNull();   // until the 12th
    const later = offlineSheet(saved, '2026-11-12', 'am');
    expect(later.offline).toBe(true);
    expect(later.cows[0].withdrawal).toBeNull();
    expect(later.cows.every((c) => c.log === null)).toBe(true);
  });

  it('shows entries waiting on the phone as that milking’s values', () => {
    const sheet = offlineSheet(sheetForOffline(online), '2026-11-11', 'am');
    overlayWaiting(sheet, [
      { body: { day: '2026-11-11', session: 'am', entries: [{ animal_id: 'c1', litres: 7, discarded: true }, { animal_id: 'c2', litres: 5 }] } },
      { body: { day: '2026-11-11', session: 'am', entries: [{ animal_id: 'c2', litres: 5.5 }] } },   // corrected later
      { body: { day: '2026-11-11', session: 'pm', entries: [{ animal_id: 'c1', litres: 9 }] } },     // another milking
    ]);
    expect(sheet.cows[0].log).toEqual({ litres: 7, discarded: true, waiting: true });
    expect(sheet.cows[1].log.litres).toBe(5.5);
    expect(sheet.total).toBe(12.5);
  });

  it('guesses the milking from Kenya time', () => {
    expect(currentSession(['am', 'pm'], new Date('2026-11-10T03:30:00Z'))).toBe('am');     // 06:30 in Nairobi
    expect(currentSession(['am', 'midday', 'pm'], new Date('2026-11-10T09:30:00Z'))).toBe('midday');
    expect(currentSession(['am', 'pm'], new Date('2026-11-10T14:00:00Z'))).toBe('pm');     // 17:00
  });
});

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

  it('always discards milk from a cow under treatment withdrawal', () => {
    const treated = [{ id: 't', log: null, withdrawal: { until: '2026-11-12', product: 'Penstrep' } }];
    expect(changedEntries(treated, { t: { text: '7', discarded: false } })).toEqual([{ animal_id: 't', litres: 7, discarded: true }]);
  });
});

describe('initialEdits', () => {
  it('starts from the saved values and ticks Discard for treated cows', () => {
    const rows = [
      { id: 'a', log: { litres: 8, discarded: false } },
      { id: 't', log: null, withdrawal: { until: '2026-11-12' } },
    ];
    expect(initialEdits(rows)).toEqual({ a: { text: '8', discarded: false }, t: { text: '', discarded: true } });
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
