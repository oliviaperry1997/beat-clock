// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/solarLongitude.js';

describe('solarLongitude chronometer', () => {
  it('returns SL?? when lat/lon are null', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date, {})).toBe('SL??');
  });

  it('returns SL?? when lat/lon are undefined', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date)).toBe('SL??');
  });

  it('returns ~0° at vernal equinox 2026', () => {
    const date = new Date(Date.UTC(2026, 2, 20, 15, 0, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('SL00')).toBe(true);
  });

  it('returns ~90° at summer solstice 2026', () => {
    const date = new Date(Date.UTC(2026, 5, 21, 18, 0, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('SL09')).toBe(true);
  });

  it('returns ~180° at autumnal equinox 2026', () => {
    const date = new Date(Date.UTC(2026, 8, 23, 0, 0, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('SL18')).toBe(true);
  });

  it('returns ~270° at winter solstice 2026', () => {
    const date = new Date(Date.UTC(2026, 11, 21, 21, 0, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('SL27')).toBe(true);
  });

  it('returns valid string for arbitrary date and location', () => {
    const date = new Date();
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result).toMatch(/^SL\d{3}$/);
  });
});
