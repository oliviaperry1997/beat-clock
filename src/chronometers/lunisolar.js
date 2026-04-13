import { Solar } from 'lunar-javascript';
import SunCalc from 'suncalc';

/**
 * Lunisolar chronometer — computes lunar month, day, and leap month status.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @returns {object} { month: number, day: number, isLeap: boolean, moonAge: number, illumination: number }
 */
export function compute(date, opts) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  const month = lunar.getMonth();
  const day = lunar.getDay();
  const isLeap = month < 0;

  const moonIllumination = SunCalc.getMoonIllumination(date);
  // moonIllumination.phase is 0..2*PI (0 = new moon, PI = full moon)
  // Convert phase to moon age in days (0-29.53 day lunar cycle)
  const moonAge = (moonIllumination.phase / (2 * Math.PI)) * 29.53;

  return {
    month: Math.abs(month),
    day,
    isLeap,
    moonAge: moonAge % 29.53,  // normalize to 0-29.53
    illumination: moonIllumination.fraction,
  };
}
