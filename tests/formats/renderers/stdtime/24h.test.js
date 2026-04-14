// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/stdtime/24h.js';

describe('24h standard time renderer', () => {

  // --- Basic output format ---

  it('renders HH:MM at UTC midnight (offset 0)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)) };
    expect(render(data)).toBe('00:00');
  });

  it('renders HH:MM at UTC noon (offset 0)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 30, 45)) };
    expect(render(data)).toBe('12:30');
  });

  it('renders zero-padded hours and minutes', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 8, 5, 0)) };
    expect(render(data)).toBe('08:05');
  });

  it('renders 23:59 at one minute before UTC midnight', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 23, 59, 0)) };
    expect(render(data)).toBe('23:59');
  });

  // --- showSeconds flag ---

  it('renders HH:MM:SS when opts.showSeconds is true', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 8, 5, 30)) };
    expect(render(data, { showSeconds: true })).toBe('08:05:30');
  });

  it('renders HH:MM when opts.showSeconds is false', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 8, 5, 30)) };
    expect(render(data, { showSeconds: false })).toBe('08:05');
  });

  it('zero-pads seconds when showSeconds is true', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 10, 3, 5)) };
    expect(render(data, { showSeconds: true })).toBe('10:03:05');
  });

  // --- Meridian offset: positive ---

  it('applies positive integer meridianOffset (UTC+3)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 9, 0, 0)) };
    expect(render(data, { meridianOffset: 3 })).toBe('12:00');
  });

  it('applies meridianOffset 0 (no change)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 15, 30, 0)) };
    expect(render(data, { meridianOffset: 0 })).toBe('15:30');
  });

  // --- Fractional meridian offsets ---

  it('handles IST offset +5.5h — hours floored, minutes unchanged', () => {
    // UTC 08:30 + 5.5h = 13.5h → floor(13.5) = 13, minutes still 30 → 13:30
    const data = { now: new Date(Date.UTC(2026, 0, 1, 8, 30, 0)) };
    expect(render(data, { meridianOffset: 5.5 })).toBe('13:30');
  });

  it('handles IST offset +5.5h — fractional part does not bleed into minutes', () => {
    // UTC 07:30 + 5.5h = 12.5h → floor(12.5) = 12 → 12:30 (not 13:00 or 12:60)
    const data = { now: new Date(Date.UTC(2026, 0, 1, 7, 30, 0)) };
    expect(render(data, { meridianOffset: 5.5 })).toBe('12:30');
  });

  it('handles NPT offset +5.75h', () => {
    // UTC 12:00 + 5.75h = 17.75h → floor = 17, minutes still 00
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0)) };
    expect(render(data, { meridianOffset: 5.75 })).toBe('17:00');
  });

  // --- Negative meridian offsets ---

  it('applies negative meridianOffset (UTC-5)', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 18, 0, 0)) };
    expect(render(data, { meridianOffset: -5 })).toBe('13:00');
  });

  it('handles negative fractional offset (-0.5h)', () => {
    // UTC 12:30 - 0.5h = 11.5h → floor(11.5) = 11, minutes still 30 from UTC → 11:30
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 30, 0)) };
    expect(render(data, { meridianOffset: -0.5 })).toBe('11:30');
  });

  // --- Midnight crossing ---

  it('wraps forward across midnight: UTC 23:00 + offset +3h = 02:00', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 23, 0, 0)) };
    expect(render(data, { meridianOffset: 3 })).toBe('02:00');
  });

  it('wraps backward across midnight: UTC 01:00 + offset -3h = 22:00', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 1, 0, 0)) };
    expect(render(data, { meridianOffset: -3 })).toBe('22:00');
  });

  it('midnight crossing with fractional: UTC 22:30 + 5.5h wraps correctly', () => {
    // UTC 22:30 + 5.5h = 27.5h → 27.5 % 24 = 3.5 → floor(3.5) = 3 → 03:30
    const data = { now: new Date(Date.UTC(2026, 0, 1, 22, 30, 0)) };
    expect(render(data, { meridianOffset: 5.5 })).toBe('03:30');
  });

  // --- Extreme offsets ---

  it('handles extreme positive offset +14h', () => {
    // UTC 12:00 + 14h = 26h → wraps to 02:00
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0)) };
    expect(render(data, { meridianOffset: 14 })).toBe('02:00');
  });

  it('handles extreme negative offset -12h', () => {
    // UTC 06:00 - 12h = -6h → wraps to 18:00
    const data = { now: new Date(Date.UTC(2026, 0, 1, 6, 0, 0)) };
    expect(render(data, { meridianOffset: -12 })).toBe('18:00');
  });

  // --- Error fallbacks ---

  it('returns ??:?? when data is null', () => {
    expect(render(null)).toBe('??:??');
  });

  it('returns ??:?? when data is undefined', () => {
    expect(render(undefined)).toBe('??:??');
  });

  it('falls back to new Date() when data.now is undefined (data={})', () => {
    expect(render({})).toMatch(/^\d{2}:\d{2}$/); // falls back to new Date()
  });

  it('falls back to new Date() when data.now is null', () => {
    // null is not instanceof Date → falls back to new Date()
    expect(render({ now: null })).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns ??:?? when data.now is an invalid Date', () => {
    // new Date('invalid') is instanceof Date but isNaN → falls back to new Date()
    expect(render({ now: new Date('invalid') })).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns ??:??:?? (with seconds) when data is null and showSeconds is true', () => {
    expect(render(null, { showSeconds: true })).toBe('??:??:??');
  });

  // --- Default opts ---

  it('uses meridianOffset 0 when opts is omitted', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 14, 22, 0)) };
    expect(render(data)).toBe('14:22');
  });

  it('uses meridianOffset 0 when opts.meridianOffset is not set', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1, 14, 22, 0)) };
    expect(render(data, {})).toBe('14:22');
  });

});
