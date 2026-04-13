import { getChineseNewYear } from './chineseNewYear.js';

/**
 * Holocene chronometer — computes Holocene year that ticks on Chinese New Year.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @returns {number} Holocene year (gregorianYear + 9700)
 */
export function compute(date, opts) {
  const gregorianYear = date.getUTCFullYear();
  const cny = getChineseNewYear(gregorianYear);
  const cnyDate = new Date(Date.UTC(cny.getYear(), cny.getMonth() - 1, cny.getDay()));

  // If the date is before Chinese New Year of its Gregorian year, use previous year
  const effectiveYear = date < cnyDate ? gregorianYear - 1 : gregorianYear;

  return effectiveYear + 9700;
}
