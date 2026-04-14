/**
 * Gregorian date renderer.
 *
 * Renders the current date in the standard Gregorian calendar.
 * Always uses UTC methods for consistency with all other chronometer modules.
 *
 * Source date: data.now (injected by Phase 14 pipeline as the effective meridian time)
 * or falls back to new Date().
 *
 * Format: {M}/{D} — no zero-padding (e.g., '4/14', '1/1', '12/31')
 *
 * Day +/- indicator (opts.solarDateDiffsStdDate):
 *   - 'ahead'  → appends '+' (local solar date is ahead of standard meridian date)
 *   - 'behind' → appends '-' (local solar date is behind standard meridian date)
 *   - falsy    → no suffix
 *
 * @param {object} data - Chronometer data, with optional data.now (Date)
 * @param {object} [opts] - Pipeline options
 * @param {string} [opts.solarDateDiffsStdDate] - 'ahead' | 'behind' | falsy
 * @returns {string} Formatted date string: 'M/D', 'M/D+', or 'M/D-'
 */
export function render(data, opts = {}) {
  const raw = data?.now;
  const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const suffix = opts.solarDateDiffsStdDate === 'ahead' ? '+'
               : opts.solarDateDiffsStdDate === 'behind' ? '-'
               : '';
  return `${month}/${day}${suffix}`;
}
