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

  // ── Polar day: no sunrise/sunset/night events at all ──────────────────────
  // Use sun altitude to pick between day and golden-hour
  if (!hasSunrise && !hasSunset && !hasNightEnd && !hasNight && !hasNauticalDawn && !hasNauticalDusk) {
    const pos = SunCalc.getPosition(date, latitude, longitude);
    const altDeg = pos.altitude * (180 / Math.PI);
    if (altDeg >= 6) {
      return { phase: 'day', progress: Math.min(1, (altDeg - 6) / 29) };
    }
    // Low sun (near antinoon, sun skims near horizon)
    return { phase: 'golden-hour', progress: Math.max(0, altDeg / 6) };
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
        return { phase: 'astronomical-twilight', progress: nautDawnT ? (t - nightEndT) / (nautDawnT - nightEndT) : 0.5 };
      if (nautDawnT !== null && t >= nautDawnT && t < dawnT)
        return { phase: 'astronomical-twilight', progress: (t - nautDawnT) / (dawnT - nautDawnT) };
      if (t >= dawnT && t <= duskT)
        return { phase: 'civil-dawn-dusk', progress: (t - dawnT) / (duskT - dawnT) };
      if (nautDuskT !== null && t > duskT && t <= nautDuskT)
        return { phase: 'astronomical-twilight', progress: (t - duskT) / (nautDuskT - duskT) };
      if (nightT !== null && nautDuskT !== null && t > nautDuskT && t <= nightT)
        return { phase: 'astronomical-twilight', progress: (t - nautDuskT) / (nightT - nautDuskT) };
      return { phase: 'deep-night', progress: 0 };
    }

    // Polar night with nautical twilight only (no civil dawn/dusk)
    if (hasNauticalDawn && hasNauticalDusk) {
      const nightEndT  = hasNightEnd   ? times.nightEnd.getTime()  : null;
      const nautDawnT  = nauticalDawn.getTime();
      const nautDuskT  = nauticalDusk.getTime();
      const nightT     = hasNight      ? times.night.getTime()     : null;

      if (nightEndT !== null && t >= nightEndT && t < nautDawnT)
        return { phase: 'astronomical-twilight', progress: (t - nightEndT) / (nautDawnT - nightEndT) };
      if (t >= nautDawnT && t <= nautDuskT)
        return { phase: 'astronomical-twilight', progress: (t - nautDawnT) / (nautDuskT - nautDawnT) };
      if (nightT !== null && t > nautDuskT && t <= nightT)
        return { phase: 'astronomical-twilight', progress: (t - nautDuskT) / (nightT - nautDuskT) };
      return { phase: 'deep-night', progress: 0 };
    }

    // Astronomical twilight only (nightEnd/night valid, nothing brighter)
    if (hasNightEnd && hasNight) {
      const nightEndT = times.nightEnd.getTime();
      const nightT    = times.night.getTime();
      if (t >= nightEndT && t <= nightT)
        return { phase: 'astronomical-twilight', progress: (t - nightEndT) / (nightT - nightEndT) };
      return { phase: 'deep-night', progress: 0 };
    }

    // Complete polar night — no twilight at all
    return { phase: 'deep-night', progress: 0 };
  }

  // ── White nights: sunrise/sunset valid but no astronomical night ──────────
  // The normal phase logic works for daytime. For the short night window,
  // clamp to at worst civil-dawn-dusk (sun never goes below -18°).
  if (hasSunrise && hasSunset && !hasNight) {
    // Try the normal daytime phases first
    if (isValidDate(goldenHourEnd) && isValidDate(goldenHour)) {
      if (t >= goldenHourEnd.getTime() && t < goldenHour.getTime()) {
        return { phase: 'day', progress: (t - goldenHourEnd.getTime()) / (goldenHour.getTime() - goldenHourEnd.getTime()) };
      }
      if (t >= goldenHour.getTime() && t < sunset.getTime()) {
        return { phase: 'golden-hour', progress: (t - goldenHour.getTime()) / (sunset.getTime() - goldenHour.getTime()) };
      }
      if (t >= sunrise.getTime() && t < goldenHourEnd.getTime()) {
        return { phase: 'golden-hour', progress: (t - sunrise.getTime()) / (goldenHourEnd.getTime() - sunrise.getTime()) };
      }
    }
    // For the twilight window (outside sunrise→sunset), use altitude to determine phase
    // Sun never goes below -18° in white nights, so deepest is astronomical-twilight
    if (hasDawn && hasDusk) {
      if (t >= dawn.getTime() && t < sunrise.getTime())
        return { phase: 'civil-dawn-dusk', progress: (t - dawn.getTime()) / (sunrise.getTime() - dawn.getTime()) };
      if (t > sunset.getTime() && t <= dusk.getTime())
        return { phase: 'civil-dawn-dusk', progress: (t - sunset.getTime()) / (dusk.getTime() - sunset.getTime()) };
    }
    // Remaining twilight: clamp to civil-dawn-dusk minimum
    const pos = SunCalc.getPosition(date, latitude, longitude);
    const altDeg = pos.altitude * (180 / Math.PI);
    if (altDeg >= -6) return { phase: 'civil-dawn-dusk', progress: 0.5 };
    return { phase: 'astronomical-twilight', progress: 0.5 };
  }

  // ── Normal solar cycle ────────────────────────────────────────────────────
  // Require all key events to be valid
  if (!hasSunrise || !hasSunset || !isValidDate(dawn) || !isValidDate(dusk) ||
      !isValidDate(nauticalDawn) || !isValidDate(nauticalDusk)) {
    return { phase: 'deep-night', progress: 0 };
  }

  // Check if current time is in the "day" window: after morning goldenHourEnd
  // but before evening goldenHour (which may be next UTC day).
  if (isValidDate(goldenHourEnd) && isValidDate(goldenHour) &&
      t >= goldenHourEnd.getTime() && t < goldenHour.getTime()) {
    return { phase: 'day', progress: (t - goldenHourEnd.getTime()) / (goldenHour.getTime() - goldenHourEnd.getTime()) };
  }

  // Evening phases (goldenHour → sunset → dusk → nauticalDusk → night)
  if (isValidDate(goldenHour) && t >= goldenHour.getTime() && t < sunset.getTime()) {
    return { phase: 'golden-hour', progress: (t - goldenHour.getTime()) / (sunset.getTime() - goldenHour.getTime()) };
  }
  if (t >= sunset.getTime() && t < dusk.getTime()) {
    return { phase: 'civil-dawn-dusk', progress: (t - sunset.getTime()) / (dusk.getTime() - sunset.getTime()) };
  }
  if (t >= dusk.getTime() && t < nauticalDusk.getTime()) {
    return { phase: 'astronomical-twilight', progress: (t - dusk.getTime()) / (nauticalDusk.getTime() - dusk.getTime()) };
  }
  if (isValidDate(times.night) && t >= nauticalDusk.getTime() && t < times.night.getTime()) {
    return { phase: 'deep-night', progress: (t - nauticalDusk.getTime()) / (times.night.getTime() - nauticalDusk.getTime()) };
  }

  // Night phases (night → nauticalDawn → dawn → sunrise → goldenHourEnd)
  if (isValidDate(times.night) && t >= times.night.getTime() && t < nauticalDawn.getTime()) {
    return { phase: 'deep-night', progress: (t - times.night.getTime()) / (nauticalDawn.getTime() - times.night.getTime()) };
  }
  if (t >= nauticalDawn.getTime() && t < dawn.getTime()) {
    return { phase: 'astronomical-twilight', progress: (t - nauticalDawn.getTime()) / (dawn.getTime() - nauticalDawn.getTime()) };
  }
  if (t >= dawn.getTime() && t < sunrise.getTime()) {
    return { phase: 'civil-dawn-dusk', progress: (t - dawn.getTime()) / (sunrise.getTime() - dawn.getTime()) };
  }
  if (isValidDate(goldenHourEnd) && t >= sunrise.getTime() && t < goldenHourEnd.getTime()) {
    return { phase: 'golden-hour', progress: (t - sunrise.getTime()) / (goldenHourEnd.getTime() - sunrise.getTime()) };
  }

  // Default: deep night (before yesterday's evening events, or after tonight's night)
  return { phase: 'deep-night', progress: 0 };
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

  // Suncalc returns events for the calendar date at the location.
  // Evening events (goldenHour, sunset...) may land on the next UTC day.
  // If current time is before morning events, use yesterday's evening events.
  // Use isValidDate() — SunCalc returns Invalid Date (truthy) for missing polar events.
  let eveningTimes = times;
  if (isValidDate(times.nauticalDawn) && date < times.nauticalDawn) {
    const yesterday = new Date(date.getTime() - 86400000);
    eveningTimes = SunCalc.getTimes(yesterday, latitude, longitude);
  }

  // Merge: evening events from yesterday (if applicable), morning events from today
  const phaseTimes = {
    goldenHour: eveningTimes.goldenHour,
    sunset: eveningTimes.sunset,
    dusk: eveningTimes.dusk,
    nauticalDusk: eveningTimes.nauticalDusk,
    night: eveningTimes.night,
    nightEnd: times.nightEnd,
    nauticalDawn: times.nauticalDawn,
    dawn: times.dawn,
    sunrise: times.sunrise,
    goldenHourEnd: times.goldenHourEnd,
  };

  const { phase, progress } = getSkyPhase(date, phaseTimes, latitude, longitude);

  // Clamp progress to 0-1
  const t = Math.max(0, Math.min(1, progress || 0));

  const skyPhase = SKY_PHASES[phase];
  if (!skyPhase) {
    return defaultGradient;
  }

  // Blend between current phase colors and next phase colors based on progress
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const nextPhaseName = PHASE_ORDER[(phaseIndex + 1) % PHASE_ORDER.length];
  const nextPhase = SKY_PHASES[nextPhaseName];

  const topColor = nextPhase
    ? lerpColor(skyPhase.top, nextPhase.top, t)
    : rgbToHex(...skyPhase.top);
  const bottomColor = nextPhase
    ? lerpColor(skyPhase.bottom, nextPhase.bottom, t)
    : rgbToHex(...skyPhase.bottom);

  return { topColor, bottomColor };
}
