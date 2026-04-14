/**
 * Holocene year renderer.
 *
 * Renders the current year in the Holocene Era calendar system.
 * Holocene year = Gregorian year + 9700.
 *
 * When data.effectiveYear is present (injected by the display pipeline in Phase 14
 * to handle year boundary transitions), the renderer applies the +9700 offset directly.
 * Otherwise falls back to data.holocene from compose().
 *
 * @param {object} data - Chronometer data from compose(), with optional effectiveYear
 * @param {object} [opts] - Pipeline options (not used by this renderer)
 * @returns {string} Formatted year string: 'H{year}' or 'H??'
 */
export function render(data, opts = {}) {
  if (data?.effectiveYear != null && !isNaN(data.effectiveYear)) {
    return `H${data.effectiveYear + 9700}`;
  }
  return `H${data?.holocene ?? '??'}`;
}
