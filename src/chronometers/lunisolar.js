import { Solar } from 'lunar-javascript';

/**
 * Lunisolar chronometer — computes lunar month, day, and leap month status.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @returns {object} { month: number, day: number, isLeap: boolean }
 */
export function compute(date, opts) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();

  const month = lunar.getMonth();
  const day = lunar.getDay();
  const isLeap = month < 0;

  return {
    month: Math.abs(month),
    day,
    isLeap,
  };
}
