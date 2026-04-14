# Plan 01: Core Chronometer Modules

**Phase:** 9
**Wave:** 1
**depends_on:** []
**files_modified:** src/chronometers/solarLongitude.js, src/chronometers/lunarPhase.js, src/chronometers/solarTime.js, tests/pure/solarLongitude.test.js, tests/pure/lunarPhase.test.js, tests/pure/solarTime.test.js
**autonomous:** true
**requirements:** DATE-03, SOLTIME-01, SOLTIME-02, SOLTIME-03

---

## Objective

Create three computation modules: solar longitude, lunar phase angle, and solar time. Each is an independent pure function with its own test file.

---

### Task 01-01: Solar Longitude Module

**files_modified:** src/chronometers/solarLongitude.js

<read_first>
- src/chronometers/solar.js — existing chronometer pattern for reference
- src/chronometers/index.js — composer pattern (import/export style)
- .planning/phases/09-new-chronometry-modules/9-CONTEXT.md — decisions D-01 through D-03
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — astronomia API reference for solar.apparentLongitude(T), Date→JDE→T pipeline
</read_first>

<action>
Create `src/chronometers/solarLongitude.js` that exports `compute(date, opts)`.

Implementation:
1. Extract `latitude` and `longitude` from `opts`. If either is null/undefined, return `'SL??'`.
2. Convert JS Date to Julian century T:
   ```js
   import { solar, base, julian } from 'astronomia';
   const jde = julian.DateToJD(date);
   const T = base.J2000Century(jde);
   ```
3. Compute apparent solar longitude in radians: `const lonRad = solar.apparentLongitude(T);`
4. Convert to degrees: `const lonDeg = (lonRad * 180 / Math.PI) % 360;`
   Note: `solar.apparentLongitude(T)` already returns a normalized 0-2π value, so the degrees conversion is straightforward. If negative result from modulo, add 360.
5. Return as integer string: `SL${Math.round(lonDeg).toString().padStart(3, '0')}` (e.g., `SL000`, `SL090`, `SL180`, `SL270`).
</action>

<acceptance_criteria>
- File `src/chronometers/solarLongitude.js` exists
- Exports `compute` function with signature `compute(date, opts = {})`
- Imports `solar`, `base`, `julian` from 'astronomia'
- Returns `'SL??'` when opts.latitude or opts.longitude is null/undefined
- Returns string matching pattern `^SL\d{3}$` for valid coordinates
- Returns `SL000` (±1°) for vernal equinox date (2026-03-20)
- Returns `SL090` (±1°) for summer solstice date (2026-06-21)
</acceptance_criteria>

---

### Task 01-02: Solar Longitude Tests

**files_modified:** tests/pure/solarLongitude.test.js

<read_first>
- tests/pure/solar.test.js — existing test pattern
- tests/pure/holocene.test.js — test structure reference
- src/chronometers/solarLongitude.js — module being tested (from Task 01-01)
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — verified test data values
</read_first>

<action>
Create `tests/pure/solarLongitude.test.js` with these test cases:

1. `'returns SL?? when lat/lon are null'` — opts = {} → 'SL??'
2. `'returns SL?? when lat/lon are undefined'` — compute(date) → 'SL??'
3. `'returns ~0° at vernal equinox 2026'` — Date.UTC(2026, 2, 20, 15, 0, 0) → starts with 'SL00' (equinox at ~14:46 UTC, test at 15:00)
4. `'returns ~90° at summer solstice 2026'` — Date.UTC(2026, 5, 21, 18, 0, 0) → starts with 'SL09' (solstice at ~14:00 UTC, 18:00 gives ~90.04°)
5. `'returns ~180° at autumnal equinox 2026'` — Date.UTC(2026, 8, 23, 0, 0, 0) → starts with 'SL18' (equinox at ~18:00 UTC on Sept 22, test at midnight after)
6. `'returns ~270° at winter solstice 2026'` — Date.UTC(2026, 11, 21, 21, 0, 0) → starts with 'SL27' (solstice at ~20:50 UTC, test at 21:00)
7. `'returns valid string for arbitrary date and location'` — any date + { latitude: 40.7, longitude: -74.0 } → matches /^SL\d{3}$/
</action>

<acceptance_criteria>
- File `tests/pure/solarLongitude.test.js` exists
- Uses `// @vitest-environment node` pragma
- Imports `{ describe, it, expect }` from 'vitest'
- Imports `{ compute }` from '../../src/chronometers/solarLongitude.js'
- Contains at least 7 test cases
- All tests pass: `npx vitest run tests/pure/solarLongitude.test.js` exits 0
</acceptance_criteria>

---

### Task 01-03: Lunar Phase Angle Module

**files_modified:** src/chronometers/lunarPhase.js

<read_first>
- src/chronometers/solar.js — existing chronometer pattern
- src/chronometers/solarLongitude.js — new module using same astronomia pipeline (from Task 01-01)
- .planning/phases/09-new-chronometry-modules/9-CONTEXT.md — decisions D-04 through D-06
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — moonposition API, phase angle computation
</read_first>

<action>
Create `src/chronometers/lunarPhase.js` that exports `compute(date, opts)`.

Implementation:
1. Extract `latitude` and `longitude` from `opts`. If either is null/undefined, return `'LP??'`.
2. Convert JS Date to JDE:
   ```js
   import { moonposition, solar, base, julian } from 'astronomia';
   const jde = julian.DateToJD(date);
   ```
3. Get lunar ecliptic longitude: `const moonPos = moonposition.position(jde);` (returns object with `.lon` in radians)
4. Get solar apparent longitude: `const sunLon = solar.apparentLongitude(base.J2000Century(jde));` (returns radians)
5. Compute phase angle: `let phaseDeg = ((moonPos.lon - sunLon) * 180 / Math.PI) % 360;`
6. Normalize to 0-360: if negative, add 360.
7. Return as integer string: `LP${Math.round(phaseDeg).toString().padStart(3, '0')}` (e.g., `LP000` = new moon, `LP180` = full moon).
</action>

<acceptance_criteria>
- File `src/chronometers/lunarPhase.js` exists
- Exports `compute` function with signature `compute(date, opts = {})`
- Imports `moonposition`, `solar`, `base`, `julian` from 'astronomia'
- Returns `'LP??'` when opts.latitude or opts.longitude is null/undefined
- Returns string matching pattern `^LP\d{3}$` for valid coordinates
- Returns `LP000` (±5°) for known new moon date (2026-01-18)
- Returns `LP180` (±5°) for known full moon date (2026-02-01)
</acceptance_criteria>

---

### Task 01-04: Lunar Phase Tests

**files_modified:** tests/pure/lunarPhase.test.js

<read_first>
- tests/pure/solarLongitude.test.js — test pattern from Task 01-02
- src/chronometers/lunarPhase.js — module being tested (from Task 01-03)
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — verified new moon / full moon dates
</read_first>

<action>
Create `tests/pure/lunarPhase.test.js` with these test cases:

1. `'returns LP?? when lat/lon are null'` — opts = {} → 'LP??'
2. `'returns LP?? when lat/lon are undefined'` — compute(date) → 'LP??'
3. `'returns ~0° at new moon Jan 2026'` — Date.UTC(2026, 0, 18, 20, 0, 0) → starts with 'LP00' (new moon at ~19:52 UTC, test at 20:00)
4. `'returns ~180° at full moon Feb 2026'` — Date.UTC(2026, 1, 1, 22, 30, 0) → starts with 'LP18' (full moon at ~22:09 UTC, test at 22:30)
5. `'returns ~0° at new moon Feb 2026'` — Date.UTC(2026, 1, 17, 12, 30, 0) → starts with 'LP00' (new moon at ~12:01 UTC, test at 12:30)
6. `'returns ~180° at full moon Mar 2026'` — Date.UTC(2026, 2, 3, 12, 0, 0) → starts with 'LP18' (full moon at ~11:37 UTC, test at 12:00)
7. `'returns valid string for arbitrary date and location'` — any date + { latitude: 40.7, longitude: -74.0 } → matches /^LP\d{3}$/
</action>

<acceptance_criteria>
- File `tests/pure/lunarPhase.test.js` exists
- Uses `// @vitest-environment node` pragma
- Imports `{ describe, it, expect }` from 'vitest'
- Imports `{ compute }` from '../../src/chronometers/lunarPhase.js'
- Contains at least 7 test cases
- All tests pass: `npx vitest run tests/pure/lunarPhase.test.js` exits 0
</acceptance_criteria>

---

### Task 01-05: Solar Time Module

**files_modified:** src/chronometers/solarTime.js

<read_first>
- src/chronometers/solar.js — existing chronometer pattern
- src/chronometers/index.js — composer pattern
- .planning/phases/09-new-chronometry-modules/9-CONTEXT.md — decisions D-07, D-08
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — eqtime.eSmart() API, conversion to minutes
</read_first>

<action>
Create `src/chronometers/solarTime.js` that exports `compute(date, opts)`.

Implementation:
1. Extract `latitude` and `longitude` from `opts`. If either is null/undefined, return `'ST??'`.
2. Convert JS Date to JDE:
   ```js
   import { eqtime, base, julian } from 'astronomia';
   const jde = julian.DateToJD(date);
   const T = base.J2000Century(jde);
   ```
3. Compute equation of time in radians: `const eotRad = eqtime.eSmart(jde);`
4. Convert to minutes: `const eotMin = eotRad * 720 / Math.PI;` (positive = sun is fast, negative = sun is slow)
5. Get local mean time offset from longitude: `const lonOffsetMin = opts.longitude * 4;` (1° = 4 minutes)
6. Compute total solar offset: `const totalOffsetMin = lonOffsetMin + eotMin;`
7. Return as formatted string: include both components and total. Format: `ST{sign}{HH}:{MM}` where the time is local solar time (UTC time + totalOffsetMin).
   - Compute: `const solarMinutes = date.getUTCMinutes() + date.getUTCHours() * 60 + totalOffsetMin;`
   - Normalize: `const normalized = ((solarMinutes % 1440) + 1440) % 1440;`
   - Hours: `Math.floor(normalized / 60)`, Minutes: `Math.round(normalized % 60)`
   - Return: `ST${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
</action>

<acceptance_criteria>
- File `src/chronometers/solarTime.js` exists
- Exports `compute` function with signature `compute(date, opts = {})`
- Imports `eqtime`, `base`, `julian` from 'astronomia'
- Returns `'ST??'` when opts.latitude or opts.longitude is null/undefined
- Returns string matching pattern `^ST\d{2}:\d{2}$` for valid coordinates
- Equation of time value near Feb 11 is approximately -14 minutes (sun slow)
- Equation of time value near Nov 3 is approximately +16 minutes (sun fast)
- Solar time differs from UTC time by longitude offset + EOT
</acceptance_criteria>

---

### Task 01-06: Solar Time Tests

**files_modified:** tests/pure/solarTime.test.js

<read_first>
- tests/pure/solarLongitude.test.js — test pattern
- src/chronometers/solarTime.js — module being tested (from Task 01-05)
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — equation of time test data
</read_first>

<action>
Create `tests/pure/solarTime.test.js` with these test cases:

1. `'returns ST?? when lat/lon are null'` — opts = {} → 'ST??'
2. `'returns ST?? when lat/lon are undefined'` — compute(date) → 'ST??'
3. `'returns valid time string at UTC on equinox'` — Date.UTC(2026, 2, 20, 12, 0, 0) + { latitude: 51.5, longitude: 0 } → matches /^ST\d{2}:\d{2}$/
4. `'EOT ~-14min on Feb 11'` — compute solar time at longitude=0 on Feb 11 at noon UTC. Independently compute expected value: at longitude 0, solar time = UTC + EOT. Verify the returned time differs from UTC by approximately -14 minutes (use astronomia in test to compute expected EOT independently).
5. `'EOT ~+16min on Nov 3'` — same approach: compute at longitude=0, noon UTC, verify offset is approximately +16 minutes.
6. `'returns different time for different longitude'` — same UTC time, different longitude → different ST result
7. `'handles midnight crossing correctly'` — UTC 23:50 with large positive offset → wraps to next day
</action>

<acceptance_criteria>
- File `tests/pure/solarTime.test.js` exists
- Uses `// @vitest-environment node` pragma
- Imports `{ describe, it, expect }` from 'vitest'
- Imports `{ compute }` from '../../src/chronometers/solarTime.js'
- Contains at least 7 test cases
- All tests pass: `npx vitest run tests/pure/solarTime.test.js` exits 0
</acceptance_criteria>

---

## must_haves

1. Solar longitude uses `solar.apparentLongitude(T)` (not VSOP87)
2. Lunar phase = lunar ecliptic longitude minus solar apparent longitude (both from astronomia)
3. Solar time includes equation of time correction via `eqtime.eSmart(jde)`
4. All modules return fallback strings (`'SL??'`, `'LP??'`, `'ST??'`) for missing opts
5. All modules are pure functions with no side effects

## Verification

Run: `npx vitest run tests/pure/solarLongitude.test.js tests/pure/lunarPhase.test.js tests/pure/solarTime.test.js`
Expected: All tests pass, 0 failures.

---

*Plan 01 for Phase 9: New Chronometry Modules*
*Created: 2026-04-14*
