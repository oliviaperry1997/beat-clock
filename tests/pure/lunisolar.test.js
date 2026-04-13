// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/lunisolar.js';

describe('lunisolar chronometer', () => {
  it('returns correct values for CNY 2026 (Feb 17, 2026)', () => {
    const date = new Date(Date.UTC(2026, 1, 17));
    const result = compute(date);
    expect(result).toHaveProperty('month', 1);
    expect(result).toHaveProperty('day', 1);
    expect(result).toHaveProperty('isLeap', false);
    expect(result.moonAge).toBeGreaterThanOrEqual(0);
    expect(result.moonAge).toBeLessThanOrEqual(29.53);
    expect(result.illumination).toBeGreaterThanOrEqual(0);
    expect(result.illumination).toBeLessThanOrEqual(1);
  });

  it('detects leap month for Jul 25, 2025 (leap 6th month day 1)', () => {
    const date = new Date(Date.UTC(2025, 6, 25));
    const result = compute(date);
    expect(result).toHaveProperty('month', 6);
    expect(result).toHaveProperty('day', 1);
    expect(result).toHaveProperty('isLeap', true);
    expect(result.moonAge).toBeGreaterThanOrEqual(0);
    expect(result.moonAge).toBeLessThanOrEqual(29.53);
    expect(result.illumination).toBeGreaterThanOrEqual(0);
    expect(result.illumination).toBeLessThanOrEqual(1);
  });

  it('returns valid values for spring equinox 2026', () => {
    const date = new Date(Date.UTC(2026, 2, 20));
    const result = compute(date);
    expect(typeof result.month).toBe('number');
    expect(typeof result.day).toBe('number');
    expect(typeof result.isLeap).toBe('boolean');
    expect(result.month).toBeGreaterThan(0);
    expect(result.month).toBeLessThanOrEqual(12);
    expect(result.day).toBeGreaterThan(0);
    expect(result.day).toBeLessThanOrEqual(30);
  });

  it('returns object with correct shape', () => {
    const date = new Date();
    const result = compute(date);
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('day');
    expect(result).toHaveProperty('isLeap');
    expect(typeof result.month).toBe('number');
    expect(typeof result.day).toBe('number');
    expect(typeof result.isLeap).toBe('boolean');
  });
});
