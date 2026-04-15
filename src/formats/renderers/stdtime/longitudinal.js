/**
 * Longitudinal standard time renderer.
 *
 * Expresses standard time as a position on the 360° daily arc:
 *   0° = start of day (meridian midnight)
 *   180° = meridian noon
 *   360° = end of day (wraps back to 0°)
 *
 * This is NOT "clock time at a geographic longitude" — it is the time ITSELF
 * expressed as degrees. 1° = 4 minutes = 240 seconds of time.
 *
 * Formula:
 *   msOfDay    = UTC hours/min/sec/ms combined into total milliseconds since UTC midnight
 *   adjustedMs = ((msOfDay + meridianOffsetMs) % 86400000 + 86400000) % 86400000
 *   degrees    = adjustedMs / 86400000 * 360
 *
 * Symbol: ⧖ (U+29D6 WHITE HOURGLASS) — NOT ☉ (U+2609 SUN), which is reserved for solar/date renderers.
 * Format: ⧖NNN.NN° — e.g. '⧖0.00°', '⧖180.00°', '⧖270.25°'
 *
 * Precision: floored to 2 decimal places. Range: [0.00°, 360.00°) — never reaches 360.00° exactly.
 *
 * Error fallback: '⧖???°' when data is null/undefined.
 *
 * @param {object} data - Chronometer data. data.now should be a valid Date.
 * @param {object} [opts] - Pipeline options.
 * @param {number} [opts.meridianOffset=0] - Hours offset (float). Positive = east of UTC.
 * @returns {string} Formatted longitudinal time string. Never throws.
 */
export function render(data, opts = {}) {
  // Return error fallback if data itself is null or undefined
  if (data == null) {
    return '\u29D6???\u00B0';
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
    const adjustedMs = ((msOfDay + meridianOffsetMs) % 86400000 + 86400000) % 86400000;

    const degrees = adjustedMs / 86400000 * 360;
    const flooredDegrees = Math.floor(degrees * 100) / 100;
    return `\u29D6${flooredDegrees.toFixed(2)}\u00B0`;
  } catch (_) {
    return '\u29D6???\u00B0';
  }
}
