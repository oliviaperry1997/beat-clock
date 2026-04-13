# Phase 2: Modular Chronometry Core — Research

**Date:** 2026-04-13
**Purpose:** Technical research for extracting clock logic into modular ES modules

---

## 1. lunar-javascript Library (6tail)

### Package Details

| Field | Value |
|-------|-------|
| **Package** | `lunar-javascript` |
| **Author** | 6tail |
| **Version** | 1.7.7 |
| **License** | MIT |
| **Bundle Size** | ~35KB minified, ~12KB gzipped |
| **Unpacked Size** | 512KB (30 files) |
| **Dependencies** | Zero runtime dependencies |
| **Module Format** | CommonJS (`module.exports`), Webpack handles interop transparently |
| **Main Entry** | `index.js` |
| **Date Range** | 1 AD to 9999 AD (uses astronomical algorithms, not lookup tables) |

### Import Patterns

```js
// CommonJS (works in current Webpack setup)
const { Solar, Lunar } = require('lunar-javascript');

// ESM (if project switches to "type": "module")
import { Solar, Lunar } from 'lunar-javascript';
```

**Gotcha:** The library is CommonJS and **not tree-shakeable** by Webpack. The entire library will be bundled. At ~35KB minified this is acceptable for the project's performance constraints (DOM update at 864ms intervals dominates any bundle-size concern).

### Core API: Solar Date from JS Date

```js
// From a native JavaScript Date object
const solar = Solar.fromDate(date);

// From numeric year, month, day (1-indexed months)
const solar = Solar.fromYmd(2026, 2, 17);
```

### Core API: Convert Solar to Lunar

**IMPORTANT:** The method is `solar.getLunar()`, NOT `solar.toLunar()`. The README_EN.md documentation is misleading — the actual API uses `getLunar()` on Solar instances.

```js
const solar = Solar.fromDate(new Date(2026, 1, 17)); // Feb 17, 2026
const lunar = solar.getLunar();

lunar.getYear();            // 2026
lunar.getMonth();           // 1 (positive = normal month)
lunar.getDay();             // 1
lunar.getMonthInChinese();  // "正" (first month)
lunar.getDayInChinese();    // "初一"
lunar.toFullString();       // Full formatted string with Ganzhi, etc.
```

### Leap Month Detection

**Leap months are indicated by negative integers.** When `Solar.getLunar()` returns a Lunar object for a date that falls in a leap month, `getMonth()` returns a negative number.

```js
// August 1, 2025 falls in the leap 6th month of lunar year 2025
const solar = Solar.fromYmd(2025, 8, 1);
const lunar = solar.getLunar();
lunar.getMonth();           // -6 (negative = leap month)
lunar.getMonthInChinese();  // "闰六" (leap 6th)
```

**Detection pattern:**
```js
function isLeapMonth(lunar) {
  return lunar.getMonth() < 0;
}

function getAbsoluteMonth(lunar) {
  return Math.abs(lunar.getMonth());
}
```

**Creating Lunar dates with leap months:**
```js
// Negative month creates a leap month date
const leapDate = Lunar.fromYmd(2025, -6, 1);
leapDate.getMonth();           // -6
leapDate.getMonthInChinese();  // "闰六"
leapDate.getSolar().toYmd();   // "2025-07-25" (the solar date of leap 6th month day 1)
```

### Getting Chinese New Year for a Given Year

```js
// Chinese New Year = 1st day of 1st lunar month
function getChineseNewYear(year) {
  return Lunar.fromYmd(year, 1, 1).getSolar();
}

// Verified dates:
// CNY 2025: 2025-01-29
// CNY 2026: 2026-02-17
// CNY 2027: 2027-02-06
```

The returned Solar object has `.toYmd()`, `.getYear()`, `.getMonth()`, `.getDay()` methods.

### Year Range Behavior

The library works correctly outside the 1900-2100 range (it supports 1 AD to 9999 AD):

```js
Solar.fromYmd(1800, 1, 1).getLunar().getYear();  // 1799 (works)
Solar.fromYmd(2200, 1, 1).getLunar().getYear();  // 2199 (works)
```

**No errors thrown for out-of-range dates.** However, for this project's use case (displaying current time), pre-1900 and post-2100 dates are not a practical concern.

### Other Useful Lunar Methods

```js
lunar.getYearInChinese();    // "二〇二六" (Chinese numerals)
lunar.getYearInGanZhi();     // "丙午" (heavenly stem + earthly branch)
lunar.getShengxiao();        // "马" (zodiac animal)
lunar.getJieQi();            // Solar terms (24 节气)
lunar.getJieQiList();        // List of all solar term keys
lunar.getFestivals();        // Traditional festivals on this date
lunar.isLeap();              // NOTE: this method does NOT exist on Lunar instances
                              // Use lunar.getMonth() < 0 instead
```

### Gotchas

1. **`toLunar()` does NOT exist** — use `solar.getLunar()` instead
2. **`isLeap()` does NOT exist** on Lunar instances — use `lunar.getMonth() < 0`
3. **Chinese month names are abbreviated** — `getMonthInChinese()` returns "正", "二", "三", etc., not full "正月". For leap months it returns "闰六" not "闰六月".
4. **`getMonthInChinese()` returns single characters** for months 1-9 (e.g., "正" for 1st, not "正月"). The planner should decide on display formatting.
5. **Day values are 1-indexed** — `getDay()` returns 1-29/30, never 0.
6. **Negative month in `Lunar.fromYmd()`** is the input convention for leap months. The output `getMonth()` also uses negative numbers for leap months.

---

## 2. Vitest with Webpack 5

### Setup

Vitest works in Webpack projects — it does not require Vite. Install:

```bash
npm install -D vitest jsdom
```

### vitest.config.js

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Optional: separate projects for pure vs DOM tests
  },
  // Disable CSS processing since Vitest uses Vite's pipeline,
  // and we don't have Vite CSS plugins configured
  css: false,
});
```

### Handling CSS Imports in Test Files

When test files (directly or indirectly) import modules that do `import "./styles.css"`, Vitest's Vite-based resolver will try to process the CSS. Since the project uses `css-loader` + `style-loader` (Webpack-specific), Vitest won't understand these.

**Solution 1: CSS stub via alias**

```js
// vitest.config.js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
  },
  css: false, // Skip CSS transformation
  resolve: {
    alias: [
      {
        find: /\.css$/,
        replacement: 'identity-obj-proxy', // or a local stub
      },
    ],
  },
});
```

Install `identity-obj-proxy` as a dev dependency, or create a local stub:

```js
// test/mocks/css-proxy.js
export default new Proxy({}, {
  get(_, key) {
    return key;
  },
});
```

**Solution 2: Separate test directories**

Keep pure function tests in a directory that doesn't import from `src/index.js` (which imports `styles.css`):

```
tests/
├── pure/           # Pure function tests (no DOM, no CSS imports)
│   ├── holocene.test.js
│   ├── beats.test.js
│   ├── solar.test.js
│   └── lunisolar.test.js
├── dom/            # DOM/integration tests (need jsdom + CSS stubs)
│   └── composer.test.js
```

**Solution 3: Environment directives per file**

```js
// tests/pure/beats.test.js
// @vitest-environment node

// tests/dom/composer.test.js
// @vitest-environment jsdom
```

### Recommended Configuration for This Project

```js
// vitest.config.js
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

For the chronometer modules (pure functions), use `// @vitest-environment node` at the top of test files to skip jsdom overhead. Only use jsdom for integration tests that need DOM APIs.

### Testing Pure Functions vs DOM-Dependent Code

**Pure functions** (holocene, beats, solar calculations):
- No DOM needed
- Use `// @vitest-environment node`
- Fast execution, no jsdom boot time

**DOM-dependent code** (composer integration, updateClock):
- Needs jsdom environment
- Mock `document.querySelector` or use a test container
- Mock `navigator.geolocation`

```js
// Mock geolocation for tests
beforeEach(() => {
  Object.defineProperty(global.navigator, 'geolocation', {
    value: {
      getCurrentPosition: vi.fn(),
    },
    writable: true,
  });
});
```

### npm test Script

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

## 3. astronomia v4 APIs

### Import Pattern

astronomia v4 supports both ESM and CJS via conditional exports:

```js
// CommonJS
const { moonphase, solstice, julian } = require('astronomia');

// ESM
import moonphase from 'astronomia/moonphase';
import solstice from 'astronomia/solstice';
import julian from 'astronomia/julian';

// Or subpath import
import { moonphase, solstice, julian } from 'astronomia';
```

### moonphase.newMoon(year)

**Returns:** JDE (Julian Ephemeris Day) of the **first new moon at or near the start of the year** as a single number.

**NOT an array.** It returns the JDE of one new moon.

```js
import { moonphase, julian } from 'astronomia';

const jde = moonphase.newMoon(2025);
// jde = 2460675.436114201

const date = julian.JDEToDate(jde);
// date = 2024-12-30T22:26:51.670Z
// Note: the "first" new moon of 2025 is actually Dec 30, 2024 UTC
```

**Finding all new moons in a year:** Iterate by `moonphase.meanLunarMonth`:

```js
let jde = moonphase.newMoon(2025);
const newMoons2025 = [];

while (julian.JDEToDate(jde).getFullYear() <= 2025) {
  const d = julian.JDEToDate(jde);
  if (d.getFullYear() === 2025) {
    newMoons2025.push(d);
  }
  jde += moonphase.meanLunarMonth; // 29.530588861
}

// newMoons2025 = [
//   2025-01-29, 2025-02-27, 2025-03-29, 2025-04-28,
//   2025-05-27, 2025-06-26, 2025-07-25, 2025-08-24,
//   2025-09-22, 2025-10-22, 2025-11-20, 2025-12-20
// ]
```

### moonphase.meanLunarMonth

```js
moonphase.meanLunarMonth; // 29.530588861 (days)
```

This is the precise value. Current code uses `29.53059` — the difference is `0.000001139` days (~0.1 seconds), negligible for display purposes.

### Other moonphase Functions

```js
moonphase.new(jde);      // Refined new moon JDE from approximate JDE
moonphase.meanNew(k);    // Mean new moon for lunation number k (from J2000.0)
moonphase.first(jde);    // First quarter
moonphase.full(jde);     // Full moon
moonphase.last(jde);     // Last quarter
moonphase.meanFirst(k);  // Mean first quarter
moonphase.meanFull(k);   // Mean full moon
moonphase.meanLast(k);   // Mean last quarter
```

### solstice.march(year)

**Returns:** JDE of the March (vernal) equinox for the given year.

```js
import { solstice, julian } from 'astronomia';

const jde = solstice.march(2025);
const date = julian.JDEToDate(jde);
// 2025-03-20T09:01:36.983Z

solstice.march(2026); // 2026-03-20T14:45 UTC
solstice.march(2027); // 2027-03-20T20:24 UTC
```

**Other solstice functions:**
```js
solstice.june(year);     // June solstice
solstice.september(year); // September equinox
solstice.december(year);  // December solstice
```

### julian.JDEToDate(jde)

```js
import { julian } from 'astronomia';

const jde = 2460754.8769173706;
const date = julian.JDEToDate(jde);
// Returns a native JS Date object
date.toISOString(); // "2025-03-20T09:01:36.983Z"
```

### Comparison: astronomia vs Current Polynomial Approximation

The current `marchEquinoxJDE()` function re-implements a polynomial approximation. Comparing with `astronomia/solstice.march()`:

| Year | Polynomial JDE | astronomia JDE | Difference |
|------|---------------|----------------|------------|
| 2025 | 2025-03-20 08:50 UTC | 2025-03-20 09:01 UTC | +11.1 min |
| 2026 | 2026-03-20 14:39 UTC | 2026-03-20 14:45 UTC | +6.0 min |
| 2027 | 2027-03-20 20:28 UTC | 2027-03-20 20:24 UTC | -3.7 min |
| 2030 | 2030-03-20 13:55 UTC | 2030-03-20 13:51 UTC | -3.7 min |
| 2050 | 2050-03-20 10:15 UTC | 2050-03-20 10:19 UTC | +3.8 min |

The polynomial approximation is within ~11 minutes of astronomia's Meeus Chapter 49 algorithm. For the beat clock's day-counting purposes (days since equinox), this difference is **functionally irrelevant** — it would never change the day count. However, replacing the polynomial with `astronomia/solstice` is still recommended as:
1. It eliminates dead code (Issue #5 in ARCHITECTURE.md)
2. It uses the authoritative algorithm
3. It's simpler code (one function call vs 5-line polynomial)

### Replacing getNextNewMoon

The current `getNextNewMoon()` function uses hourly stepping with `suncalc.getMoonIllumination()` — ~700 iterations for a 30-day search. This can be replaced entirely:

```js
// OLD: ~700 iterations, hourly stepping
function getNextNewMoon(afterDate) { /* ... */ }

// NEW: Single O(1) call
function getNextNewMoon(afterDate) {
  const year = afterDate.getUTCFullYear();
  let jde = moonphase.newMoon(year);

  // Iterate forward until we find the first new moon after afterDate
  while (julian.JDEToDate(jde) <= afterDate) {
    jde += moonphase.meanLunarMonth;
  }

  // Refine with the precise new() function
  return julian.JDEToDate(moonphase.new(jde));
}
```

This is O(1) in practice (at most ~13 iterations of adding meanLunarMonth).

---

## 4. Test Fixture Dates

### Chinese New Year Dates (Verified via lunar-javascript)

| Year | CNY Gregorian Date | Lunar Year | Notes |
|------|-------------------|------------|-------|
| 2025 | 2025-01-29 | 2025 | Year of Snake |
| 2026 | 2026-02-17 | 2026 | Year of Horse |
| 2027 | 2027-02-06 | 2027 | Year of Goat |

### Spring Equinox Dates (Verified via astronomia)

| Year | Equinox UTC Time | JDE |
|------|-----------------|-----|
| 2025 | 2025-03-20 09:01:36 UTC | 2460754.8769 |
| 2026 | 2026-03-20 14:45 UTC (approx) | — |
| 2027 | 2027-03-20 20:24 UTC (approx) | — |

### New Moon Dates Near Equinoxes (Verified via astronomia)

**2025:**
| New Moon | Date (UTC) | Relation to Equinox |
|----------|-----------|-------------------|
| Before equinox | 2025-02-27 23:54 UTC | ~21 days before |
| After equinox | 2025-03-29 12:39 UTC | ~9 days after |

**2026:**
| New Moon | Date (UTC) | Relation to Equinox |
|----------|-----------|-------------------|
| Before equinox | 2026-03-20 (need to calculate) | Near equinox |
| First of year | 2026-01-18 19:52 UTC | — |

Full 2025 new moons: Jan 29, Feb 27, Mar 29, Apr 28, May 27, Jun 26, Jul 25, Aug 24, Sep 22, Oct 22, Nov 20, Dec 20.

### Beat Time Reference: @000.00 at 23:00 BMT

Swatch Internet Time (`.beats`) is based on Biel Mean Time (BMT = UTC+1).

- **@000.00** = midnight BMT = **23:00 UTC previous day**
- **@500.00** = noon BMT = **11:00 UTC same day**
- **@999.99** = just before midnight BMT = **22:59:59.999 UTC same day**

Current `getBeats()` implementation:
```js
function getBeats(now) {
  const msOfDay = now.getUTCHours() * 3600000 +
      now.getUTCMinutes() * 60000 +
      now.getUTCSeconds() * 1000 +
      now.getUTCMilliseconds();
  const bmtOffset = 3600000; // UTC+1 = 1 hour in ms
  const totalMs = (msOfDay + bmtOffset) % 86400000;
  const beats = totalMs / 86400; // 86400ms per beat
  return `@${beats.toFixed(2).padStart(6, '0')}`;
}
```

**Verified test cases:**
| UTC Time | BMT Time | Beats |
|----------|----------|-------|
| 23:00:00 UTC (prev day) | 00:00:00 BMT | @000.00 |
| 11:00:00 UTC | 12:00:00 BMT | @500.00 |
| 00:00:00 UTC | 01:00:00 BMT | @041.67 |
| 22:59:59 UTC | 23:59:59 BMT | @999.99 |

### Solar Percent Edge Cases

| Scenario | Expected Output | Notes |
|----------|----------------|-------|
| `lat = null, lon = null` | `'S??'` | Geolocation unavailable |
| Polar regions (Arctic/Antarctic) | `'S??'` | Sun doesn't rise/set; suncalc returns undefined |
| Midnight (nighttime) | `'N{percent}'` | N prefix for night phase |
| Noon (daytime) | `'S{percent}'` | S prefix for solar/day phase |
| Exactly at sunrise | `'S00'` | 0% into daytime |
| Exactly at sunset | `'S99'` or `'N00'` | Transition point |

### Holocene Year Test Cases

| Gregorian Year | Holocene Year | Formula |
|---------------|---------------|---------|
| 2025 | H12025 | 2025 + 10000 - 9700 = 2025 + 10000... wait |

Actually: `getHoloceneYear(date) = date.getUTCFullYear() + 9700`

| Gregorian Year | Holocene Year |
|---------------|---------------|
| 2025 | H11725 |
| 2026 | H11726 |
| 2000 | H11700 |
| 1970 | H11670 |

**Note:** The Holocene calendar conventionally adds 10,000 years (placing year 1 at ~10,000 BCE). The current code uses +9700, which is slightly non-standard. The exact offset should be confirmed — this may be intentional for the project's aesthetic.

---

## 5. Module Design Notes

### compute(date, opts) Contract

Every chronometer module should export:
```js
/**
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude for location-dependent calculations
 * @param {number} [opts.longitude] - Longitude for location-dependent calculations
 * @returns {object|string|number} Result
 */
export function compute(date, opts) { ... }
```

### Error Handling (D-26)

Composer wraps each `compute()` in try/catch:
- Numeric components return `'??'` on error
- Error status returns `'E!'`
- Failed modules log via `console.warn(moduleName, error)`

### Shared Utility: chineseNewYear.js

Both `holocene.js` and `lunisolar.js` need Chinese New Year dates. Extract into shared utility:

```js
// src/chronometers/chineseNewYear.js
import { Lunar } from 'lunar-javascript';

export function getChineseNewYear(year) {
  return Lunar.fromYmd(year, 1, 1).getSolar();
}

export function getCurrentLunisolarYear(date) {
  // Returns the lunar year for a given date
  const solar = Solar.fromDate(date);
  return solar.getLunar().getYear();
}
```

### Holocene Year Ticking on CNY (D-03)

After Phase 2 migration, Holocene year ticks on Chinese New Year instead of Gregorian Jan 1:
- Before CNY: Holocene year = previous Gregorian year + 9700
- On/after CNY: Holocene year = current Gregorian year + 9700

---

## 6. Migration Reference: Current Functions to Modules

| Current Function | Target Module | Dependencies | Notes |
|-----------------|--------------|--------------|-------|
| `getHoloceneYear()` | `holocene.js` | `chineseNewYear.js` (after D-03) | Ticks on CNY |
| `getBeats()` | `beats.js` | None | Pure function |
| `getSolarPercent()` + helpers | `solar.js` | `suncalc` | Location-dependent |
| `getLunationSinceEquinox()` + `getNextNewMoon()` | Replaced by `lunisolar.js` | `lunar-javascript` | New module |
| `marchEquinoxJDE()` | Dead code | — | Replaced by `astronomia/solstice` |
| `getSpringEquinox()` | Dead code | — | Equinox no longer needed as anchor |
| `getDaysSinceEquinox()` | `oldSystem.js` | — | Preserved but hidden |
| `getNextNewMoon()` | Dead code | — | Replaced by `astronomia/moonphase` |

---

## 7. Bundle Impact Summary

| Dependency | Size (minified) | Tree-shakeable | Notes |
|-----------|----------------|----------------|-------|
| `suncalc` (existing) | ~6KB | N/A (CJS) | Keep for sunrise/sunset |
| `astronomia` (existing) | ~50KB* | Partial (subpath imports) | Keep, expand usage |
| `lunar-javascript` (new) | ~35KB | No (CJS) | New dependency |
| `vitest` (dev) | — | — | Dev-only, not bundled |

*astronomia with subpath imports (`astronomia/moonphase`, `astronomia/solstice`, `astronomia/julian`) allows Webpack to tree-shake unused modules. Using the full `require('astronomia')` bundles everything.

---

*Research complete. Ready for /gsd-plan-phase.*
