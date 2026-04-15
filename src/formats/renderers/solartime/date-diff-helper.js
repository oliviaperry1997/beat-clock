/**
 * Date comparison helper for solar time renderers.
 * 
 * Computes whether the local solar date differs from the standard meridian date.
 * Solar time renderers call this to set opts.solarDateDiffsStdDate before returning.
 * Date renderers (Phase 11) consume this flag to append +/- indicators.
 * 
 * Strategy: Construct Date objects for both solar time and standard time at current moment,
 * then compare their UTC dates.
 * 
 * @param {object} data - Chronometer data
 * @param {object} data.solarTime - Solar time object { hours, minutes, totalMinutes, degrees }
 * @param {Date} data.now - Current UTC Date
 * @param {object} opts - Renderer options
 * @param {number} [opts.meridianOffset=0] - Hours offset for standard time (float)
 * @returns {string|null} 'ahead' | 'behind' | null
 */
export function computeDateDiff(data, opts = {}) {
  // Validate inputs
  if (!data?.solarTime || !data?.now) return null;
  if (!(data.now instanceof Date) || isNaN(data.now)) return null;
  
  const now = data.now;
  
  // Get current UTC time in milliseconds
  const utcTime = now.getTime();
  
  // Standard time offset in milliseconds
  const meridianOffsetMs = (opts.meridianOffset ?? 0) * 3600000;
  
  // Solar time offset in milliseconds
  // Solar offset = what we need to add to UTC to get solar time
  // solarMinutes = utcMinutes + solarOffset (normalized to 0-1439)
  // So: solarOffset = solarMinutes - utcMinutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const solarMinutes = data.solarTime.totalMinutes;
  
  // Handle wraparound: if difference is large, we crossed midnight
  let solarOffsetMinutes = solarMinutes - utcMinutes;
  if (solarOffsetMinutes > 720) {
    solarOffsetMinutes -= 1440; // Wrapped backward through midnight
  } else if (solarOffsetMinutes < -720) {
    solarOffsetMinutes += 1440; // Wrapped forward through midnight
  }
  const solarOffsetMs = solarOffsetMinutes * 60000;
  
  // Construct local times
  const standardTime = new Date(utcTime + meridianOffsetMs);
  const solarTime = new Date(utcTime + solarOffsetMs);
  
  // Compare UTC dates (year, month, day)
  const standardDate = standardTime.getUTCDate();
  const solarDate = solarTime.getUTCDate();
  
  // If dates differ, determine if solar is ahead or behind
  if (solarDate > standardDate) {
    // Check if it's a month boundary case (e.g., solar = 1, standard = 31)
    if (solarDate === 1 && standardDate > 28) {
      return 'behind'; // Solar wrapped to next month, but is actually behind
    }
    return 'ahead';
  }
  if (solarDate < standardDate) {
    // Check if it's a month boundary case (e.g., solar = 31, standard = 1)
    if (standardDate === 1 && solarDate > 28) {
      return 'ahead'; // Standard wrapped to next month, but solar is actually ahead
    }
    return 'behind';
  }
  
  // Dates are the same, no difference
  return null;
}
