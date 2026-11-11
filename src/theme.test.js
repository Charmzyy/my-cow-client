import { describe, expect, it } from 'vitest';
import { DEFAULT_ACCENT, brandScale, contrast, mix, okForWhiteText, pickColor, reach, resolveMode } from './theme';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(contrast('#000000', '#ffffff')).toBe(21);
    expect(contrast('#ffffff', '#ffffff')).toBe(1);
    expect(contrast(DEFAULT_ACCENT, '#ffffff')).toBeGreaterThanOrEqual(7.5);   // MyCow green: 7.6:1
  });

  it('refuses colours too light for white button text', () => {
    expect(okForWhiteText('#1d4ed8')).toBe(true);
    expect(okForWhiteText('#e0a526')).toBe(false);   // savanna gold: dark ink only
    expect(okForWhiteText('green')).toBe(false);
  });
});

describe('brand scale', () => {
  it('keeps every button readable, even from a light colour', () => {
    for (const mode of ['light', 'dark']) {
      const scale = brandScale('#7dd3fc', mode);   // sky blue: far too light as it is
      expect(contrast(scale['--mc-primary'], '#ffffff')).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(brandScale('#7dd3fc', 'contrast')['--mc-primary'], '#ffffff')).toBeGreaterThanOrEqual(7);
  });

  it('uses light text tints in dark mode, readable on the dark card', () => {
    const scale = brandScale(DEFAULT_ACCENT, 'dark');
    expect(contrast(scale['--mc-primary-text'], '#1c2420')).toBeGreaterThanOrEqual(4.5);
    expect(contrast(scale['--mc-green-800'], scale['--mc-green-50'])).toBeGreaterThanOrEqual(4.5);   // chip text on chip
  });

  it('keeps chip text readable on its tint in light mode', () => {
    const scale = brandScale('#0f766e', 'light');
    expect(contrast(scale['--mc-green-800'], scale['--mc-green-50'])).toBeGreaterThanOrEqual(4.5);
  });
});

describe('helpers', () => {
  it('mixes and reaches a target contrast', () => {
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(contrast(reach('#cccccc', '#ffffff', 4.5, '#000000'), '#ffffff')).toBeGreaterThanOrEqual(4.5);
  });

  it('resolves "match my phone" from the phone setting', () => {
    expect(resolveMode('system', true)).toBe('dark');
    expect(resolveMode('system', false)).toBe('light');
    expect(resolveMode('contrast', true)).toBe('contrast');
    expect(resolveMode('neon', false)).toBe('light');
  });

  it('paints the workspace brand before the personal accent', () => {
    expect(pickColor({ brand: '#7b1fa2', accent: '#1d4ed8' })).toBe('#7b1fa2');
    expect(pickColor({ brand: null, accent: '#1d4ed8' })).toBe('#1d4ed8');
    expect(pickColor({ brand: '#ffff00', accent: null })).toBe(DEFAULT_ACCENT);   // unreadable brand is ignored
  });
});
