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
  const { sunrise, sunset, civilDawn, civilDusk, nauticalDawn, nauticalDusk } = times;

  // If any required times are invalid, default to deep-night
  if (!sunrise || !sunset || !civilDawn || !civilDusk || !nauticalDawn || !nauticalDusk) {
    return { phase: 'deep-night', progress: 0 };
  }

  // Determine current phase based on time boundaries
  if (date >= civilDusk && date < nauticalDusk) {
    const start = civilDusk.getTime();
    const end = nauticalDusk.getTime();
    return { phase: 'civil-dawn-dusk', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= nauticalDusk && date < nauticalDawn) {
    const start = nauticalDusk.getTime();
    const end = nauticalDawn.getTime();
    return { phase: 'deep-night', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= nauticalDawn && date < civilDawn) {
    const start = nauticalDawn.getTime();
    const end = civilDawn.getTime();
    return { phase: 'astronomical-twilight', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= civilDawn && date < sunrise) {
    const start = civilDawn.getTime();
    const end = sunrise.getTime();
    return { phase: 'civil-dawn-dusk', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= sunrise && date < times.goldenHourEnd) {
    const start = sunrise.getTime();
    const end = times.goldenHourEnd.getTime();
    return { phase: 'golden-hour', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= times.goldenHourEnd && date < times.goldenHour) {
    const start = times.goldenHourEnd.getTime();
    const end = times.goldenHour.getTime();
    return { phase: 'day', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= times.goldenHour && date < sunset) {
    const start = times.goldenHour.getTime();
    const end = sunset.getTime();
    return { phase: 'golden-hour', progress: (date.getTime() - start) / (end - start) };
  }
  // Default: deep night (after sunset, before civil dusk)
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
  const { phase, progress } = getSkyPhase(date, times);

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
