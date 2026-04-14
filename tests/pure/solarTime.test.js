import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/solarTime.js';

describe('solarTime chronometer', () => {
  describe('Error cases', () => {
    it('returns null when latitude is missing', () => {
      const result = compute(new Date('2026-04-14T12:00:00Z'), { longitude: 0 });
      expect(result).toBe(null);
    });

    it('returns null when longitude is missing', () => {
      const result = compute(new Date('2026-04-14T12:00:00Z'), { latitude: 0 });
      expect(result).toBe(null);
    });

    it('returns null when both latitude and longitude are missing', () => {
      const result = compute(new Date('2026-04-14T12:00:00Z'), {});
      expect(result).toBe(null);
    });
  });

  describe('Object structure', () => {
    it('returns object with correct structure when location is provided', () => {
      const result = compute(new Date('2026-03-20T12:00:00Z'), { latitude: 0, longitude: 0 });
      
      expect(result).toBeTypeOf('object');
      expect(result.hours).toBeTypeOf('number');
      expect(result.minutes).toBeTypeOf('number');
      expect(result.totalMinutes).toBeTypeOf('number');
      expect(result.degrees).toBeTypeOf('number');
      
      expect(result.hours).toBeGreaterThanOrEqual(0);
      expect(result.hours).toBeLessThan(24);
      expect(result.minutes).toBeGreaterThanOrEqual(0);
      expect(result.minutes).toBeLessThan(60);
      expect(result.degrees).toBeGreaterThanOrEqual(0);
      expect(result.degrees).toBeLessThan(360);
    });

    it('computes totalMinutes and degrees relationship', () => {
      const result = compute(new Date('2026-04-14T06:00:00Z'), { latitude: 40, longitude: -74 });
      
      // degrees should equal (totalMinutes / 1440) * 360
      const expectedDegrees = (result.totalMinutes / 1440) * 360;
      expect(result.degrees).toBeCloseTo(expectedDegrees, 2);
    });
  });

  describe('Solar time calculation', () => {
    it('computes solar time at Prime Meridian (0° longitude) near solar noon on equinox', () => {
      const result = compute(new Date('2026-03-20T12:00:00Z'), { latitude: 0, longitude: 0 });
      
      // On equinox at Prime Meridian, solar noon should be close to 12:00 UTC
      // Allow ±1 hour for equation of time variation
      expect(result.hours).toBeGreaterThan(10);
      expect(result.hours).toBeLessThan(14);
      
      // totalMinutes should match hours * 60 + minutes
      expect(result.totalMinutes).toBe(result.hours * 60 + result.minutes);
    });

    it('handles positive longitude offset (east of Prime Meridian)', () => {
      const primeResult = compute(new Date('2026-04-14T12:00:00Z'), { latitude: 0, longitude: 0 });
      const eastResult = compute(new Date('2026-04-14T12:00:00Z'), { latitude: 0, longitude: 15 });
      
      // 15° east = +1 hour ahead
      // Allow some tolerance for equation of time
      const hoursDiff = eastResult.hours - primeResult.hours;
      expect(hoursDiff).toBeGreaterThan(0);
      expect(hoursDiff).toBeLessThan(2);
    });

    it('handles negative longitude offset (west of Prime Meridian)', () => {
      const primeResult = compute(new Date('2026-04-14T12:00:00Z'), { latitude: 0, longitude: 0 });
      const westResult = compute(new Date('2026-04-14T12:00:00Z'), { latitude: 0, longitude: -15 });
      
      // 15° west = -1 hour behind
      // Allow some tolerance for equation of time
      const hoursDiff = primeResult.hours - westResult.hours;
      expect(hoursDiff).toBeGreaterThan(0);
      expect(hoursDiff).toBeLessThan(2);
    });

    it('includes equation of time correction', () => {
      // Early November has significant equation of time (~16 minutes)
      // Solar time should differ from simple UTC+longitude calculation
      const date = new Date('2026-11-03T12:00:00Z');
      const result = compute(date, { latitude: 0, longitude: 0 });
      
      // Simple UTC calculation (without equation of time) would be exactly 12:00
      const utcHours = date.getUTCHours();
      
      // With equation of time, solar time should differ
      // In early November, equation of time is about -16 minutes, so solar time should be behind
      // We just verify it's not exactly 12:00 (equation of time is applied)
      const minutesDiff = Math.abs(result.totalMinutes - (utcHours * 60));
      expect(minutesDiff).toBeGreaterThan(5); // At least 5 minutes difference
    });
  });

  describe('Edge cases', () => {
    it('normalizes time to 0-1440 range when crossing midnight', () => {
      const result = compute(new Date('2026-04-14T23:30:00Z'), { latitude: 0, longitude: 30 });
      
      // 30° = +2 hours, so 23:30 UTC + 2:00 = 01:30 next day
      // totalMinutes should be in valid range 0-1439
      expect(result.totalMinutes).toBeGreaterThanOrEqual(0);
      expect(result.totalMinutes).toBeLessThan(1440);
      
      // Should wrap around to early morning hours
      expect(result.hours).toBeGreaterThanOrEqual(0);
      expect(result.hours).toBeLessThan(4);
    });

    it('handles extreme eastern longitude', () => {
      const result = compute(new Date('2026-04-14T00:00:00Z'), { latitude: 0, longitude: 165 });
      
      // 165° = +11 hours
      expect(result.totalMinutes).toBeGreaterThanOrEqual(0);
      expect(result.totalMinutes).toBeLessThan(1440);
    });

    it('handles extreme western longitude', () => {
      const result = compute(new Date('2026-04-14T23:00:00Z'), { latitude: 0, longitude: -165 });
      
      // -165° = -11 hours
      expect(result.totalMinutes).toBeGreaterThanOrEqual(0);
      expect(result.totalMinutes).toBeLessThan(1440);
    });
  });
});
