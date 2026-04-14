/**
 * 24h local solar time renderer.
 * Full implementation in Phase 13.
 * @param {object} data - Chronometer data (solarTime from compose())
 * @returns {string} Formatted 24h solar time string
 */
export function render(data) {
  const solarTime = data?.solarTime;
  if (!solarTime || typeof solarTime === 'string') return solarTime ?? 'ST??';
  // Stub — full solar time formatting in Phase 13
  return `${solarTime.hours ?? '?'}:${String(solarTime.minutes ?? '??').padStart(2, '0')}`;
}
