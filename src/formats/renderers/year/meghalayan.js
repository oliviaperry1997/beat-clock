/**
 * Meghalayan age year renderer.
 *
 * Renders the current year in the Holocene Stages calendar system with
 * custom stage abbreviations (different from the chronometer's label field).
 *
 * Stage abbreviations used by this renderer:
 *   - Meghalayan:    'Mgh' (2200 BCE to present)
 *   - Northgrippian: 'Ngp' (6326 BCE to 2200 BCE)  — NOTE: chronometer uses 'Nrg', renderer uses 'Ngp'
 *   - Greenlandian:  'Grn' (9700 BCE to 6326 BCE)  — NOTE: chronometer uses 'Ghg', renderer uses 'Grn'
 *   - Pre-Holocene:  '—'  (before 9700 BCE)
 *
 * Format: {abbreviation}{year} — NO space (e.g., 'Mgh4226', 'Ngp3327', 'Grn1701')
 *
 * When data.effectiveYear is present, re-computes the stage and year from effectiveYear
 * using the same boundary constants as meghalayan.js chronometer.
 *
 * @param {object} data - Chronometer data from compose(), with optional effectiveYear
 * @param {object} [opts] - Pipeline options (not used by this renderer)
 * @returns {string} Formatted year string: '{abbr}{year}', '—', or '??'
 */

// Stage boundary constants (JS astronomical year numbering, same as meghalayan.js chronometer)
const MEGHALAYAN_BOUNDARY = -2199;     // 2200 BCE
const NORTHGRIPPIAN_BOUNDARY = -6325;  // 6326 BCE
const GREENLANDIAN_BOUNDARY = -9699;   // 9700 BCE

const STAGE_ABBR = Object.freeze({
  meghalayan: 'Mgh',
  northgrippian: 'Ngp',
  greenlandian: 'Grn',
});

/**
 * Compute Holocene stage and year-within-stage from a Gregorian year integer.
 * Returns null when the year is pre-Holocene.
 * @param {number} gregorianYear
 * @returns {{ stage: string, year: number }|null}
 */
function computeStageFromYear(gregorianYear) {
  if (gregorianYear < GREENLANDIAN_BOUNDARY) {
    return null; // pre-Holocene
  }
  if (gregorianYear >= MEGHALAYAN_BOUNDARY) {
    return { stage: 'meghalayan', year: gregorianYear + 2200 };
  }
  if (gregorianYear >= NORTHGRIPPIAN_BOUNDARY) {
    return { stage: 'northgrippian', year: gregorianYear + 6326 };
  }
  return { stage: 'greenlandian', year: gregorianYear + 9700 };
}

export function render(data, opts = {}) {
  // When effectiveYear is injected by the pipeline, re-compute the stage directly
  if (data?.effectiveYear != null && !isNaN(data.effectiveYear)) {
    const result = computeStageFromYear(data.effectiveYear);
    if (result === null) return '—';
    const abbr = STAGE_ABBR[result.stage];
    return `${abbr}${result.year}`;
  }

  // Fall back to data.meghalayan from compose()
  const meghalayan = data?.meghalayan;
  if (!meghalayan || typeof meghalayan !== 'object') return '??';

  const { stage, year } = meghalayan;

  if (stage === 'pre-holocene') return '—';

  const abbr = STAGE_ABBR[stage];
  if (!abbr || year == null) return '??';

  return `${abbr}${year}`;
}
