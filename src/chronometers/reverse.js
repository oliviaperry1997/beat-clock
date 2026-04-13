import { Lunar } from 'lunar-javascript';

const BEATS_DISCLAIMER = 'Beat values represent an 86.4-second window. Exact instant may vary +/-43.2 seconds.';

/**
 * Convert a beats value (0-999.99) to BMT (UTC+1) time.
 * @param {number} beats - The beats value
 * @returns {{ hours: number, minutes: number, seconds: number }}
 */
export function beatsToBMTTime(beats) {
  const totalSeconds = beats * 86.4;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return { hours, minutes, seconds };
}

/**
 * Convert BMT time to UTC by subtracting 1 hour with wraparound.
 * @param {{ hours: number, minutes: number, seconds: number }} bmtTime
 * @returns {{ hours: number, minutes: number, seconds: number }}
 */
export function bmtToUTC(bmtTime) {
  const utcHours = (bmtTime.hours - 1 + 24) % 24;
  return { hours: utcHours, minutes: bmtTime.minutes, seconds: bmtTime.seconds };
}

/**
 * Returns the Gregorian date range for a Holocene year (CNY to CNY).
 * @param {number} holoceneYear - The Holocene year
 * @returns {{ start: Date, end: Date }}
 */
export function getHoloceneYearRange(holoceneYear) {
  const gregorianYear = holoceneYear - 9700;
  const cnyStart = Lunar.fromYmd(gregorianYear, 1, 1).getSolar();
  const cnyEnd = Lunar.fromYmd(gregorianYear + 1, 1, 1).getSolar();
  return {
    start: new Date(Date.UTC(cnyStart.getYear(), cnyStart.getMonth() - 1, cnyStart.getDay())),
    end: new Date(Date.UTC(cnyEnd.getYear(), cnyEnd.getMonth() - 1, cnyEnd.getDay())),
  };
}

/**
 * Composite reverse converter: Beat Clock -> Gregorian datetime.
 * @param {object} params
 * @param {number} [params.beats] - Beats value (0-999.99)
 * @param {number} [params.holoceneYear] - Holocene year
 * @param {number} [params.lunisolarMonth] - Lunar month (1-12)
 * @param {number} [params.lunisolarDay] - Lunar day (1-30)
 * @returns {object} Result with gregorianDate, confidence, disclaimer, etc.
 */
export function reverseBeatClock({ beats, holoceneYear, lunisolarMonth, lunisolarDay } = {}) {
  const result = {
    gregorianDate: null,
    confidence: 'unknown',
    disclaimer: '',
  };

  // Step 1: Determine date from lunisolar + holocene year
  if (holoceneYear != null && lunisolarMonth != null && lunisolarDay != null) {
    const gregorianYear = holoceneYear - 9700;
    const lunar = Lunar.fromYmd(gregorianYear, lunisolarMonth, lunisolarDay);
    const solar = lunar.getSolar();
    result.gregorianDate = new Date(Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay()));
    result.confidence = 'exact-date';
  } else if (holoceneYear != null) {
    // Only holocene year provided - return range
    const yearRange = getHoloceneYearRange(holoceneYear);
    result.yearRange = yearRange;
    result.confidence = 'year-range';
  }

  // Step 2: Add time from beats
  if (beats != null) {
    const bmtTime = beatsToBMTTime(beats);
    const utcTime = bmtToUTC(bmtTime);

    if (result.gregorianDate) {
      result.gregorianDate.setUTCHours(utcTime.hours, utcTime.minutes, utcTime.seconds, 0);
      result.confidence = 'exact-datetime';
    } else {
      result.bmtTime = bmtTime;
      if (result.confidence === 'unknown') {
        result.confidence = 'time-only';
      }
    }
  }

  // Build disclaimer
  const parts = [];
  if (beats != null && (holoceneYear == null || lunisolarMonth == null || lunisolarDay == null)) {
    parts.push('Beat value provides time only. Add Holocene year and lunisolar date for full datetime.');
  }
  if (beats != null || result.gregorianDate) {
    parts.push(BEATS_DISCLAIMER);
  }
  result.disclaimer = parts.join(' ');

  return result;
}
