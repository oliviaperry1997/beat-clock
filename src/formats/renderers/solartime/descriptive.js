/**
 * Descriptive solar time renderer.
 * Full implementation in Phase 13.
 * @param {object} data - Chronometer data (solarTime from compose())
 * @returns {string} Time-of-day description (golden hour, blue hour, etc.)
 */
export function render(data) {
  const solarTime = data?.solarTime;
  if (!solarTime || typeof solarTime === 'string') return 'Day';
  // Stub — full description mapping in Phase 13
  return solarTime.description ?? 'Day';
}
