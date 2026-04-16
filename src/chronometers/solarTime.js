import { eqtime, base, julian } from 'astronomia';
import SunCalc from 'suncalc';

/**
 * Solar Time chronometer — computes local solar time with equation of time correction.
 * Solar time = UTC + longitude offset (1° = 4 min) + equation of time.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude
 * @param {number} [opts.longitude] - Longitude
 * @returns {object|null} Object with { hours, minutes, totalMinutes, degrees, altitudeDeg } or null when location unavailable
 */
export function compute(date, opts = {}) {
  const { latitude, longitude } = opts;

  if (latitude == null || longitude == null) return null;

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

  const totalMinutes = Math.round(normalized) % 1440;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const degrees = (totalMinutes / 1440) * 360;

  // Solar altitude at the given location in degrees (-90 to +90)
  const sunPos = SunCalc.getPosition(date, latitude, longitude);
  const altitudeDeg = sunPos.altitude * (180 / Math.PI);

  return { hours, minutes, totalMinutes, degrees, altitudeDeg };
}
