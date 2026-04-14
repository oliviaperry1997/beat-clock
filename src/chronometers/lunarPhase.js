import { moonposition, solar, base, julian } from 'astronomia';

/**
 * Lunar Phase chronometer — computes lunar phase angle (0-360° from New Moon).
 * Phase angle = lunar ecliptic longitude - solar apparent longitude.
 * 0° = new moon, 180° = full moon.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude
 * @param {number} [opts.longitude] - Longitude
 * @returns {string} Lunar phase angle string (LP{degrees padded to 3 digits})
 */
export function compute(date, opts = {}) {
  const { latitude, longitude } = opts;

  if (latitude == null || longitude == null) return 'LP??';

  const jde = julian.DateToJD(date);

  // Lunar ecliptic longitude in radians
  const moonPos = moonposition.position(jde);
  const moonLonRad = moonPos.lon;

  // Solar apparent longitude in radians
  const T = base.J2000Century(jde);
  const sunLonRad = solar.apparentLongitude(T);

  // Phase angle: difference in degrees, normalized to 0-360
  let phaseDeg = ((moonLonRad - sunLonRad) * 180 / Math.PI) % 360;
  if (phaseDeg < 0) phaseDeg += 360;

  return `LP${Math.round(phaseDeg).toString().padStart(3, '0')}`;
}
