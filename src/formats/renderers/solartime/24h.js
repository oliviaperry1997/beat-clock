import { computeDateDiff } from './date-diff-helper.js';

/**
 * 24h local solar time renderer.
 * 
 * Renders local solar time (equation of time corrected, location-based) in 24-hour format.
 * NO seconds display — solar time precision philosophy per Phase 13 D-05.
 * 
 * Format: HH:MM — zero-padded hours and minutes (e.g., '14:32', '08:05', '00:00')
 * 
 * Source data: data.solarTime.hours and data.solarTime.minutes (from solarTime chronometer)
 * 
 * Date comparison: Computes opts.solarDateDiffsStdDate before returning (consumed by date renderers)
 * 
 * Error fallback: '??:??' when data.solarTime is null or invalid.
 * 
 * @param {object} data - Chronometer data from compose()
 * @param {object} data.solarTime - { hours, minutes, totalMinutes, degrees } or null
 * @param {Date} data.now - Current UTC Date (for date comparison)
 * @param {object} [opts] - Pipeline options
 * @param {number} [opts.meridianOffset=0] - Standard time meridian offset (for date comparison)
 * @returns {string} Formatted 24h solar time string. Never throws.
 */
export function render(data, opts = {}) {
  // Error fallback: null or missing solarTime
  if (!data?.solarTime || typeof data.solarTime !== 'object') {
    return '??:??';
  }
  
  try {
    const { hours, minutes } = data.solarTime;
    
    // Validate fields
    if (hours == null || minutes == null) return '??:??';
    
    // Format: HH:MM with zero-padding
    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    
    // Compute and set date comparison flag (consumed by date renderers in Phase 14)
    opts.solarDateDiffsStdDate = computeDateDiff(data, opts);
    
    return `${h}:${m}`;
  } catch (_) {
    return '??:??';
  }
}
