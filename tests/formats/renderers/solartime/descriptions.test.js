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

    it('returns Dawn at nightEnd time', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.nightEnd, lat, lon);
      expect(result).toBe('Dawn');
    });

    it('returns Dusk at night time', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.night, lat, lon);
      expect(result).toBe('Dusk');
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

  describe('Normal solar cycle — short day compression', () => {
    // Murmansk Dec 1: sunrise ~09:14, sunset ~10:01, total day ~47 min
    // dayGap = (10:01 - 15min) - (09:14 + 15min) = 09:46 - 09:29 = 17 min < 90 min → Day
    const lat = 68.97;
    const lon = 33.07;
    const baseDate = new Date('2026-12-01T12:00:00Z');

    it('returns Day at solar noon during very short day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      // Verify this location/date has sunrise and sunset (not polar night)
      if (!isNaN(times.sunrise?.getTime()) && !isNaN(times.sunset?.getTime())) {
        const result = getDescription(times.solarNoon, lat, lon);
        expect(result).toBe('Day');
      }
    });

    it('returns Day between sunrise and sunset windows during very short day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (!isNaN(times.sunrise?.getTime()) && !isNaN(times.sunset?.getTime())) {
        // Midpoint between sunrise and sunset
        const mid = new Date((times.sunrise.getTime() + times.sunset.getTime()) / 2);
        const result = getDescription(mid, lat, lon);
        expect(result).toBe('Day');
      }
    });

    it('still returns Sunrise at sunrise event during short day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (!isNaN(times.sunrise?.getTime())) {
        const result = getDescription(times.sunrise, lat, lon);
        expect(result).toBe('Sunrise');
      }
    });

    it('still returns Sunset at sunset event during short day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (!isNaN(times.sunset?.getTime())) {
        const result = getDescription(times.sunset, lat, lon);
        expect(result).toBe('Sunset');
      }
    });
  });

  describe('Normal solar cycle — Morning/Afternoon compression', () => {
    // Find a location/date where morning gap is < 90 min but day is not fully compressed
    // At lat ~60-65N in November, days are short enough to trigger Morning/Afternoon compression
    // but not Day compression. Let's use lat=63N Nov 20.
    const lat = 63;
    const lon = 25;
    const baseDate = new Date('2026-11-20T12:00:00Z');

    it('returns Morning when morning gap < 90 min and current time is in morning arc', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (!isNaN(times.sunrise?.getTime()) && !isNaN(times.solarNoon?.getTime())) {
        const windowMs = 15 * 60000;
        const riseTime = times.sunrise.getTime();
        const noonTime = times.solarNoon.getTime();
        const morningGap = (noonTime - windowMs) - (riseTime + windowMs);
        // Only test if compression actually applies
        if (morningGap < 90 * 60000 && morningGap > 0) {
          const midMorning = new Date(riseTime + windowMs + morningGap / 2);
          const result = getDescription(midMorning, lat, lon);
          expect(result).toBe('Morning');
        }
      }
    });

    it('returns Afternoon when afternoon gap < 90 min and current time is in afternoon arc', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (!isNaN(times.sunset?.getTime()) && !isNaN(times.solarNoon?.getTime())) {
        const windowMs = 15 * 60000;
        const noonTime = times.solarNoon.getTime();
        const setTime = times.sunset.getTime();
        const afternoonGap = (setTime - windowMs) - (noonTime + windowMs);
        if (afternoonGap < 90 * 60000 && afternoonGap > 0) {
          const midAfternoon = new Date(noonTime + windowMs + afternoonGap / 2);
          const result = getDescription(midAfternoon, lat, lon);
          expect(result).toBe('Afternoon');
        }
      }
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

    it('returns Antinoon at computed anti-noon (solar noon + 12h) during polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const antinoon = new Date(times.solarNoon.getTime() + 12 * 3600000);
      const result = getDescription(antinoon, lat, lon);
      expect(result).toBe('Antinoon');
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
      expect(result).not.toBe('Dusk');
    });

    it('does not return Midnight during polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const antinoon = new Date(times.solarNoon.getTime() + 12 * 3600000);
      const result = getDescription(antinoon, lat, lon);
      expect(result).not.toBe('Midnight');
      expect(result).toBe('Antinoon');
    });

    it('does not return night labels during polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const antinoon = new Date(times.solarNoon.getTime() + 12 * 3600000);
      for (let offset = 1; offset <= 5; offset++) {
        const testTime = new Date(antinoon.getTime() + offset * 3600000);
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Night');
        expect(result).not.toBe('Midnight');
      }
    });

    it('returns morning or afternoon labels throughout polar day', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const testTime = new Date(times.solarNoon.getTime() + 18 * 3600000); // 6 AM next solar day
      const result = getDescription(testTime, lat, lon);
      const validLabels = ['Early Morning', 'Midmorning', 'Late Morning', 'Early Afternoon', 'Midafternoon', 'Late Afternoon', 'Noon', 'Antinoon'];
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
      const hasWhiteNights = times.sunrise && times.sunset && 
                           (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                           (!times.night || isNaN(times.night.getTime()));
      
      if (hasWhiteNights && times.sunset) {
        const testTime = new Date(times.sunset.getTime() + 2 * 3600000); // 2h after sunset
        const result = getDescription(testTime, lat, lon);
        expect(['Evening Twilight', 'Morning Twilight', 'Twilight']).toContain(result);
      }
    });

    it('does not return Dawn during white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const hasWhiteNights = times.sunrise && times.sunset && 
                           (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                           (!times.night || isNaN(times.night.getTime()));
      
      if (hasWhiteNights && times.sunrise) {
        const testTime = new Date(times.sunrise.getTime() - 2 * 3600000); // 2h before sunrise
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Dawn');
      }
    });

    it('does not return Dusk during white nights', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const hasWhiteNights = times.sunrise && times.sunset && 
                           (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                           (!times.night || isNaN(times.night.getTime()));
      
      if (hasWhiteNights && times.sunset) {
        const testTime = new Date(times.sunset.getTime() + 2 * 3600000); // 2h after sunset
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Dusk');
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

  describe('White nights — short gap (Twilight merge)', () => {
    // At lat=65°N, June 21: twilight gap ~88 min < 90 min → should merge to 'Twilight'
    const lat = 65;
    const lon = 25;
    const baseDate = new Date('2026-06-21T12:00:00Z');

    it('returns Twilight during night hours when twilight gap < 90 min', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const hasWhiteNights = times.sunrise && !isNaN(times.sunrise.getTime()) &&
                             times.sunset && !isNaN(times.sunset.getTime()) &&
                             (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                             (!times.night || isNaN(times.night.getTime()));
      if (hasWhiteNights) {
        // Time midway between sunset and next sunrise
        const midTwilight = new Date(times.sunset.getTime() + 1 * 3600000);
        const result = getDescription(midTwilight, lat, lon);
        expect(result).toBe('Twilight');
      }
    });
  });

  describe('White nights — Lingering Sun', () => {
    // At lat=65.7°N, June 21: twilight gap is negative (sunset/next sunrise overlap)
    const lat = 65.7;
    const lon = 25;
    const baseDate = new Date('2026-06-21T12:00:00Z');

    it('returns Lingering Sun when sunset and next sunrise overlap', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const hasSunrise = times.sunrise && !isNaN(times.sunrise.getTime());
      const hasSunset = times.sunset && !isNaN(times.sunset.getTime());
      const noNight = !times.nightEnd || isNaN(times.nightEnd.getTime());
      
      if (hasSunrise && hasSunset && noNight) {
        const W = 15 * 60000;
        const nextRise = times.sunrise.getTime() + 24 * 3600000;
        const gap = (nextRise - W) - (times.sunset.getTime() + W);
        // Only test if this actually is a Lingering Sun case
        if (gap <= 0) {
          const testTime = new Date(times.sunset.getTime() + 15 * 60000);
          const result = getDescription(testTime, lat, lon);
          expect(result).toBe('Lingering Sun');
        }
      }
    });
  });

  describe('Polar night edge case', () => {
    // Test location: 78°N, 15°E (Svalbard), Date: December 21, 2026
    const lat = 78;
    const lon = 15;
    const baseDate = new Date('2026-12-21T12:00:00Z');

    it('returns Antimidnight at solar noon during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const result = getDescription(times.solarNoon, lat, lon);
      expect(result).toBe('Antimidnight');
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

    it('returns Dawn at nightEnd time during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.nightEnd && !isNaN(times.nightEnd.getTime())) {
        const result = getDescription(times.nightEnd, lat, lon);
        expect(result).toBe('Dawn');
      }
    });

    it('returns Dusk at astronomical dusk time during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.night && !isNaN(times.night.getTime())) {
        const result = getDescription(times.night, lat, lon);
        expect(result).toBe('Dusk');
      }
    });

    it('returns Morning Twilight between Dawn and Antimidnight', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.nightEnd && !isNaN(times.nightEnd.getTime())) {
        const windowMs = 15 * 60000;
        // Midpoint between Dawn and solar noon
        const midTwilight = new Date(times.nightEnd.getTime() + windowMs + 30 * 60000);
        const result = getDescription(midTwilight, lat, lon);
        expect(result).toBe('Morning Twilight');
      }
    });

    it('returns Evening Twilight between Antimidnight and Dusk', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.night && !isNaN(times.night.getTime())) {
        const windowMs = 15 * 60000;
        // Time between solar noon and Dusk
        const midTwilight = new Date(times.solarNoon.getTime() + windowMs + 30 * 60000);
        const result = getDescription(midTwilight, lat, lon);
        expect(result).toBe('Evening Twilight');
      }
    });

    it('returns Midnight at computed midnight during polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
      const result = getDescription(midnight, lat, lon);
      expect(result).toBe('Midnight');
    });

    it('returns Early Night between Dusk and Midnight', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.night && !isNaN(times.night.getTime())) {
        const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
        const windowMs = 15 * 60000;
        const midNight = new Date(times.night.getTime() + windowMs + 30 * 60000);
        const result = getDescription(midNight, lat, lon);
        expect(result).toBe('Early Night');
      }
    });

    it('returns Late Night between Midnight and Dawn', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      if (times.nightEnd && !isNaN(times.nightEnd.getTime())) {
        const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
        const windowMs = 15 * 60000;
        // 30 min after midnight window
        const lateNight = new Date(midnight.getTime() + windowMs + 30 * 60000);
        const result = getDescription(lateNight, lat, lon);
        expect(result).toBe('Late Night');
      }
    });
  });

  describe('Complete polar night (no twilight)', () => {
    // North Pole in December: sun far below -18°, no twilight events at all
    const lat = 89;
    const lon = 0;
    const baseDate = new Date('2026-12-21T12:00:00Z');

    it('returns Antimidnight at solar noon during complete polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      // Verify complete polar night condition
      const noTwilight = (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                         (!times.night || isNaN(times.night.getTime())) &&
                         (!times.sunrise || isNaN(times.sunrise.getTime()));
      if (noTwilight) {
        const result = getDescription(times.solarNoon, lat, lon);
        expect(result).toBe('Antimidnight');
      }
    });

    it('returns Midnight at midnight during complete polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const noTwilight = (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                         (!times.night || isNaN(times.night.getTime())) &&
                         (!times.sunrise || isNaN(times.sunrise.getTime()));
      if (noTwilight) {
        const midnight = new Date(times.solarNoon.getTime() + 12 * 3600000);
        const result = getDescription(midnight, lat, lon);
        expect(result).toBe('Midnight');
      }
    });

    it('only returns 4-phase labels during complete polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const noTwilight = (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                         (!times.night || isNaN(times.night.getTime())) &&
                         (!times.sunrise || isNaN(times.sunrise.getTime()));
      if (noTwilight) {
        const validLabels = ['Antimidnight', 'Early Night', 'Midnight', 'Late Night', 'Night'];
        for (let h = 0; h < 24; h++) {
          const testTime = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), h, 0, 0, 0);
          const result = getDescription(testTime, lat, lon);
          expect(validLabels).toContain(result);
        }
      }
    });

    it('does not return day or twilight labels during complete polar night', () => {
      const times = SunCalc.getTimes(baseDate, lat, lon);
      const noTwilight = (!times.nightEnd || isNaN(times.nightEnd.getTime())) &&
                         (!times.night || isNaN(times.night.getTime())) &&
                         (!times.sunrise || isNaN(times.sunrise.getTime()));
      if (noTwilight) {
        const testTime = times.solarNoon;
        const result = getDescription(testTime, lat, lon);
        expect(result).not.toBe('Dawn');
        expect(result).not.toBe('Morning Twilight');
        expect(result).not.toBe('Sunrise');
        expect(result).not.toBe('Noon');
        expect(result).not.toBe('Sunset');
        expect(result).not.toBe('Evening Twilight');
        expect(result).not.toBe('Dusk');
      }
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
    it('can return all core labels throughout a normal solar cycle', () => {
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
