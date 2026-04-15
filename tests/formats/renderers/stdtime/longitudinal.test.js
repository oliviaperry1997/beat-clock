// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/stdtime/longitudinal.js';

describe('longitudinal standard time renderer', () => {

  // --- Basic output at known times ---

  it('returns ⧖ 0.00° at UTC midnight with offset 0', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('⧖ 0.00°');
  });

  it('returns ⧖ 180.00° at UTC noon with offset 0', () => {
    // noon = 43200000ms / 86400000 * 360 = 180°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('⧖ 180.00°');
  });

  it('returns ⧖ 90.00° at 06:00 UTC with offset 0', () => {
    // 6h = 21600000ms / 86400000 * 360 = 90°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 6, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('⧖ 90.00°');
  });

  it('returns ⧖ 270.00° at 18:00 UTC with offset 0', () => {
    // 18h = 64800000ms / 86400000 * 360 = 270°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 18, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('⧖ 270.00°');
  });

  // --- Symbol and format ---

  it('uses ⧖ (U+29D6 white hourglass) symbol — NOT ☉ (sun)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    const result = render(data);
    expect(result.startsWith('⧖')).toBe(true);
    expect(result.startsWith('☉')).toBe(false);
  });

  it('has exactly one space between ⧖ and the number', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    const result = render(data);
    // ⧖ is 3 bytes in UTF-8 but 1 char in JS
    expect(result[1]).toBe(' ');
  });

  it('ends with ° (degree symbol)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    const result = render(data);
    expect(result.endsWith('°')).toBe(true);
  });

  it('has exactly 2 decimal places', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    const result = render(data);
    // extract numeric part
    const numStr = result.slice(2, -1); // remove '⧖ ' prefix and '°' suffix
    expect(numStr).toMatch(/^\d+\.\d{2}$/);
  });

  // --- Specific degree values ---

  it('returns ⧖ 270.25° for a known time', () => {
    // 270.25° → 270.25 / 360 * 86400000 = 64860000ms = 18h 1m 0s
    // Verify: 18*3600000 + 1*60000 = 64860000, 64860000/86400000*360 = 270.25°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 18, 1, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('⧖ 270.25°');
  });

  it('output stays in [0°, 360°) range at midnight (should be 0.00°, not 360.00°)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('⧖ 0.00°');
  });

  it('floors near-midnight output to ⧖ 359.99° instead of rounding up to 360.00°', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 23, 59, 59, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('⧖ 359.99°');
  });

  // --- Meridian offset ---

  it('applies positive meridianOffset: UTC midnight + 6h = ⧖ 90.00°', () => {
    // 0ms + 6h = 21600000ms → 90°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 6 })).toBe('⧖ 90.00°');
  });

  it('applies negative meridianOffset: UTC noon - 6h = ⧖ 90.00°', () => {
    // 12h - 6h = 6h = 21600000ms → 90°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data, { meridianOffset: -6 })).toBe('⧖ 90.00°');
  });

  it('handles fractional offset IST +5.5h', () => {
    // UTC midnight (0ms) + 5.5h = 19800000ms → 19800000/86400000*360 = 82.50°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 5.5 })).toBe('⧖ 82.50°');
  });

  // --- Midnight crossing ---

  it('wraps forward across midnight: UTC 23:00 + offset +3h', () => {
    // 23h + 3h = 26h → wraps to 2h = 7200000ms → 30°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 23, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 3 })).toBe('⧖ 30.00°');
  });

  it('wraps backward across midnight: UTC 01:00 + offset -3h', () => {
    // 1h - 3h = -2h → wraps to 22h = 79200000ms → 79200000/86400000*360 = 330°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 1, 0, 0, 0)) };
    expect(render(data, { meridianOffset: -3 })).toBe('⧖ 330.00°');
  });

  // --- Extreme offsets ---

  it('handles extreme positive offset +14h', () => {
    // UTC noon (180°) + 14h = 26h → wraps to 2h = 7200000ms → 30°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data, { meridianOffset: 14 })).toBe('⧖ 30.00°');
  });

  it('handles extreme negative offset -12h', () => {
    // UTC 6h (90°) - 12h = -6h → wraps to 18h = 64800000ms → 270°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 6, 0, 0, 0)) };
    expect(render(data, { meridianOffset: -12 })).toBe('⧖ 270.00°');
  });

  it('negative offset does not produce negative degrees', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0, 0)) };
    const result = render(data, { meridianOffset: -12 });
    // Extract degrees value
    const numStr = result.slice(2, -1);
    expect(parseFloat(numStr)).toBeGreaterThanOrEqual(0);
  });

  // --- Error fallbacks ---

  it('returns ⧖ ???° when data is null', () => {
    expect(render(null)).toBe('⧖ ???°');
  });

  it('returns ⧖ ???° when data is undefined', () => {
    expect(render(undefined)).toBe('⧖ ???°');
  });

  it('falls back to new Date() when data.now is absent', () => {
    const result = render({});
    expect(result).toMatch(/^⧖ \d+\.\d{2}°$/);
  });

  it('falls back to new Date() when data.now is an invalid Date', () => {
    const result = render({ now: new Date('invalid') });
    expect(result).toMatch(/^⧖ \d+\.\d{2}°$/);
  });

  // --- Default opts ---

  it('defaults meridianOffset to 0 when opts is omitted', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data)).toBe('⧖ 180.00°');
  });

  it('defaults meridianOffset to 0 when opts.meridianOffset is not set', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    expect(render(data, {})).toBe('⧖ 180.00°');
  });

});
