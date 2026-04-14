# Phase 9: New Chronometry Modules — Research

**Researched:** 2026-04-14
**Purpose:** Answer "What do I need to know to PLAN this phase well?"

---

## API Reference

### astronomia library (v4.1.1)

Import style already used in project (see `oldSystem.js`, `astro-cache.js`):
```js
import { solar, eqtime, base, julian, moonposition } from 'astronomia';
// or CommonJS: const { solar, eqtime, base, julian, moonposition } = require('astronomia');
```

#### Date → Julian Day → T (Julian Century)

The standard pipeline for all astronomia computations:

```js
import { julian, base } from 'astronomia';

const date = new Date(Date.UTC(2026, 2, 20, 14, 46, 0)); // any JS Date
const jde = julian.DateToJD(date);        // JD as number (e.g., 2461120.115...)
const T = base.J2000Century(jde);         // Julian centuries since J2000
```

- `julian.DateToJD(date)` — takes a JavaScript `Date`, returns Julian Day (number)
- `base.J2000Century(jde)` — takes JD, returns `T = (jde - 2451545.0) / 36525`
- Key constant: `base.J2000 = 2451545.0`

#### solar.apparentLongitude(T)

- **File:** `node_modules/astronomia/src/solar.js`
- **Signature:** `function apparentLongitude(T) → number`
- **Parameter:** `T` — Julian centuries since J2000 (from `base.J2000Century(jde)`)
- **Return:** Solar apparent ecliptic longitude in **radians** (Number, not object)
- **Includes:** Nutation correction (-0.00569°) and aberration correction (-0.00478° * sin(Ω))
- **Accuracy:** ~0.01° for years 1900–2100
- **Range:** 0 to 2π radians (use `base.pmod` if normalization needed, but the function already returns a normalized value via `base.pmod`)

Conversion to degrees:
```js
const lonDeg = (lon * 180 / Math.PI) % 360;
```

#### moonposition.position(jde)

- **File:** `node_modules/astronomia/src/moonposition.js`
- **Signature:** `function position(jde) → Coord`
- **Parameter:** `jde` — Julian ephemeris day (number, from `julian.DateToJD(date)`)
- **Return:** `base.Coord` object with properties:
  - `.lon` — geocentric ecliptic longitude in **radians**
  - `.lat` — geocentric ecliptic latitude in **radians**
  - `.range` — Earth-Moon distance in **km**

The `.lon` property is the lunar ecliptic longitude. Note: `Coord.lon` is an alias for `Coord.ra` (the constructor parameter).

**No nutation correction** — the moonposition result does not include nutation. This is consistent with the solar computation (both referenced to mean equinox of date).

#### eqtime.eSmart(jde)

- **File:** `node_modules/astronomia/src/eqtime.js`
- **Signature:** `function eSmart(jde) → number`
- **Parameter:** `jde` — Julian ephemeris day (number)
- **Return:** Equation of time as an **hour angle in radians**
- **Advantage:** Does NOT require a VSOP87 planet object (unlike `eqtime.e(jde, earth)`)
- **Accuracy:** Good enough for display purposes; uses low-precision solar model

**Conversion to minutes:**
```js
const eqRadians = eqtime.eSmart(jde);
const eqMinutes = eqRadians * 720 / Math.PI;  // hour angle → minutes
```

Rationale: 2π radians = 24 hours = 1440 minutes. So 1 radian = 1440 / (2π) = 720/π minutes.

**Sign convention:** Positive = sun is ahead of mean time (sundial fast). Negative = sun is behind mean time (sundial slow).

#### eqtime.e(jde, earth) — NOT recommended

- **Signature:** `function e(jde, earth) → number`
- Requires: `new planetposition.Planet('earth')` + VSOP87 data
- Higher accuracy but requires extra dependency. Use `eSmart` instead.

#### base.pmod(x, y)

- **Signature:** `function pmod(x, y) → number`
- Returns positive modulo: `x % y` normalized to `[0, y)` for positive `y`
- Essential for normalizing angles to 0-360° or 0-2π range

#### base.toDeg(rad) / base.toRad(deg)

- **Signature:** `function toDeg(rad) → number`, `function toRad(deg) → number`
- Convenient conversion utilities

---

## Solar Longitude Computation

```js
import { solar, julian, base } from 'astronomia';

function compute(date) {
  const jde = julian.DateToJD(date);
  const T = base.J2000Century(jde);
  const lonRad = solar.apparentLongitude(T);
  const lonDeg = base.pmod(lonRad * 180 / Math.PI, 360);
  return lonDeg; // 0-360°, 0° = vernal equinox (Point of Aries)
}
```

### Verified Test Data

| Date (UTC) | Event | Solar Longitude (°) |
|---|---|---|
| 2026-03-20 14:46 | Vernal equinox 2026 | **0.0057°** (~0°) |
| 2026-06-21 08:24 | Summer solstice 2026 | **90.0022°** (~90°) |
| 2024-03-20 | Vernal equinox 2024 | ~0° |
| 2025-03-20 | Vernal equinox 2025 | ~0° |
| 2024-06-21 | Summer solstice 2024 | ~90° |
| 2025-06-21 02:42 UTC | Summer solstice 2025 | ~90° |

**Note:** The exact equinox/solstice moments shift slightly year-to-year. Testing at noon on the equinox date (not the exact moment) will give values within ~1° of the ideal. For tests, use dates within a few hours of the exact event for values within 0.1°.

Additional reference angles (for completeness):
- Autumnal equinox: 180°
- Winter solstice: 270°

---

## Lunar Phase Angle Computation

```js
import { solar, moonposition, julian, base } from 'astronomia';

function compute(date) {
  const jde = julian.DateToJD(date);
  const T = base.J2000Century(jde);

  const solarLon = solar.apparentLongitude(T);
  const moonPos = moonposition.position(jde);

  // Phase angle: lunar longitude minus solar longitude
  const phaseRad = base.pmod(moonPos.lon - solarLon, 2 * Math.PI);
  const phaseDeg = phaseRad * 180 / Math.PI;

  return phaseDeg; // 0-360°, 0° = new moon, 180° = full moon
}
```

**Key insight:** The phase angle is the angular separation between the Moon and Sun along the ecliptic. At new moon, they are at the same ecliptic longitude (angle ≈ 0°). At full moon, they are opposite (angle ≈ 180°).

### Verified Test Data

| Date (UTC) | Event | Lunar Lon (°) | Solar Lon (°) | Phase Angle (°) |
|---|---|---|---|---|
| 2026-01-18 19:52 | New moon | 298.72° | 298.73° | **359.99°** (~0°) |
| 2026-02-17 12:01 | New moon | — | — | ~0° |
| 2026-03-19 01:23 | New moon | — | — | ~0° |
| 2026-02-01 22:09 | Full moon | 133.04° | 313.06° | **179.98°** (~180°) |
| 2026-03-03 11:37 | Full moon | — | — | ~180° |
| 2026-04-02 02:11 | Full moon | — | — | ~180° |

**Accuracy note:** The computed phase angles are within 0.02° of ideal values. This confirms the computation approach is correct.

### Alternative: suncalc.getMoonIllumination()

The existing `lunisolar.js` already uses suncalc:
```js
const illum = SunCalc.getMoonIllumination(date);
// illum.phase: 0..1 (NOT radians!) — 0 = new moon, 0.5 = full moon
// illum.fraction: 0..1 illumination fraction
// illum.angle: radians
```

**Decision:** The user has already chosen astronomia moonposition (D-04). Use the lunar-solar longitude difference method, NOT suncalc's `.phase` field. The astronomia approach is more physically meaningful (gives actual ecliptic angular separation) and is consistent with the solar longitude module using the same library.

---

## Solar Time / Equation of Time

```js
import { eqtime, julian } from 'astronomia';

function compute(date, longitude) {
  const jde = julian.DateToJD(date);

  // Equation of time in minutes
  const eqRad = eqtime.eSmart(jde);
  const eqMinutes = eqRad * 720 / Math.PI;

  // Solar time calculation:
  // Local solar time = local mean solar time + equation of time
  // The longitude offset from the time zone meridian gives the base correction
  // Then add the equation of time correction

  return { equationOfTime: eqMinutes, /* ... */ };
}
```

### Verified Test Data — Equation of Time

| Date (UTC) | EOT (minutes) | Notes |
|---|---|---|
| 2026-02-11 | **-14.22 min** | Annual minimum (sun ~14 min slow) |
| 2026-11-03 | **+16.49 min** | Annual maximum (sun ~16 min fast) |
| 2026-04-15 | -0.02 min | Zero crossing |
| 2026-06-13 | -0.10 min | Zero crossing |
| 2026-09-01 | -0.02 min | Zero crossing |
| 2026-12-25 | -0.06 min | Zero crossing |
| 2026-03-20 (equinox) | -7.40 min | Not a zero crossing |

**Sign convention confirmed:**
- **Positive EOT** (November): Sun crosses meridian BEFORE clock noon → sundial is FAST
- **Negative EOT** (February): Sun crosses meridian AFTER clock noon → sundial is SLOW

### Solar Time Formula

For the solar time chronometer (SOLTIME-01/02/03), the core computation is:

1. **Local Mean Solar Time (LMST)** in decimal hours:
   ```
   LMST = UTC_hours + (longitude / 15)
   ```
   where longitude is in degrees (positive = east, negative = west)

2. **True Solar Time** adds the equation of time:
   ```
   TrueSolarTime = LMST + EOT_in_hours
   ```
   where `EOT_in_hours = eqMinutes / 60`

3. For **24h solar time** (SOLTIME-01): Format TrueSolarTime as HH:MM:SS

4. For **decimal solar beats** (SOLTIME-02): Convert TrueSolarTime to decimal beats (0-1000 per day)

5. For **solar longitudinal** (SOLTIME-03): Compute time based on actual solar angle at a chosen longitude

---

## Meghalayan Year

### Verified Formula

```
meghalayanYear = gregorianYear + 2200
```

Where `gregorianYear` is from `date.getUTCFullYear()`.

### Verified Computations

| Gregorian Date | getUTCFullYear() | Meghalayan Year |
|---|---|---|
| 2026 CE | 2026 | **4226** (2026 + 2200 = 4226) ✓ |
| 1 CE | 1 | 2201 |
| 1 BCE (year 0) | 0 | 2200 |
| 2200 BCE (year -2199) | -2199 | **1** (-2199 + 2200 = 1) ✓ |

### BCE Year Handling in JavaScript

JavaScript uses **ISO-8601 / astronomical year numbering**:
- Year 0 in JavaScript = 1 BCE (the year before 1 CE)
- Year -1 in JavaScript = 2 BCE
- Year -2199 in JavaScript = 2200 BCE

The relationship: `BCE_year = -(JS_year + 1)` for years before 1 CE.

**Key finding:** The simple formula `meghalayanYear = date.getUTCFullYear() + 2200` works correctly for **all dates** (BCE and CE) because:
- 2200 BCE → JS year -2199 → -2199 + 2200 = 1 (Mgh 1) ✓
- 1 BCE → JS year 0 → 0 + 2200 = 2200 (Mgh 2200) ✓
- 1 CE → JS year 1 → 1 + 2200 = 2201 (Mgh 2201) ✓
- 2026 CE → JS year 2026 → 2026 + 2200 = 4226 (Mgh 4226) ✓

**No special BCE handling needed** for the Meghalayan module. The formula is a simple linear offset that works across the year-0 boundary naturally.

### Pattern to follow (from holocene.js)

The Meghalayan module is even simpler than the Holocene module since it has no CNY ticking concern:

```js
export function compute(date, opts) {
  const gregorianYear = date.getUTCFullYear();
  return gregorianYear + 2200;
}
```

---

## Custom Epoch Year

### Computation

```js
export function compute(date, opts = {}) {
  const { customEpoch } = opts;

  if (!customEpoch) {
    return 0; // or null, or '??' — planner's discretion
  }

  const epochDate = new Date(customEpoch);
  const epochYear = epochDate.getUTCFullYear();
  const gregorianYear = date.getUTCFullYear();

  return gregorianYear - epochYear + 1;  // +1 because epoch date = year 1
}
```

### Integration Note

`opts.customEpoch` must be threaded through from the configuration layer (Phase 14 — Format Selector UI). For now, the module should accept it as a parameter and handle the missing case gracefully.

**Potential formats for `customEpoch`:**
- JavaScript `Date` object
- Timestamp (milliseconds since epoch)
- `{ year, month, day }` object

The module should normalize to a Date internally. Following the `compute(date, opts)` pattern:
```js
const epochDate = customEpoch instanceof Date ? customEpoch : new Date(customEpoch);
```

---

## Integration Points

### Composer Pattern (src/chronometers/index.js)

Current structure:
```js
import { compute as computeHolocene } from './holocene.js';
import { compute as computeBeats } from './beats.js';
import { compute as computeSolar } from './solar.js';
import { compute as computeLunisolar } from './lunisolar.js';

export function compose(date, opts = {}) {
  const result = {};

  try {
    result.holocene = computeHolocene(date, opts);
  } catch (error) {
    console.warn('holocene', error);
    result.holocene = '??';
  }

  // ... repeats for each module ...

  return result;
}
```

New imports to add:
```js
import { compute as computeSolarLongitude } from './solarLongitude.js';
import { compute as computeLunarPhase } from './lunarPhase.js';
import { compute as computeSolarTime } from './solarTime.js';
import { compute as computeMeghalayan } from './meghalayan.js';
import { compute as computeCustomEpoch } from './customEpoch.js';
```

Each new module gets its own try/catch block in `compose()`.

### Options Flow

Current `opts` passed to composer:
- `opts.latitude` — from geolocation
- `opts.longitude` — from geolocation

New options needed:
- `opts.customEpoch` — user-defined epoch date (from config, Phase 14)

The solar time module needs `opts.latitude` and `opts.longitude` for location-based solar calculations. The solar longitude, lunar phase, and meghalayan modules do NOT need location — they are purely date-based.

### Return Type Considerations

| Module | Recommended Return Type | Reason |
|---|---|---|
| solarLongitude | `number` (0-360°) | Raw value; formatter rounds to integer |
| lunarPhase | `number` (0-360°) | Raw value; formatter rounds to integer |
| solarTime | `object` { hours, minutes, seconds, equationOfTime } | Multiple values needed by different format renderers |
| meghalayan | `number` | Same as holocene (year integer) |
| customEpoch | `number` or `0` | Year integer; fallback if no customEpoch provided |

The composer try/catch will handle errors by setting the result to `'??'`, which is compatible with both number and object return types.

---

## Test Patterns

### Existing Conventions (from tests/pure/holocene.test.js, tests/pure/solar.test.js)

```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/holocene.js';

describe('holocene chronometer', () => {
  it('returns correct Holocene year before CNY 2026', () => {
    const date = new Date(Date.UTC(2026, 1, 16));
    expect(compute(date)).toBe(11725);
  });

  it('returns a number', () => {
    const date = new Date();
    const result = compute(date);
    expect(typeof result).toBe('number');
  });
});
```

Key conventions:
- File: `tests/pure/{module}.test.js`
- Environment: `// @vitest-environment node`
- Imports: `describe`, `it`, `expect` from `vitest`
- Compute: `import { compute } from '../../src/chronometers/{module}.js'`
- Date construction: `new Date(Date.UTC(year, month, day, ...))`
- Assertions: `expect(result).toBe(value)` or `expect(typeof result).toBe('number')`
- Tests cover: known dates, type checking, edge cases, fallback behavior

### vitest.config.js

```js
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
  },
  css: false,
});
```

Note: Environment defaults to `jsdom` at config level, but individual test files override with `// @vitest-environment node` when DOM is not needed.

---

## Known Astronomical Reference Values for Testing

### Solar Longitude Reference Points

| Event | Approx Date | Expected Longitude |
|---|---|---|
| Vernal equinox | March 20 | 0° |
| Summer solstice | June 21 | 90° |
| Autumnal equinox | September 22-23 | 180° |
| Winter solstice | December 21-22 | 270° |

Exact 2026 times (UTC):
- Vernal equinox: March 20, 14:46 UTC
- Summer solstice: June 21, 08:24 UTC
- Winter solstice: December 21, 20:50 UTC

### Lunar Phase Reference Points (2026, UTC)

| Phase | Date | Expected Angle |
|---|---|---|
| New moon | Jan 18, 19:52 | ~0° |
| Full moon | Feb 1, 22:09 | ~180° |
| New moon | Feb 17, 12:01 | ~0° |
| Full moon | Mar 3, 11:37 | ~180° |
| New moon | Mar 19, 01:23 | ~0° |
| Full moon | Apr 2, 02:11 | ~180° |
| New moon | Apr 17, 11:51 | ~0° |
| Full moon | May 1, 17:23 | ~180° |
| New moon | May 16, 20:01 | ~0° |
| Full moon | May 31, 08:45 | ~180° |

### Equation of Time Reference Points (2026)

| Date | EOT (minutes) | Description |
|---|---|---|
| Feb 11 | ~-14.2 | Annual minimum |
| Apr 15 | ~0 | Zero crossing |
| Jun 13 | ~0 | Zero crossing |
| Sep 1 | ~0 | Zero crossing |
| Nov 3 | ~+16.5 | Annual maximum |
| Dec 25 | ~0 | Zero crossing |

### Meghalayan Reference Points

| Gregorian Year | Meghalayan Year |
|---|---|
| 2200 BCE | Mgh 1 (epoch) |
| 1 BCE | Mgh 2200 |
| 1 CE | Mgh 2201 |
| 2000 CE | Mgh 4200 |
| 2026 CE | Mgh 4226 |

---

## Edge Cases and Risks

### 1. astronomia Date Range Limitations

The `solar.apparentLongitude(T)` and `moonposition.position(jde)` functions are validated for years approximately **1900–2100** (per source code comments). Using them for dates far outside this range will produce results, but accuracy degrades. This is NOT a concern for the Meghalayan module (which is a simple arithmetic offset), but IS relevant if testing solar/lunar functions with BCE dates.

### 2. Julian Day for Very Old Dates

`julian.DateToJD()` can handle JavaScript's full Date range, but JavaScript Date itself is limited to ±100,000,000 days from 1970-01-01 (roughly ±273,785 years). More practically, `Date.UTC()` with negative years works correctly for the BCE dates relevant to Meghalayan (2200 BCE = JS year -2199).

### 3. Solar Time Longitude Sign Convention

In the equation `LMST = UTC_hours + longitude / 15`:
- Positive longitude (east of Greenwich) → solar time is AHEAD of UTC
- Negative longitude (west of Greenwich) → solar time is BEHIND UTC

This is consistent with the existing `solar.js` chronometer which uses the same sign convention for SunCalc.

### 4. Solar Time at Polar Latitudes

At extreme latitudes, the sun may not rise/set for extended periods (polar day/night). However, solar time is a geometric calculation based on the sun's hour angle, not on visibility. It remains well-defined at all latitudes.

### 5. Month Indexing

JavaScript `Date.UTC()` uses 0-based months (0 = January, 11 = December). The test data above uses this convention consistently.

---

## Module File Structure

Following existing patterns in `src/chronometers/`:

```
src/chronometers/
├── index.js                 (updated with new imports + compose blocks)
├── holocene.js              (existing)
├── beats.js                 (existing)
├── solar.js                 (existing)
├── lunisolar.js             (existing)
├── oldSystem.js             (existing, not imported by composer)
├── chineseNewYear.js        (existing)
├── solarLongitude.js        (NEW — ~15 lines)
├── lunarPhase.js            (NEW — ~20 lines)
├── solarTime.js             (NEW — ~30 lines)
├── meghalayan.js            (NEW — ~10 lines)
└── customEpoch.js           (NEW — ~15 lines)

tests/pure/
├── holocene.test.js         (existing)
├── beats.test.js            (existing)
├── solar.test.js            (existing)
├── lunisolar.test.js        (existing)
├── oldSystem.test.js        (existing)
├── solarLongitude.test.js   (NEW)
├── lunarPhase.test.js       (NEW)
├── solarTime.test.js        (NEW)
├── meghalayan.test.js       (NEW)
└── customEpoch.test.js      (NEW)
```

---

## Dependencies

### Already installed
- `astronomia@^4.1.1` — provides solar, moonposition, eqtime, julian, base modules
- `suncalc` — already used for solar percent; NOT needed for new modules (astronomia covers all needs)

### No new npm dependencies required

---

## RESEARCH COMPLETE
