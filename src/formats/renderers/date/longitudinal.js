/**
 * Longitudinal date renderer (Solar Longitude + Lunar Phase Angle).
 * Full implementation in Phase 11.
 * @param {object} data - Chronometer data (solarLongitude, lunarPhase from compose())
 * @returns {string} Formatted longitudinal date string (☉ XXX° ☽ XXX°)
 */
export function render(data) {
  const sl = data?.solarLongitude ?? '??';
  const lp = data?.lunarPhase ?? '??';
  return `☉ ${sl}° ☽ ${lp}°`;
}
