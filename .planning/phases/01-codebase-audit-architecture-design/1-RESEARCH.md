# Phase 1: Codebase Audit & Architecture Design — Research

**Researched:** 2026-04-13
**Phase:** 01-codebase-audit-architecture-design

---

## 1. Existing Codebase Audit

### 1.1 Architecture Overview

The entire application lives in a single file: `src/index.js` (161 lines). It is structured as three informal sections:

| Section | Lines | Content |
|---------|-------|---------|
| Imports | 1-3 | CSS import, `suncalc`, `astronomia` (solar, julian modules) |
| Helper functions | 5-127 | 8 pure functions: `getHoloceneYear`, `marchEquinoxJDE`, `getSpringEquinox`, `getDaysSinceEquinox`, `getLunationSinceEquinox`, `getNextNewMoon`, `getBeats`, `getNextSunrise`, `getPreviousSunset`, `getSolarPercent` |
| Main + init | 129-161 | `updateClock`, `convertGregorianToCustom`, geolocation bootstrap |

**Key observation:** The code is already functionally pure — no classes, no mutable shared state. This aligns perfectly with D-12 (functional ES modules). Extraction risk is low.

### 1.2 Function-by-Function Analysis

#### `getHoloceneYear(date)` — Line 5-7
- **Type:** Pure function
- **Dependency:** None
- **Complexity:** O(1)
- **Extraction difficulty:** Trivial — ideal first module
- **Edge cases:** None; works for any valid Date object

#### `marchEquinoxJDE(year)` — Lines 9-18
- **Type:** Pure function
- **Dependency:** None (polynomial approximation from Meeus)
- **Complexity:** O(1)
- **Accuracy:** Uses table 27.b coefficients (valid for years 1000-3000). Matches `astronomia/src/solstice.js` table `mc2` exactly — this is a re-implementation of what astronomia already provides.
- **Note:** Could be replaced with `solar.trueLongitude()` to find when sun longitude = 0, or `solstice.march()` from astronomia directly.

#### `getSpringEquinox(holoceneYear)` — Lines 20-30
- **Type:** Pure function
- **Dependency:** `marchEquinoxJDE`, `astronomia/julian`
- **Complexity:** O(1)
- **Quirk — 23:00 UTC anchor:** The code shifts the equinox to the previous 23:00 UTC for day-counting purposes. The logic:
  ```js
  anchorTime.setUTCHours(23, 0, 0, 0);
  if (equinoxDateUTC.getUTCHours() < 23) {
    anchorTime.setUTCDate(anchorTime.getUTCDate() - 1);
  }
  ```
  This creates a day boundary at 23:00 UTC instead of midnight. **This is a design decision, not a bug** — it likely ensures day counts align with the beat clock's UTC+1 bias. Must be preserved or explicitly replaced when switching to Chinese New Year anchoring.

#### `getDaysSinceEquinox(now, equinox)` — Lines 32-35
- **Type:** Pure function
- **Dependency:** None
- **Complexity:** O(1)
- **Extraction difficulty:** Trivial

#### `getLunationSinceEquinox(now, equinox)` — Lines 37-52
- **Type:** Pure function
- **Dependency:** `getNextNewMoon`, hardcoded lunar cycle (29.53059 days)
- **Complexity:** O(1) after new moon lookup
- **Issue:** Uses a fixed synodic month length (29.53059 days) rather than calculating actual new moon dates. This is an approximation — acceptable for the current display but the Chinese lunisolar system will need precise month boundaries.
- **Note:** The constant `29.53059` differs slightly from astronomia's `meanLunarMonth` (29.530588861) — negligible for display purposes but worth standardizing.

#### `getNextNewMoon(afterDate)` — Lines 54-77
- **Type:** Approximate numerical search
- **Dependency:** `suncalc`
- **Complexity:** O(n) where n = hours until next new moon
- **CRITICAL PERFORMANCE ISSUE:** Uses hourly stepping with a worst-case search window of 60 days = 1,440 hours = **1,440 iterations**, not 43,200 as initially estimated (the maxHours constant is `60 * 24 * 60` which equals 86,400 hours = 3,600 days — but the loop variable `i` counts hours, so the actual worst case is ~720 hours = 30 days between new moons, meaning ~720 `getMoonIllumination` calls).
  
  **Correction:** `maxHours = 60 * 24 * 60 = 86,400` — this is the loop iteration count limit, not days. The actual number of iterations before finding a new moon is ~29.5 * 24 = ~708 iterations (one synodic month in hours). Each iteration calls `SunCalc.getMoonIllumination()`.

- **Accuracy issue:** `suncalc`'s moon phase has a known inaccuracy of approximately +/-6 hours (see GitHub issue #150). For a display clock this is acceptable, but for determining Chinese New Year boundaries (where the exact day matters), this margin of error could shift the result by one day in edge cases.
- **Refinement step:** After finding an approximate new moon, it checks +/- 1 hour to refine. This is a reasonable local optimization but inherits suncalc's base accuracy limits.

#### `getBeats(now)` — Lines 79-87
- **Type:** Pure function
- **Dependency:** None
- **Complexity:** O(1)
- **Extraction difficulty:** Trivial — ideal first module
- **Note:** Uses UTC+1 (BMT = Biel Mean Time) offset of 3,600,000ms. Correct implementation of Swatch Internet Time.

#### `getSolarPercent(now, lat, lon)` — Lines 89-117
- **Type:** Pure function (when lat/lon provided)
- **Dependency:** `suncalc`
- **Complexity:** O(1) with 1-3 `getTimes` calls
- **Fallback behavior:** Returns `'S??'` when lat/lon is null
- **Edge cases:**
  - Polar regions: `suncalc` may return undefined sunrise/sunset times in extreme latitudes. The code handles this with the `!sunrise || !sunset` check.
  - The `getNextSunrise` / `getPreviousSunset` fallback loops search up to 3 days forward/backward.
- **Extraction difficulty:** Low — depends on suncalc and location system

#### `updateClock(userLocation)` — Lines 120-130
- **Type:** Side-effect function (DOM mutation)
- **Dependency:** All calculation functions
- **Pattern:** Calculates all components, formats single-line string, sets DOM textContent
- **Note:** Will need expansion for multi-component display (Phase 5)

#### `convertGregorianToCustom(gregorianString, lat, lon)` — Lines 132-147
- **Type:** Pure function with side effect (console.log)
- **Dependency:** All calculation functions
- **Note:** Duplicates `updateClock` logic — potential DRY target. Phase 4 (Datetime Converters) prerequisite.

#### Geolocation bootstrap — Lines 149-161
- **Type:** Side-effect initialization
- **Pattern:** Standard `navigator.geolocation.getCurrentPosition` with error fallback
- **Update interval:** 864ms (~1 beat granularity)
- **Issue:** Does NOT render immediately on load — waits for geolocation callback. This conflicts with D-09 (clock MUST render immediately). Needs fixing during migration.

### 1.3 Issues Summary

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | No immediate render on load (violates D-09) | High | Must fix during migration |
| 2 | `suncalc` moon phase accuracy +/-6 hours | Medium | Acceptable for display, borderline for Chinese New Year |
| 3 | `getNextNewMoon` hourly stepping (700+ iterations) | Medium | Replaced by astronomia's `moonphase.newMoon()` in migration |
| 4 | Fixed lunar cycle constant (29.53059) vs astronomia's (29.530588861) | Low | Negligible display impact |
| 5 | `marchEquinoxJDE` re-implements astronomia's solstice table | Low | Dead code — astronomia already provides this |
| 6 | `convertGregorianToCustom` duplicates `updateClock` logic | Low | DRY issue |
| 7 | No error handling for invalid dates in `convertGregorianToCustom` | Low | Returns null with console.error only |
| 8 | Webpack config is development-only (no production mode) | Low | Out of scope for Phase 1 |

---

## 2. Chinese Lunisolar Calendar — Technical Domain

### 2.1 How Chinese New Year Is Calculated

The Chinese lunisolar calendar determines the New Year date through these rules:

1. **Winter solstice anchor:** Find the winter solstice (typically December 21-22)
2. **New moon counting:** Chinese New Year falls on the **second new moon after the winter solstice**
3. **Exception:** If there is a leap month between the winter solstice and the first new moon, the first new moon after winter solstice becomes New Year's Day
4. **Alternative rule:** New Year is the new moon closest to 立春 (Lichun, ~February 4) — but only if that new moon occurs after the winter solstice

Both rules produce the same result in most years. The "second new moon after winter solstice" rule is the more commonly implemented approach in software libraries.

**Date range:** Chinese New Year always falls between January 21 and February 20.

### 2.2 Leap Month Rules

- The calendar uses the **19-year Metonic cycle** (7 leap months per cycle)
- A leap month is inserted when a lunar month **lacks a Principal Solar Term (中氣 / Zhongqi)**
- The leap month takes the number of the preceding month (e.g., leap 4th month follows 4th month)
- This keeps lunar months synchronized with the solar year

### 2.3 Accuracy Requirements

- Pre-1645 dates are historically variable (different regions used different observational methods)
- Post-1645 dates are algorithmically calculable with high precision using true solar/lunar positions
- Standard software implementations handle ~4000 BCE to ~8000 CE, but practical accuracy is best for 1900-2100

---

## 3. Library Evaluation

### 3.1 `lunar-javascript` (6tail) — RECOMMENDED

| Attribute | Details |
|-----------|---------|
| **Package** | `lunar-javascript` v1.7.7 |
| **Author** | 6tail |
| **Dependencies** | Zero runtime dependencies |
| **License** | MIT (same as project) |
| **Year range** | 1900-2100 (standard for Chinese calendar libraries) |
| **Last updated** | ~5 months ago (actively maintained) |
| **Bundle size** | ~200KB raw, ~50-70KB minified (estimated — no explicit build step) |
| **Tests** | Jest test suite included |
| **Multi-language** | Also available as `lunar-typescript` for typed usage |

**API highlights:**
```js
const { Solar, Lunar } = require('lunar-javascript');

// Gregorian to Lunar
const solar = Solar.fromYmd(2026, 1, 29);
const lunar = solar.getLunar();
lunar.getYear();    // Chinese lunar year number
lunar.getMonth();   // Month (1-12, negative for leap months, e.g., -2 = leap 2nd month)
lunar.getDay();     // Day of month

// Leap month detection
lunar.getMonth();   // Returns negative for leap months

// Direct Lunar creation
const lunar = Lunar.fromYmd(year, month, day);

// Julian day support
solar.getJulianDay();

// Solar terms (节气)
lunar.getJieQi();   // Get solar term for this date
```

**Pros:**
- Zero dependencies — clean addition to existing stack
- Comprehensive API — covers all Chinese calendar needs (year, month, day, leap months, solar terms)
- Actively maintained with cross-language ports (Java, PHP, Go, C#, Python)
- Includes Julian day conversion (useful for astronomia interop)
- Supports both CommonJS and browser usage

**Cons:**
- Documentation is primarily in Chinese (https://6tail.cn/calendar/api.html)
- No ESM-native export — uses CommonJS (`require()`), but Webpack handles this transparently
- Year range limited to 1900-2100 (sufficient for this project)
- Bundle size is larger than ideal for a single-feature library, but still small compared to framework overhead

**Verdict:** This is the best fit for the Chinese lunisolar calendar requirement. It handles New Year calculation, leap month detection, and month/day numbering out of the box — eliminating the need to implement astronomical calculations from scratch.

### 3.2 `chinese-lunar` (oljc) — Alternative (lightweight)

| Attribute | Details |
|-----------|---------|
| **Package** | `chinese-lunar` |
| **Bundle size** | ~3KB minified |
| **Scope** | Date conversion only |
| **Status** | Minimal maintenance |

**Pros:** Extremely lightweight, simple API
**Cons:** Very limited feature set, less actively maintained, no solar term support

**Verdict:** Too minimal for this project's needs. `lunar-javascript` is the better choice despite larger size.

### 3.3 `suncalc` (mourner) — Keep for solar, replace for lunar

| Attribute | Details |
|-----------|---------|
| **Package** | `suncalc` v1.9.0 |
| **Purpose** | Sunrise/sunset times, moon illumination fraction |
| **Known issues** | Moon phase accuracy +/-6 hours (GitHub #150); does not account for delta-T |
| **Maintenance** | Sporadic — issues accumulate without resolution |
| **Bundle size** | ~6KB minified |

**Pros:** Tiny, well-known, sufficient for sunrise/sunset (solar percent calculation)
**Cons:** Moon phase calculations are not precise enough for Chinese New Year determination; the library's equations have known accuracy limitations

**Verdict:** Keep `suncalc` for solar calculations (sunrise/sunset for solar percent) — its ~1-minute accuracy for sun times is adequate. Do NOT use it for precise lunar phase determination; replace with `astronomia/moonphase` or `lunar-javascript`.

### 3.4 `suncalc2` (andiling) — Not needed

| Attribute | Details |
|-----------|---------|
| **Package** | `suncalc2` |
| **Improvements** | Added `getMoonTimes()`, `nadir`, `parallacticAngle`, performance improvements |
| **Moon accuracy** | Same underlying formulas as suncalc — no improvement in phase accuracy |

**Verdict:** Does not solve the moon phase accuracy problem. Not worth migrating to.

### 3.5 `astronomia` (commenthol) — Keep, use more of it

| Attribute | Details |
|-----------|---------|
| **Package** | `astronomia` v4.1.1 |
| **Type** | ESM-native (`"type": "module"`) |
| **Modules** | 50+ submodules including `moonphase`, `solstice`, `solar`, `julian`, `moon`, `rise` |
| **Accuracy** | Based on Jean Meeus's "Astronomical Algorithms" — industry standard |
| **Bundle size** | Full library ~1.5MB (mostly VSOP87 planetary data); individual modules are small |

**Key modules relevant to this project:**

| Module | Purpose | Currently used? |
|--------|---------|----------------|
| `astronomia/solar` | True solar longitude, mean anomaly | Yes (imported but only `trueLongitude` available) |
| `astronomia/julian` | Julian Day conversions, JDEToDate | Yes (used in `getSpringEquinox`) |
| `astronomia/solstice` | Equinox/solstice calculations (table 27.a/b) | No — but code re-implements this |
| `astronomia/moonphase` | Precise new moon, full moon, quarter moon JDE | No — critical gap |
| `astronomia/moon` | Moon position calculations | No |
| `astronomia/rise` | Rise/set calculations for any body | No — could replace suncalc for sun |
| `astronomia/sunrise` | Sunrise/sunset | No — could replace suncalc |

**The `moonphase.newMoon(year)` function:**
- Returns the Julian Day Ephemeris (JDE) of the true new moon nearest the given year
- Accuracy: within seconds (vs suncalc's +/-6 hours)
- Based on Meeus Chapter 49 with full periodic term corrections
- **This should replace the `getNextNewMoon` hourly stepping function entirely**

**Recommendation:** The project already depends on `astronomia` but only uses `solar` and `julian` modules. The `moonphase` module alone can replace the entire `getNextNewMoon` function with a single O(1) call. For Chinese New Year, use `astronomia/moonphase` to find precise new moon dates, then feed those into `lunar-javascript` for calendar interpretation.

---

## 4. Recommended Library Strategy

### Current dependencies
- `suncalc` — sunrise/sunset, moon illumination (keep for sun, drop for moon)
- `astronomia` — Julian dates, equinox (keep, expand usage)

### Proposed dependencies
- **Add:** `lunar-javascript` — Chinese lunisolar calendar calculations
- **Keep:** `suncalc` — sunrise/sunset for solar percent (adequate accuracy, tiny footprint)
- **Keep:** `astronomia` — use `moonphase.newMoon()` for precise new moon JDE, `solstice` for equinox/solstice

### Migration impact
- `lunar-javascript` is CommonJS — Webpack handles this transparently, no config changes needed
- No dependency conflicts — all three libraries are independent
- Bundle size increase: ~50-70KB minified for `lunar-javascript` (acceptable given project constraints)

---

## 5. Modular ES Module Architecture Pattern

### 5.1 Recommended File Structure

```
src/
├── index.js                    # Entry point + DOM update + geolocation bootstrap
├── styles.css
├── template.html
└── chronometers/
    ├── holocene.js             # getHoloceneYear(date) -> number
    ├── beats.js                # getBeats(date) -> string
    ├── solar.js                # getSolarPercent(date, lat, lon) -> string
    ├── lunisolar.js            # getLunisolarDate(date) -> { year, month, day, isLeap }
    ├── oldSystem.js            # getOldSystem(date, lat, lon) -> { lunation, daysSinceEquinox }
    └── index.js                # Composer — imports and calls all chronometers
```

### 5.2 Module Contract (JSDoc)

Each chronometer module follows this pattern:

```js
/**
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude for location-dependent calculations
 * @param {number} [opts.longitude] - Longitude for location-dependent calculations
 * @returns {object|string|number} Result specific to this chronometer
 */
export function compute(date, opts) { ... }
```

### 5.3 Composer Pattern

The composer (`chronometers/index.js`) is a simple aggregator:

```js
import { compute as holocene } from './holocene.js';
import { compute as beats } from './beats.js';
import { compute as solar } from './solar.js';
import { compute as lunisolar } from './lunisolar.js';

export function compose(date, opts) {
  return {
    holocene: holocene(date, opts),
    beats: beats(date, opts),
    solar: solar(date, opts),
    lunisolar: lunisolar(date, opts),
  };
}
```

**Why this works well:**
- Zero runtime overhead — just function calls
- Each module is independently testable
- No plugin registry complexity — imports are explicit
- Adding a new chronometer = add file + import in composer
- Matches D-12 and D-13 exactly

### 5.4 Migration Order (per D-22)

1. **Holocene year** — zero dependencies, pure `Date` operation
2. **Beats** — zero dependencies, pure `Date` operation
3. **Solar percent** — depends on suncalc + location, but isolated
4. **Lunisolar date** — depends on `lunar-javascript`, the new module
5. **Old system** — existing lunation + equinox logic, preserved but hidden

After each extraction:
- Remove the function from `src/index.js`
- Import from the new module
- Verify the clock still renders correctly
- Commit atomically

---

## 6. Performance Considerations

### 6.1 Current Update Interval

The clock updates every **864ms** (approximately 1 beat = 86.4 seconds / 100 = 0.864 seconds). This is a deliberate choice to update at beat granularity.

**Impact of adding modules:**
- Each chronometer is O(1) except lunisolar (library lookup, still O(1))
- Total calculation time: <1ms per update
- No performance concern — the DOM update dominates

### 6.2 `getNextNewMoon` Replacement

Current: ~708 iterations x `suncalc.getMoonIllumination()` per call = expensive
Proposed: `astronomia/moonphase.newMoon(year)` = single call, O(1)

**Improvement:** 3-4 orders of magnitude faster for new moon calculation. However, this only runs once per clock update (not every 864ms), so the practical impact is minimal. The real benefit is accuracy and code simplicity.

### 6.3 `lunar-javascript` Bundle Impact

- Raw: ~200KB
- Minified: ~50-70KB
- Gzipped: ~15-20KB
- Load time impact: negligible on broadband, ~100-200ms on 3G

**Tree-shaking note:** `lunar-javascript` is CommonJS and not tree-shakeable by Webpack. The entire library will be bundled. This is acceptable for the project's performance constraints.

---

## 7. Edge Cases and Gotchas

### 7.1 Chinese Calendar Edge Cases

| Edge Case | Description | Handling |
|-----------|-------------|----------|
| **Leap month display** | D-04: Display as `MX` not numbered month | `lunar-javascript` returns negative month number for leap months — check `month < 0` |
| **Year boundary** | Chinese New Year falls on different Gregorian dates each year | `lunar-javascript` handles this internally |
| **Pre-1900 dates** | Outside library's calculation range | Not a practical concern — the clock displays current time |
| **Historical calendar reforms** | 1645 Shixian calendar changed from mean to true positions | `lunar-javascript` uses modern algorithmic rules — consistent for 1900-2100 |

### 7.2 Astronomical Edge Cases

| Edge Case | Description | Handling |
|-----------|-------------|----------|
| **Polar sunrise/sunset** | Above Arctic Circle, sun may not rise/set for months | `suncalc` returns `undefined` — current code returns `'S??'` |
| **Equinox timing** | March equinox can fall on March 19, 20, or 21 UTC | `astronomia/solstice` handles this precisely |
| **New moon near midnight UTC** | +/-6 hour suncalc error could shift the day | Use `astronomia/moonphase` for sub-second accuracy |

### 7.3 Geolocation Edge Cases

| Edge Case | Description | Current Handling | Required |
|-----------|-------------|-----------------|----------|
| **Permission denied** | User blocks geolocation | Falls back to `null`, solar shows `'S??'` | Keep |
| **Timeout** | GPS takes too long | Falls back to error handler | Keep |
| **No immediate render** | Waits for geolocation before first render | **BUG** — must fix per D-09 | Render immediately with `null` location, then re-render when location resolves |

### 7.4 Migration Gotchas

1. **Do not change output format during extraction** — the display string must remain byte-for-byte identical after each module extraction
2. **The 23:00 UTC equinox anchor** — this quirk exists for a reason (likely alignment with beat clock's UTC+1 bias). When replacing equinox with Chinese New Year, decide explicitly whether to keep a similar anchor
3. **`convertGregorianToCustom` must stay functional** during migration — it's the Phase 4 prerequisite
4. **CommonJS interop** — `lunar-javascript` uses `module.exports`, while the project uses ESM imports. Webpack handles this, but be aware that `import { Solar } from 'lunar-javascript'` works through Webpack's CJS interop layer

---

## 8. Chinese New Year Calculation — Recommended Approach

Given the research, here is the recommended implementation strategy for Chinese New Year / lunisolar month calculation:

### Option A: Use `lunar-javascript` exclusively (RECOMMENDED)

```js
import { Solar } from 'lunar-javascript';

function getLunisolarDate(date) {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  return {
    year: lunar.getYear(),        // Chinese lunar year
    month: Math.abs(lunar.getMonth()), // Month number (1-12)
    day: lunar.getDay(),          // Day of month
    isLeap: lunar.getMonth() < 0  // Negative = leap month
  };
}
```

**Why this wins:**
- One library call replaces all the equinox + new moon + month counting logic
- Handles leap months, year boundaries, and edge cases internally
- Already includes Julian day conversion if needed for interop with astronomia
- Zero custom astronomical code to maintain

### Option B: Use `astronomia/moonphase` + custom Chinese calendar logic

Find new moons with astronomia, then implement Chinese calendar rules manually (second new moon after winter solstice, leap month detection via solar terms).

**Why this loses:**
- Re-invents what `lunar-javascript` already does
- Requires implementing solar term detection, leap month rules, and month numbering
- More code to maintain, more edge cases to handle

### Option C: Hybrid — `astronomia/moonphase` for precision, `lunar-javascript` for interpretation

Use astronomia to find precise new moon JDE, then validate against `lunar-javascript`.

**Why this is overkill:**
- `lunar-javascript` is already accurate to the day for 1900-2100
- The display doesn't need sub-day precision
- Adds complexity without user-visible benefit

---

## 9. Holocene Year Ticking on Chinese New Year (D-03)

**Decision D-03 states:** "Holocene year number is retained but ticks on Chinese New Year instead of Spring Equinox"

**Implementation implication:**
- Current: `getHoloceneYear(date) = date.getUTCFullYear() + 9700` (ticks on Jan 1)
- New: Holocene year increments on Chinese New Year, not Jan 1
- Between Jan 1 and Chinese New Year, the Holocene year is still the previous year

**Example:** If Chinese New Year 2027 falls on February 6:
- January 1-5, 2027 → Holocene year is still 12026 (not 12027)
- February 6, 2027 onwards → Holocene year becomes 12027

**This requires:** The Holocene module needs access to Chinese New Year dates, creating a dependency from `holocene.js` → `lunisolar.js` (or a shared Chinese New Year lookup function). **This is the one coupling between modules that D-12's independence goal needs to account for.**

**Recommendation:** Create a shared `chineseNewYear.js` utility that both `holocene.js` and `lunisolar.js` can import, keeping them independent of each other.

---

## 10. Summary of Recommendations

| Decision | Recommendation |
|----------|---------------|
| Chinese calendar library | `lunar-javascript` (6tail) — zero deps, comprehensive, actively maintained |
| Moon phase precision | Replace `getNextNewMoon` with `astronomia/moonphase.newMoon()` |
| Solar calculations | Keep `suncalc` — adequate accuracy, tiny footprint |
| Module pattern | Pure function ES modules with `compute(date, opts)` signature |
| Composer | Simple aggregator in `chronometers/index.js` |
| Migration order | Holocene → Beats → Solar → Lunisolar → Old System |
| Bundle size concern | Acceptable — `lunar-javascript` adds ~15-20KB gzipped |
| Immediate render fix | Render with `null` location on load, update when geolocation resolves |
| Holocene Chinese New Year coupling | Extract Chinese New Year lookup into shared utility module |

---

## RESEARCH COMPLETE
