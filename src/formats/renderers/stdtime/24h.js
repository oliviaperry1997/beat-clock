/**
 * 24h standard time renderer.
 * Full implementation in Phase 12.
 * @param {object} data - Chronometer data
 * @param {object} opts - Options (meridian offset in hours)
 * @returns {string} Formatted 24h time string
 */
export function render(data, opts = {}) {
  const meridianOffset = opts.meridianOffset ?? 0;
  const now = data?.now ?? new Date();
  const utcHours = now.getUTCHours();
  const adjustedHours = ((utcHours + meridianOffset) % 24 + 24) % 24;
  const hours = String(adjustedHours).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
