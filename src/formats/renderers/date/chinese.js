/**
 * Chinese lunisolar date renderer.
 * Full implementation in Phase 11.
 * @param {object} data - Chronometer data (lunisolar value from compose())
 * @returns {string} Formatted Chinese date string (month/day with leap notation)
 */
export function render(data) {
  const { month, day, isLeap } = data?.lunisolar ?? {};
  if (month == null || day == null) return '??/??';
  const monthStr = isLeap ? `${month}X` : `${month}`;
  return `M${monthStr} D${day}`;
}
