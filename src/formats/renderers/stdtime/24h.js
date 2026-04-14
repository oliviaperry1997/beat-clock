/**
 * 24h standard time renderer.
 *
 * Renders UTC time adjusted by a fractional hour meridian offset.
 * Always reads minutes and seconds directly from UTC (no sub-hour offset carry).
 * Supports optional seconds display via opts.showSeconds.
 *
 * Format: HH:MM (default) or HH:MM:SS (opts.showSeconds = true)
 * Zero-padded hours and minutes always (e.g. '08:05', '00:00', '23:59').
 *
 * Meridian offset: opts.meridianOffset (hours, float). Default: 0 (UTC).
 * Math.floor applied to adjusted hours to handle fractional offsets (e.g. IST +5.5h).
 *
 * Error fallback: '??:??' or '??:??:??' when data is null/undefined.
 * Falls back to new Date() when data.now is absent or invalid.
 *
 * @param {object} data - Chronometer data. data.now should be a valid Date.
 * @param {object} [opts] - Pipeline options.
 * @param {number} [opts.meridianOffset=0] - Hours offset (float). Positive = east of UTC.
 * @param {boolean} [opts.showSeconds=false] - If true, append :SS to output.
 * @returns {string} Formatted time string. Never throws.
 */
export function render(data, opts = {}) {
  // Return error fallback if data itself is null or undefined
  if (data == null) {
    return opts.showSeconds ? '??:??:??' : '??:??';
  }

  const raw = data.now;
  const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();

  try {
    const meridianOffset = opts.meridianOffset ?? 0;
    const utcHours = now.getUTCHours();
    // Math.floor REQUIRED: fractional offsets (e.g. +5.5) would produce non-integer hours
    const adjustedHours = Math.floor(((utcHours + meridianOffset) % 24 + 24) % 24);
    const h = String(adjustedHours).padStart(2, '0');
    const m = String(now.getUTCMinutes()).padStart(2, '0');

    if (opts.showSeconds) {
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      return `${h}:${m}:${s}`;
    }
    return `${h}:${m}`;
  } catch (_) {
    return opts.showSeconds ? '??:??:??' : '??:??';
  }
}
