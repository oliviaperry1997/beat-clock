/**
 * Astronomical event precomputation cache.
 * Precomputes sunrise, sunset, solar noon, moon illumination, equinox, and solstice dates.
 * Cache invalidates on location change.
 */

import SunCalc from 'suncalc';
import { solstice, julian } from 'astronomia';

// Module-level cache
let cachedEvents = null;
let cachedDate = null;
let cachedLat = null;
let cachedLon = null;

const MEAN_LUNAR_MONTH = 29.53059;

/**
 * Check if two dates share the same calendar day.
 */
export function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Convert a JDE (Julian Ephemeris Day) number to a Date.
 * astronomia solstice/moonphase functions return a JDE number.
 */
function jdeToDate(jde) {
  return julian.JDEToDate(jde);
}

/**
 * Get astronomical events for a given date and location.
 * Caches results based on date, latitude, and longitude.
 */
export function getAstroEvents(date, latitude, longitude) {
  // Check cache
  if (
    cachedEvents &&
    cachedDate &&
    isSameDay(cachedDate, date) &&
    cachedLat === latitude &&
    cachedLon === longitude
  ) {
    return cachedEvents;
  }

  const year = date.getFullYear();

  // Sun events
  const sunTimes = SunCalc.getTimes(date, latitude, longitude);

  // Moon illumination
  const moonData = SunCalc.getMoonIllumination(date);

  // Equinox dates
  const marchEquinoxJDE = solstice.march(year);
  const septemberEquinoxJDE = solstice.september(year);

  // Solstice dates
  const juneSolsticeJDE = solstice.june(year);
  const decemberSolsticeJDE = solstice.december(year);

  // Lunar events (full moons and new moons for the year)
  const fullMoons = [];
  const newMoons = [];

  // Start from January and iterate through ~13 lunar months
  let currentDate = new Date(year, 0, 1);
  for (let i = 0; i < 13; i++) {
    const moonPhaseData = SunCalc.getMoonIllumination(currentDate);
    const phase = moonPhaseData.phase;

    // Full moon: phase ~0.5, New moon: phase ~0 or ~1
    if (Math.abs(phase - 0.5) < 0.05) {
      fullMoons.push(new Date(currentDate));
    } else if (phase < 0.05 || phase > 0.95) {
      newMoons.push(new Date(currentDate));
    }

    // Advance by mean lunar month / 13 to get roughly monthly samples
    currentDate = new Date(currentDate.getTime() + MEAN_LUNAR_MONTH * 24 * 60 * 60 * 1000 / 13);
  }

  // Build events object
  const events = {
    sun: {
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
      solarNoon: sunTimes.solarNoon
    },
    moon: {
      fraction: moonData.fraction,
      phase: moonData.phase
    },
    equinoxes: {
      march: jdeToDate(marchEquinoxJDE),
      september: jdeToDate(septemberEquinoxJDE)
    },
    solstices: {
      june: jdeToDate(juneSolsticeJDE),
      december: jdeToDate(decemberSolsticeJDE)
    },
    lunarEvents: {
      fullMoons,
      newMoons
    }
  };

  // Cache results
  cachedEvents = events;
  cachedDate = new Date(date);
  cachedLat = latitude;
  cachedLon = longitude;

  return events;
}

/**
 * Invalidate the astronomical event cache.
 */
export function invalidateCache() {
  cachedEvents = null;
  cachedDate = null;
  cachedLat = null;
  cachedLon = null;
}

/**
 * Check if the moon fraction indicates a full moon day.
 */
export function isFullMoonDay(moonFraction) {
  return moonFraction >= 0.98;
}

/**
 * Check if the moon fraction indicates a new moon day.
 */
export function isNewMoonDay(moonFraction) {
  return moonFraction <= 0.02;
}

/**
 * Check if a date matches an equinox day.
 */
export function isEquinoxDay(date, equinoxes) {
  return (
    isSameDay(date, equinoxes.march) ||
    isSameDay(date, equinoxes.september)
  );
}

/**
 * Check if a date matches a solstice day.
 */
export function isSolsticeDay(date, solstices) {
  return (
    isSameDay(date, solstices.june) ||
    isSameDay(date, solstices.december)
  );
}

/**
 * Check if a date matches a lunar event day (full moon or new moon).
 */
export function isLunarEventDay(date, lunarEvents, eventType) {
  if (eventType === 'full-moon') {
    return lunarEvents.fullMoons.some(fullMoonDate => isSameDay(date, fullMoonDate));
  }
  if (eventType === 'new-moon') {
    return lunarEvents.newMoons.some(newMoonDate => isSameDay(date, newMoonDate));
  }
  return false;
}
