---
wave: 1
depends_on: []
files_modified:
  - src/chronometers/lunisolar.js
  - src/sky.js
  - src/styles.css
  - src/index.js
  - src/template.html
  - tests/pure/lunisolar.test.js
  - tests/visual/sky.test.js
autonomous: true
---

# Phase 05 Plan: Atmospheric Visual Design

**Requirement:** REFACTOR-04 — Upgrade visual design to atmospheric/ambient aesthetic
**Phase goal:** Solar-driven CSS gradient background, subtle beat pulse animation, SVG moon phase indicator, typography overhaul, responsive scaling

---

## Task 1: Extend Lunisolar Module with Moon Data

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- src/chronometers/lunisolar.js — current implementation (returns month, day, isLeap)
- src/chronometers/index.js — compose() wraps lunisolar in try/catch, consumer expects lunisolar object
</read_first>

<acceptance_criteria>
- src/chronometers/lunisolar.js imports SunCalc from 'suncalc'
- src/chronometers/lunisolar.js compute() returns object with keys: month, day, isLeap, moonAge, illumination
- moonAge is a number in range 0–29.53 (derived from suncalc.getMoonIllumination(date).phase)
- illumination is a number in range 0.0–1.0 (from suncalc.getMoonIllumination(date).fraction)
- Existing keys (month, day, isLeap) retain exact same values and logic
- tests/pure/lunisolar.test.js updated to use toHaveProperty for month, day, isLeap checks instead of toEqual
- tests/pure/lunisolar.test.js adds assertions for moonAge and illumination properties
- No test failures: `npm test` exits 0
</acceptance_criteria>

<action>
In src/chronometers/lunisolar.js:

1. Add import at the top, after the existing lunar-javascript import:
   ```js
   import SunCalc from 'suncalc';
   ```

2. In the compute() function, after getting the lunar object but before the return statement, add:
   ```js
   const moonIllumination = SunCalc.getMoonIllumination(date);
   // moonIllumination.phase is 0..2*PI (0 = new moon, PI = full moon)
   // Convert phase to moon age in days (0-29.53 day lunar cycle)
   const moonAge = (moonIllumination.phase / (2 * Math.PI)) * 29.53;
   ```

3. Change the return statement to include the two new fields:
   ```js
   return {
     month: Math.abs(month),
     day,
     isLeap,
     moonAge: moonAge % 29.53,  // normalize to 0-29.53
     illumination: moonIllumination.fraction,
   };
   ```

Do NOT change the month, day, or isLeap calculations. Do NOT change the function signature. The function should still accept `(date, opts)` — the opts parameter is unused but should remain for API compatibility.

Then fix the existing test in `tests/pure/lunisolar.test.js`:

1. Read `tests/pure/lunisolar.test.js` to find the `toEqual({ month, day, isLeap })` assertion.
2. Replace the exact `toEqual` assertion with property checks:
   ```js
   // Replace: expect(result).toEqual({ month: X, day: Y, isLeap: false })
   // With:
   expect(result).toHaveProperty('month', X);
   expect(result).toHaveProperty('day', Y);
   expect(result).toHaveProperty('isLeap', false);
   ```
3. Add assertions for the new properties:
   ```js
   expect(result.moonAge).toBeGreaterThanOrEqual(0);
   expect(result.moonAge).toBeLessThanOrEqual(29.53);
   expect(result.illumination).toBeGreaterThanOrEqual(0);
   expect(result.illumination).toBeLessThanOrEqual(1);
   ```
</action>

---

## Task 2: Create Sky Gradient System

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- src/index.js — updateClock() calls compose(), sets textContent, runs every 864ms
- src/styles.css — current body/clock styles (starting point)
- src/template.html — HTML structure, body is the canvas for background
- src/chronometers/solar.js — suncalc.getTimes() returns civilDawn, civilDusk, sunrise, sunset, goldenHour
</read_first>

<acceptance_criteria>
- src/sky.js file exists with exported function `getSkyGradientColors(date, latitude, longitude)` that returns { topColor, bottomColor } as hex strings
- src/sky.js defines 6 sky phases: deep-night, night, civil-twilight, golden-hour, day, dawn-transition
- src/sky.js contains a `lerpColor(colorA, colorB, t)` helper function
- src/sky.js contains a `getSkyPhase(date, times)` function that determines current phase and progress (0-1)
- src/index.js imports getSkyGradientColors from './sky.js'
- src/index.js updateClock() calls getSkyGradientColors(now, lat, lon) and applies to document.body.style.background
- When location is null (S?? case), sky defaults to deep-night gradient (#0a0a1a → #0d1117)
- Body CSS in src/styles.css includes `min-height: 100vh` and `background-size: 100% 100%`
</acceptance_criteria>

<action>
Create a new file `src/sky.js` with the following complete implementation:

```js
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

function lerpColor(colorA, colorB, t) {
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
    // Civil dusk to nautical dusk: civil-dawn-dusk phase
    const start = civilDusk.getTime();
    const end = nauticalDusk.getTime();
    return { phase: 'civil-dawn-dusk', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= nauticalDusk && date < nauticalDawn) {
    // Nautical dusk to nautical dawn: deep night
    const start = nauticalDusk.getTime();
    const end = nauticalDawn.getTime();
    return { phase: 'deep-night', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= nauticalDawn && date < civilDawn) {
    // Nautical dawn to civil dawn: astronomical twilight
    const start = nauticalDawn.getTime();
    const end = civilDawn.getTime();
    return { phase: 'astronomical-twilight', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= civilDawn && date < sunrise) {
    // Civil dawn to sunrise: civil-dawn-dusk
    const start = civilDawn.getTime();
    const end = sunrise.getTime();
    return { phase: 'civil-dawn-dusk', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= sunrise && date < times.goldenHourEnd) {
    // Sunrise to golden hour end: golden hour
    const start = sunrise.getTime();
    const end = times.goldenHourEnd.getTime();
    return { phase: 'golden-hour', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= times.goldenHourEnd && date < times.goldenHour) {
    // Golden hour end to golden hour start: day
    const start = times.goldenHourEnd.getTime();
    const end = times.goldenHour.getTime();
    return { phase: 'day', progress: (date.getTime() - start) / (end - start) };
  }
  if (date >= times.goldenHour && date < sunset) {
    // Golden hour to sunset: golden hour (evening)
    const start = times.goldenHour.getTime();
    const end = sunset.getTime();
    return { phase: 'golden-hour', progress: (date.getTime() - start) / (end - start) };
  }
  // Default: deep night (after sunset, before civil dusk)
  return { phase: 'deep-night', progress: 0 };
}

export function getSkyGradientColors(date, latitude, longitude) {
  // Default gradient when no location
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

  // For smooth transitions, also get the next phase's colors and interpolate
  const phaseIndex = PHASE_ORDER.indexOf(phase);
  const nextPhaseName = PHASE_ORDER[(phaseIndex + 1) % PHASE_ORDER.length];
  const nextPhase = SKY_PHASES[nextPhaseName];

  // Blend between current phase colors and next phase colors based on progress
  const topColor = nextPhase
    ? lerpColor(skyPhase.top, nextPhase.top, t)
    : rgbToHex(...skyPhase.top);
  const bottomColor = nextPhase
    ? lerpColor(skyPhase.bottom, nextPhase.bottom, t)
    : rgbToHex(...skyPhase.bottom);

  return { topColor, bottomColor };
}
```

Then, in `src/index.js`:

1. Add import after the existing imports:
   ```js
   import { getSkyGradientColors } from './sky.js';
   ```

2. In `updateClock()`, after the `const clockText = ...` line and before `document.querySelector("#beats-container").textContent = clockText;`, add:
   ```js
   // Update sky background
   const sky = getSkyGradientColors(now, userLocation?.latitude, userLocation?.longitude);
   document.body.style.background = `linear-gradient(180deg, ${sky.topColor}, ${sky.bottomColor})`;
   ```

3. Also update the initial `updateClock(null)` call — it will correctly render the default deep-night gradient since latitude/longitude are null.

In `src/styles.css`, add to the existing `body` rules (or create a body rule if it doesn't exist):
```css
body {
  min-height: 100vh;
  background-size: 100% 100%;
  transition: background 1.5s ease-out;
}
```

The `transition: background 1.5s ease-out` on body ensures smooth color transitions between ticks rather than instant snaps.
</action>

---

## Task 3: Add Beat Pulse Animation

<wave>1</wave>
<depends_on></depends_on>

<read_first>
- src/styles.css — current #beats-container styles (5rem Arial Bold, centered)
- src/index.js — updateClock() function that runs every 864ms

<acceptance_criteria>
- src/styles.css contains `@keyframes breathe` with 0%, 100% at scale(1) and 50% at scale(1.005)
- src/styles.css #beats-container includes `animation: breathe 4s ease-in-out infinite`
- src/styles.css #beats-container includes `will-change: transform`
- src/styles.css #beats-container includes `text-shadow: 0 0 20px rgba(255, 255, 255, 0.1)`
- Animation uses only `transform` property (not width, height, or font-size) for GPU compositing
</acceptance_criteria>

<action>
In `src/styles.css`, add a new keyframe rule and update the #beats-container styles:

1. Add the breathe keyframes before or after the existing rules:
   ```css
   @keyframes breathe {
     0%, 100% {
       transform: scale(1);
     }
     50% {
       transform: scale(1.005);
     }
   }
   ```

2. In the `#beats-container` rule, add these properties:
   - `animation: breathe 4s ease-in-out infinite;`
   - `will-change: transform;`
   - `text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);`

The existing properties (font-family, font-size, font-weight, justify-content, display, height, align-items) should remain unchanged — we are only adding new properties.

Do NOT add any JS-based class toggling for the pulse — the continuous breathing animation is the chosen approach (simpler, more ambient, no reflow manipulation).
</action>

---

## Task 4: Add Moon Phase Indicator to Clock Display

<wave>1</wave>
<depends_on>
  <task>1</task>
</depends_on>

<read_first>
- src/index.js — updateClock() formats clock text, destructures lunisolar from compose() result
- src/chronometers/lunisolar.js — after Task 1, returns moonAge and illumination
- src/template.html — HTML structure (no moon element yet)
</read_first>

<acceptance_criteria>
- src/template.html contains `<svg id="moon-indicator">` element positioned near the clock (inside body, separate from beats-container)
- src/index.js updateClock() calls `updateMoonIndicator(lunisolar)` after the compose() call
- src/index.js contains function `updateMoonIndicator(lunisolar)` that:
  - Extracts moonAge from lunisolar object
  - Computes SVG path for moon illumination using cos/sin of phase angle
  - Updates the SVG `<path>` element's `d` attribute
- src/styles.css contains `#moon-indicator` styles with `width: 20px; height: 20px; opacity: 0.4; position: absolute; top: 1rem; left: 1rem;`
- When lunisolar is '??' (error case), moon indicator is hidden via `display: none`
- Moon renders as a subtle monochrome SVG (fill: rgba(255,255,255,0.6)) against dark background
</acceptance_criteria>

<action>
In `src/template.html`, add a moon indicator SVG after the beats-container div:

```html
<svg id="moon-indicator" width="20" height="20" viewBox="0 0 24 24" aria-label="Moon phase">
  <circle cx="12" cy="12" r="10" fill="rgba(255,255,255,0.15)" />
  <path id="moon-lit" fill="rgba(255,255,255,0.6)" />
</svg>
```

In `src/index.js`, add the moon indicator function and wire it into updateClock():

1. Add this function before the `updateClock` function:
   ```js
   function updateMoonIndicator(lunisolar) {
     const moonSvg = document.querySelector('#moon-lit');
     const moonIndicator = document.querySelector('#moon-indicator');

     if (!moonSvg || !moonIndicator) return;

     if (lunisolar === '??' || lunisolar.moonAge == null) {
       moonIndicator.style.display = 'none';
       return;
     }

     moonIndicator.style.display = 'block';

     const moonAge = lunisolar.moonAge;
     const phaseAngle = (moonAge / 29.53) * 2 * Math.PI;
     const cosPhase = Math.cos(phaseAngle);

     // SVG arc path for moon illumination
     const cx = 12, cy = 12, r = 10;
     const sweep = cosPhase >= 0 ? 1 : 0; // waxing=1, waning=0
     const width = Math.abs(cosPhase) * r;

     // Arc from top to bottom of circle, then back with illuminated width
     const d = `M ${cx} ${cy - r}
       A ${r} ${r} 0 0 1 ${cx} ${cy + r}
       A ${width} ${r} 0 0 ${sweep} ${cx} ${cy - r}
       Z`;

     moonSvg.setAttribute('d', d);
   }
   ```

2. In `updateClock()`, after the clock text update, add:
   ```js
   updateMoonIndicator(lunisolar);
   ```

3. Also call `updateMoonIndicator` for the initial render — after `updateClock(null);` add nothing extra since the initial call already includes it. The initial call with null location will result in lunisolar being computed (it doesn't depend on location), so it will work fine.

In `src/styles.css`, add the moon indicator styling:
```css
#moon-indicator {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 20px;
  height: 20px;
  opacity: 0.4;
  transition: opacity 150ms ease-out;
}

#moon-indicator:hover {
  opacity: 0.8;
}
```

The moon renders as a subtle detail in the top-left corner of the viewport, opposite the location selector (top-right).
</action>

---

## Task 3b: Create Tests for Sky Gradient System

<wave>1</wave>
<depends_on>
  <task>2</task>
</depends_on>

<read_first>
- src/sky.js — created in Task 2 (getSkyGradientColors, getSkyPhase, lerpColor)
- tests/pure/beats.test.js — test patterns (Date.UTC usage, vitest imports, jsdom environment)
- tests/pure/solar.test.js — existing solar test patterns for reference
</read_first>

<acceptance_criteria>
- tests/visual/sky.test.js exists with `// @vitest-environment node` pragma
- Test file imports from 'vitest' (describe, it, expect) and '../../src/sky.js'
- Contains `describe('sky gradient', () => { ... })` block
- At least 8 individual `it()` test cases covering:
  - `getSkyGradientColors(null, null, null)` returns default deep-night gradient `{ topColor: '#0a0a1a', bottomColor: '#0d1117' }`
  - `getSkyGradientColors(date, 40.7128, -74.0060)` (New York) returns object with `topColor` and `bottomColor` keys, both hex strings starting with `#`
  - `lerpColor([0,0,0], [255,255,255], 0.5)` returns `'#808080'` (mid-gray)
  - `lerpColor([0,0,0], [255,255,255], 0)` returns `'#000000'`
  - `lerpColor([0,0,0], [255,255,255], 1)` returns `'#ffffff'`
  - `getSkyPhase` returns `deep-night` for a date at midnight
  - `getSkyPhase` returns valid phase string from `['deep-night','night','astronomical-twilight','civil-dawn-dusk','golden-hour','day']` for any valid date/times
  - `getSkyGradientColors` with invalid coordinates (lat 999) returns default gradient without crashing
- `npm test` passes (all existing tests AND new sky tests)
</acceptance_criteria>

<action>
Create `tests/visual/sky.test.js`:

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getSkyGradientColors, lerpColor } from '../../src/sky.js';

describe('sky gradient', () => {
  it('returns default deep-night gradient with no location', () => {
    const result = getSkyGradientColors(null, null, null);
    expect(result).toEqual({ topColor: '#0a0a1a', bottomColor: '#0d1117' });
  });

  it('returns hex colors for valid location', () => {
    const date = new Date();
    const result = getSkyGradientColors(date, 40.7128, -74.0060); // New York
    expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result.bottomColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('lerps to mid-gray at t=0.5', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 0.5)).toBe('#808080');
  });

  it('lerps to colorA at t=0', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 0)).toBe('#000000');
  });

  it('lerps to colorB at t=1', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 1)).toBe('#ffffff');
  });

  it('handles invalid coordinates gracefully', () => {
    const date = new Date();
    const result = getSkyGradientColors(date, 999, 999);
    expect(result.topColor).toMatch(/^#/);
    expect(result.bottomColor).toMatch(/^#/);
  });
});
```

The test file uses jsdom-free environment (node) since sky.js has no DOM dependencies.

---

## Task 5: Typography Overhaul

<wave>2</wave>
<depends_on>
  <task>1</task>
  <task>2</task>
  <task>3</task>
  <task>4</task>
</depends_on>

<read_first>
- src/styles.css — current #beats-container styles (Arial, 5rem, font-weight: 900)
</read_first>

<acceptance_criteria>
- src/styles.css #beats-container `font-family` is set to `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- src/styles.css #beats-container `font-weight` is set to `300`
- src/styles.css #beats-container `letter-spacing` is set to `0.08em`
- src/styles.css #beats-container `font-variant-numeric` is set to `tabular-nums`
- src/styles.css #beats-container `color` is set to `rgba(255, 255, 255, 0.95)`
- src/styles.css #beats-container `line-height` is set to `1`
- src/styles.css #beats-container `font-size` uses `clamp(2.5rem, 6vw, 5rem)`
- Font weight 900 is no longer used anywhere in src/styles.css
- Arial is no longer the primary font (it remains only as a fallback in the font stack)
</acceptance_criteria>

<action>
In `src/styles.css`, replace the entire `#beats-container` rule with:

```css
#beats-container {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: clamp(2.5rem, 6vw, 5rem);
  font-weight: 300;
  letter-spacing: 0.08em;
  font-variant-numeric: tabular-nums;
  line-height: 1;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  justify-content: center;
  display: flex;
  height: 100vh;
  align-items: center;
  animation: breathe 4s ease-in-out infinite;
  will-change: transform;
}
```

This replaces the previous `font-family: Arial, Helvetica, sans-serif`, `font-size: 5rem`, and `font-weight: 900`. All other properties (justify-content, display, height, align-items) are preserved.

The `animation` and `will-change` properties are added here (from Task 3). The `text-shadow` is also added here (from Task 3).

Also add the `@keyframes breathe` block (from Task 3) to this file if not already present.
</action>

---

## Task 6: Responsive Scaling + Default State

<wave>2</wave>
<depends_on>
  <task>5</task>
</depends_on>

<read_first>
- src/styles.css — full file after Task 5 changes
- src/location/styles.css — existing responsive pattern at 768px breakpoint (reference for consistency)
</read_first>

<acceptance_criteria>
- src/styles.css contains `@media (max-width: 768px)` rule
- Media query adjusts `#beats-container` `font-size` to `clamp(2rem, 8vw, 3.5rem)` for mobile
- Media query adjusts `#moon-indicator` `width` to `16px` and `height` to `16px`
- Media query adjusts `.location-selector` position to `top: 0.5rem; right: 0.5rem`
- Body has `overflow-x: hidden` to prevent horizontal scroll from clamp sizing
- No layout breakage at 320px viewport width (smallest mobile)
</acceptance_criteria>

<action>
In `src/styles.css`, add a responsive media query at the end of the file:

```css
/* Responsive scaling */
@media (max-width: 768px) {
  #beats-container {
    font-size: clamp(2rem, 8vw, 3.5rem);
    padding: 0 1rem;
    letter-spacing: 0.04em;
  }

  #moon-indicator {
    width: 16px;
    height: 16px;
    top: 0.75rem;
    left: 0.75rem;
  }

  .location-selector {
    top: 0.5rem;
    right: 0.5rem;
  }
}
```

Also, in the existing `body` rule (from Task 2), add:
```css
body {
  min-height: 100vh;
  background-size: 100% 100%;
  transition: background 1.5s ease-out;
  overflow-x: hidden;
  margin: 0;
}
```

If the `* { box-sizing: border-box; margin: 0; }` rule already exists (it does at the top of styles.css), the `margin: 0` on body is redundant but harmless — keep it for clarity.

Additionally, ensure the sky gradient renders correctly when no location is set (S?? case). This is already handled in Task 2's `getSkyGradientColors()` function which returns the default `#0a0a1a` → `#0d1117` gradient when latitude/longitude are null. Verify this by reading sky.js and confirming the null check is present at the top of `getSkyGradientColors()`.
</action>

---

## must_haves

1. **Solar-driven continuous gradient** — `getSkyGradientColors()` uses suncalc.getTimes() to determine sky phase and returns interpolated colors
2. **Smooth transitions** — `transition: background 1.5s ease-out` on body prevents discrete color snaps
3. **Beat pulse** — `@keyframes breathe` with scale(1.005) runs continuously on #beats-container
4. **Moon phase** — SVG moon indicator renders from lunisolar.moonAge, updates every tick
5. **Typography upgrade** — System font stack, weight 300, tabular-nums, clamp() responsive sizing
6. **Responsive scaling** — 768px media query adjusts font size and moon indicator for mobile
7. **Default state** — Deep night gradient (#0a0a1a → #0d1117) when no location set
8. **Glassmorphism harmonization** — Moon indicator and location selector use same rgba patterns as existing UI

## Verification Criteria

After execution, verify:

1. **Visual check**: Open `npm start` in browser — background should be dark gradient, clock centered with light text, moon visible top-left
2. **Time-of-day check**: If location is set, background should reflect current solar phase (dawn=peach, day=blue, dusk=purple, night=navy)
3. **Animation check**: Clock should have barely perceptible breathing animation (scale 1→1.005 over 4s cycle)
4. **Moon check**: Moon SVG should show correct phase for current date (verify against real moon phase)
5. **Responsive check**: Resize browser to 375px width — font should scale down, moon should shrink
6. **No-location check**: Clear localStorage, reload — should show deep dark gradient with S?? in clock
7. **No errors**: Browser console should have no errors, `npm test` should pass
