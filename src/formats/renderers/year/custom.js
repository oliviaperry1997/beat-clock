/**
 * Custom epoch year renderer.
 * Full implementation in Phase 11.
 * @param {object} data - Chronometer data (customEpoch value from compose())
 * @returns {string} Formatted custom epoch year string
 */
export function render(data) {
  const year = data?.customEpoch ?? '??';
  return `Y${year}`;
}
