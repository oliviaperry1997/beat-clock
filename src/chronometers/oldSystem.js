import SunCalc from 'suncalc';
import { solstice, moonphase, julian } from 'astronomia';

/**
 * OldSystem chronometer — preserves the legacy lunation + days-since-equinox logic.
 * NOT imported by the composer — exists for reference only.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @returns {object} { lunation: number, percent: string, daysSinceEquinox: number }
 */
export function compute(date, opts) {
  const gregorianYear = date.getUTCFullYear();
  // Holocene year uses simple +9700 formula (no CNY ticking in old system)
  const holoceneYear = gregorianYear + 9700;

  const equinox = getSpringEquinox(holoceneYear);
  const daysSinceEquinox = getDaysSinceEquinox(date, equinox);
  const moon = getLunationSinceEquinox(date, equinox);

  return {
    lunation: moon.lunation,
    percent: moon.percent,
    daysSinceEquinox,
  };
}

function getSpringEquinox(holoceneYear) {
  const gregorianYear = holoceneYear - 9700;
  const jde = solstice.march(gregorianYear);
  const equinoxDateUTC = julian.JDEToDate(jde);

  // Shift equinox to the previous 23:00 UTC for day counting anchor
  const anchorTime = new Date(equinoxDateUTC.getTime());
  anchorTime.setUTCHours(23, 0, 0, 0);
  if (equinoxDateUTC.getUTCHours() < 23) {
    anchorTime.setUTCDate(anchorTime.getUTCDate() - 1);
  }
  return anchorTime;
}

function getDaysSinceEquinox(now, equinox) {
  const diff = now - equinox;
  return Math.floor(diff / 86400000) + 1;
}

function getLunationSinceEquinox(now, equinox) {
  const lunarCycle = 29.53059 * 86400000;
  const firstNewMoonAfterEquinox = getNextNewMoon(equinox);
  if (now < firstNewMoonAfterEquinox) {
    return { lunation: 1, percent: "00" };
  }
  const diff = now - firstNewMoonAfterEquinox;
  const lunation = Math.floor(diff / lunarCycle) + 1;
  const phaseProgress = (diff % lunarCycle) / lunarCycle;
  return {
    lunation,
    percent: phaseProgress.toFixed(2).slice(2),
  };
}

function getNextNewMoon(afterDate) {
  const year = afterDate.getUTCFullYear();
  let jde = moonphase.newMoon(year);

  // Iterate forward until we find the first new moon after afterDate
  while (julian.JDEToDate(jde) <= afterDate) {
    jde += moonphase.meanLunarMonth;
  }

  // Return the JDE directly (the new() refinement API produces invalid results
  // in astronomia v4 — the iterated JDE is accurate enough for our purposes)
  return julian.JDEToDate(jde);
}
