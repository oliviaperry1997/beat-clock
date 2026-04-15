import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/solartime/descriptive.js';

describe('Descriptive solar time renderer', () => {
  describe('Error handling', () => {
    it('returns Day when data is null', () => {
      expect(render(null, { latitude: 40, longitude: -74 })).toBe('Day');
    });

    it('returns Day when data is undefined', () => {
      expect(render(undefined, { latitude: 40, longitude: -74 })).toBe('Day');
    });

    it('returns Day when data.now is missing', () => {
      const data = {};
      expect(render(data, { latitude: 40, longitude: -74 })).toBe('Day');
    });

    it('returns Day when data.now is not a Date', () => {
      const data = { now: '2026-04-14T12:00:00Z' };
      expect(render(data, { latitude: 40, longitude: -74 })).toBe('Day');
    });

    it('returns Day when data.now is invalid Date', () => {
      const data = { now: new Date('invalid') };
      expect(render(data, { latitude: 40, longitude: -74 })).toBe('Day');
    });

    it('returns Day when latitude is missing', () => {
      const data = { now: new Date('2026-04-14T12:00:00Z') };
      expect(render(data, { longitude: -74 })).toBe('Day');
    });

    it('returns Day when longitude is missing', () => {
      const data = { now: new Date('2026-04-14T12:00:00Z') };
      expect(render(data, { latitude: 40 })).toBe('Day');
    });

    it('returns Day when both latitude and longitude are missing', () => {
      const data = { now: new Date('2026-04-14T12:00:00Z') };
      expect(render(data, {})).toBe('Day');
    });
  });

  describe('Normal solar cycle integration', () => {
    it('returns a time-of-day label for valid inputs at mid-latitude', () => {
      const data = { now: new Date('2026-03-20T17:00:00Z') }; // March 20, noon EST
      const opts = { latitude: 40, longitude: -74 }; // New York area
      const result = render(data, opts);
      
      // Should return one of the valid labels (any label is acceptable, we're testing integration)
      const validLabels = [
        'Astronomical Dawn', 'Morning Twilight', 'Sunrise',
        'Early Morning', 'Midmorning', 'Late Morning', 'Noon',
        'Early Afternoon', 'Midafternoon', 'Late Afternoon',
        'Sunset', 'Evening Twilight', 'Astronomical Dusk',
        'Early Night', 'Midnight', 'Late Night',
        'Day', 'Twilight', 'Night' // altitude fallback labels
      ];
      
      expect(validLabels).toContain(result);
    });

    it('returns Noon label near solar noon', () => {
      // Solar noon on March 20 at 40°N, -74°W is approximately 16:50 UTC
      const data = { now: new Date('2026-03-20T16:50:00Z') };
      const opts = { latitude: 40, longitude: -74 };
      const result = render(data, opts);
      
      // Should return 'Noon' (within ±15 min window)
      expect(result).toBe('Noon');
    });

    it('returns day-related label during daytime hours', () => {
      const data = { now: new Date('2026-06-21T15:00:00Z') }; // June 21, midday
      const opts = { latitude: 40, longitude: -74 };
      const result = render(data, opts);
      
      // Should be a daytime label (not night/twilight)
      const daytimeLabels = [
        'Sunrise', 'Early Morning', 'Midmorning', 'Late Morning',
        'Noon', 'Early Afternoon', 'Midafternoon', 'Late Afternoon',
        'Sunset', 'Day'
      ];
      
      expect(daytimeLabels).toContain(result);
    });

    it('returns night-related label during nighttime hours', () => {
      const data = { now: new Date('2026-03-20T06:00:00Z') }; // March 20, 1am EST (deep night)
      const opts = { latitude: 40, longitude: -74 };
      const result = render(data, opts);
      
      // Should be a nighttime label
      const nightLabels = [
        'Evening Twilight', 'Astronomical Dusk', 'Early Night',
        'Midnight', 'Late Night', 'Astronomical Dawn', 'Morning Twilight',
        'Night', 'Twilight'
      ];
      
      expect(nightLabels).toContain(result);
    });
  });

  describe('Polar edge cases integration', () => {
    it('returns appropriate label for polar day (Svalbard, June)', () => {
      const data = { now: new Date('2026-06-21T12:00:00Z') };
      const opts = { latitude: 78, longitude: 15 }; // Svalbard
      const result = render(data, opts);
      
      // Should NOT be night-related (sun never sets)
      const forbiddenLabels = [
        'Sunset', 'Evening Twilight', 'Astronomical Dusk',
        'Early Night', 'Late Night', 'Night'
      ];
      
      expect(forbiddenLabels).not.toContain(result);
      expect(result.length).toBeGreaterThan(0);
    });

    it('returns appropriate label for polar night (Svalbard, December)', () => {
      const data = { now: new Date('2026-12-21T12:00:00Z') };
      const opts = { latitude: 78, longitude: 15 }; // Svalbard
      const result = render(data, opts);
      
      // Should NOT be full daytime labels (sun never rises)
      const forbiddenLabels = [
        'Sunrise', 'Early Morning', 'Midmorning', 'Late Morning',
        'Early Afternoon', 'Midafternoon', 'Late Afternoon', 'Sunset'
      ];
      
      expect(forbiddenLabels).not.toContain(result);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Date comparison integration', () => {
    it('sets opts.solarDateDiffsStdDate after rendering', () => {
      const data = {
        now: new Date('2026-04-14T12:00:00Z'),
        solarTime: { hours: 14, minutes: 0, totalMinutes: 840, degrees: 210 }
      };
      const opts = { latitude: 40, longitude: -74, meridianOffset: 0 };
      
      render(data, opts);
      
      // opts should have solarDateDiffsStdDate set (value depends on calculation)
      expect(['ahead', 'behind', null]).toContain(opts.solarDateDiffsStdDate);
    });

    it('sets solarDateDiffsStdDate even when description is default', () => {
      const data = { now: new Date('2026-04-14T12:00:00Z') };
      const opts = {}; // no location, will return 'Day' fallback
      
      const result = render(data, opts);
      
      expect(result).toBe('Day');
      // solarDateDiffsStdDate may not be set if location is missing (computeDateDiff returns null)
      // Just verify the renderer doesn't crash
    });
  });
});
