// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/solarTime.js';
import { eqtime, julian } from 'astronomia';

describe('solarTime chronometer', () => {
  it('returns ST?? when lat/lon are null', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date, {})).toBe('ST??');
  });

  it('returns ST?? when lat/lon are undefined', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date)).toBe('ST??');
  });

  it('returns valid time string at UTC on equinox', () => {
    const date = new Date(Date.UTC(2026, 2, 20, 12, 0, 0));
    const result = compute(date, { latitude: 51.5, longitude: 0 });
    expect(result).toMatch(/^ST\d{2}:\d{2}$/);
  });

  it('EOT ~-14min on Feb 11', () => {
    // At longitude 0, solar time = UTC + EOT
    const date = new Date(Date.UTC(2026, 1, 11, 12, 0, 0));
    const result = compute(date, { latitude: 51.5, longitude: 0 });
    // Extract minutes from result
    const match = result.match(/^ST(\d{2}):(\d{2})$/);
    expect(match).not.toBeNull();
    const resultMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
    // UTC noon = 720 minutes, EOT ~-14 min → solar ~706 min (11:46)
    const expectedOffset = -14; // minutes
    expect(Math.abs(resultMinutes - 720 - expectedOffset)).toBeLessThan(2);
  });

  it('EOT ~+16min on Nov 3', () => {
    const date = new Date(Date.UTC(2026, 10, 3, 12, 0, 0));
    const result = compute(date, { latitude: 51.5, longitude: 0 });
    const match = result.match(/^ST(\d{2}):(\d{2})$/);
    expect(match).not.toBeNull();
    const resultMinutes = parseInt(match[1]) * 60 + parseInt(match[2]);
    const expectedOffset = 16; // minutes
    expect(Math.abs(resultMinutes - 720 - expectedOffset)).toBeLessThan(2);
  });

  it('returns different time for different longitude', () => {
    const date = new Date(Date.UTC(2026, 2, 20, 12, 0, 0));
    const result1 = compute(date, { latitude: 51.5, longitude: 0 });
    const result2 = compute(date, { latitude: 51.5, longitude: -74.0 });
    expect(result1).not.toBe(result2);
  });

  it('handles midnight crossing correctly', () => {
    // UTC 23:50 with large positive offset (e.g., lon=150° = +600 min = +10 hours)
    const date = new Date(Date.UTC(2026, 2, 20, 23, 50, 0));
    const result = compute(date, { latitude: -33.9, longitude: 150.0 });
    expect(result).toMatch(/^ST\d{2}:\d{2}$/);
    // Should wrap to next day — verify it's a valid time
    const match = result.match(/^ST(\d{2}):(\d{2})$/);
    const hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    expect(hours).toBeGreaterThanOrEqual(0);
    expect(hours).toBeLessThan(24);
    expect(minutes).toBeGreaterThanOrEqual(0);
    expect(minutes).toBeLessThan(60);
  });
});
