// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render as render24h }          from '../../../../src/formats/renderers/stdtime/24h.js';
import { render as renderDecimal }      from '../../../../src/formats/renderers/stdtime/decimal.js';
import { render as renderLongitudinal } from '../../../../src/formats/renderers/stdtime/longitudinal.js';
import { compute as computeBeats }      from '../../../../src/chronometers/beats.js';

// ---------------------------------------------------------------------------
// Helper: create a Date at an exact UTC time
// ---------------------------------------------------------------------------
function utc(h, m = 0, s = 0, ms = 0) {
  return new Date(Date.UTC(2026, 0, 1, h, m, s, ms));
}

// ---------------------------------------------------------------------------
// 1. Cross-renderer consistency: same meridian moment maps consistently
//    across all three renderers
// ---------------------------------------------------------------------------

describe('cross-renderer consistency', () => {

  it('at UTC noon offset 0: 24h=12:00, decimal=@500.00, longitudinal=⌚ 180.00°', () => {
    const data = { now: utc(12) };
    const opts = { meridianOffset: 0 };
    expect(render24h(data, opts)).toBe('12:00');
    expect(renderDecimal(data, opts)).toBe('@500.00');
    expect(renderLongitudinal(data, opts)).toBe('⌚ 180.00°');
  });

  it('at UTC midnight offset 0: 24h=00:00, decimal=@000.00, longitudinal=⌚ 0.00°', () => {
    const data = { now: utc(0) };
    const opts = { meridianOffset: 0 };
    expect(render24h(data, opts)).toBe('00:00');
    expect(renderDecimal(data, opts)).toBe('@000.00');
    expect(renderLongitudinal(data, opts)).toBe('⌚ 0.00°');
  });

  it('at 06:00 UTC offset 0: 24h=06:00, decimal=@250.00, longitudinal=⌚ 90.00°', () => {
    const data = { now: utc(6) };
    const opts = { meridianOffset: 0 };
    expect(render24h(data, opts)).toBe('06:00');
    expect(renderDecimal(data, opts)).toBe('@250.00');
    expect(renderLongitudinal(data, opts)).toBe('⌚ 90.00°');
  });

  it('at 18:00 UTC offset 0: 24h=18:00, decimal=@750.00, longitudinal=⌚ 270.00°', () => {
    const data = { now: utc(18) };
    const opts = { meridianOffset: 0 };
    expect(render24h(data, opts)).toBe('18:00');
    expect(renderDecimal(data, opts)).toBe('@750.00');
    expect(renderLongitudinal(data, opts)).toBe('⌚ 270.00°');
  });

  it('all three renderers wrap midnight correctly for offset +3h (22:00 UTC → 01:00 local)', () => {
    // UTC 22:00 + 3h = 25h → wraps to 1h
    const data = { now: utc(22) };
    const opts = { meridianOffset: 3 };

    expect(render24h(data, opts)).toBe('01:00');

    // 1h = 3600000ms / 86400 = 41.66 beats (floored)
    expect(renderDecimal(data, opts)).toBe('@041.66');

    // 1h = 3600000ms / 86400000 * 360 = 15°
    expect(renderLongitudinal(data, opts)).toBe('⌚ 15.00°');
  });

  it('all three renderers consistent for negative offset crossing midnight backward (02:00 UTC − 4h → 22:00)', () => {
    const data = { now: utc(2) };
    const opts = { meridianOffset: -4 };

    expect(render24h(data, opts)).toBe('22:00');

    // 22h = 79200000ms / 86400 = 916.66 beats (floored)
    expect(renderDecimal(data, opts)).toBe('@916.66');

    // 22h = 79200000ms / 86400000 * 360 = 330°
    expect(renderLongitudinal(data, opts)).toBe('⌚ 330.00°');
  });

});

// ---------------------------------------------------------------------------
// 2. Beats formula pin: decimal renderer at meridianOffset=1 must match beats.js
// ---------------------------------------------------------------------------

describe('decimal renderer formula pin against beats.js', () => {

  const testDates = [
    utc(0),          // midnight
    utc(6),          // quarter day
    utc(12),         // noon
    utc(18),         // three-quarter day
    utc(23, 59, 59), // one second before midnight
    utc(1, 30, 45),  // arbitrary time
  ];

  for (const date of testDates) {
    it(`decimal at meridianOffset=1 matches beats.js at ${date.toISOString()}`, () => {
      const expected = computeBeats(date); // BMT = UTC+1
      const actual = renderDecimal({ now: date }, { meridianOffset: 1 });
      expect(actual).toBe(expected);
    });
  }

});

// ---------------------------------------------------------------------------
// 3. Fractional offsets: sub-hour meridians (IST +5.5, NPT +5.75, IRST +3.5)
// ---------------------------------------------------------------------------

describe('fractional meridian offsets', () => {

  it('IST +5.5h: UTC 00:00 → 24h shows 05:00 (floor(0+5.5)=5)', () => {
    // UTC 00:00 + 5.5h: Math.floor(5.5) = 5, minutes = 0 (from UTC)
    const data = { now: utc(0) };
    expect(render24h(data, { meridianOffset: 5.5 })).toBe('05:00');
  });

  it('IST +5.5h: UTC 00:30 → 24h shows 05:30 (floor(0+5.5)=5, UTC minutes=30)', () => {
    const data = { now: utc(0, 30) };
    expect(render24h(data, { meridianOffset: 5.5 })).toBe('05:30');
  });

  it('NPT +5.75h: UTC 12:00 → 24h shows 17:00 (floor(12+5.75)=floor(17.75)=17)', () => {
    const data = { now: utc(12) };
    expect(render24h(data, { meridianOffset: 5.75 })).toBe('17:00');
  });

  it('IRST +3.5h: UTC 20:30 → 24h shows 23:30 (floor(20+3.5)=floor(23.5)=23)', () => {
    const data = { now: utc(20, 30) };
    expect(render24h(data, { meridianOffset: 3.5 })).toBe('23:30');
  });

  it('ACST +9.5h: decimal renderer handles fractional offset correctly', () => {
    // UTC midnight + 9.5h = 34200000ms → 34200000 / 86400 = 395.833... → @395.83
    const data = { now: utc(0) };
    expect(renderDecimal(data, { meridianOffset: 9.5 })).toBe('@395.83');
  });

  it('NPT +5.75h: longitudinal renderer handles fractional offset correctly', () => {
    // UTC midnight + 5.75h = 20700000ms → 20700000 / 86400000 * 360 = 86.25°
    const data = { now: utc(0) };
    expect(renderLongitudinal(data, { meridianOffset: 5.75 })).toBe('⌚ 86.25°');
  });

});

// ---------------------------------------------------------------------------
// 4. Extreme offsets (+14h, -12h, ±24h edge)
// ---------------------------------------------------------------------------

describe('extreme meridian offsets', () => {

  it('+14h (UTC+14, Kiribati): UTC 12:00 → 24h=02:00 (floor((12+14)%24)=floor(2)=2)', () => {
    const data = { now: utc(12) };
    expect(render24h(data, { meridianOffset: 14 })).toBe('02:00');
  });

  it('-12h (UTC-12): UTC 06:00 → 24h=18:00 (floor((-6%24+24)%24)=18)', () => {
    const data = { now: utc(6) };
    expect(render24h(data, { meridianOffset: -12 })).toBe('18:00');
  });

  it('offset +24h is equivalent to offset 0 for all renderers', () => {
    const data = { now: utc(10, 30) };
    expect(render24h(data, { meridianOffset: 24 })).toBe(render24h(data, { meridianOffset: 0 }));
    expect(renderDecimal(data, { meridianOffset: 24 })).toBe(renderDecimal(data, { meridianOffset: 0 }));
    expect(renderLongitudinal(data, { meridianOffset: 24 })).toBe(renderLongitudinal(data, { meridianOffset: 0 }));
  });

  it('offset -24h is equivalent to offset 0 for all renderers', () => {
    const data = { now: utc(10, 30) };
    expect(render24h(data, { meridianOffset: -24 })).toBe(render24h(data, { meridianOffset: 0 }));
    expect(renderDecimal(data, { meridianOffset: -24 })).toBe(renderDecimal(data, { meridianOffset: 0 }));
    expect(renderLongitudinal(data, { meridianOffset: -24 })).toBe(renderLongitudinal(data, { meridianOffset: 0 }));
  });

  it('decimal renderer: negative offset never produces a negative beats value', () => {
    const offsets = [-1, -3, -6, -12, -12.5];
    for (const meridianOffset of offsets) {
      const data = { now: utc(0) };
      const result = renderDecimal(data, { meridianOffset });
      const numeric = parseFloat(result.slice(1)); // strip '@'
      expect(numeric).toBeGreaterThanOrEqual(0);
    }
  });

  it('longitudinal renderer: output always in [0°, 360°) for any combination of offset and time', () => {
    const times = [utc(0), utc(6), utc(12), utc(18), utc(23, 59, 59)];
    const offsets = [-12, -6, -3, -1, 0, 1, 3, 6, 14];
    for (const now of times) {
      for (const meridianOffset of offsets) {
        const result = renderLongitudinal({ now }, { meridianOffset });
        // strip '⌚ ' prefix (3 chars) and '°' suffix (1 char)
        const numStr = result.slice(2, -1);
        const deg = parseFloat(numStr);
        expect(deg).toBeGreaterThanOrEqual(0);
        expect(deg).toBeLessThan(360);
      }
    }
  });

});

// ---------------------------------------------------------------------------
// 5. Precision: millisecond-level accuracy
// ---------------------------------------------------------------------------

describe('millisecond precision', () => {

  it('decimal renderer includes milliseconds: 864ms difference = exactly 0.01 beats', () => {
    // 86400ms = 1 beat; 864ms = 0.01 beats
    const data0   = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 0)) };
    const data864 = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0, 864)) };
    expect(renderDecimal(data0,   { meridianOffset: 0 })).toBe('@500.00');
    expect(renderDecimal(data864, { meridianOffset: 0 })).toBe('@500.01');
  });

  it('longitudinal renderer includes sub-minute precision: 12:01:00 → 180.25°', () => {
    // 12h 1m = 43260000ms / 86400000 * 360 = 180.25°
    const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 1, 0, 0)) };
    expect(renderLongitudinal(data, { meridianOffset: 0 })).toBe('⌚ 180.25°');
  });

  it('24h renderer: minutes are taken from UTC (fractional offset does not affect minute display)', () => {
    // UTC 10:45, offset +5.5h → adjustedHours = floor(10+5.5) = floor(15.5) = 15; minutes = 45 (from UTC)
    const data = { now: utc(10, 45) };
    expect(render24h(data, { meridianOffset: 5.5 })).toBe('15:45');
  });

});

// ---------------------------------------------------------------------------
// 6. Error state consistency across renderers
// ---------------------------------------------------------------------------

describe('error state consistency across renderers', () => {

  it('24h returns ??:?? for null data', () => {
    expect(render24h(null)).toBe('??:??');
  });

  it('24h returns ??:?? for undefined data', () => {
    expect(render24h(undefined)).toBe('??:??');
  });

  it('decimal returns @??? for null data', () => {
    expect(renderDecimal(null)).toBe('@???');
  });

  it('decimal returns @??? for undefined data', () => {
    expect(renderDecimal(undefined)).toBe('@???');
  });

  it('longitudinal returns ⌚ ???° for null data', () => {
    expect(renderLongitudinal(null)).toBe('⌚ ???°');
  });

  it('longitudinal returns ⌚ ???° for undefined data', () => {
    expect(renderLongitudinal(undefined)).toBe('⌚ ???°');
  });

  it('all three renderers accept data={} without throwing (fall back to new Date())', () => {
    expect(() => render24h({})).not.toThrow();
    expect(() => renderDecimal({})).not.toThrow();
    expect(() => renderLongitudinal({})).not.toThrow();
  });

  it('all three renderers accept data={now: new Date("invalid")} without throwing', () => {
    const data = { now: new Date('invalid') };
    expect(() => render24h(data)).not.toThrow();
    expect(() => renderDecimal(data)).not.toThrow();
    expect(() => renderLongitudinal(data)).not.toThrow();
  });

  it('all three renderers return strings (never null, undefined, or throwing)', () => {
    const data = { now: utc(15, 30) };
    expect(typeof render24h(data)).toBe('string');
    expect(typeof renderDecimal(data)).toBe('string');
    expect(typeof renderLongitudinal(data)).toBe('string');
  });

});

// ---------------------------------------------------------------------------
// 7. Registry smoke: renderers accessible via getRenderer()
// ---------------------------------------------------------------------------

describe('registry integration smoke test', () => {

  it('getRenderer("stdTime", "24h") returns the render function', async () => {
    const { getRenderer } = await import('../../../../src/formats/registry.js');
    const fn = getRenderer('stdTime', '24h');
    expect(typeof fn).toBe('function');
    const data = { now: utc(12) };
    expect(fn(data)).toBe('12:00');
  });

  it('getRenderer("stdTime", "decimal") returns the render function', async () => {
    const { getRenderer } = await import('../../../../src/formats/registry.js');
    const fn = getRenderer('stdTime', 'decimal');
    expect(typeof fn).toBe('function');
    const data = { now: utc(12) };
    expect(fn(data)).toBe('@500.00');
  });

  it('getRenderer("stdTime", "longitudinal") returns the render function', async () => {
    const { getRenderer } = await import('../../../../src/formats/registry.js');
    const fn = getRenderer('stdTime', 'longitudinal');
    expect(typeof fn).toBe('function');
    const data = { now: utc(12) };
    expect(fn(data)).toBe('⌚ 180.00°');
  });

});
