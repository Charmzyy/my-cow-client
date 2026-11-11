// Milk recording helpers (matches MilkController / MilkDeliveryController on the API).

export const SESSIONS = { am: 'Morning', midday: 'Midday', pm: 'Evening' };

export const MILK_STATUS = {
  milking: { label: 'In milk', chip: 'mc-chip-green' },
  unknown: { label: 'No calving recorded', chip: 'mc-chip-ink' },
  dry: { label: 'Dry', chip: 'mc-chip-gold' },
};

// Where milk goes. `sold` kinds have a buyer and a price.
export const OUTLETS = {
  coop: { label: 'Co-op / dairy', sold: true },
  sale: { label: 'Local sale', sold: true },
  home: { label: 'Home use', sold: false },
  calves: { label: 'Fed to calves', sold: false },
};

/** "8,5" / " 8.5 " / "" -> 8.5 / 8.5 / null. Anything that isn't a sensible milking (0-60 l) -> NaN. */
export function parseLitres(text) {
  const s = String(text ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 && n <= 60 ? Math.round(n * 100) / 100 : NaN;
}

/** The sheet's starting edits: saved values, and Discard ticked for cows under a treatment's withdrawal. */
export function initialEdits(rows) {
  const out = {};
  for (const c of rows) out[c.id] = { text: c.log ? String(c.log.litres) : '', discarded: !!c.log?.discarded || !!c.withdrawal };
  return out;
}

/**
 * Only what changed on the sheet, ready for POST /milk/session.
 * rows: the API's cows (with their saved `log`, and `withdrawal` when under treatment);
 * edits: { [animalId]: { text, discarded } }. A cow under withdrawal is always sent as discarded
 * (the API enforces it anyway).
 */
export function changedEntries(rows, edits) {
  const out = [];
  for (const row of rows) {
    const edit = edits[row.id];
    if (!edit) continue;
    const litres = parseLitres(edit.text);
    if (Number.isNaN(litres)) continue;
    const before = row.log ? { litres: row.log.litres, discarded: !!row.log.discarded } : { litres: null, discarded: false };
    const discarded = litres === null ? false : !!edit.discarded || !!row.withdrawal;
    if (litres === before.litres && discarded === before.discarded) continue;
    out.push({ animal_id: row.id, litres, discarded });
  }
  return out;
}

/** The sheet's running total as typed (unsaved edits included). */
export function sheetTotal(rows, edits) {
  let total = 0;
  for (const row of rows) {
    const edit = edits[row.id];
    const litres = edit ? parseLitres(edit.text) : row.log?.litres ?? null;
    if (typeof litres === 'number' && !Number.isNaN(litres)) total += litres;
  }
  return Math.round(total * 100) / 100;
}

/** The code inside a scanned ear-tag QR (".../c/ABCD2345") or a typed code; null if it isn't one. */
export function codeFromScan(text) {
  const raw = String(text ?? '').trim();
  const fromUrl = raw.match(/\/c\/([A-Za-z0-9-]{6,12})\/?$/);
  const code = (fromUrl ? fromUrl[1] : raw).replace(/[\s-]/g, '').toUpperCase();
  return /^[A-Z0-9]{8}$/.test(code) ? code : null;
}

export function litresText(n, digits = 1) {
  return n == null ? '—' : `${Number(n).toLocaleString('en-KE', { maximumFractionDigits: digits })} l`;
}

export function kesText(n) {
  return n == null ? '—' : `KES ${Number(n).toLocaleString('en-KE', { maximumFractionDigits: 0 })}`;
}

/** "Mon 6" style label for a chart axis / table row. */
export function shortDay(isoDay) {
  const d = new Date(`${isoDay}T00:00:00`);
  return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' });
}

/** The milking happening now, like the API's FarmClock::currentSession (Kenya time). */
export function currentSession(sessions, now = new Date()) {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', hour: '2-digit', hour12: false }).format(now)) % 24;
  let guess = hour < 11 ? 'am' : hour < 15 ? 'midday' : 'pm';
  if (!sessions.includes(guess)) guess = hour < 13 ? 'am' : 'pm';
  return sessions.includes(guess) ? guess : sessions[0];
}

/**
 * The milking sheet with no signal, built from the last sheet this phone loaded for the farm:
 * same cows, nothing recorded yet. A treatment withdrawal still counts if it lasts past `day`.
 */
export function offlineSheet(saved, day, session) {
  return {
    farm: saved.farm,
    day,
    session,
    sessions: saved.sessions,
    today: kenyaToday(),
    offline: true,
    savedAt: saved.savedAt,
    cows: saved.cows.map((c) => ({
      ...c,
      log: null,
      withdrawal: c.withdrawal && c.withdrawal.until > day ? c.withdrawal : null,
    })),
    total: 0,
  };
}

/** What to keep of a sheet so it can be rebuilt offline (cows only, not the day's entries). */
export function sheetForOffline(sheet) {
  return {
    farm: sheet.farm,
    sessions: sheet.sessions,
    savedAt: new Date().toISOString(),
    cows: sheet.cows.map(({ id, name, tag_number, qr_code, status, days_in_milk, last_litres, withdrawal }) => ({
      id, name, tag_number, qr_code, status, days_in_milk, last_litres, withdrawal,
    })),
  };
}

/**
 * Show entries still waiting on the phone as this sheet's saved values (marked `waiting`), so a
 * sheet opened again before they're sent shows what was typed. `queued`: outbox items, oldest first.
 */
export function overlayWaiting(sheet, queued) {
  const byCow = new Map(sheet.cows.map((c) => [c.id, c]));
  for (const item of queued) {
    const b = item.body;
    if (b.day !== sheet.day || b.session !== sheet.session) continue;
    for (const e of b.entries) {
      const cow = byCow.get(e.animal_id);
      if (cow) cow.log = e.litres === null ? null : { litres: e.litres, discarded: !!e.discarded, waiting: true };
    }
  }
  sheet.total = Math.round(sheet.cows.reduce((t, c) => t + (c.log?.litres || 0), 0) * 100) / 100;
  return sheet;
}

/** Today's date in Kenya time (the API's FarmClock), as YYYY-MM-DD. */
export function kenyaToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}
