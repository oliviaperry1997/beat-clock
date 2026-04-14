/**
 * Holocene Stages chronometer — returns which Holocene stage a date falls into
 * with the year count within that stage.
 *
 * Three stages of the Holocene:
 * - Greenlandian: 9700 BCE to 6326 BCE (start of Holocene to 8.2kya event)
 * - Northgrippian: 6326 BCE to 2200 BCE (8.2kya event to 4.2kya event)
 * - Meghalayan: 2200 BCE to present (4.2kya event onward)
 *
 * Uses JavaScript astronomical year numbering where BCE years are negative:
 * 2200 BCE = JS year -2199, 6326 BCE = JS year -6325, 9700 BCE = JS year -9699
 *
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration (not used)
 * @returns {object} { stage, year, label } or pre-Holocene fallback
 */
export function compute(date, opts = {}) {
  const year = date.getUTCFullYear();

  // Stage boundaries in JS astronomical year numbering
  const MEGHALAYAN_BOUNDARY = -2199;   // 2200 BCE
  const NORTHGRIPPIAN_BOUNDARY = -6325; // 6326 BCE
  const GREENLANDIAN_BOUNDARY = -9699;  // 9700 BCE

  // Pre-Holocene: before the start of the Holocene epoch
  if (year < GREENLANDIAN_BOUNDARY) {
    return { stage: 'pre-holocene', year: null, label: '—' };
  }

  let stage, stageYear, label;

  if (year >= MEGHALAYAN_BOUNDARY) {
    // Meghalayan: 2200 BCE to present
    stage = 'meghalayan';
    stageYear = year + 2200;
    label = `Mgh ${stageYear}`;
  } else if (year >= NORTHGRIPPIAN_BOUNDARY) {
    // Northgrippian: 6326 BCE to 2200 BCE
    stage = 'northgrippian';
    stageYear = year + 6326;
    label = `Nrg ${stageYear}`;
  } else {
    // Greenlandian: 9700 BCE to 6326 BCE
    stage = 'greenlandian';
    stageYear = year + 9700;
    label = `Ghg ${stageYear}`;
  }

  return { stage, year: stageYear, label };
}
