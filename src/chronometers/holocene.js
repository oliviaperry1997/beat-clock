import { getChineseNewYear } from './chineseNewYear.js';

/**
 * Holocene chronometer — computes Holocene year that ticks on Chinese New Year.
 * Returns '??' for pre-Holocene dates (before 9700 BCE).
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @returns {number|string} Holocene year (gregorianYear + 9700) or '??' for pre-Holocene
 */
export function compute(date, opts) {
  // Pre-Holocene check: before 9700 BCE (JS astronomical year -9699)
  const PRE_HOLOCAENE_BOUNDARY = -9699;
  if (date.getUTCFullYear() < PRE_HOLOCAENE_BOUNDARY) {
    return '??';
  }

  const gregorianYear = date.getUTCFullYear();
  const cny = getChineseNewYear(gregorianYear);
  const cnyDate = new Date(Date.UTC(cny.getYear(), cny.getMonth() - 1, cny.getDay()));

  // If the date is before Chinese New Year of its Gregorian year, use previous year
  const effectiveYear = date < cnyDate ? gregorianYear - 1 : gregorianYear;

  return effectiveYear + 9700;
}
