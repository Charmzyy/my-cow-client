// Chart colours. Each palette has its own steps for light and dark backgrounds, and both were
// checked with the dataviz palette validator (lightness band, chroma, colour-blind separation of
// neighbouring colours, normal-vision separation, contrast) against the app's card colours
// (#ffffff light, #1c2420 dark). Gold sits below 3:1 on white, so every chart also has a legend
// and a "Show as table" view. Don't reorder or add colours without re-running the validator:
// the order is what keeps neighbouring colours apart for colour-blind readers.

export const PALETTES = {
  farm: {
    label: 'Farm colours',
    hint: 'Green, blue, gold, violet, red',
    light: ['#2e8b57', '#2a78d6', '#e0a526', '#6250d6', '#c0504d'],
    dark: ['#2b9a5a', '#3987e5', '#c98500', '#9085e9', '#d9605c'],
  },
  colorblind: {
    label: 'Colour-blind safe',
    hint: 'Eight colours tuned for red-green colour blindness',
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  },
};

/** "Other" (folded categories) is a quiet grey, never a ninth hue. */
export const OTHER_COLOR = { light: '#8a8f88', dark: '#7d877f' };

export function paletteFor(key, mode) {
  const p = PALETTES[key] || PALETTES.farm;
  return mode === 'dark' ? p.dark : p.light;   // high contrast uses the light steps on white
}

/** How many categories a pie can colour before the rest fold into "Other". */
export function slotCount(key) {
  return (PALETTES[key] || PALETTES.farm).light.length;
}

/** Colour for slot i (wraps never: callers fold extra categories into "Other" first). */
export function slotColor(key, mode, i) {
  const colors = paletteFor(key, mode);
  return colors[Math.min(i, colors.length - 1)];
}

export function otherColor(mode) {
  return mode === 'dark' ? OTHER_COLOR.dark : OTHER_COLOR.light;
}
