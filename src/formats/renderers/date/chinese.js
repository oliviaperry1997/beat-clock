/**
 * Chinese lunisolar date renderer.
 *
 * Renders the current date in the Chinese lunisolar calendar system.
 * Source: data.lunisolar from compose() → { month, day, isLeap }
 *
 * Format:
 *   Normal month:              'M{month} D{day}'  e.g., 'M6 D15'
 *   Intercalary (leap) month:  'MX D{day}'        e.g., 'MX D1'
 *
 * The 'X' in leap month notation replaces the entire month number —
 * NOT appended to it. 'MX D15' means "the intercalary month, day 15."
 * (Showing the number would be ambiguous since the leap month is a
 * repeat of an existing month number.)
 *
 * Day +/- indicator (opts.solarDateDiffsStdDate):
 *   - 'ahead'  → appends '+' suffix
 *   - 'behind' → appends '-' suffix
 *   - falsy    → no suffix
 *
 * @param {object} data - Chronometer data from compose()
 * @param {object} [opts] - Pipeline options
 * @param {string} [opts.solarDateDiffsStdDate] - 'ahead' | 'behind' | falsy
 * @returns {string} Formatted date string or '??' on missing data
 */
export function render(data, opts = {}) {
  const lunisolar = data?.lunisolar;

  // Guard: lunisolar must be a plain object (not null, not the '??' error string)
  if (!lunisolar || typeof lunisolar !== 'object') return '??';

  const { month, day, isLeap } = lunisolar;

  // Guard: month and day must be present
  if (month == null || day == null) return '??';

  const monthStr = isLeap ? 'X' : String(month);
  const suffix = opts.solarDateDiffsStdDate === 'ahead' ? '+'
               : opts.solarDateDiffsStdDate === 'behind' ? '-'
               : '';

  return `M${monthStr} D${day}${suffix}`;
}
