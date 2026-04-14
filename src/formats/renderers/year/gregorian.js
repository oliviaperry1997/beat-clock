/**
 * Gregorian year renderer.
 * Full implementation in Phase 11.
 * @param {object} data - Chronometer data
 * @returns {string} Formatted year string
 */
export function render(data) {
  // Use standard JS to get Gregorian year
  return String(data?.now?.getFullYear() ?? new Date().getFullYear());
}
