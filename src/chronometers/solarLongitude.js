import { solar, base, julian } from 'astronomia';

/**
 * Solar Longitude chronometer — computes solar ecliptic longitude (0-360° from Point of Aries).
 * Uses astronomia's apparent longitude (includes nutation + aberration corrections).
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude
 * @param {number} [opts.longitude] - Longitude
 * @returns {string} Solar longitude string (SL{degrees padded to 3 digits}, e.g., SL000, SL090)
 */
export function compute(date, opts = {}) {
  const { latitude, longitude } = opts;

  if (latitude == null || longitude == null) return 'SL??';

  const jde = julian.DateToJD(date);
  const T = base.J2000Century(jde);

  // Apparent solar longitude in radians (already normalized 0-2π)
  const lonRad = solar.apparentLongitude(T);

  // Convert to degrees and normalize to 0-360
  let lonDeg = (lonRad * 180 / Math.PI) % 360;
  if (lonDeg < 0) lonDeg += 360;

  return `SL${Math.round(lonDeg).toString().padStart(3, '0')}`;
}
