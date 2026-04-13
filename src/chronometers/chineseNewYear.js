import { Lunar } from 'lunar-javascript';

/**
 * Get the Chinese New Year date for a given year.
 * @param {number} year - Gregorian year
 * @returns {object} Solar object representing Chinese New Year date
 */
export function getChineseNewYear(year) {
  return Lunar.fromYmd(year, 1, 1).getSolar();
}
