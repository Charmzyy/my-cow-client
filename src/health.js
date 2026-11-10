// Health records helpers (matches AnimalEvent::HEALTH_TYPES / computeClearDates on the API).

// Record types that carry a product, dose, withdrawal and next-due date
export const HEALTH_TYPES = ['vaccination', 'deworming', 'treatment'];

export const isHealthType = (type) => HEALTH_TYPES.includes(type);

/**
 * Drug labels give milk withdrawal in hours ("72 hours") or days ("3 days").
 * { value: '3', unit: 'days' } -> 72. Blank -> null. Anything that isn't a whole, sensible number -> NaN.
 */
export function toHours({ value, unit }) {
  const s = String(value ?? '').trim().replace(',', '.');
  if (s === '') return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return NaN;
  const hours = unit === 'days' ? n * 24 : n;
  return Number.isInteger(hours) && hours <= 2160 ? hours : NaN;
}

/** Whole days or blank -> number / null; anything else -> NaN. */
export function toDays(value, max = 365) {
  const s = String(value ?? '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : NaN;
}

/** Is this withdrawal date still in the future? Dates are YYYY-MM-DD, so string order is date order. */
export function isActive(clearOn, today) {
  return !!clearOn && clearOn > today;
}

/** "Milk withdrawal until Thu 12 Nov · Penstrep" for chips; until = the first day the milk can be sold. */
export function withdrawalText(until, product, what = 'Milk withdrawal') {
  const d = new Date(`${until}T00:00:00`);
  const day = d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${what} until ${day}${product ? ` · ${product}` : ''}`;
}
