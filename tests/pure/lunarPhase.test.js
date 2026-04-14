// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/lunarPhase.js';

describe('lunarPhase chronometer', () => {
  it('returns LP?? when lat/lon are null', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date, {})).toBe('LP??');
  });

  it('returns LP?? when lat/lon are undefined', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date)).toBe('LP??');
  });

  it('returns ~0° at new moon Jan 2026', () => {
    const date = new Date(Date.UTC(2026, 0, 18, 20, 0, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('LP00')).toBe(true);
  });

  it('returns ~180° at full moon Feb 2026', () => {
    const date = new Date(Date.UTC(2026, 1, 1, 22, 30, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('LP18')).toBe(true);
  });

  it('returns ~0° at new moon Feb 2026', () => {
    const date = new Date(Date.UTC(2026, 1, 17, 12, 30, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('LP00')).toBe(true);
  });

  it('returns ~180° at full moon Mar 2026', () => {
    const date = new Date(Date.UTC(2026, 2, 3, 12, 0, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('LP18')).toBe(true);
  });

  it('returns valid string for arbitrary date and location', () => {
    const date = new Date();
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result).toMatch(/^LP\d{3}$/);
  });
});
