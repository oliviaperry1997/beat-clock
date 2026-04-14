// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/stdtime/decimal.js';
import { compute } from '../../../../src/chronometers/beats.js';

describe('decimal beats standard time renderer', () => {

  // --- Basic output format ---

  it('returns @000.00 at UTC midnight with offset 0', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('@000.00');
  });

  it('returns @500.00 at UTC noon with offset 0', () => {
    // noon = 43200000 ms / 86400 = 500 beats exactly
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('@500.00');
  });

  it('returns @250.00 at 06:00 UTC with offset 0', () => {
    // 21600000 ms / 86400 = 250 beats
    const data = { now: new Date(Date.UTC(2026, 0, 1, 6, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('@250.00');
  });

  it('returns @750.00 at 18:00 UTC with offset 0', () => {
    // 64800000 ms / 86400 = 750 beats
    const data = { now: new Date(Date.UTC(2026, 0, 1, 18, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('@750.00');
  });

  // --- Zero-padding ---

  it('zero-pads beats below 10 to produce @00X.XX format', () => {
    // 1h = 41.67 beats (1 * 3600000 / 86400 = 41.666...)
    const data = { now: new Date(Date.UTC(2026, 0, 1, 1, 0, 0, 0)) };
    const result = render(data, { meridianOffset: 0 });
    expect(result).toMatch(/^@0\d\d\.\d\d$/); // @0XX.XX
  });

  it('output string always starts with @', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 10, 0, 0, 0)) };
    expect(render(data).charAt(0)).toBe('@');
  });

  it('output string has exactly 7 characters (@NNN.NN)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 10, 0, 0, 0)) };
    expect(render(data).length).toBe(7);
  });

  // --- Meridian offset ---

  it('applies positive meridianOffset: UTC midnight + 6h = @250.00', () => {
    // 0ms + 6h offset = 21600000ms → 250 beats
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 6 })).toBe('@250.00');
  });

  it('applies negative meridianOffset: UTC noon - 6h = @250.00', () => {
    // 12h UTC - 6h = 6h = 21600000ms → 250 beats
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data, { meridianOffset: -6 })).toBe('@250.00');
  });

  it('handles fractional offset IST +5.5h correctly', () => {
    // UTC midnight (0ms) + 5.5h = 19800000ms → 229.17 beats
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    const result = render(data, { meridianOffset: 5.5 });
    expect(result).toBe('@229.17');
  });

  // --- Cross-check: decimal renderer at offset +1h must match beats.js at same UTC time ---

  it('at meridianOffset +1h (BMT), output matches beats.js compute() exactly', () => {
    const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0));
    const beatsJsResult = compute(date);
    const decimalResult = render({ now: date }, { meridianOffset: 1 });
    expect(decimalResult).toBe(beatsJsResult);
  });

  it('at meridianOffset +1h, output matches beats.js at a different UTC time', () => {
    const date = new Date(Date.UTC(2026, 3, 14, 8, 30, 0, 0));
    const beatsJsResult = compute(date);
    const decimalResult = render({ now: date }, { meridianOffset: 1 });
    expect(decimalResult).toBe(beatsJsResult);
  });

  // --- Midnight crossing ---

  it('wraps forward across midnight: UTC 23:00 + 3h offset', () => {
    // 23h + 3h = 26h → wraps to 2h = 7200000ms → 83.33 beats
    const data = { now: new Date(Date.UTC(2026, 0, 1, 23, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 3 })).toBe('@083.33');
  });

  it('wraps backward across midnight: UTC 01:00 - 3h offset', () => {
    // 1h - 3h = -2h → wraps to 22h = 79200000ms → 916.67 beats
    const data = { now: new Date(Date.UTC(2026, 0, 1, 1, 0, 0, 0)) };
    expect(render(data, { meridianOffset: -3 })).toBe('@916.67');
  });

  // --- Extreme offsets ---

  it('handles extreme positive offset +14h', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    const result = render(data, { meridianOffset: 14 });
    // 12h + 14h = 26h → wraps to 2h = 7200000ms → 83.33 beats
    expect(result).toBe('@083.33');
  });

  it('handles extreme negative offset -12h', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 6, 0, 0, 0)) };
    const result = render(data, { meridianOffset: -12 });
    // 6h - 12h = -6h → wraps to 18h = 64800000ms → 750.00 beats
    expect(result).toBe('@750.00');
  });

  it('negative offset does not produce negative beats', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    const result = render(data, { meridianOffset: -12 });
    expect(result).not.toContain('-');
    expect(result.charAt(0)).toBe('@');
  });

  // --- Error fallbacks ---

  it('returns @??? when data is null', () => {
    expect(render(null)).toBe('@???');
  });

  it('returns @??? when data is undefined', () => {
    expect(render(undefined)).toBe('@???');
  });

  it('falls back to new Date() when data.now is absent', () => {
    const result = render({});
    expect(result).toMatch(/^@\d{3}\.\d{2}$/);
  });

  it('falls back to new Date() when data.now is an invalid Date', () => {
    const result = render({ now: new Date('invalid') });
    expect(result).toMatch(/^@\d{3}\.\d{2}$/);
  });

  // --- Default opts ---

  it('defaults meridianOffset to 0 when opts is omitted', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data)).toBe('@500.00');
  });

  it('defaults meridianOffset to 0 when opts.meridianOffset is not set', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data, {})).toBe('@500.00');
  });

});
