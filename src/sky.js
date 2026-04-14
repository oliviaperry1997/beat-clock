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

function getSkyPhase(date, times) {
  const { sunrise, sunset, dawn, dusk, nauticalDawn, nauticalDusk, goldenHour, goldenHourEnd } = times;

  // If any required times are invalid, default to deep-night
  if (!sunrise || !sunset || !dawn || !dusk || !nauticalDawn || !nauticalDusk) {
    return { phase: 'deep-night', progress: 0 };
  }

  const t = date.getTime();

  // Suncalc returns times for the calendar date at the given location.
  // Evening events (goldenHour, sunset, etc.) may be on the next UTC day.
  // Morning events (nauticalDawn, dawn, etc.) are on the current UTC day.
  // When current UTC time is between these two groups, we're in the
  // "post-midnight, pre-dawn" window and should use today's morning events.
  // When current UTC time is after morning events but before evening events,
  // we're in daytime.

  // Check if current time is in the "day" window: after morning goldenHourEnd
  // but before evening goldenHour (which may be next UTC day).
  if (t >= goldenHourEnd.getTime() && t < goldenHour.getTime()) {
    // Full day phase
    return { phase: 'day', progress: (t - goldenHourEnd.getTime()) / (goldenHour.getTime() - goldenHourEnd.getTime()) };
  }

  // Evening phases (goldenHour → sunset → dusk → nauticalDusk → night)
  if (t >= goldenHour.getTime() && t < sunset.getTime()) {
    return { phase: 'golden-hour', progress: (t - goldenHour.getTime()) / (sunset.getTime() - goldenHour.getTime()) };
  }
  if (t >= sunset.getTime() && t < dusk.getTime()) {
    return { phase: 'civil-dawn-dusk', progress: (t - sunset.getTime()) / (dusk.getTime() - sunset.getTime()) };
  }
  if (t >= dusk.getTime() && t < nauticalDusk.getTime()) {
    return { phase: 'astronomical-twilight', progress: (t - dusk.getTime()) / (nauticalDusk.getTime() - dusk.getTime()) };
  }
  if (t >= nauticalDusk.getTime() && t < times.night.getTime()) {
    return { phase: 'deep-night', progress: (t - nauticalDusk.getTime()) / (times.night.getTime() - nauticalDusk.getTime()) };
  }

  // Night phases (night → nauticalDawn → dawn → sunrise → goldenHourEnd)
  if (t >= times.night.getTime() && t < nauticalDawn.getTime()) {
    return { phase: 'deep-night', progress: (t - times.night.getTime()) / (nauticalDawn.getTime() - times.night.getTime()) };
  }
  if (t >= nauticalDawn.getTime() && t < dawn.getTime()) {
    return { phase: 'astronomical-twilight', progress: (t - nauticalDawn.getTime()) / (dawn.getTime() - nauticalDawn.getTime()) };
  }
  if (t >= dawn.getTime() && t < sunrise.getTime()) {
    return { phase: 'civil-dawn-dusk', progress: (t - dawn.getTime()) / (sunrise.getTime() - dawn.getTime()) };
  }
  if (t >= sunrise.getTime() && t < goldenHourEnd.getTime()) {
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
  let eveningTimes = times;
  if (times.nauticalDawn && date < times.nauticalDawn) {
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
    nauticalDawn: times.nauticalDawn,
    dawn: times.dawn,
    sunrise: times.sunrise,
    goldenHourEnd: times.goldenHourEnd,
  };

  const { phase, progress } = getSkyPhase(date, phaseTimes);

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
