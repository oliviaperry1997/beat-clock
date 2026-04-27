import { computeDateDiff } from './date-diff-helper.js';

/**
 * Longitudinal solar time renderer.
 * 
 * Expresses the sun's actual compass azimuth at the selected location (0–359°, north-based),
 * followed by the sun's current altitude.
 * Uses SunCalc for both values; azimuth is 0=N, 90=E, 180=S, 270=W.
 *
 * NO decimal degrees — solar time precision philosophy per Phase 13 D-07.
 *
 * Format: NNN°<span>±AA°</span> — azimuth zero-padded to 3 digits (e.g., '218°', '042°'),
 *         altitude signed integer (e.g., '+23°', '−05°'), no space between symbol and number
 *
 * Source data: data.solarTime.azimuthDeg, data.solarTime.altitudeDeg (from solarTime chronometer)
 * 
 * Date comparison: Computes opts.solarDateDiffsStdDate before returning (consumed by date renderers)
 * 
 * Error fallback: '???°' when data.solarTime is null or invalid.
 * 
 * @param {object} data - Chronometer data from compose()
 * @param {object} data.solarTime - { hours, minutes, totalMinutes, degrees, azimuthDeg, altitudeDeg } or null
 * @param {Date} data.now - Current UTC Date (for date comparison)
 * @param {object} [opts] - Pipeline options
 * @param {number} [opts.chosenLongitude] - Longitude in degrees (-180 to +180). Default: user's actual longitude if available, else 0°.
 * @param {number} [opts.meridianOffset=0] - Standard time meridian offset (for date comparison)
 * @returns {string} HTML string with degrees and altitude spans. Never throws.
 */
export function render(data, opts = {}) {
  // Error fallback: null or missing solarTime
  if (!data?.solarTime || typeof data.solarTime !== 'object') {
    return '???\u00B0';
  }
  
  try {
    const { azimuthDeg, altitudeDeg } = data.solarTime;

    // Validate field
    if (azimuthDeg == null) return '???\u00B0';

    // Integer degrees only (no decimal places), 0–359
    const intDegrees = Math.floor(((azimuthDeg % 360) + 360) % 360);
    
    // Format: NNN° with zero-padding to 3 digits. The UI prepends the symbol.
    const formatted = String(intDegrees).padStart(3, '0');
    
    // Compute and set date comparison flag (consumed by date renderers in Phase 14)
    opts.solarDateDiffsStdDate = computeDateDiff(data, opts);
    
    // Build altitude string if available
    let altHtml = '';
    if (altitudeDeg != null && isFinite(altitudeDeg)) {
      const intAlt = Math.round(altitudeDeg);
      // Signed integer: show + for above horizon, - for below, pad to 2 digits
      const sign = intAlt >= 0 ? '+' : '\u2212';
      const absAlt = String(Math.abs(intAlt)).padStart(2, '0');
      altHtml = `<span class="solar-altitude">${sign}${absAlt}\u00B0</span>`;
    }
    
    return `${formatted}\u00B0${altHtml}`;
  } catch (_) {
    return '???\u00B0';
  }
}
