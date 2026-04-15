/**
 * Date comparison helper for solar time renderers.
 * 
 * Computes whether the local solar date differs from the standard meridian date.
 * Solar time renderers call this to set opts.solarDateDiffsStdDate before returning.
 * Date renderers (Phase 11) consume this flag to append +/- indicators.
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
  
  // Standard time minutes from UTC + meridian offset
  const utcMinutes = data.now.getUTCHours() * 60 + data.now.getUTCMinutes();
  const meridianOffsetMinutes = (opts.meridianOffset ?? 0) * 60;
  // Double-modulo handles both positive and negative offsets
  const stdMinutes = ((utcMinutes + meridianOffsetMinutes) % 1440 + 1440) % 1440;
  
  // Solar time minutes (already computed in chronometer)
  const solarMinutes = data.solarTime.totalMinutes;
  
  // Compare days (totalMinutes can be negative for yesterday or >1440 for tomorrow)
  // Day-of-year is floor(minutes / 1440), which normalizes across midnight boundaries
  const solarDay = Math.floor(solarMinutes / 1440);
  const stdDay = Math.floor(stdMinutes / 1440);
  
  if (solarDay > stdDay) return 'ahead';
  if (solarDay < stdDay) return 'behind';
  return null;
}
