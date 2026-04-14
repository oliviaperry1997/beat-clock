/**
 * Custom epoch year renderer.
 *
 * Renders the current year relative to a user-defined epoch (custom year 1).
 * Supports optional custom label (replaces default 'Y' prefix) and label positioning.
 *
 * Year computation priority:
 *   1. If data.effectiveYear is present AND opts.customEpoch is a valid Date:
 *      year = data.effectiveYear - opts.customEpoch.getUTCFullYear() + 1
 *   2. Else if data.customEpoch is a 'CE{n}' string (not 'CE??'):
 *      year = parseInt(data.customEpoch.slice(2), 10)
 *   3. Else: return error fallback
 *
 * Label options:
 *   - opts.customLabel (string): replaces default 'Y' prefix
 *   - opts.customLabelPosition ('prefix'|'suffix'): default 'prefix'
 *
 * @param {object} data - Chronometer data from compose(), with optional effectiveYear
 * @param {object} [opts] - Pipeline options
 * @param {Date}   [opts.customEpoch] - The epoch Date (year 1 of the custom calendar)
 * @param {string} [opts.customLabel] - Custom label replacing 'Y'
 * @param {string} [opts.customLabelPosition] - 'prefix' (default) or 'suffix'
 * @returns {string} Formatted year string: '{label}{year}' or error fallback
 */
export function render(data, opts = {}) {
  let year;

  // Priority 1: effectiveYear + opts.customEpoch Date
  if (data?.effectiveYear != null && opts.customEpoch instanceof Date && !isNaN(opts.customEpoch)) {
    year = data.effectiveYear - opts.customEpoch.getUTCFullYear() + 1;
  }
  // Priority 2: parse year from data.customEpoch string 'CE{n}'
  else if (data?.customEpoch && typeof data.customEpoch === 'string' && data.customEpoch !== 'CE??') {
    const parsed = parseInt(data.customEpoch.slice(2), 10);
    if (!isNaN(parsed)) {
      year = parsed;
    }
  }

  // Error fallback
  if (year == null) {
    const label = opts.customLabel ?? 'Y';
    return `${label}??`;
  }

  const label = opts.customLabel ?? 'Y';
  const pos = opts.customLabelPosition ?? 'prefix';
  return pos === 'suffix' ? `${year}${label}` : `${label}${year}`;
}
