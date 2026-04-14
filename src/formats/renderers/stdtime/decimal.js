/**
 * Decimal beats standard time renderer.
 *
 * Recomputes beats from midnight at the chosen meridian. Does NOT pass through
 * data.beats (which is BMT-anchored / Swatch Internet Time). Instead, this renderer
 * applies the user's meridianOffset to shift the "midnight" reference point.
 *
 * Formula:
 *   msOfDay  = UTC hours/min/sec/ms combined into total milliseconds since UTC midnight
 *   adjustedMs = ((msOfDay + meridianOffsetMs) % 86400000 + 86400000) % 86400000
 *   beats    = adjustedMs / 86400
 *
 * At meridianOffset = 1 (UTC+1, i.e. BMT), output matches beats.js chronometer exactly.
 *
 * Format: @NNN.NN — always 6 characters after '@', zero-padded from left.
 * e.g. '@000.00', '@270.25', '@999.99'
 *
 * Error fallback: '@???' when data is null/undefined.
 *
 * @param {object} data - Chronometer data. data.now should be a valid Date.
 * @param {object} [opts] - Pipeline options.
 * @param {number} [opts.meridianOffset=0] - Hours offset (float). Positive = east of UTC.
 * @returns {string} Formatted beats string. Never throws.
 */
export function render(data, opts = {}) {
  // Return error fallback if data itself is null or undefined
  if (data == null) {
    return '@???';
  }

  const raw = data.now;
  const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();

  try {
    const meridianOffset = opts.meridianOffset ?? 0;
    const meridianOffsetMs = meridianOffset * 3600000;

    const msOfDay = now.getUTCHours() * 3600000
                  + now.getUTCMinutes() * 60000
                  + now.getUTCSeconds() * 1000
                  + now.getUTCMilliseconds();

    // Double-modulo: handles both positive and negative offsets
    // JavaScript % can return negative values for negative operands
    const adjustedMs = ((msOfDay + meridianOffsetMs) % 86400000 + 86400000) % 86400000;

    const beats = adjustedMs / 86400;
    return `@${beats.toFixed(2).padStart(6, '0')}`;
  } catch (_) {
    return '@???';
  }
}
