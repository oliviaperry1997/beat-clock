import { getDescription } from './descriptions.js';
import { computeDateDiff } from './date-diff-helper.js';

/**
 * Descriptive solar time renderer.
 * 
 * Returns human-readable time-of-day description labels based on sun position and events.
 * Uses 16-label event-anchored system for normal solar cycles.
 * Handles polar edge cases (polar day, white nights, polar night) with compartmentalized logic.
 * 
 * Labels include: Astronomical Dawn, Morning Twilight, Sunrise, Early Morning, Midmorning,
 * Late Morning, Noon, Early Afternoon, Midafternoon, Late Afternoon, Sunset, Evening Twilight,
 * Astronomical Dusk, Early Night, Midnight, Late Night.
 * 
 * Polar cases use simplified label sets appropriate for missing solar events.
 * Altitude fallback (Day/Twilight/Night) used when event pattern is ambiguous.
 * 
 * Error fallback: 'Day' when location or date is unavailable.
 * 
 * Date comparison: Computes opts.solarDateDiffsStdDate before returning (consumed by date renderers)
 * 
 * @param {object} data - Chronometer data from compose()
 * @param {Date} data.now - Current UTC Date
 * @param {object} [opts] - Pipeline options
 * @param {number} [opts.latitude] - Latitude in degrees
 * @param {number} [opts.longitude] - Longitude in degrees
 * @param {number} [opts.meridianOffset=0] - Standard time meridian offset (for date comparison)
 * @returns {string} Time-of-day description label. Never throws.
 */
export function render(data, opts = {}) {
  // Error fallback: missing data or location
  if (!data?.now) return 'Day';
  if (!(data.now instanceof Date) || isNaN(data.now)) return 'Day';
  
  const { latitude, longitude } = opts;
  if (latitude == null || longitude == null) return 'Day';
  
  try {
    // Get description from mapping module
    const description = getDescription(data.now, latitude, longitude);
    
    // Compute and set date comparison flag (consumed by date renderers in Phase 14)
    opts.solarDateDiffsStdDate = computeDateDiff(data, opts);
    
    return description;
  } catch (_) {
    return 'Day';
  }
}
