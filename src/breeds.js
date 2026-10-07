// The classes the model can predict (must match CLASS_NAMES in my-cow-py/app/main.py).
export const BREEDS = {
  Ayrshire:      { use: 'Dairy', origin: 'Scotland', note: 'Red-and-white dairy breed, hardy and an efficient grazer.' },
  'Black-Angus': { use: 'Beef', origin: 'Scotland', note: 'Solid black, naturally hornless beef breed known for marbled meat.' },
  Boran:         { use: 'Beef', origin: 'East Africa', note: 'Humped zebu beef breed, tolerant of heat, drought and ticks.' },
  Guernsey:      { use: 'Dairy', origin: 'Channel Islands', note: 'Fawn-and-white dairy breed with rich, golden-coloured milk.' },
  Holstein:      { use: 'Dairy', origin: 'Netherlands', note: 'Black-and-white Friesian type with the highest milk volume.' },
  Jersey:        { use: 'Dairy', origin: 'Channel Islands', note: 'Small fawn dairy breed giving milk high in butterfat.' },
  Sahiwal:       { use: 'Dairy', origin: 'Pakistan / India', note: 'Reddish zebu dairy breed, heat-tolerant and widely kept in East Africa.' },
  Zebu:          { use: 'Dual-purpose', origin: 'East Africa', note: 'Indigenous humped cattle, very hardy under local conditions.' },
};

export const NOT_A_COW = 'Not a cow';

// Mirrors the threshold in main.py: below this the model says "Not a cow".
export function confidenceLevel(confidence) {
  const c = Number(confidence) || 0;
  if (c >= 80) return { key: 'high', label: 'High confidence' };
  if (c >= 60) return { key: 'mid', label: 'Moderate confidence' };
  return { key: 'low', label: 'Low confidence' };
}

export function formatPct(confidence) {
  const c = Number(confidence);
  return Number.isFinite(c) ? `${c.toFixed(c >= 99.95 ? 0 : 1)}%` : '—';
}

export function breedLabel(name) {
  return name ? String(name).replace('-', ' ') : 'Unknown';
}
