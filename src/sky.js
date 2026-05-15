import SunCalc from 'suncalc';

// Sky phase color palette — top and bottom colors for each phase
const SKY_PHASES = {
  'deep-night': {
    top: [10, 10, 26],      // #0a0a1a — near-black navy
    bottom: [13, 17, 23],    // #0d1117 — dark charcoal-navy
  },
  'night': {
    top: [15, 25, 35],       // #0f1923 — deep navy
    bottom: [19, 26, 46],    // #131a2e — dark navy
  },
  'astronomical-twilight': {
    top: [26, 35, 50],       // #1a2332 — twilight blue
    bottom: [26, 26, 46],    // #1a1a2e — deep navy
  },
  'civil-dawn-dusk': {
    top: [45, 27, 78],       // #2d1b4e — purple
    bottom: [26, 16, 64],    // #1a1040 — deep purple
  },
  'golden-hour': {
    top: [135, 206, 235],    // #87CEEB — sky blue
    bottom: [244, 164, 152], // #f4a498 — warm peach
  },
  'day': {
    top: [91, 155, 213],     // #5B9BD5 — clear blue
    bottom: [135, 206, 235], // #87CEEB — light sky blue
  },
};

// Order of phases for progression
const PHASE_ORDER = [
  'deep-night',
  'astronomical-twilight',
  'civil-dawn-dusk',
  'golden-hour',
  'day',
  'golden-hour',
  'civil-dawn-dusk',
  'astronomical-twilight',
  'deep-night',
];

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

export function lerpColor(colorA, colorB, t) {
  const r = Math.round(colorA[0] + (colorB[0] - colorA[0]) * t);
  const g = Math.round(colorA[1] + (colorB[1] - colorA[1]) * t);
  const b = Math.round(colorA[2] + (colorB[2] - colorA[2]) * t);
  return rgbToHex(r, g, b);
}

// Check if a SunCalc date is valid (SunCalc returns Invalid Date, not null, for missing events)
function isValidDate(d) {
  return d instanceof Date && !isNaN(d.getTime());
}

function getSkyPhase(date, times, latitude, longitude) {
  const { sunrise, sunset, dawn, dusk, nauticalDawn, nauticalDusk, goldenHour, goldenHourEnd } = times;

  const hasSunrise     = isValidDate(sunrise);
  const hasSunset      = isValidDate(sunset);
  const hasNauticalDawn = isValidDate(nauticalDawn);
  const hasNauticalDusk = isValidDate(nauticalDusk);
  const hasDawn        = isValidDate(dawn);
  const hasDusk        = isValidDate(dusk);
  const hasNight       = isValidDate(times.night);
  const hasNightEnd    = isValidDate(times.nightEnd);

  const t = date.getTime();

  // Helper to return phase with next phase for gradient blending
  function phaseResult(phase, progress, nextPhase) {
    return { phase, progress, nextPhase };
  }

  // ── Polar day: no sunrise/sunset/night events at all ──────────────────────
  // Use sun altitude to pick between day and golden-hour
  if (!hasSunrise && !hasSunset && !hasNightEnd && !hasNight && !hasNauticalDawn && !hasNauticalDusk) {
    const pos = SunCalc.getPosition(date, latitude, longitude);
    const altDeg = pos.altitude * (180 / Math.PI);
    if (altDeg >= 6) {
      return phaseResult('day', Math.min(1, (altDeg - 6) / 29), 'day');
    }
    // Low sun (near antinoon, sun skims near horizon)
    return phaseResult('golden-hour', Math.max(0, altDeg / 6), 'day');
  }

  // ── Polar night (no sunrise/sunset) with nautical or civil twilight ────────
  if (!hasSunrise && !hasSunset) {
    // Partial polar night: civil twilight available (dawn/dusk valid)
    if (hasDawn && hasDusk) {
      const nightEndT    = hasNightEnd   ? times.nightEnd.getTime()   : null;
      const nautDawnT    = hasNauticalDawn ? nauticalDawn.getTime()   : null;
      const dawnT        = dawn.getTime();
      const duskT        = dusk.getTime();
      const nautDuskT    = hasNauticalDusk ? nauticalDusk.getTime()   : null;
      const nightT       = hasNight      ? times.night.getTime()      : null;

      if (nightEndT !== null && t >= nightEndT && (nautDawnT === null || t < nautDawnT))
        return phaseResult('astronomical-twilight', nautDawnT ? (t - nightEndT) / (nautDawnT - nightEndT) : 0.5, 'civil-dawn-dusk');
      if (nautDawnT !== null && t >= nautDawnT && t < dawnT)
        return phaseResult('astronomical-twilight', (t - nautDawnT) / (dawnT - nautDawnT), 'civil-dawn-dusk');
      if (t >= dawnT && t <= duskT)
        return phaseResult('civil-dawn-dusk', (t - dawnT) / (duskT - dawnT), 'astronomical-twilight');
      if (nautDuskT !== null && t > duskT && t <= nautDuskT)
        return phaseResult('astronomical-twilight', (t - duskT) / (nautDuskT - duskT), 'deep-night');
      if (nightT !== null && nautDuskT !== null && t > nautDuskT && t <= nightT)
        return phaseResult('astronomical-twilight', (t - nautDuskT) / (nightT - nautDuskT), 'deep-night');
      return phaseResult('deep-night', 0, 'deep-night');
    }

    // Polar night with nautical twilight only (no civil dawn/dusk)
    if (hasNauticalDawn && hasNauticalDusk) {
      const nightEndT  = hasNightEnd   ? times.nightEnd.getTime()  : null;
      const nautDawnT  = nauticalDawn.getTime();
      const nautDuskT  = nauticalDusk.getTime();
      const nightT     = hasNight      ? times.night.getTime()     : null;

      if (nightEndT !== null && t >= nightEndT && t < nautDawnT)
        return phaseResult('astronomical-twilight', (t - nightEndT) / (nautDawnT - nightEndT), 'astronomical-twilight');
      if (t >= nautDawnT && t <= nautDuskT)
        return phaseResult('astronomical-twilight', (t - nautDawnT) / (nautDuskT - nautDawnT), 'deep-night');
      if (nightT !== null && t > nautDuskT && t <= nightT)
        return phaseResult('astronomical-twilight', (t - nautDuskT) / (nightT - nautDuskT), 'deep-night');
      return phaseResult('deep-night', 0, 'deep-night');
    }

    // Astronomical twilight only (nightEnd/night valid, nothing brighter)
    if (hasNightEnd && hasNight) {
      const nightEndT = times.nightEnd.getTime();
      const nightT    = times.night.getTime();
      if (t >= nightEndT && t <= nightT)
        return phaseResult('astronomical-twilight', (t - nightEndT) / (nightT - nightEndT), 'deep-night');
      return phaseResult('deep-night', 0, 'deep-night');
    }

    // Complete polar night — no twilight at all
    return phaseResult('deep-night', 0, 'deep-night');
  }

  // ── White nights: sunrise/sunset valid but no astronomical night ──────────
  // The normal phase logic works for daytime. For the short night window,
  // clamp to at worst civil-dawn-dusk (sun never goes below -18°).
  if (hasSunrise && hasSunset && !hasNight) {
    // Try the normal daytime phases first
    if (isValidDate(goldenHourEnd) && isValidDate(goldenHour)) {
      if (t >= goldenHourEnd.getTime() && t < goldenHour.getTime()) {
        return phaseResult('day', (t - goldenHourEnd.getTime()) / (goldenHour.getTime() - goldenHourEnd.getTime()), 'golden-hour');
      }
      if (t >= goldenHour.getTime() && t < sunset.getTime()) {
        return phaseResult('golden-hour', (t - goldenHour.getTime()) / (sunset.getTime() - goldenHour.getTime()), 'civil-dawn-dusk');
      }
      if (t >= sunrise.getTime() && t < goldenHourEnd.getTime()) {
        return phaseResult('golden-hour', (t - sunrise.getTime()) / (goldenHourEnd.getTime() - sunrise.getTime()), 'day');
      }
    }
    // For the twilight window (outside sunrise→sunset), use altitude to determine phase
    // Sun never goes below -18° in white nights, so deepest is astronomical-twilight
    if (hasDawn && hasDusk) {
      if (t >= dawn.getTime() && t < sunrise.getTime())
        return phaseResult('civil-dawn-dusk', (t - dawn.getTime()) / (sunrise.getTime() - dawn.getTime()), 'golden-hour');
      if (t > sunset.getTime() && t <= dusk.getTime())
        return phaseResult('civil-dawn-dusk', (t - sunset.getTime()) / (dusk.getTime() - sunset.getTime()), 'astronomical-twilight');
    }
    // Remaining twilight: clamp to civil-dawn-dusk minimum
    const pos = SunCalc.getPosition(date, latitude, longitude);
    const altDeg = pos.altitude * (180 / Math.PI);
    if (altDeg >= -6) return phaseResult('civil-dawn-dusk', 0.5, 'astronomical-twilight');
    return phaseResult('astronomical-twilight', 0.5, 'civil-dawn-dusk');
  }

  // ── Normal solar cycle ────────────────────────────────────────────────────
  // Require all key events to be valid
  if (!hasSunrise || !hasSunset || !isValidDate(dawn) || !isValidDate(dusk) ||
      !isValidDate(nauticalDawn) || !isValidDate(nauticalDusk)) {
    return phaseResult('deep-night', 0, 'deep-night');
  }

  // Check if current time is in the "day" window: after morning goldenHourEnd
  // but before evening goldenHour (which may be next UTC day).
  if (isValidDate(goldenHourEnd) && isValidDate(goldenHour) &&
      t >= goldenHourEnd.getTime() && t < goldenHour.getTime()) {
    return phaseResult('day', (t - goldenHourEnd.getTime()) / (goldenHour.getTime() - goldenHourEnd.getTime()), 'golden-hour');
  }

  // Evening phases (goldenHour → sunset → dusk → nauticalDusk → night)
  if (isValidDate(goldenHour) && t >= goldenHour.getTime() && t < sunset.getTime()) {
    return phaseResult('golden-hour', (t - goldenHour.getTime()) / (sunset.getTime() - goldenHour.getTime()), 'civil-dawn-dusk');
  }
  if (t >= sunset.getTime() && t < dusk.getTime()) {
    return phaseResult('civil-dawn-dusk', (t - sunset.getTime()) / (dusk.getTime() - sunset.getTime()), 'astronomical-twilight');
  }
  if (t >= dusk.getTime() && t < nauticalDusk.getTime()) {
    return phaseResult('astronomical-twilight', (t - dusk.getTime()) / (nauticalDusk.getTime() - dusk.getTime()), 'deep-night');
  }
  if (isValidDate(times.night) && t >= nauticalDusk.getTime() && t < times.night.getTime()) {
    return phaseResult('deep-night', (t - nauticalDusk.getTime()) / (times.night.getTime() - nauticalDusk.getTime()), 'deep-night');
  }

  // Night phases (night → nauticalDawn → dawn → sunrise → goldenHourEnd)
  if (isValidDate(times.night) && t >= times.night.getTime() && t < nauticalDawn.getTime()) {
    return phaseResult('deep-night', (t - times.night.getTime()) / (nauticalDawn.getTime() - times.night.getTime()), 'astronomical-twilight');
  }
  if (t >= nauticalDawn.getTime() && t < dawn.getTime()) {
    return phaseResult('astronomical-twilight', (t - nauticalDawn.getTime()) / (dawn.getTime() - nauticalDawn.getTime()), 'civil-dawn-dusk');
  }
  if (t >= dawn.getTime() && t < sunrise.getTime()) {
    return phaseResult('civil-dawn-dusk', (t - dawn.getTime()) / (sunrise.getTime() - dawn.getTime()), 'golden-hour');
  }
  if (isValidDate(goldenHourEnd) && t >= sunrise.getTime() && t < goldenHourEnd.getTime()) {
    return phaseResult('golden-hour', (t - sunrise.getTime()) / (goldenHourEnd.getTime() - sunrise.getTime()), 'day');
  }

  // Default: deep night (before yesterday's evening events, or after tonight's night)
  return phaseResult('deep-night', 0, 'deep-night');
}

export function getSkyGradientColors(date, latitude, longitude) {
  const defaultGradient = {
    topColor: '#0a0a1a',
    bottomColor: '#0d1117',
  };

  if (latitude == null || longitude == null) {
    return defaultGradient;
  }

  const times = SunCalc.getTimes(date, latitude, longitude);

  // SunCalc returns events for the solar day containing the given timestamp.
  // Edge case: when we're in early morning (after midnight but before dawn),
  // SunCalc gives us today's morning events but yesterday's evening events may have already passed.
  // The getSkyPhase function expects evening events to bracket correctly with morning events.
  // If we're before today's morning nautical dawn, supplement with yesterday's evening events.
  
  const yesterday = new Date(date.getTime() - 86400000);
  const yesterdayTimes = SunCalc.getTimes(yesterday, latitude, longitude);
  
  // Use yesterday's evening events if we're in the early morning (before nauticalDawn)
  const useYesterdayEvening = isValidDate(times.nauticalDawn) && date < times.nauticalDawn;
  
  const phaseTimes = {
    // Evening events: use yesterday's if we're in early morning, otherwise use today's
    goldenHour: useYesterdayEvening ? yesterdayTimes.goldenHour : times.goldenHour,
    sunset: useYesterdayEvening ? yesterdayTimes.sunset : times.sunset,
    dusk: useYesterdayEvening ? yesterdayTimes.dusk : times.dusk,
    nauticalDusk: useYesterdayEvening ? yesterdayTimes.nauticalDusk : times.nauticalDusk,
    night: useYesterdayEvening ? yesterdayTimes.night : times.night,
    // Morning events: always use today's
    nightEnd: times.nightEnd,
    nauticalDawn: times.nauticalDawn,
    dawn: times.dawn,
    sunrise: times.sunrise,
    goldenHourEnd: times.goldenHourEnd,
  };

  const { phase, progress, nextPhase: nextPhaseName } = getSkyPhase(date, phaseTimes, latitude, longitude);

  // Clamp progress to 0-1
  const t = Math.max(0, Math.min(1, progress || 0));

  const skyPhase = SKY_PHASES[phase];
  if (!skyPhase) {
    return defaultGradient;
  }

  // Blend between current phase colors and next phase colors based on progress
  const nextPhase = SKY_PHASES[nextPhaseName];

  const topColor = nextPhase
    ? lerpColor(skyPhase.top, nextPhase.top, t)
    : rgbToHex(...skyPhase.top);
  const bottomColor = nextPhase
    ? lerpColor(skyPhase.bottom, nextPhase.bottom, t)
    : rgbToHex(...skyPhase.bottom);

  return { topColor, bottomColor };
}
