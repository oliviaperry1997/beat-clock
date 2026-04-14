/**
 * Holocene year renderer.
 * Full implementation in Phase 11.
 * @param {object} data - Chronometer data (holocene value from compose())
 * @returns {string} Formatted year string
 */
export function render(data) {
  return `H${data?.holocene ?? '??'}`;
}
