import { eqtime, base, julian } from 'astronomia';

/**
 * Solar Time chronometer — computes local solar time with equation of time correction.
 * Solar time = UTC + longitude offset (1° = 4 min) + equation of time.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude
 * @param {number} [opts.longitude] - Longitude
 * @returns {string} Solar time string (ST{HH}:{MM} 24h format)
 */
export function compute(date, opts = {}) {
  const { latitude, longitude } = opts;

  if (latitude == null || longitude == null) return 'ST??';

  const jde = julian.DateToJD(date);

  // Equation of time in minutes (positive = sun is fast)
  const eotRad = eqtime.eSmart(jde);
  const eotMin = eotRad * 720 / Math.PI;

  // Longitude offset: 1° = 4 minutes
  const lonOffsetMin = longitude * 4;

  // Total offset from UTC
  const totalOffsetMin = lonOffsetMin + eotMin;

  // Convert UTC time to minutes, add offset, normalize to 0-1440
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  const solarMinutes = utcMinutes + totalOffsetMin;
  const normalized = ((solarMinutes % 1440) + 1440) % 1440;

  const hours = Math.floor(normalized / 60);
  const minutes = Math.round(normalized % 60);

  return `ST${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
