// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  beatsToBMTTime,
  bmtToUTC,
  getHoloceneYearRange,
  reverseBeatClock,
} from '../../src/chronometers/reverse.js';

describe('reverse conversion', () => {
  describe('beatsToBMTTime', () => {
    it('converts @500.00 beats to 12:00:00 BMT', () => {
      expect(beatsToBMTTime(500)).toEqual({ hours: 12, minutes: 0, seconds: 0 });
    });

    it('converts @000.00 beats to 00:00:00 BMT', () => {
      expect(beatsToBMTTime(0)).toEqual({ hours: 0, minutes: 0, seconds: 0 });
    });

    it('converts @250.00 beats to 06:00:00 BMT', () => {
      expect(beatsToBMTTime(250)).toEqual({ hours: 6, minutes: 0, seconds: 0 });
    });
  });

  describe('bmtToUTC', () => {
    it('converts BMT 12:00 to UTC 11:00', () => {
      expect(bmtToUTC({ hours: 12, minutes: 0, seconds: 0 })).toEqual({
        hours: 11,
        minutes: 0,
        seconds: 0,
      });
    });

    it('wraps BMT 00:00 to UTC 23:00', () => {
      expect(bmtToUTC({ hours: 0, minutes: 0, seconds: 0 })).toEqual({
        hours: 23,
        minutes: 0,
        seconds: 0,
      });
    });
  });

  describe('getHoloceneYearRange', () => {
    it('returns Holocene year range spanning CNY to CNY', () => {
      // H11726 = Gregorian 2026 (2026 + 9700 = 11726)
      const range = getHoloceneYearRange(11726);
      expect(range.start.getUTCFullYear()).toBe(2026);
      expect(range.start.getUTCMonth()).toBe(1); // February (0-indexed)
      expect(range.end.getUTCFullYear()).toBe(2027);
    });
  });

  describe('reverseBeatClock', () => {
    it('returns time-only confidence with beats only', () => {
      const result = reverseBeatClock({ beats: 500 });
      expect(result.confidence).toBe('time-only');
      expect(result.disclaimer).toContain('86.4-second');
      expect(result.gregorianDate).toBe(null);
    });

    it('returns exact-datetime confidence with full composite key', () => {
      const result = reverseBeatClock({
        beats: 500,
        holoceneYear: 11726,
        lunisolarMonth: 1,
        lunisolarDay: 1,
      });
      expect(result.confidence).toBe('exact-datetime');
      expect(result.gregorianDate).toBeInstanceOf(Date);
    });

    it('returns year-range confidence with Holocene year only', () => {
      const result = reverseBeatClock({ holoceneYear: 11726 });
      expect(result.confidence).toBe('year-range');
      expect(result.yearRange).toBeDefined();
      expect(result.yearRange.start).toBeInstanceOf(Date);
      expect(result.yearRange.end).toBeInstanceOf(Date);
    });

    it('includes disclaimer about 86.4-second window when beats provided', () => {
      const result = reverseBeatClock({
        beats: 500,
        holoceneYear: 11726,
        lunisolarMonth: 1,
        lunisolarDay: 1,
      });
      expect(result.disclaimer).toContain('86.4-second');
    });
  });
});
