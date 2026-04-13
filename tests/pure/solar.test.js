// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/solar.js';

describe('solar chronometer', () => {
  it('returns S?? when lat/lon are null', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date, {})).toBe('S??');
  });

  it('returns S?? when lat/lon are undefined', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    expect(compute(date)).toBe('S??');
  });

  it('returns string starting with S or N for valid location', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
    const result = compute(date, { latitude: 40.7, longitude: -74.0 });
    expect(result.startsWith('S') || result.startsWith('N')).toBe(true);
    // Should be S## or N## (prefix + 2 digits)
    expect(result).toMatch(/^[SN]\d{2}$/);
  });

  it('returns S?? for polar region in December (Svalbard)', () => {
    const date = new Date(Date.UTC(2025, 11, 21, 12, 0, 0));
    const result = compute(date, { latitude: 78.0, longitude: 16.0 });
    expect(result).toBe('S??');
  });
});
