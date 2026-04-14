# Plan 02: Year Modules and Composer Integration

**Phase:** 9
**Wave:** 2
**depends_on:** [01]
**files_modified:** src/chronometers/meghalayan.js, src/chronometers/customEpoch.js, src/chronometers/index.js, tests/pure/meghalayan.test.js, tests/pure/customEpoch.test.js, tests/integration/composer.test.js
**autonomous:** true
**requirements:** DATE-03, SOLTIME-01, SOLTIME-02, SOLTIME-03

---

## Objective

Create two year computation modules (Meghalayan, Custom Epoch) and wire all 5 new modules into the composer. Verify no regression in existing tests.

---

### Task 02-01: Meghalayan Year Module

**files_modified:** src/chronometers/meghalayan.js

<read_first>
- src/chronometers/holocene.js — existing year chronometer pattern (effective year + epoch offset)
- .planning/phases/09-new-chronometry-modules/9-CONTEXT.md — decisions D-09, D-10, D-11
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — BCE year handling in JavaScript (astronomical year numbering)
</read_first>

<action>
Create `src/chronometers/meghalayan.js` that exports `compute(date, opts)`.

Implementation:
1. Get UTC year from date: `const year = date.getUTCFullYear();`
2. Compute Meghalayan year: `const meghalayanYear = year + 2200;`
   - JavaScript's `getUTCFullYear()` returns negative numbers for BCE years using astronomical numbering (2200 BCE = year -2199, so -2199 + 2200 = 1 = Mgh 1). This is correct.
3. Return as string: `Mgh${meghalayanYear}` (e.g., `Mgh4226` for 2026 CE).
4. No dependency on location — does NOT return fallback for missing opts. Year computation always works.

Example:
```js
// 2026 CE → Mgh4226
// 1 BCE (year 0 in astronomical) → Mgh2200
// 2200 BCE (year -2199 in JS) → Mgh1
```
</action>

<acceptance_criteria>
- File `src/chronometers/meghalayan.js` exists
- Exports `compute` function with signature `compute(date, opts = {})`
- Does NOT require latitude or longitude in opts
- Returns string matching pattern `^Mgh\d+$`
- `compute(Date.UTC(2026, 0, 1))` returns `'Mgh4226'`
- `compute(Date.UTC(1, 0, 1))` (1 CE) returns `'Mgh2201'`
- `compute(Date.UTC(-2199, 0, 1))` (2200 BCE) returns `'Mgh1'`
- `compute(Date.UTC(-2200, 0, 1))` (2201 BCE) returns `'Mgh0'`
</acceptance_criteria>

---

### Task 02-02: Meghalayan Year Tests

**files_modified:** tests/pure/meghalayan.test.js

<read_first>
- tests/pure/holocene.test.js — year chronometer test pattern
- src/chronometers/meghalayan.js — module being tested (from Task 02-01)
</read_first>

<action>
Create `tests/pure/meghalayan.test.js` with these test cases:

1. `'returns Mgh4226 for 2026 CE'` — Date.UTC(2026, 0, 1) → 'Mgh4226'
2. `'returns Mgh1 for 2200 BCE'` — Date.UTC(-2199, 0, 1) → 'Mgh1'
3. `'returns Mgh2201 for 1 CE'` — Date.UTC(1, 0, 1) → 'Mgh2201'
4. `'returns Mgh2200 for 1 BCE'` — Date.UTC(0, 0, 1) → 'Mgh2200'
5. `'returns correct value for year 2000'` — Date.UTC(2000, 6, 1) → 'Mgh4200'
6. `'returns a string starting with Mgh for any date'` — new Date() → matches /^Mgh/
7. `'ignores opts parameter'` — compute(date, {}) === compute(date, { anything: true })
</action>

<acceptance_criteria>
- File `tests/pure/meghalayan.test.js` exists
- Uses `// @vitest-environment node` pragma
- Imports `{ describe, it, expect }` from 'vitest'
- Imports `{ compute }` from '../../src/chronometers/meghalayan.js'
- Contains at least 7 test cases
- All tests pass: `npx vitest run tests/pure/meghalayan.test.js` exits 0
</acceptance_criteria>

---

### Task 02-03: Custom Epoch Year Module

**files_modified:** src/chronometers/customEpoch.js

<read_first>
- src/chronometers/holocene.js — year chronometer pattern
- .planning/phases/09-new-chronometry-modules/9-CONTEXT.md — decisions D-12, D-13, D-15
- .planning/phases/09-new-chronometry-modules/9-RESEARCH.md — opts.customEpoch handling
</read_first>

<action>
Create `src/chronometers/customEpoch.js` that exports `compute(date, opts)`.

Implementation:
1. Extract `customEpoch` from `opts`. If not provided (null/undefined/not a Date), return `'CE??'`.
2. Validate `opts.customEpoch` is a valid Date: `if (!(opts.customEpoch instanceof Date) || isNaN(opts.customEpoch.getTime())) return 'CE??';`
3. Get the epoch year: `const epochYear = opts.customEpoch.getUTCFullYear();`
4. Compute custom year: `const customYear = date.getUTCFullYear() - epochYear + 1;` (epoch date = year 1)
5. Return as string: `CE${customYear}` (e.g., if epoch is 2020-01-01 and current year is 2026, returns `CE7`).

Note: This module is year-count only. The Date system determines when the year ticks (orchestration concern, per CONTEXT.md D-14).
</action>

<acceptance_criteria>
- File `src/chronometers/customEpoch.js` exists
- Exports `compute` function with signature `compute(date, opts = {})`
- Returns `'CE??'` when opts.customEpoch is missing
- Returns `'CE??'` when opts.customEpoch is not a Date
- Returns `'CE??'` when opts.customEpoch is an invalid Date (NaN)
- compute(Date.UTC(2026, 0, 1), { customEpoch: new Date(Date.UTC(2020, 0, 1)) }) returns `'CE7'`
- compute(Date.UTC(2020, 0, 1), { customEpoch: new Date(Date.UTC(2020, 0, 1)) }) returns `'CE1'`
- Returns string matching pattern `^(CE\d+|CE\?\?)$`
</acceptance_criteria>

---

### Task 02-04: Custom Epoch Tests

**files_modified:** tests/pure/customEpoch.test.js

<read_first>
- tests/pure/holocene.test.js — test pattern
- src/chronometers/customEpoch.js — module being tested (from Task 02-03)
</read_first>

<action>
Create `tests/pure/customEpoch.test.js` with these test cases:

1. `'returns CE?? when customEpoch not provided'` — compute(date, {}) → 'CE??'
2. `'returns CE?? when customEpoch is undefined'` — compute(date) → 'CE??'
3. `'returns CE?? when customEpoch is not a Date'` — compute(date, { customEpoch: '2020-01-01' }) → 'CE??'
4. `'returns CE?? when customEpoch is invalid Date'` — compute(date, { customEpoch: new Date('invalid') }) → 'CE??'
5. `'returns CE7 when epoch is 2020 and date is 2026'` → 'CE7'
6. `'returns CE1 when date equals epoch'` → 'CE1'
7. `'returns CE0 for year before epoch'` — epoch 2020, date 2019 → 'CE0'
8. `'ignores latitude and longitude'` — opts with lat/lon but no customEpoch → 'CE??'
</action>

<acceptance_criteria>
- File `tests/pure/customEpoch.test.js` exists
- Uses `// @vitest-environment node` pragma
- Imports `{ describe, it, expect }` from 'vitest'
- Imports `{ compute }` from '../../src/chronometers/customEpoch.js'
- Contains at least 8 test cases
- All tests pass: `npx vitest run tests/pure/customEpoch.test.js` exits 0
</acceptance_criteria>

---

### Task 02-05: Composer Integration

**files_modified:** src/chronometers/index.js

<read_first>
- src/chronometers/index.js — existing composer (5 existing modules, try/catch pattern)
- src/chronometers/solarLongitude.js — new module (from Task 01-01)
- src/chronometers/lunarPhase.js — new module (from Task 01-03)
- src/chronometers/solarTime.js — new module (from Task 01-05)
- src/chronometers/meghalayan.js — new module (from Task 02-01)
- src/chronometers/customEpoch.js — new module (from Task 02-03)
</read_first>

<action>
Modify `src/chronometers/index.js` to add the 5 new modules to the composer.

Add imports at the top:
```js
import { compute as computeSolarLongitude } from './solarLongitude.js';
import { compute as computeLunarPhase } from './lunarPhase.js';
import { compute as computeSolarTime } from './solarTime.js';
import { compute as computeMeghalayan } from './meghalayan.js';
import { compute as computeCustomEpoch } from './customEpoch.js';
```

Add try/catch blocks in the `compose` function AFTER the existing lunisolar block:

```js
  // Solar Longitude
  try {
    result.solarLongitude = computeSolarLongitude(date, opts);
  } catch (error) {
    console.warn('solarLongitude', error);
    result.solarLongitude = 'SL??';
  }

  // Lunar Phase
  try {
    result.lunarPhase = computeLunarPhase(date, opts);
  } catch (error) {
    console.warn('lunarPhase', error);
    result.lunarPhase = 'LP??';
  }

  // Solar Time
  try {
    result.solarTime = computeSolarTime(date, opts);
  } catch (error) {
    console.warn('solarTime', error);
    result.solarTime = 'ST??';
  }

  // Meghalayan
  try {
    result.meghalayan = computeMeghalayan(date, opts);
  } catch (error) {
    console.warn('meghalayan', error);
    result.meghalayan = '??';
  }

  // Custom Epoch
  try {
    result.customEpoch = computeCustomEpoch(date, opts);
  } catch (error) {
    console.warn('customEpoch', error);
    result.customEpoch = '??';
  }
```

The opts object already flows through from the caller. The `customEpoch` module will look for `opts.customEpoch` which the caller (orchestration layer in future phases) will provide.
</action>

<acceptance_criteria>
- File `src/chronometers/index.js` imports all 5 new compute functions
- compose() function includes try/catch blocks for all 5 new modules
- Each try/catch uses the correct fallback value (matching module's fallback pattern)
- console.warn calls use correct module name strings: 'solarLongitude', 'lunarPhase', 'solarTime', 'meghalayan', 'customEpoch'
- Existing 4 modules (holocene, beats, solar, lunisolar) are unchanged
- File still exports `compose` function
</acceptance_criteria>

---

### Task 02-06: Regression Tests

**files_modified:** tests/integration/composer.test.js

<read_first>
- tests/integration/composer.test.js — existing composer integration tests
- src/chronometers/index.js — modified composer (from Task 02-05)
</read_first>

<action>
Update `tests/integration/composer.test.js` to verify new modules are present in composer output.

Add test cases:
1. `'includes solarLongitude in result'` — compose(date, opts) → result.solarLongitude is defined
2. `'includes lunarPhase in result'` — compose(date, opts) → result.lunarPhase is defined
3. `'includes solarTime in result'` — compose(date, opts) → result.solarTime is defined
4. `'includes meghalayan in result'` — compose(date, opts) → result.meghalayan is defined
5. `'includes customEpoch in result'` — compose(date, opts) → result.customEpoch is defined
6. `'existing modules still present'` — result.holocene, result.beats, result.solar, result.lunisolar all defined
7. `'returns fallback when no location provided'` — compose(date, {}) → solarLongitude='SL??', lunarPhase='LP??', solarTime='ST??' (meghalayan and customEpoch have different fallback behavior)
</action>

<acceptance_criteria>
- File `tests/integration/composer.test.js` contains tests for all 5 new modules
- `npx vitest run tests/integration/composer.test.js` exits 0
- `npm test` exits 0 (full suite — no regression in existing 268+ tests)
</acceptance_criteria>

---

## must_haves

1. Meghalayan formula: `year + 2200` (JavaScript astronomical year numbering handles BCE correctly)
2. Custom epoch returns fallback `'CE??'` when opts.customEpoch is missing or invalid
3. All 5 new modules wired into composer with try/catch error boundaries
4. No regression in existing holocene, beats, solar, lunisolar module tests
5. Composer output includes all 9 modules (4 existing + 5 new)

## Verification

Run: `npm test`
Expected: All tests pass (268+ existing + new tests), 0 failures.

---

*Plan 02 for Phase 9: New Chronometry Modules*
*Created: 2026-04-14*
