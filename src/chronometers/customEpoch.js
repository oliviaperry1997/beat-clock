/**
 * Custom Epoch chronometer — counts years forward from a user-defined epoch date.
 * The epoch date is passed via opts.customEpoch.
 * Pre-Holocene dates (before 9700 BCE) return 'CE??' regardless of customEpoch.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {Date} [opts.customEpoch] - User-defined epoch date (year 1)
 * @returns {string} Custom epoch year string (CE{year}) or 'CE??' if invalid
 */
export function compute(date, opts = {}) {
  const { customEpoch } = opts;

  // Missing or invalid customEpoch
  if (!customEpoch || !(customEpoch instanceof Date) || isNaN(customEpoch.getTime())) {
    return 'CE??';
  }

  // Pre-Holocene check (before 9700 BCE = JS year -9699)
  const PRE_HOLOCAENE_BOUNDARY = -9699;
  const year = date.getUTCFullYear();
  if (year < PRE_HOLOCAENE_BOUNDARY) {
    return 'CE??';
  }

  const epochYear = customEpoch.getUTCFullYear();
  const customYear = year - epochYear + 1;

  return `CE${customYear}`;
}
