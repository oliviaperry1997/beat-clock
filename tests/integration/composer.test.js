// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { compose } from '../../src/chronometers/index.js';

describe('composer integration', () => {
  it('returns object with exactly 4 keys', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, {});
    expect(Object.keys(result)).toEqual(['holocene', 'beats', 'solar', 'lunisolar']);
  });

  it('returns number for holocene value', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, {});
    expect(typeof result.holocene).toBe('number');
    expect(result.holocene).toBe(11726);
  });

  it('returns beats starting with @', () => {
    const date = new Date(Date.UTC(2026, 2, 1, 12, 0, 0));
    const result = compose(date, {});
    expect(result.beats.startsWith('@')).toBe(true);
  });

  it('returns S?? when lat/lon are null', () => {
    const date = new Date(Date.UTC(2026, 2, 1, 12, 0, 0));
    const result = compose(date, {});
    expect(result.solar).toBe('S??');
  });

  it('returns valid solar for known location', () => {
    const date = new Date(Date.UTC(2026, 2, 1, 12, 0, 0));
    const result = compose(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.solar).toMatch(/^[SN]\d{2}$/);
  });

  it('returns lunisolar with month, day, isLeap', () => {
    const date = new Date(Date.UTC(2026, 1, 17)); // CNY 2026
    const result = compose(date, {});
    expect(result.lunisolar).toHaveProperty('month', 1);
    expect(result.lunisolar).toHaveProperty('day', 1);
    expect(result.lunisolar).toHaveProperty('isLeap', false);
    expect(result.lunisolar.moonAge).toBeGreaterThanOrEqual(0);
    expect(result.lunisolar.moonAge).toBeLessThanOrEqual(29.53);
    expect(result.lunisolar.illumination).toBeGreaterThanOrEqual(0);
    expect(result.lunisolar.illumination).toBeLessThanOrEqual(1);
  });
});
