---
wave: 1
depends_on: Phase 1 (ARCHITECTURE.md)
files_modified:
  - src/chronometers/index.js (new — composer)
  - src/chronometers/chineseNewYear.js (new — shared utility)
  - src/chronometers/holocene.js (new)
  - src/chronometers/beats.js (new)
  - src/chronometers/solar.js (new)
  - src/chronometers/lunisolar.js (new)
  - src/chronometers/oldSystem.js (new)
  - src/index.js (refactored — DOM + geolocation only)
  - package.json (add lunar-javascript, vitest, jsdom)
  - vitest.config.js (new)
  - tests/pure/holocene.test.js (new)
  - tests/pure/beats.test.js (new)
  - tests/pure/solar.test.js (new)
  - tests/pure/lunisolar.test.js (new)
  - tests/pure/oldSystem.test.js (new)
  - tests/integration/composer.test.js (new)
autonomous: true
---

# Phase 2 Plan: Modular Chronometry Core

**Phase ID:** 02
**Requirements:** REFACTOR-01, REFACTOR-02, REFACTOR-03
**Goal:** Extract each clock component into independent ES modules under `src/chronometers/`, implement composer/registry pattern, add `lunar-javascript` dependency, write unit + integration tests with Vitest, transition display format from `H{year} L{lunation}.{pct} D{days} @{beats} {solar}` to `H{year} M{month} D{day} @{beats} {solar}`.

## Must Haves (goal-backward verification)

1. `src/chronometers/` directory exists with at least 5 module files: `holocene.js`, `beats.js`, `solar.js`, `lunisolar.js`, `oldSystem.js`
2. `src/chronometers/index.js` exports a `compose(date, opts)` function that calls each module's `compute(date, opts)`
3. Each module exports a `compute(date, opts)` function following the uniform contract from ARCHITECTURE.md
4. `src/index.js` reduced to DOM update + geolocation bootstrap only — no business logic (no calculation functions defined inline)
5. Display output format is `H{holoceneYear} M{month} D{day} @{beats} {solar}` (NOT the old `L{lunation}.{pct} D{days}` format)
6. `lunar-javascript` installed and imported in at least one chronometer module
7. Vitest tests pass with `npm test` — at least one test file per chronometer module
8. Immediate render on page load (D-09) — `updateClock(null)` called before geolocation resolves
9. Per-module error handling (D-26) — composer wraps each `compute()` in try/catch, returns fallback on error
10. REFACTOR-01: Each clock element is an independent module in `src/chronometers/`
11. REFACTOR-02: Composer structure allows adding/removing modules with one import line change (hard-coded imports, designed for future config-driven conversion)
12. REFACTOR-03: Clean file structure — `src/chronometers/` directory with one file per time system, entry point handles DOM/geolocation only

## Execution Strategy

Sequential tasks within Wave 1 — each extraction builds on the previous, and the entry point refactor depends on all modules existing. Order follows ARCHITECTURE.md migration plan: holocene (simplest) -> beats -> solar -> lunisolar -> oldSystem -> composer -> entry point -> tests.

---

## Task 1: Add dependencies and test infrastructure

<read_first>
- package.json (current dependencies and scripts)
- webpack.config.js (build configuration)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (Vitest setup section, lunar-javascript import patterns)
</read_first>

Install `lunar-javascript` (already in package.json per current state), `vitest`, and `jsdom` as dev dependencies. Create `vitest.config.js` with jsdom environment, CSS disabled, and test file patterns. Add `npm test` and `npm run test:watch` scripts to package.json.

<acceptance_criteria>
- package.json contains "vitest" and "jsdom" in devDependencies
- package.json has "test": "vitest run" and "test:watch": "vitest" in scripts
- vitest.config.js exists at project root with test.environment = 'jsdom', css: false, and globals: true
- `npm test` runs without errors (even with zero tests, vitest should exit 0 or report "No test files found" gracefully)
</acceptance_criteria>

---

## Task 2: Extract holocene chronometer

<read_first>
- src/index.js (getHoloceneYear function, lines 6-8)
- .planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md (module contract, holocene.js design)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (Holocene year test cases, Chinese New Year ticking logic D-03)
- .planning/phases/02-modular-chronometry-core/02-CONTEXT.md (D-03: Holocene ticks on Chinese New Year)
</read_first>

Create `src/chronometers/chineseNewYear.js` shared utility with `getChineseNewYear(year)` using `lunar-javascript`'s `Lunar.fromYmd(year, 1, 1).getSolar()`. Create `src/chronometers/holocene.js` with `compute(date, opts)` that returns Holocene year (gregorianYear + 9700), ticking on Chinese New Year per D-03: if the date is before Chinese New Year of its Gregorian year, use previous year + 9700.

<acceptance_criteria>
- src/chronometers/chineseNewYear.js exists and exports getChineseNewYear(year) function
- src/chronometers/chineseNewYear.js imports Lunar from 'lunar-javascript'
- src/chronometers/holocene.js exists and exports compute(date, opts) function
- compute(date, opts) returns a number (gregorianYear + 9700)
- For dates before Chinese New Year 2026 (before 2026-02-17), holocene year = 2025 + 9700 = 11725
- For dates on or after Chinese New Year 2026 (on/after 2026-02-17), holocene year = 2026 + 9700 = 11726
- getChineseNewYear(2026).toYmd() === '2026-02-17'
</acceptance_criteria>

---

## Task 3: Extract beats chronometer

<read_first>
- src/index.js (getBeats function, lines 79-87)
- .planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md (module contract, beats.js design)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (Beat time reference test cases)
</read_first>

Create `src/chronometers/beats.js` with `compute(date, opts)` that returns Swatch Internet Time string. Logic is identical to current `getBeats()` — pure function, no dependencies. Format: `@{beats}` where beats = (UTC ms of day + 1 hour BMT offset) % 86400000 / 86400, formatted as `@XXX.XX` padded to 6 chars.

<acceptance_criteria>
- src/chronometers/beats.js exists and exports compute(date, opts) function
- compute(date, opts) returns a string starting with '@'
- At 23:00:00 UTC (previous day), compute returns '@000.00'
- At 11:00:00 UTC, compute returns '@500.00'
- At 00:00:00 UTC, compute returns '@041.67'
- At 22:59:59 UTC, compute returns '@999.99'
- Function does not import any external library (pure Date math only)
</acceptance_criteria>

---

## Task 4: Extract solar chronometer

<read_first>
- src/index.js (getSolarPercent, getNextSunrise, getPreviousSunset functions, lines 89-127)
- .planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md (module contract, solar.js design)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (Solar percent edge cases)
</read_first>

Create `src/chronometers/solar.js` with `compute(date, opts)` that returns solar percent string. Requires `opts.latitude` and `opts.longitude`. Uses `suncalc` for sunrise/sunset. Returns `'S??'` when lat/lon unavailable or sunrise/sunset undefined (polar regions). Returns `'S{percent}'` during daytime, `'N{percent}'` during nighttime. Preserve the existing getNextSunrise/getPreviousSunset fallback loops (search up to 3 days).

<acceptance_criteria>
- src/chronometers/solar.js exists and exports compute(date, opts) function
- compute(date, opts) with lat=null, lon=null returns exactly 'S??'
- compute(date, opts) with lat=40.7, lon=-74.0 (New York) returns string starting with 'S' or 'N' followed by 2 digits
- compute returns 'S??' when suncalc.getTimes returns undefined sunrise/sunset (polar test: lat=78.0, lon=16.0 in December)
- Function imports SunCalc from 'suncalc'
- Function signature: compute(date, opts) where opts has optional latitude and longitude properties
</acceptance_criteria>

---

## Task 5: Extract lunisolar chronometer

<read_first>
- src/index.js (getLunationSinceEquinox, getNextNewMoon functions — being REPLACED, not migrated)
- .planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md (module contract, lunisolar.js design)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (lunar-javascript API, leap month detection, import patterns, gotchas)
- .planning/phases/02-modular-chronometry-core/02-CONTEXT.md (D-04: leap month display format, D-24: display format)
</read_first>

Create `src/chronometers/lunisolar.js` with `compute(date, opts)` that returns `{ month, day, isLeap }` using `lunar-javascript`. Use `Solar.fromDate(date).getLunar()` to get lunar date. Month = absolute value of `lunar.getMonth()` (negative = leap month). Day = `lunar.getDay()`. isLeap = `lunar.getMonth() < 0`. This module REPLACES the old `getLunationSinceEquinox` + `getNextNewMoon` approach entirely.

<acceptance_criteria>
- src/chronometers/lunisolar.js exists and exports compute(date, opts) function
- compute imports { Solar } from 'lunar-javascript'
- For date 2026-02-17 (Chinese New Year 2026), compute returns month=1, day=1, isLeap=false
- For date 2025-08-01 (leap 6th month), compute returns month=6, day=1, isLeap=true
- compute returns an object with numeric month, numeric day, and boolean isLeap properties
- For date 2026-03-20 (spring equinox 2026), compute returns valid month (2 or 3 depending on lunar calendar) and day
</acceptance_criteria>

---

## Task 6: Extract oldSystem chronometer (preserved but hidden)

<read_first>
- src/index.js (getDaysSinceEquinox, getLunationSinceEquinox, getSpringEquinox, marchEquinoxJDE, getNextNewMoon — all old system functions)
- .planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md (oldSystem.js design — preserved but NOT imported by composer)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (astronomia v4 APIs for replacing polynomial equinox)
</read_first>

Create `src/chronometers/oldSystem.js` with `compute(date, opts)` that preserves the old lunation + days-since-equinox logic. Replace `marchEquinoxJDE` polynomial with `astronomia/solstice.march(year)` and `getNextNewMoon` hourly stepping with `astronomia/moonphase.newMoon()` iteration (per RESEARCH.md). Returns `{ lunation, percent, daysSinceEquinox }`. This module is NOT imported by the composer — it exists for reference and future swappable systems.

<acceptance_criteria>
- src/chronometers/oldSystem.js exists and exports compute(date, opts) function
- oldSystem.js imports from 'astronomia' (solstice and/or moonphase and/or julian)
- oldSystem.js does NOT define marchEquinoxJDE polynomial (uses astronomia/solstice instead)
- oldSystem.js does NOT use hourly stepping for new moon (uses astronomia/moonphase instead)
- compute returns an object with lunation (number), percent (string), and daysSinceEquinox (number) properties
- oldSystem.js is NOT imported in src/chronometers/index.js (the composer)
</acceptance_criteria>

---

## Task 7: Create composer

<read_first>
- .planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md (Composer Pattern section, exact import structure)
- .planning/phases/02-modular-chronometry-core/02-CONTEXT.md (D-26: error handling, D-28: simple hard-coded imports, D-29: composer structure)
- src/chronometers/holocene.js, src/chronometers/beats.js, src/chronometers/solar.js, src/chronometers/lunisolar.js (created in previous tasks)
</read_first>

Create `src/chronometers/index.js` as the composer. Import holocene, beats, solar, lunisolar compute functions directly (D-28: hard-coded imports). Export `compose(date, opts)` function that returns object with keyed properties. Wrap each `compute()` call in try/catch (D-26): on error, log `console.warn(moduleName, error)` and return `'??'` for that key. Do NOT import oldSystem.

<acceptance_criteria>
- src/chronometers/index.js exists and exports compose(date, opts) function
- composer imports compute from './holocene.js', './beats.js', './solar.js', './lunisolar.js' (4 modules)
- composer does NOT import from './oldSystem.js'
- compose returns object with keys: holocene, beats, solar, lunisolar
- Each module call is wrapped in try/catch that returns '??' on error
- Error path logs console.warn with module name and error
</acceptance_criteria>

---

## Task 8: Refactor entry point

<read_first>
- src/index.js (full current file — all logic to be removed except DOM + geolocation)
- src/chronometers/index.js (composer, created in Task 7)
- .planning/phases/02-modular-chronometry-core/02-CONTEXT.md (D-09: immediate render, D-10: S?? fallback, D-24: display format string)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (Holocene year test cases, Beat time reference)
</read_first>

Replace `src/index.js` entirely. Remove ALL calculation functions (getHoloceneYear, marchEquinoxJDE, getSpringEquinox, getDaysSinceEquinox, getLunationSinceEquinox, getNextNewMoon, getBeats, getNextSunrise, getPreviousSunset, getSolarPercent, updateClock, convertGregorianToCustom). New entry point: import `compose` from `./chronometers/index.js`, import `./styles.css`. Bootstrap: call `updateClock(null)` immediately (D-09), then start geolocation. On geolocation success, re-render with location. Update interval at 864ms. Display format: `H{holocene} M{month} D{day} @{beats} {solar}` (D-24). The holocene value is a number, month is a number (or `MX` if leap per D-04 — format as `{month}X` when isLeap), day is a number, beats is the @-prefixed string, solar is the S/N prefixed string.

<acceptance_criteria>
- src/index.js contains NO function definitions for calculation logic (no getHoloceneYear, getBeats, getSolarPercent, etc.)
- src/index.js imports compose from './chronometers/index.js'
- src/index.js imports './styles.css'
- src/index.js calls updateClock or equivalent with null BEFORE navigator.geolocation.getCurrentPosition
- src/index.js sets setInterval at 864ms
- Display output format contains 'H', 'M', 'D', '@', and solar prefix (no 'L' lunation or 'D' days-since-equinox tokens)
- Display renders into '#beats-container' element
- convertGregorianToCustom is either removed or refactored to use compose() instead of inline calculations
</acceptance_criteria>

---

## Task 9: Write unit tests

<read_first>
- src/chronometers/holocene.js, src/chronometers/beats.js, src/chronometers/solar.js, src/chronometers/lunisolar.js, src/chronometers/oldSystem.js (all created modules)
- .planning/phases/02-modular-chronometry-core/02-RESEARCH.md (Test fixture dates: CNY dates, equinox dates, new moon dates, beat times, solar percent edge cases, Holocene year test cases)
- vitest.config.js (test configuration)
- package.json (test scripts)
</read_first>

Create test files under `tests/pure/` with `// @vitest-environment node` directive for pure function tests. One file per chronometer:

- `tests/pure/holocene.test.js` — test known dates: 2025-01-01 -> 11725, 2026-02-17 -> 11726, 2026-02-16 -> 11725, 2000-06-15 -> 11700
- `tests/pure/beats.test.js` — test known times: 23:00 UTC -> @000.00, 11:00 UTC -> @500.00, 00:00 UTC -> @041.67
- `tests/pure/solar.test.js` — test null location -> 'S??', test valid location returns S/N prefix + 2 digits
- `tests/pure/lunisolar.test.js` — test known dates: 2026-02-17 -> month 1 day 1, 2025-08-01 -> month 6 day 1 isLeap true
- `tests/pure/oldSystem.test.js` — test that compute returns valid object structure for a known date

Each test file imports the module's `compute` function and asserts known inputs produce expected outputs.

<acceptance_criteria>
- tests/pure/holocene.test.js exists with at least 4 test cases including before/after CNY boundary
- tests/pure/beats.test.js exists with at least 3 test cases covering @000.00, @500.00, and @041.67
- tests/pure/solar.test.js exists with at least 2 test cases including null location -> 'S??'
- tests/pure/lunisolar.test.js exists with at least 3 test cases including CNY 2026 and leap month date
- tests/pure/oldSystem.test.js exists with at least 1 test case verifying return object structure
- All test files have '// @vitest-environment node' or '// @vitest-environment jsdom' directive
- `npm test` exits 0 with all tests passing
</acceptance_criteria>

---

## Task 10: Write integration test

<read_first>
- src/chronometers/index.js (composer)
- src/chronometers/holocene.js, src/chronometers/beats.js, src/chronometers/solar.js, src/chronometers/lunisolar.js (modules)
- .planning/phases/02-modular-chronometry-core/02-CONTEXT.md (D-24: display format string, D-26: error handling)
</read_first>

Create `tests/integration/composer.test.js` with `// @vitest-environment jsdom` directive. Test that `compose(date, opts)` returns correct combined output for known dates. Verify all four keys present in return object. Test error handling path by calling compose with invalid options that cause a module to throw (e.g., solar with invalid coordinates that suncalc cannot handle).

<acceptance_criteria>
- tests/integration/composer.test.js exists
- Test verifies compose(date, opts) returns object with exactly 4 keys: holocene, beats, solar, lunisolar
- Test verifies holocene value is a number for a known date (e.g., 2026-03-01 -> 11726)
- Test verifies beats value starts with '@' for any date
- Test verifies solar returns 'S??' when lat/lon are null
- Test verifies lunisolar returns object with month, day, isLeap for a known date
- `npm test` exits 0 with all tests passing
</acceptance_criteria>

---

## Verification

After all tasks complete:

1. **`npm test`** — all tests pass (holocene, beats, solar, lunisolar, oldSystem, composer)
2. **`npm start`** — dev server starts, clock renders immediately on page load with format `H{year} M{month} D{day} @{beats} {solar}`
3. **grep verification:**
   - `src/chronometers/` contains at least 5 `.js` files
   - `src/index.js` contains no calculation function definitions (no `function getHoloceneYear`, no `function getBeats`, etc.)
   - `src/chronometers/index.js` imports exactly 4 modules (holocene, beats, solar, lunisolar)
   - Each module file exports `compute` function
   - `oldSystem.js` exists but is NOT imported by composer
4. **Display format check:** Clock output contains `H`, `M`, `D`, `@`, and `S`/`N` tokens — NO `L{lunation}` or `D{days}` tokens
5. **Immediate render:** Page loads clock text before geolocation callback (solar shows `S??` initially)
6. **Error resilience:** If a module throws, clock continues rendering with `??` for that component

## Requirements Mapping

| Requirement | How satisfied |
|-------------|--------------|
| **REFACTOR-01**: Modular chronometry components | Each clock element (Holocene, lunar, solar, beats, old system) extracted into independent `src/chronometers/*.js` module with `compute(date, opts)` contract |
| **REFACTOR-02**: Swappable time systems | Composer pattern decouples rendering from calculation; adding/removing modules = one import line change; return object keyed by module name enables future config-driven conversion |
| **REFACTOR-03**: Code organization | Clean `src/chronometers/` directory with one file per time system; entry point handles DOM update and geolocation only; no business logic inline |
