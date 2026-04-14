// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render as renderHolocene } from '../../../../src/formats/renderers/year/holocene.js';
import { render as renderGregorian } from '../../../../src/formats/renderers/year/gregorian.js';
import { render as renderMeghalayan } from '../../../../src/formats/renderers/year/meghalayan.js';
import { render as renderCustom } from '../../../../src/formats/renderers/year/custom.js';

describe('year boundary transitions (DATE-04)', () => {
  describe('before Chinese New Year 2026 (Jan 15 UTC — effectiveYear = 2025)', () => {
    const data = { effectiveYear: 2025 };

    it('holocene shows H11725 (2025 + 9700)', () => {
      expect(renderHolocene(data)).toBe('H11725');
    });

    it('gregorian shows 2025', () => {
      expect(renderGregorian(data)).toBe('2025');
    });

    it('meghalayan shows Mgh4225 (2025 + 2200)', () => {
      expect(renderMeghalayan(data)).toBe('Mgh4225');
    });
  });

  describe('on/after Chinese New Year 2026 (Feb 17 UTC — effectiveYear = 2026)', () => {
    const data = { effectiveYear: 2026 };

    it('holocene shows H11726 (2026 + 9700)', () => {
      expect(renderHolocene(data)).toBe('H11726');
    });

    it('gregorian shows 2026', () => {
      expect(renderGregorian(data)).toBe('2026');
    });

    it('meghalayan shows Mgh4226 (2026 + 2200)', () => {
      expect(renderMeghalayan(data)).toBe('Mgh4226');
    });
  });

  describe('effectiveYear is independent from raw chronometer data', () => {
    it('holocene uses effectiveYear even when data.holocene is present with different value', () => {
      // holocene=11726 (2026 CE), effectiveYear=2025 → should yield H11725
      expect(renderHolocene({ holocene: 11726, effectiveYear: 2025 })).toBe('H11725');
    });

    it('gregorian uses effectiveYear even when data.now is present', () => {
      const data = { now: new Date(Date.UTC(2026, 3, 14)), effectiveYear: 2025 };
      expect(renderGregorian(data)).toBe('2025');
    });
  });

  describe('meghalayan stage boundary transitions via effectiveYear', () => {
    it('re-computes to Ngp at Northgrippian boundary (effectiveYear = -6325)', () => {
      expect(renderMeghalayan({ effectiveYear: -6325 })).toBe('Ngp1');
    });

    it('re-computes to Grn at Greenlandian boundary (effectiveYear = -9699)', () => {
      expect(renderMeghalayan({ effectiveYear: -9699 })).toBe('Grn1');
    });

    it('re-computes to pre-holocene below Greenlandian boundary (effectiveYear = -9700)', () => {
      expect(renderMeghalayan({ effectiveYear: -9700 })).toBe('—');
    });
  });

  describe('custom epoch renderer with effectiveYear', () => {
    it('computes custom year from effectiveYear and opts.customEpoch', () => {
      const opts = { customEpoch: new Date(Date.UTC(2020, 0, 1)) };
      // 2026 - 2020 + 1 = 7
      expect(renderCustom({ effectiveYear: 2026 }, opts)).toBe('Y7');
    });

    it('computes custom year for effectiveYear 2025', () => {
      const opts = { customEpoch: new Date(Date.UTC(2020, 0, 1)) };
      // 2025 - 2020 + 1 = 6
      expect(renderCustom({ effectiveYear: 2025 }, opts)).toBe('Y6');
    });
  });
});
