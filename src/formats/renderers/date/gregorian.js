/**
 * Gregorian date renderer.
 * Full implementation in Phase 11.
 * @param {object} data - Chronometer data
 * @returns {string} Formatted date string (M/D)
 */
export function render(data) {
  const now = data?.now ?? new Date();
  return `${now.getMonth() + 1}/${now.getDate()}`;
}
