/**
 * Decimal solar beats renderer.
 * Full implementation in Phase 13.
 * @param {object} data - Chronometer data (solarTime from compose())
 * @returns {string} Formatted decimal solar beats string
 */
export function render(data) {
  const solarTime = data?.solarTime;
  // Stub — full decimal solar beat calculation in Phase 13
  return `@${solarTime?.beats ?? '??'}`;
}
