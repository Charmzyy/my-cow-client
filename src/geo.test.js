import { describe, expect, it } from 'vitest';
import { distanceKm, hasPoint, inKenya } from './geo';

describe('inKenya', () => {
  it('accepts points inside the API bounding box', () => {
    expect(inKenya(-1.2921, 36.8219)).toBe(true); // Nairobi
    expect(inKenya(-0.3031, 36.08)).toBe(true);   // Nakuru
  });

  it('rejects points outside it', () => {
    expect(inKenya(51.5, -0.12)).toBe(false);     // London
    expect(inKenya(-6.8, 39.28)).toBe(false);     // Dar es Salaam (south of -5)
  });
});

describe('hasPoint', () => {
  it('needs both coordinates', () => {
    expect(hasPoint({ latitude: -1.2, longitude: 36.8 })).toBe(true);
    expect(hasPoint({ latitude: -1.2, longitude: null })).toBe(false);
    expect(hasPoint({ latitude: '', longitude: 36.8 })).toBe(false);
    expect(hasPoint(null)).toBeFalsy();
  });

  it('treats 0 as a real coordinate', () => {
    expect(hasPoint({ latitude: 0, longitude: 37.9 })).toBe(true);
  });
});

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm({ lat: -1.29, lng: 36.82 }, { lat: -1.29, lng: 36.82 })).toBe(0);
  });

  it('gives Nairobi to Nakuru as roughly 137 km in a straight line', () => {
    const km = distanceKm({ lat: -1.2921, lng: 36.8219 }, { lat: -0.3031, lng: 36.08 });
    expect(km).toBeGreaterThan(132);
    expect(km).toBeLessThan(142);
  });
});
