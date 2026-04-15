// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { compose } from '../../src/chronometers/index.js';

describe('composer integration', () => {
  it('returns object with exactly 9 keys', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, {});
    expect(Object.keys(result)).toEqual([
      'holocene', 'beats', 'solar', 'lunisolar',
      'solarLongitude', 'lunarPhase', 'solarTime',
      'meghalayan', 'customEpoch'
    ]);
  });

  it('includes solarLongitude in result', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.solarLongitude).toMatch(/^SL\d{3}$/);
  });

  it('includes lunarPhase in result', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.lunarPhase).toMatch(/^LP\d{3}$/);
  });

  it('includes solarTime in result', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.solarTime).toBeTypeOf('object');
    expect(result.solarTime).toHaveProperty('hours');
    expect(result.solarTime).toHaveProperty('minutes');
    expect(result.solarTime).toHaveProperty('totalMinutes');
    expect(result.solarTime).toHaveProperty('degrees');
  });

  it('includes meghalayan in result', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, {});
    expect(result.meghalayan).toHaveProperty('stage', 'meghalayan');
    expect(result.meghalayan).toHaveProperty('year');
    expect(result.meghalayan).toHaveProperty('label');
  });

  it('includes customEpoch in result', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, {});
    expect(result.customEpoch).toBe('CE??'); // no customEpoch provided
  });

  it('customEpoch returns value when provided', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, { customEpoch: new Date(Date.UTC(2020, 0, 1)) });
    expect(result.customEpoch).toBe('CE7');
  });

  it('returns fallback when no location provided', () => {
    const date = new Date(Date.UTC(2026, 2, 1, 12, 0, 0));
    const result = compose(date, {});
    expect(result.solarLongitude).toBe('SL??');
    expect(result.lunarPhase).toBe('LP??');
    expect(result.solarTime).toBe(null); // returns null when location unavailable
    expect(result.meghalayan.stage).toBe('meghalayan'); // megahalayan doesn't need location
    expect(result.customEpoch).toBe('CE??');
  });

  it('existing modules still present', () => {
    const date = new Date(Date.UTC(2026, 2, 1));
    const result = compose(date, { latitude: 40.7, longitude: -74.0 });
    expect(typeof result.holocene).toBe('number');
    expect(result.beats.startsWith('@')).toBe(true);
    expect(result.solar).toMatch(/^[SN]\d{2}$/);
    expect(result.lunisolar).toHaveProperty('month');
  });
});
