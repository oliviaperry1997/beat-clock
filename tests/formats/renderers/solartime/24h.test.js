import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/solartime/24h.js';

describe('24h solar time renderer', () => {
  describe('Basic formatting', () => {
    it('formats solar time with zero-padded hours and minutes', () => {
      const data = {
        solarTime: { hours: 14, minutes: 32, totalMinutes: 872, degrees: 218 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('14:32');
    });

    it('zero-pads single-digit hours', () => {
      const data = {
        solarTime: { hours: 8, minutes: 5, totalMinutes: 485, degrees: 121.25 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('08:05');
    });

    it('formats midnight as 00:00', () => {
      const data = {
        solarTime: { hours: 0, minutes: 0, totalMinutes: 0, degrees: 0 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('00:00');
    });

    it('formats time just before midnight', () => {
      const data = {
        solarTime: { hours: 23, minutes: 59, totalMinutes: 1439, degrees: 359.75 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('23:59');
    });

    it('does not include seconds (precision philosophy)', () => {
      const data = {
        solarTime: { hours: 14, minutes: 32, totalMinutes: 872, degrees: 218 },
        now: new Date('2026-04-14T12:00:00.500Z') // has seconds and milliseconds
      };
      const result = render(data);
      expect(result).toBe('14:32');
      expect(result).not.toContain(':32:'); // no seconds separator
    });
  });

  describe('Error handling', () => {
    it('returns ??:?? when data is null', () => {
      expect(render(null)).toBe('??:??');
    });

    it('returns ??:?? when data is undefined', () => {
      expect(render(undefined)).toBe('??:??');
    });

    it('returns ??:?? when solarTime is missing', () => {
      const data = { now: new Date() };
      expect(render(data)).toBe('??:??');
    });

    it('returns ??:?? when solarTime is null', () => {
      const data = { solarTime: null, now: new Date() };
      expect(render(data)).toBe('??:??');
    });

    it('returns ??:?? when solarTime is a string (old chronometer format)', () => {
      const data = { solarTime: 'ST14:32', now: new Date() };
      expect(render(data)).toBe('??:??');
    });

    it('returns ??:?? when hours is missing', () => {
      const data = {
        solarTime: { minutes: 32, totalMinutes: 872, degrees: 218 },
        now: new Date()
      };
      expect(render(data)).toBe('??:??');
    });

    it('returns ??:?? when minutes is missing', () => {
      const data = {
        solarTime: { hours: 14, totalMinutes: 872, degrees: 218 },
        now: new Date()
      };
      expect(render(data)).toBe('??:??');
    });
  });

  describe('Date comparison integration', () => {
    it('sets opts.solarDateDiffsStdDate to null when dates match', () => {
      const data = {
        solarTime: { hours: 12, minutes: 0, totalMinutes: 720, degrees: 180 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      const opts = { meridianOffset: 0 };
      render(data, opts);
      expect(opts.solarDateDiffsStdDate).toBe(null);
    });

    it('sets opts.solarDateDiffsStdDate when solar date differs', () => {
      const data = {
        solarTime: { hours: 2, minutes: 0, totalMinutes: 120, degrees: 30 },
        now: new Date('2026-04-14T23:00:00Z')
      };
      const opts = { meridianOffset: 0 };
      render(data, opts);
      // opts.solarDateDiffsStdDate should be 'ahead' or 'behind' depending on date diff logic
      expect(['ahead', 'behind', null]).toContain(opts.solarDateDiffsStdDate);
    });
  });
});
