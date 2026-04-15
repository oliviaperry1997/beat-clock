/**
 * Gregorian year renderer.
 *
 * Renders the current year in the standard Gregorian calendar.
 * Always uses UTC year for consistency with all other chronometer modules.
 *
 * When data.effectiveYear is present (injected by the display pipeline in Phase 14
 * to handle year boundary transitions), it takes precedence.
 * Otherwise falls back to UTC year from data.now (injected by Phase 14) or new Date().
 *
 * @param {object} data - Chronometer data from compose(), with optional effectiveYear and now
 * @param {object} [opts] - Pipeline options (not used by this renderer)
 * @returns {string} Formatted year string with era suffix, e.g. '2026AD'
 */
export function render(data, opts = {}) {
  if (data?.effectiveYear != null) {
    return `${data.effectiveYear}AD`;
  }
  const now = data?.now ?? new Date();
  return `${now.getUTCFullYear()}AD`;
}
