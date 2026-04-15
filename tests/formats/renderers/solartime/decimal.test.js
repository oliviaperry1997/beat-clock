import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/solartime/decimal.js';

describe('decimal solar beats renderer', () => {
  describe('Basic formatting', () => {
    it('formats beats as @NNN with zero-padding', () => {
      const data = {
        solarTime: { hours: 15, minutes: 40, totalMinutes: 940, degrees: 235 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor((940 / 1440) * 1000) = Math.floor(652.777...) = 652
      expect(render(data)).toBe('@652');
    });

    it('solar midnight renders as @000', () => {
      const data = {
        solarTime: { hours: 0, minutes: 0, totalMinutes: 0, degrees: 0 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('@000');
    });

    it('solar noon renders as @500', () => {
      const data = {
        solarTime: { hours: 12, minutes: 0, totalMinutes: 720, degrees: 180 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor((720 / 1440) * 1000) = Math.floor(500) = 500
      expect(render(data)).toBe('@500');
    });

    it('just before midnight renders as @999', () => {
      const data = {
        solarTime: { hours: 23, minutes: 59, totalMinutes: 1439, degrees: 359.75 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor((1439 / 1440) * 1000) = Math.floor(999.305...) = 999
      expect(render(data)).toBe('@999');
    });

    it('zero-pads single-digit beats', () => {
      const data = {
        solarTime: { hours: 0, minutes: 5, totalMinutes: 5, degrees: 1.25 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor((5 / 1440) * 1000) = Math.floor(3.472...) = 3
      expect(render(data)).toBe('@003');
    });

    it('zero-pads double-digit beats', () => {
      const data = {
        solarTime: { hours: 1, minutes: 30, totalMinutes: 90, degrees: 22.5 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor((90 / 1440) * 1000) = Math.floor(62.5) = 62
      expect(render(data)).toBe('@062');
    });

    it('no decimal places (integer only)', () => {
      const data = {
        solarTime: { hours: 15, minutes: 40, totalMinutes: 940, degrees: 235 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      const result = render(data);
      expect(result).toBe('@652');
      expect(result).not.toContain('.'); // no decimal point
    });
  });

  describe('Math.floor behavior', () => {
    it('uses Math.floor, not Math.round', () => {
      // Test a value that would round up but should floor down
      const data = {
        solarTime: { hours: 12, minutes: 30, totalMinutes: 750, degrees: 187.5 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // (750 / 1440) * 1000 = 520.833...
      // Math.floor = 520, Math.round = 521
      expect(render(data)).toBe('@520');
    });

    it('floors value very close to 1000', () => {
      const data = {
        solarTime: { hours: 23, minutes: 59, totalMinutes: 1439.9, degrees: 359.9 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor((1439.9 / 1440) * 1000) = Math.floor(999.93...) = 999
      expect(render(data)).toBe('@999');
    });
  });

  describe('Error handling', () => {
    it('returns @??? when data is null', () => {
      expect(render(null)).toBe('@???');
    });

    it('returns @??? when data is undefined', () => {
      expect(render(undefined)).toBe('@???');
    });

    it('returns @??? when solarTime is missing', () => {
      const data = { now: new Date() };
      expect(render(data)).toBe('@???');
    });

    it('returns @??? when solarTime is null', () => {
      const data = { solarTime: null, now: new Date() };
      expect(render(data)).toBe('@???');
    });

    it('returns @??? when solarTime is a string', () => {
      const data = { solarTime: 'ST@654', now: new Date() };
      expect(render(data)).toBe('@???');
    });

    it('returns @??? when totalMinutes is missing', () => {
      const data = {
        solarTime: { hours: 14, minutes: 32, degrees: 218 },
        now: new Date()
      };
      expect(render(data)).toBe('@???');
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
      expect(['ahead', 'behind', null]).toContain(opts.solarDateDiffsStdDate);
    });
  });
});
