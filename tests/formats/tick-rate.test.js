import { describe, it, expect } from 'vitest';
import { tickRateForFormat } from '../../src/formats/tick-rate.js';

describe('tickRateForFormat', () => {
  it('returns one second for 24h format', () => {
    expect(tickRateForFormat('24h')).toBe(1000);
  });

  it('returns one centibeat for decimal format', () => {
    expect(tickRateForFormat('decimal')).toBe(864);
  });

  it('returns 800ms for longitudinal format', () => {
    expect(tickRateForFormat('longitudinal')).toBe(800);
  });

  it('falls back to decimal cadence for unknown formats', () => {
    expect(tickRateForFormat('unknown')).toBe(864);
  });
});
