/**
 * Longitudinal date renderer — Solar Longitude + Lunar Phase Angle.
 *
 * Renders the current solar and lunar angular positions as a date representation.
 * Source:
 *   data.solarLongitude — string 'SL{3-digit-degrees}' or 'SL??' (from solarLongitude chronometer)
 *   data.lunarPhase     — string 'LP{3-digit-degrees}' or 'LP??' (from lunarPhase chronometer)
 *
 * Format:  '☉{SL}° ☽{LP}°'
 * Example: '☉024° ☽180°'
 * Error:   '☉???° ☽???°'
 *
 * Symbols:
 *   ☉ = U+2609 SUN (solar longitude)
 *   ☽ = U+263D FIRST QUARTER MOON (lunar phase angle)
 *   ° = U+00B0 DEGREE SIGN
 *
 * Both angles are displayed as 3 characters:
 *   - Valid: 3-digit zero-padded integer, e.g., '024', '000', '360'
 *   - Error: '???' (3 question marks, matching the fixed width)
 *
 * No day +/- indicator — angular positions are not calendar dates.
 *
 * @param {object} data - Chronometer data from compose()
 * @param {object} [opts] - Pipeline options (solarDateDiffsStdDate is intentionally ignored)
 * @returns {string} Formatted longitudinal date string
 */
export function render(data, opts = {}) {
  const sl = data?.solarLongitude ?? 'SL??';
  const lp = data?.lunarPhase ?? 'LP??';

  // Strip 'SL' prefix; validate result is a 3-digit numeric string
  const slStripped = sl.slice(2);
  const slValue = /^\d{3}$/.test(slStripped) ? slStripped : '???';

  // Strip 'LP' prefix; validate result is a 3-digit numeric string
  const lpStripped = lp.slice(2);
  const lpValue = /^\d{3}$/.test(lpStripped) ? lpStripped : '???';

  return `\u2609${slValue}\u00B0 \u263D${lpValue}\u00B0`;
}
