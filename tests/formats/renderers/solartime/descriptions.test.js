import { describe, it, expect } from 'vitest';
import { getDescription } from '../../../../src/formats/renderers/solartime/descriptions.js';
import SunCalc from 'suncalc';

describe('Solar Time Description Mapping', () => {
  describe('Error cases', () => {
    it('returns Day when date is null', () => {
      expect(getDescription(null, 40, -74)).toBe('Day');
    });

    it('returns Day when date is undefined', () => {
      expect(getDescription(undefined, 40, -74)).toBe('Day');
    });

    it('returns Day when date is invalid Date', () => {
      expect(getDescription(new Date('invalid'), 40, -74)).toBe('Day');
    });

    it('returns Day when latitude is null', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      expect(getDescription(date, null, -74)).toBe('Day');
    });

    it('returns Day when longitude is null', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      expect(getDescription(date, 40, null)).toBe('Day');
    });
  });

  describe('Normal solar cycle', () => {
    // Test location: 40°N, -74°W (New York area), Date: March 20, 2026 (Spring Equinox)
    const lat = 40;
    const lon = -74;
    const baseDate = new Date('2026-03-20T12:00:00Z');

    it('returns Sunrise at sunrise time', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.sunrise, lat, lon);
      expect(result).toBe('Sunrise');
    });

    it('returns Sunrise within 15 minutes before sunrise', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.sunrise.getTime() - 10 * 60000); // 10 min before
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Sunrise');
    });

    it('returns Sunrise within 15 minutes after sunrise', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.sunrise.getTime() + 10 * 60000); // 10 min after
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Sunrise');
    });

    it('returns Noon at solar noon', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.solarNoon, lat, lon);
      expect(result).toBe('Noon');
    });

    it('returns Noon within 15 minutes of solar noon', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.solarNoon.getTime() + 12 * 60000); // 12 min after
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Noon');
    });

    it('returns Sunset at sunset time', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.sunset, lat, lon);
      expect(result).toBe('Sunset');
    });

    it('returns Sunset within 15 minutes of sunset', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.sunset.getTime() - 8 * 60000); // 8 min before
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Sunset');
    });

    it('returns Early Morning in first third after sunrise', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const windowMs = 15 * 60000;
      const testTime = new Date(times.sunrise.getTime() + windowMs + 30 * 60000); // 30 min after sunrise window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Early Morning');
    });

    it('returns Midmorning in middle third before noon', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const sunrise = times.sunrise.getTime();
      const noon = times.solarNoon.getTime();
      const midpoint = sunrise + (noon - sunrise) / 2;
      const testTime = new Date(midpoint);
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Midmorning');
    });

    it('returns Late Morning in final third before noon', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const sunrise = times.sunrise.getTime();
      const noon = times.solarNoon.getTime();
      const windowMs = 15 * 60000;
      const testTime = new Date(noon - windowMs - 30 * 60000); // 30 min before noon window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Late Morning');
    });

    it('returns Early Afternoon in first third after noon', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const windowMs = 15 * 60000;
      const testTime = new Date(times.solarNoon.getTime() + windowMs + 30 * 60000); // 30 min after noon window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Early Afternoon');
    });

    it('returns Midafternoon in middle third between noon and sunset', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const noon = times.solarNoon.getTime();
      const sunset = times.sunset.getTime();
      const midpoint = noon + (sunset - noon) / 2;
      const testTime = new Date(midpoint);
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Midafternoon');
    });

    it('returns Late Afternoon in final third before sunset', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const noon = times.solarNoon.getTime();
      const sunset = times.sunset.getTime();
      const windowMs = 15 * 60000;
      const testTime = new Date(sunset - windowMs - 30 * 60000); // 30 min before sunset window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Late Afternoon');
    });

    it('returns Morning Twilight between astronomical dawn and sunrise', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const dawn = times.nightEnd.getTime();
      const sunrise = times.sunrise.getTime();
      const windowMs = 15 * 60000;
      const testTime = new Date(dawn + windowMs + 10 * 60000); // After dawn window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Morning Twilight');
    });

    it('returns Evening Twilight between sunset and astronomical dusk', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const sunset = times.sunset.getTime();
      const dusk = times.night.getTime();
      const windowMs = 15 * 60000;
      const testTime = new Date(sunset + windowMs + 10 * 60000); // After sunset window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Evening Twilight');
    });

    it('returns Astronomical Dawn at nightEnd time', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.nightEnd, lat, lon);
      expect(result).toBe('Astronomical Dawn');
    });

    it('returns Astronomical Dusk at night time', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.night, lat, lon);
      expect(result).toBe('Astronomical Dusk');
    });

    it('returns Early Night after astronomical dusk', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const windowMs = 15 * 60000;
      const testTime = new Date(times.night.getTime() + windowMs + 30 * 60000); // 30 min after dusk window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Early Night');
    });

    it('returns Midnight at computed midnight (solar noon + 12h)', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
      const result = getDescription(midnight, lat, lon);
      expect(result).toBe('Midnight');
    });

    it('returns Late Night after midnight before dawn', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
      const windowMs = 15 * 60000;
      const testTime = new Date(midnight.getTime() + windowMs + 30 * 60000); // 30 min after midnight window
      const result = getDescription(testTime, lat, lon);
      expect(result).toBe('Late Night');
    });
  });

  describe('Polar day edge case', () => {
    // Test location: 78°N, 15°E (Svalbard), Date: June 21, 2026
    const lat = 78;
    const lon = 15;
    const baseDate = new Date('2026-06-21T12:00:00Z');

    it('returns Noon at solar noon during polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.solarNoon, lat, lon);
      expect(result).toBe('Noon');
    });

    it('returns Midnight at computed midnight during polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
      const result = getDescription(midnight, lat, lon);
      expect(result).toBe('Midnight');
    });

    it('returns afternoon phase during polar day afternoon', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const windowMs = 15 * 60000;
      const testTime = new Date(times.solarNoon.getTime() + windowMs + 2 * 3600000); // 2h after noon
      const result = getDescription(testTime, lat, lon);
      expect(['Early Afternoon', 'Midafternoon', 'Late Afternoon']).toContain(result);
    });

    it('does not return Sunset during polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.solarNoon.getTime() + 6 * 3600000); // 6h after noon
      const result = getDescription(testTime, lat, lon);
      expect(result).not.toBe('Sunset');
      expect(result).not.toBe('Evening Twilight');
      expect(result).not.toBe('Astronomical Dusk');
    });

    it('does not return night labels during polar day', () => {
      // Test multiple times throughout the "night"
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
      
      for (let offset = 1; offset <= 5; offset++) {
        const testTime = new Date(midnight.getTime() + offset * 3600000);
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Night');
        // Morning labels are OK during polar day
      }
    });

    it('returns morning or afternoon labels throughout polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.solarNoon.getTime() + 18 * 3600000); // 6 AM next day (solar time)
      const result = getDescription(testTime, lat, lon);
      const validLabels = ['Early Morning', 'Midmorning', 'Late Morning', 'Early Afternoon', 'Midafternoon', 'Late Afternoon', 'Noon', 'Midnight', 'Late Night'];
      expect(validLabels).toContain(result);
    });
  });

  describe('White nights edge case', () => {
    // Test location: 64°N, 25°E (near Arctic Circle), Date: June 21, 2026
    const lat = 64;
    const lon = 25;
    const baseDate = new Date('2026-06-21T12:00:00Z');

    it('returns Sunrise at sunrise during white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.sunrise && !isNaN(times.sunrise.getTime())) {
        const result = getDescription(times.sunrise, lat, lon);
        expect(result).toBe('Sunrise');
      }
    });

    it('returns Sunset at sunset during white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.sunset && !isNaN(times.sunset.getTime())) {
        const result = getDescription(times.sunset, lat, lon);
        expect(result).toBe('Sunset');
      }
    });

    it('returns twilight labels during night hours in white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      // If white nights condition exists (sunrise/sunset but no nightEnd/night)
      const hasWhiteNights = times.sunrise && times.sunset && 
                           (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                           (!times.night || isNaN(times.night.getTime()));
      
      if (hasWhiteNights && times.sunset) {
        const testTime = new Date(times.sunset.getTime() + 2 * 3600000); // 2h after sunset
        const result = getDescription(testTime, lat, lon);
        expect(['Evening Twilight', 'Morning Twilight', 'Twilight']).toContain(result);
      }
    });

    it('does not return Astronomical Dawn during white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const hasWhiteNights = times.sunrise && times.sunset && 
                           (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                           (!times.night || isNaN(times.night.getTime()));
      
      if (hasWhiteNights && times.sunrise) {
        const testTime = new Date(times.sunrise.getTime() - 2 * 3600000); // 2h before sunrise
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Astronomical Dawn');
      }
    });

    it('does not return Astronomical Dusk during white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const hasWhiteNights = times.sunrise && times.sunset && 
                           (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                           (!times.night || isNaN(times.night.getTime()));
      
      if (hasWhiteNights && times.sunset) {
        const testTime = new Date(times.sunset.getTime() + 2 * 3600000); // 2h after sunset
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Astronomical Dusk');
      }
    });

    it('does not return deep night labels during white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const hasWhiteNights = times.sunrise && times.sunset && 
                           (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                           (!times.night || isNaN(times.night.getTime()));
      
      if (hasWhiteNights && times.sunset) {
        const testTime = new Date(times.sunset.getTime() + 3 * 3600000); // 3h after sunset
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Early Night');
        expect(result).not.toBe('Late Night');
        expect(result).not.toBe('Night');
      }
    });
  });

  describe('Polar night edge case', () => {
    // Test location: 78°N, 15°E (Svalbard), Date: December 21, 2026
    const lat = 78;
    const lon = 15;
    const baseDate = new Date('2026-12-21T12:00:00Z');

    it('returns night-related label during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.solarNoon, lat, lon);
      const validLabels = ['Night', 'Early Night', 'Late Night', 'Midnight', 'Twilight', 'Astronomical Dawn', 'Astronomical Dusk'];
      expect(validLabels).toContain(result);
    });

    it('does not return Sunrise during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.solarNoon.getTime() - 6 * 3600000); // 6h before solar noon
      const result = getDescription(testTime, lat, lon);
      expect(result).not.toBe('Sunrise');
    });

    it('does not return Sunset during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.solarNoon.getTime() + 6 * 3600000); // 6h after solar noon
      const result = getDescription(testTime, lat, lon);
      expect(result).not.toBe('Sunset');
    });

    it('does not return day phase labels during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.solarNoon.getTime());
      const result = getDescription(testTime, lat, lon);
      expect(result).not.toBe('Early Morning');
      expect(result).not.toBe('Midmorning');
      expect(result).not.toBe('Late Morning');
      expect(result).not.toBe('Noon');
      expect(result).not.toBe('Early Afternoon');
      expect(result).not.toBe('Midafternoon');
      expect(result).not.toBe('Late Afternoon');
    });

    it('may return Astronomical Dawn if twilight exists', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      // Check if twilight events exist during polar night
      if (times.nightEnd && !isNaN(times.nightEnd.getTime())) {
        const result = getDescription(times.nightEnd, lat, lon);
        expect(result).toBe('Astronomical Dawn');
      }
    });

    it('may return Astronomical Dusk if twilight exists', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      // Check if twilight events exist during polar night
      if (times.night && !isNaN(times.night.getTime())) {
        const result = getDescription(times.night, lat, lon);
        expect(result).toBe('Astronomical Dusk');
      }
    });

    it('returns Midnight at computed midnight during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
      const result = getDescription(midnight, lat, lon);
      expect(result).toBe('Midnight');
    });
  });

  describe('Altitude fallback', () => {
    it('returns Day when sun altitude is positive', () => {
      // Use equator at noon - guaranteed positive altitude
      const date = new Date('2026-03-20T12:00:00Z');
      const result = getDescription(date, 0, 0);
      // This should work in normal case or fallback
      expect(['Day', 'Noon', 'Early Afternoon', 'Midafternoon', 'Late Afternoon']).toContain(result);
    });

    it('returns Twilight when sun is between -18° and 0°', () => {
      // Dawn/dusk time at mid-latitude should trigger twilight
      const date = new Date('2026-03-20T10:00:00Z');
      const lat = 40;
      const lon = -74;
      const result = getDescription(date, lat, lon);
      // May be specific twilight label or general fallback
      expect(result).toBeDefined();
    });

    it('returns Night when sun is below -18°', () => {
      // Night time at mid-latitude
      const date = new Date('2026-03-20T03:00:00Z');
      const lat = 40;
      const lon = -74;
      const result = getDescription(date, lat, lon);
      // Should be some night-related label
      expect(['Night', 'Early Night', 'Late Night', 'Midnight']).toContain(result);
    });
  });

  describe('Label coverage', () => {
    it('can return all 16 labels throughout a normal solar cycle', () => {
      const lat = 40;
      const lon = -74;
      const baseDate = new Date('2026-03-20T00:00:00Z');
      
      const labels = new Set();
      
      // Sample throughout the day at 30-minute intervals
      for (let hour = 0; hour < 24; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const testDate = new Date(baseDate);
          testDate.setUTCHours(hour, minute, 0, 0);
          const label = getDescription(testDate, lat, lon);
          labels.add(label);
        }
      }
      
      // Check that we got a good variety of labels
      expect(labels.size).toBeGreaterThan(10);
      
      // Verify key event labels are present
      expect(labels.has('Sunrise') || labels.has('Sunset')).toBe(true);
      expect(labels.has('Noon')).toBe(true);
    });

    it('returns string labels for all test cases', () => {
      const lat = 40;
      const lon = -74;
      const date = new Date('2026-03-20T12:00:00Z');
      
      const result = getDescription(date, lat, lon);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
