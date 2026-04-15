import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/solartime/longitudinal.js';

describe('longitudinal solar time renderer', () => {
  describe('Basic formatting', () => {
    it('formats degrees as NNN° with zero-padding', () => {
      const data = {
        solarTime: { hours: 14, minutes: 32, totalMinutes: 872, degrees: 218 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('218°');
    });

    it('solar midnight renders as 000°', () => {
      const data = {
        solarTime: { hours: 0, minutes: 0, totalMinutes: 0, degrees: 0 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('000°');
    });

    it('solar noon renders as 180°', () => {
      const data = {
        solarTime: { hours: 12, minutes: 0, totalMinutes: 720, degrees: 180 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('180°');
    });

    it('just before midnight renders as 359°', () => {
      const data = {
        solarTime: { hours: 23, minutes: 59, totalMinutes: 1439, degrees: 359.75 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor(359.75) = 359
      expect(render(data)).toBe('359°');
    });

    it('zero-pads single-digit degrees', () => {
      const data = {
        solarTime: { hours: 0, minutes: 5, totalMinutes: 5, degrees: 1.25 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor(1.25) = 1
      expect(render(data)).toBe('001°');
    });

    it('zero-pads double-digit degrees', () => {
      const data = {
        solarTime: { hours: 2, minutes: 48, totalMinutes: 168, degrees: 42 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      expect(render(data)).toBe('042°');
    });

    it('integer degrees only (no decimal places)', () => {
      const data = {
        solarTime: { hours: 14, minutes: 32, totalMinutes: 872, degrees: 218.75 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      const result = render(data);
      // Should not contain decimal point after degree number
      expect(result).toBe('218°');
      expect(result).toMatch(/^\d{3}°$/);
    });
  });

  describe('Math.floor behavior', () => {
    it('uses Math.floor, not Math.round', () => {
      const data = {
        solarTime: { hours: 14, minutes: 32, totalMinutes: 872, degrees: 218.75 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // 218.75 with Math.floor = 218, Math.round = 219
      expect(render(data)).toBe('218°');
    });

    it('floors value very close to 360', () => {
      const data = {
        solarTime: { hours: 23, minutes: 59, totalMinutes: 1439.9, degrees: 359.9 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      // Math.floor(359.9) = 359
      expect(render(data)).toBe('359°');
    });
  });

  describe('Symbol-free renderer output', () => {
    it('output contains degree symbol °', () => {
      const data = {
        solarTime: { hours: 12, minutes: 0, totalMinutes: 720, degrees: 180 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      const result = render(data);
      expect(result).toContain('°');
    });

    it('does not include the UI symbol prefix', () => {
      const data = {
        solarTime: { hours: 12, minutes: 0, totalMinutes: 720, degrees: 180 },
        now: new Date('2026-04-14T12:00:00Z')
      };
      const result = render(data);
      expect(result).toBe('180°');
    });
  });

  describe('Error handling', () => {
    it('returns ???° when data is null', () => {
      expect(render(null)).toBe('???°');
    });

    it('returns ???° when data is undefined', () => {
      expect(render(undefined)).toBe('???°');
    });

    it('returns ???° when solarTime is missing', () => {
      const data = { now: new Date() };
      expect(render(data)).toBe('???°');
    });

    it('returns ???° when solarTime is null', () => {
      const data = { solarTime: null, now: new Date() };
      expect(render(data)).toBe('???°');
    });

    it('returns ???° when solarTime is a string', () => {
      const data = { solarTime: 'ST218°', now: new Date() };
      expect(render(data)).toBe('???°');
    });

    it('returns ???° when degrees is missing', () => {
      const data = {
        solarTime: { hours: 14, minutes: 32, totalMinutes: 872 },
        now: new Date()
      };
      expect(render(data)).toBe('???°');
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
