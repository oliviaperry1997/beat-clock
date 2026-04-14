/**
 * Meghalayan age year renderer.
 * Full implementation in Phase 11.
 * @param {object} data - Chronometer data (meghalayan value from compose())
 * @returns {string} Formatted Meghalayan year string
 */
export function render(data) {
  const year = data?.meghalayan?.year ?? '??';
  return `Mgh ${year}`;
}
