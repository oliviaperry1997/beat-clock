/**
 * Decimal beats standard time renderer.
 * Full implementation in Phase 12.
 * @param {object} data - Chronometer data (beats from compose())
 * @param {object} opts - Options (beat-interval offset)
 * @returns {string} Formatted decimal beats string
 */
export function render(data, opts = {}) {
  const beats = data?.beats ?? '@???';
  const offset = opts.beatOffset ?? 0;
  // Stub — full decimal beat calculation with offset in Phase 12
  return `${beats}${offset !== 0 ? ` (${offset > 0 ? '+' : ''}${offset})` : ''}`;
}
