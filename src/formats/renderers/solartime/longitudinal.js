import { computeDateDiff } from './date-diff-helper.js';

/**
 * Longitudinal solar time renderer.
 * 
 * Expresses solar time at the chosen longitude as degrees (0-359°).
 * Uses actual sun position (equation of time included) at the chosen longitude.
 * Differs from Standard Time longitudinal (Phase 12) which uses fixed meridian offset.
 * 
 * NO decimal degrees — solar time precision philosophy per Phase 13 D-07.
 * 
 * Formula: degrees = Math.floor((solarMinutesAtChosenLongitude / 1440) * 360)
 * 
 * Symbol: supplied by the display layer so it can use a custom inline SVG.
 * 
 * Format: NNN° — integer degrees only, zero-padded to 3 digits (e.g., '218°', '042°')
 * 
 * Source data: data.solarTime.degrees (from solarTime chronometer)
 * 
 * Date comparison: Computes opts.solarDateDiffsStdDate before returning (consumed by date renderers)
 * 
 * Error fallback: '???°' when data.solarTime is null or invalid.
 * 
 * @param {object} data - Chronometer data from compose()
 * @param {object} data.solarTime - { hours, minutes, totalMinutes, degrees } or null
 * @param {Date} data.now - Current UTC Date (for date comparison)
 * @param {object} [opts] - Pipeline options
 * @param {number} [opts.chosenLongitude] - Longitude in degrees (-180 to +180). Default: user's actual longitude if available, else 0°.
 * @param {number} [opts.meridianOffset=0] - Standard time meridian offset (for date comparison)
 * @returns {string} Formatted longitudinal solar time string. Never throws.
 */
export function render(data, opts = {}) {
  // Error fallback: null or missing solarTime
  if (!data?.solarTime || typeof data.solarTime !== 'object') {
    return '???\u00B0';
  }
  
  try {
    const { degrees } = data.solarTime;
    
    // Validate field
    if (degrees == null) return '???\u00B0';
    
    // Integer degrees only (no decimal places)
    const intDegrees = Math.floor(degrees);
    
    // Format: NNN° with zero-padding to 3 digits. The UI prepends the symbol.
    const formatted = String(intDegrees).padStart(3, '0');
    
    // Compute and set date comparison flag (consumed by date renderers in Phase 14)
    opts.solarDateDiffsStdDate = computeDateDiff(data, opts);
    
    return `${formatted}\u00B0`;
  } catch (_) {
    return '???\u00B0';
  }
}
