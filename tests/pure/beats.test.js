// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/beats.js';

describe('beats chronometer', () => {
  it('returns @000.00 at 23:00 UTC (midnight BMT)', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 23, 0, 0));
    expect(compute(date)).toBe('@000.00');
  });

  it('returns @500.00 at 11:00 UTC (noon BMT)', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 11, 0, 0));
    expect(compute(date)).toBe('@500.00');
  });

  it('returns @041.66 at 00:00 UTC (1am BMT)', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    expect(compute(date)).toBe('@041.66');
  });

  it('returns @999.98 at 22:59:59 UTC', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 22, 59, 59));
    expect(compute(date)).toBe('@999.98');
  });

  it('returns string starting with @', () => {
    const date = new Date();
    const result = compute(date);
    expect(result.startsWith('@')).toBe(true);
  });
});
