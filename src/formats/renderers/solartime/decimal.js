import { computeDateDiff } from './date-diff-helper.js';

/**
 * Decimal beats local solar time renderer.
 * 
 * Computes beats from solar midnight (not UTC or BMT midnight).
 * NO centibeats display — solar time precision philosophy per Phase 13 D-06.
 * 
 * Formula: beats = Math.floor((solarMinutesSinceSolarMidnight / 1440) * 1000)
 * Range: 0-999 beats (Math.floor prevents reaching @1000 just before midnight)
 * 
 * Format: @NNN — integer only, zero-padded to 3 digits (e.g., '@654', '@042', '@000')
 * 
 * Source data: data.solarTime.totalMinutes (minutes since solar midnight)
 * 
 * Date comparison: Computes opts.solarDateDiffsStdDate before returning (consumed by date renderers)
 * 
 * Error fallback: '@???' when data.solarTime is null or invalid.
 * 
 * @param {object} data - Chronometer data from compose()
 * @param {object} data.solarTime - { hours, minutes, totalMinutes, degrees } or null
 * @param {Date} data.now - Current UTC Date (for date comparison)
 * @param {object} [opts] - Pipeline options
 * @param {number} [opts.meridianOffset=0] - Standard time meridian offset (for date comparison)
 * @returns {string} Formatted decimal beats string. Never throws.
 */
export function render(data, opts = {}) {
  // Error fallback: null or missing solarTime
  if (!data?.solarTime || typeof data.solarTime !== 'object') {
    return '@???';
  }
  
  try {
    const { totalMinutes } = data.solarTime;
    
    // Validate field
    if (totalMinutes == null) return '@???';
    
    // Compute beats from solar midnight
    // Math.floor ensures range is 0-999 (never reaches 1000)
    const beats = Math.floor((totalMinutes / 1440) * 1000);
    
    // Format: @NNN with zero-padding to 3 digits
    const formatted = String(beats).padStart(3, '0');
    
    // Compute and set date comparison flag (consumed by date renderers in Phase 14)
    opts.solarDateDiffsStdDate = computeDateDiff(data, opts);
    
    return `@${formatted}`;
  } catch (_) {
    return '@???';
  }
}
