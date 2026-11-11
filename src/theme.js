import { reactive } from 'vue';

// Light / dark / high-contrast themes and the brand colour.
//
// theme.css holds the neutral tokens for each theme ([data-theme] on <html>). The brand scale
// (--mc-green-*, --mc-primary*) is computed here from one colour: the workspace's brand colour,
// else the person's accent, else MyCow green. Buttons put white text on that colour, so it is
// always darkened until white text reads at 4.5:1 (7:1 in high contrast). Same maths as the
// API's App\Support\Contrast.

export const DEFAULT_ACCENT = '#1b5e37';
export const THEMES = {
  light: 'Light',
  dark: 'Dark',
  contrast: 'High contrast',
  system: 'Match my phone',
};
const SURFACE = { light: '#ffffff', dark: '#1c2420', contrast: '#ffffff' };

/** Bumps whenever colours change, so canvas charts (which can't use CSS variables) redraw. */
export const themeState = reactive({ mode: 'light', version: 0 });

export function isHex(hex) {
  return typeof hex === 'string' && /^#[0-9a-f]{6}$/i.test(hex);
}

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('')}`;
}

/** Blend a toward b; t = 0 gives a, t = 1 gives b. */
export function mix(a, b, t) {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex(x.map((c, i) => c + (y[i] - c) * t));
}

export function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

/** True when white text on this colour is readable (the API refuses anything else). */
export function okForWhiteText(hex, min = 4.5) {
  return isHex(hex) && contrast(hex, '#ffffff') >= min;
}

/** Darken (toward black) or lighten (toward white) in small steps until `hex` reaches `min` against `against`. */
export function reach(hex, against, min, toward) {
  let out = hex;
  for (let t = 0.04; contrast(out, against) < min && t <= 1; t += 0.04) out = mix(hex, toward, t);
  return out;
}

const rgbList = (hex) => hexToRgb(hex).join(', ');

/**
 * The brand tokens for one theme. Light and high contrast use the colour itself for buttons and
 * links; dark keeps it for buttons (white text) but uses light tints for text and dark tints for
 * tinted backgrounds, so green-on-dark text stays readable.
 */
export function brandScale(color, mode) {
  const base = isHex(color) ? color : DEFAULT_ACCENT;
  const primary = reach(base, '#ffffff', mode === 'contrast' ? 7 : 4.5, '#000000');
  const hover = mix(primary, '#000000', 0.18);
  const active = mix(primary, '#000000', 0.32);

  if (mode === 'dark') {
    const surface = SURFACE.dark;
    const text = reach(mix(primary, '#ffffff', 0.45), surface, 4.5, '#ffffff');
    return {
      '--mc-primary': primary, '--mc-primary-hover': hover, '--mc-primary-active': active,
      '--mc-primary-text': text, '--mc-primary-rgb': rgbList(primary),
      '--mc-green-950': mix(primary, '#ffffff', 0.86),
      '--mc-green-900': mix(primary, '#ffffff', 0.76),
      '--mc-green-800': mix(primary, '#ffffff', 0.64),
      '--mc-green-700': text,
      '--mc-green-600': mix(primary, '#ffffff', 0.3),
      '--mc-green-100': mix(surface, primary, 0.34),
      '--mc-green-50': mix(surface, primary, 0.18),
      '--bs-primary': primary, '--bs-primary-rgb': rgbList(primary),
      '--bs-link-color': text, '--bs-link-color-rgb': rgbList(text),
      '--bs-link-hover-color': mix(text, '#ffffff', 0.3), '--bs-link-hover-color-rgb': rgbList(mix(text, '#ffffff', 0.3)),
      '--mc-focus-ring': `rgb(${rgbList(text)} / 30%)`,
    };
  }

  return {
    '--mc-primary': primary, '--mc-primary-hover': hover, '--mc-primary-active': active,
    '--mc-primary-text': primary, '--mc-primary-rgb': rgbList(primary),
    '--mc-green-950': mix(primary, '#000000', 0.5),
    '--mc-green-900': active,
    '--mc-green-800': hover,
    '--mc-green-700': primary,
    '--mc-green-600': mix(primary, '#ffffff', 0.14),
    '--mc-green-100': mix(primary, '#ffffff', 0.85),
    '--mc-green-50': mix(primary, '#ffffff', 0.93),
    '--bs-primary': primary, '--bs-primary-rgb': rgbList(primary),
    '--bs-link-color': primary, '--bs-link-color-rgb': rgbList(primary),
    '--bs-link-hover-color': hover, '--bs-link-hover-color-rgb': rgbList(hover),
    '--mc-focus-ring': `rgb(${rgbList(primary)} / 15%)`,
  };
}

/** 'system' follows the phone's setting; everything else is taken as chosen. */
export function resolveMode(theme, prefersDark) {
  if (theme === 'system') return prefersDark ? 'dark' : 'light';
  return ['light', 'dark', 'contrast'].includes(theme) ? theme : 'light';
}

/** The colour the app is painted in: the workspace's brand first, then the person's accent. */
export function pickColor({ brand, accent }) {
  if (okForWhiteText(brand)) return brand;
  if (okForWhiteText(accent)) return accent;
  return DEFAULT_ACCENT;
}

const darkQuery = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
let last = null;

export function applyTheme({ theme = 'light', accent = null, brand = null } = {}, root = document.documentElement) {
  last = { theme, accent, brand };
  const mode = resolveMode(theme, !!darkQuery?.matches);
  root.dataset.theme = mode;
  root.dataset.bsTheme = mode === 'dark' ? 'dark' : 'light';   // Bootstrap's own components (tables, selects)
  root.style.colorScheme = mode === 'dark' ? 'dark' : 'light';
  const scale = brandScale(pickColor({ brand, accent }), mode);
  for (const [name, value] of Object.entries(scale)) {
    root.style.setProperty(name, value);
  }
  // The phone's status bar: brand colour, or the dark surface at night
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', mode === 'dark' ? SURFACE.dark : scale['--mc-primary']);
  themeState.mode = mode;
  themeState.version += 1;
}

// "Match my phone" follows the phone switching between light and dark
darkQuery?.addEventListener?.('change', () => {
  if (last?.theme === 'system') applyTheme(last);
});
