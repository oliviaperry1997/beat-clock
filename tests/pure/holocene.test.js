// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/holocene.js';

describe('holocene chronometer', () => {
  it('returns correct Holocene year before CNY 2026', () => {
    // Feb 16, 2026 is before CNY (Feb 17)
    const date = new Date(Date.UTC(2026, 1, 16));
    expect(compute(date)).toBe(11725); // 2025 + 9700
  });

  it('returns correct Holocene year on CNY 2026', () => {
    const date = new Date(Date.UTC(2026, 1, 17));
    expect(compute(date)).toBe(11726); // 2026 + 9700
  });

  it('returns correct Holocene year before CNY 2025', () => {
    // Jan 1, 2025 is before CNY 2025 (Jan 29)
    const date = new Date(Date.UTC(2025, 0, 1));
    expect(compute(date)).toBe(11724); // 2024 + 9700
  });

  it('returns correct Holocene year for year 2000', () => {
    const date = new Date(Date.UTC(2000, 5, 15));
    expect(compute(date)).toBe(11700); // 2000 + 9700
  });

  it('returns a number', () => {
    const date = new Date();
    const result = compute(date);
    expect(typeof result).toBe('number');
  });
});
