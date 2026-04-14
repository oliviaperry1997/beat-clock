# Phase 11: Year & Date Format Renderers — Research

**Researched:** 2026-04-14
**Status:** Complete — ready for planning

---

## Summary

Phase 11 replaces 7 stub renderer bodies with full implementations. All stubs already exist and are already imported by `src/formats/registry.js`. The registry, config module, and all chronometer data sources are complete from Phases 9–10. This phase is **pure logic and tests** — no new files added to the registry, no UI wiring, no new chronometer modules needed.

Key things to know:
- All 7 renderer files exist as stubs. Replace their `render(data, opts = {})` bodies.
- The renderer contract is `export function render(data, opts = {}) → string`.
- The `data` object is the direct output of `compose()` from `src/chronometers/index.js`.
- `data.effectiveYear` (set by Phase 14) is optional; renderers fall back gracefully when absent.
- Year boundary (DATE-04) is addressed via the `effectiveYear` pattern — renderers accept it but don't compute it; Phase 14 wires it.
- The Meghalayan renderer uses different abbreviations than the chronometer's `label` field.
- Chinese leap month display is `MX D{day}` (no number, just X).
- Longitudinal renderer must strip `SL`/`LP` prefixes before reformatting with Unicode symbols.
- Test files should live at `tests/formats/renderers/year/` and `tests/formats/renderers/date/`.

---

## Existing Patterns

### Renderer Interface

All renderers export a single named function:

```js
export function render(data, opts = {}) {
  // data: output of compose() from src/chronometers/index.js
  // opts: pipeline options (effectiveYear, customEpoch, solarDateDiffsStdDate, etc.)
  // returns: string — always, never throws
}
```

Evidence from `src/formats/registry.js` (line 34): registry maps `registry[component][formatId](data, opts)`. All renderer functions in the registry must accept `(data, opts)`.

Error handling pattern: return `'??'`-family strings on missing/invalid input — never throw. Consistent with chronometer error boundaries in `compose()`.

Pure functional: no classes, no mutation, no side effects.

### Registry API

From `src/formats/registry.js`:
- `getRenderer(componentId, formatId)` → render function or `null`
- All renderers imported statically at module init, registered in `REGISTRY` frozen object
- Registry structure: `{ year: { holocene, gregorian, meghalayan, custom }, date: { gregorian, chinese, longitudinal }, ... }`
- **No changes to registry needed for Phase 11** — all 7 renderer slots are already wired to the stub files

### Test Patterns

From examining existing tests:

1. **File location**: `tests/` mirrors `src/`. Renderer tests should go in `tests/formats/renderers/year/` and `tests/formats/renderers/date/`.
2. **Environment**: Chronometer tests use `// @vitest-environment node`. Registry/config tests use default jsdom (no annotation). Renderer tests are pure string functions with no DOM dependency — use `// @vitest-environment node` for performance.
3. **Imports**: `import { describe, it, expect } from 'vitest'` (vitest globals are enabled, but explicit import is the existing pattern).
4. **Structure**: `describe` block per renderer, `it` for each case. Known-date assertions preferred over `typeof` checks.
5. **No mocking needed** for pure renderers — they take plain data objects, return strings.
6. **Test data**: Construct `data` objects directly (e.g., `{ meghalayan: { stage: 'meghalayan', year: 4226, label: 'Mgh 4226' } }`).

Example from `tests/pure/holocene.test.js`:
```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/holocene.js';

describe('holocene chronometer', () => {
  it('returns correct Holocene year before CNY 2026', () => {
    const date = new Date(Date.UTC(2026, 1, 16));
    expect(compute(date)).toBe(11725);
  });
  // ...
});
```

For renderers the pattern would adapt to:
```js
// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../src/formats/renderers/year/holocene.js';

describe('holocene year renderer', () => {
  it('renders H{year} from data.holocene', () => {
    expect(render({ holocene: 12026 })).toBe('H12026');
  });
  // ...
});
```

---

## Chronometer Data Available

From `src/chronometers/index.js` — `compose(date, opts)` returns an object with exactly 9 keys:

```js
{
  holocene,       // number (e.g., 12026) or '??' for pre-Holocene
  beats,          // string (e.g., '@456.78')
  solar,          // string (e.g., 'N45' or 'S12')
  lunisolar,      // { month: number, day: number, isLeap: boolean, moonAge: number, illumination: number }
  solarLongitude, // string (e.g., 'SL024') or 'SL??' when no lat/lon
  lunarPhase,     // string (e.g., 'LP180') or 'LP??' when no lat/lon
  solarTime,      // string 'ST{HH:MM}' or 'ST??' when no lat/lon
  meghalayan,     // { stage, year, label } or { stage: '??', year: null, label: '??' } on error
  customEpoch,    // string (e.g., 'CE7') or 'CE??' when no customEpoch in opts
}
```

### Field Details Relevant to Phase 11

#### `data.holocene`
- Type: `number` (e.g., `12026` for 2026 CE) or string `'??'` for pre-Holocene
- Source: `src/chronometers/holocene.js` → `effectiveYear + 9700`
- Note: This value already reflects CNY tick boundary (ticks on Chinese New Year)
- Phase 11 note: Holocene renderer uses `data.effectiveYear` if present (Phase 14 sets it), otherwise falls back to `data.holocene`

#### `data.meghalayan`
- Type: `{ stage: string, year: number, label: string }` or `{ stage: '??', year: null, label: '??' }`
- `stage` values: `'meghalayan'`, `'northgrippian'`, `'greenlandian'`, `'pre-holocene'`
- `year`: integer within that stage (e.g., `4226`)
- `label`: pre-formatted string using OLD abbreviations (`'Mgh 4226'`, `'Nrg 3327'`, `'Ghg 1701'`, `'—'` for pre-Holocene)
- **IMPORTANT**: Phase 11 renderer IGNORES `data.meghalayan.label` — formats its own string with different abbreviations
- Source: `src/chronometers/meghalayan.js`
- Boundary constants from meghalayan.js:
  - `MEGHALAYAN_BOUNDARY = -2199` (2200 BCE)
  - `NORTHGRIPPIAN_BOUNDARY = -6325` (6326 BCE)
  - `GREENLANDIAN_BOUNDARY = -9699` (9700 BCE)
- Year computation formulas: `year + 2200` (Meghalayan), `year + 6326` (Northgrippian), `year + 9700` (Greenlandian)

#### `data.lunisolar`
- Type: `{ month: number, day: number, isLeap: boolean, moonAge: number, illumination: number }` or `'??'`
- `month`: Chinese lunar month (1–12, absolute value — negative in raw lunar data indicates leap, but lunisolar.js normalizes via `Math.abs(month)`)
- `day`: Chinese lunar day (1–30)
- `isLeap`: `true` when the month is an intercalary (leap) month — `month < 0` check in lunisolar.js
- Source: `src/chronometers/lunisolar.js` using `lunar-javascript`

#### `data.solarLongitude`
- Type: string `'SL{3-digit-degrees}'` (e.g., `'SL024'`, `'SL090'`, `'SL360'`) or `'SL??'` when no lat/lon
- Source: `src/chronometers/solarLongitude.js`
- Renderer must strip `'SL'` prefix: `parseInt('SL024'.slice(2))` → `24` (or use `replace(/^SL/, '')`)
- Error case: `'SL??'` — renderer should output `☉ ???° ☽ ???°`

#### `data.lunarPhase`
- Type: string `'LP{3-digit-degrees}'` (e.g., `'LP000'`, `'LP180'`) or `'LP??'` when no lat/lon
- Source: `src/chronometers/lunarPhase.js`
- Renderer strips `'LP'` prefix similarly to solarLongitude

#### `data.customEpoch`
- Type: string `'CE{year}'` (e.g., `'CE7'`, `'CE1'`) or `'CE??'`
- Source: `src/chronometers/customEpoch.js`
- Note: The `CE` prefix in the raw chronometer value is **not** used directly by the renderer — the renderer applies its own `Y` prefix fallback (or `opts.customLabel`)
- Renderer re-computes year from `data.effectiveYear - opts.customEpoch.getUTCFullYear() + 1` when `effectiveYear` is present

#### `data.now` (optional field, not in compose output)
- NOT currently a field in `compose()` output — the stubs reference `data?.now ?? new Date()` as a fallback
- Phase 14 will inject `data.now` into the pipeline to represent the effective current time at the chosen meridian
- Renderers should use `data.now ?? new Date()` pattern for `now`

---

## Implementation Approach (Per Renderer)

### 1. `src/formats/renderers/year/holocene.js`

**Current stub**: `return \`H${data?.holocene ?? '??'}\``

**Full implementation**:
- If `data.effectiveYear` is present: return `H${data.effectiveYear + 9700}`
- Else: return `H${data.holocene ?? '??'}`
- Format: `H{year}` no space (e.g., `H12026`)
- No special pre-Holocene handling needed in renderer — `data.holocene` is already `'??'` for pre-Holocene from compose()
- When using `effectiveYear`, the `+ 9700` offset is applied by the renderer directly (D-03)

```js
export function render(data, opts = {}) {
  if (data?.effectiveYear != null) {
    return `H${data.effectiveYear + 9700}`;
  }
  return `H${data?.holocene ?? '??'}`;
}
```

### 2. `src/formats/renderers/year/gregorian.js`

**Current stub**: `return String(data?.now?.getFullYear() ?? new Date().getFullYear())`

**Full implementation**:
- If `data.effectiveYear` is present: return `String(data.effectiveYear)`
- Else: fall back to UTC year from `data.now ?? new Date()`
- Format: plain number string (e.g., `'2026'`)
- Note: stub uses `getFullYear()` (local time), but `getUTCFullYear()` is more appropriate for consistency with other modules

```js
export function render(data, opts = {}) {
  if (data?.effectiveYear != null) {
    return String(data.effectiveYear);
  }
  const now = data?.now ?? new Date();
  return String(now.getUTCFullYear());
}
```

### 3. `src/formats/renderers/year/meghalayan.js`

**Current stub**: `return \`Mgh ${year}\`` (uses wrong space, always uses Mgh)

**Full implementation**:
- Stage abbreviations (D-07): `'meghalayan'` → `'Mgh'`, `'northgrippian'` → `'Ngp'`, `'greenlandian'` → `'Grn'`
- Pre-Holocene (`stage === 'pre-holocene'`): return `'—'` (D-10)
- Format: `{abbreviation}{year}` — NO space (D-08)
- When `data.effectiveYear` is present: re-compute stage and year against `effectiveYear` using same boundary logic as meghalayan.js (D-09)
- When `data.effectiveYear` absent: use `data.meghalayan.stage` and `data.meghalayan.year`
- Error fallback: if `data.meghalayan` is missing/invalid, return `'??'`

Stage computation when effectiveYear present (needs to replicate meghalayan.js boundaries):
```js
const MEGHALAYAN_BOUNDARY = -2199;
const NORTHGRIPPIAN_BOUNDARY = -6325;
const GREENLANDIAN_BOUNDARY = -9699;

function computeStageFromYear(gregorianYear) {
  if (gregorianYear < GREENLANDIAN_BOUNDARY) return { stage: 'pre-holocene', year: null };
  if (gregorianYear >= MEGHALAYAN_BOUNDARY) return { stage: 'meghalayan', year: gregorianYear + 2200 };
  if (gregorianYear >= NORTHGRIPPIAN_BOUNDARY) return { stage: 'northgrippian', year: gregorianYear + 6326 };
  return { stage: 'greenlandian', year: gregorianYear + 9700 };
}
```

### 4. `src/formats/renderers/year/custom.js`

**Current stub**: `return \`Y${year}\`` — always uses Y prefix, reads data.customEpoch raw

**Full implementation**:
- If `data.effectiveYear` present AND `opts.customEpoch` is a valid Date: compute `data.effectiveYear - opts.customEpoch.getUTCFullYear() + 1`
- Else if `data.customEpoch` available AND is not the `'CE??'` error: strip `CE` prefix and use that year
- Fallback: `'Y??'` if neither source has data (D-14)
- Label: use `opts.customLabel` prefix/suffix if set (D-12); default to `Y` prefix
- Format example: `Y42` (default), or `{customLabel}42` / `42{customLabel}` depending on `opts.customLabelPosition`

Key decision: `data.customEpoch` is a string like `'CE7'` — the renderer should NOT just prepend `Y` to this. It should either extract the numeric part or use `effectiveYear + opts.customEpoch` computation.

```js
export function render(data, opts = {}) {
  let year;
  
  if (data?.effectiveYear != null && opts.customEpoch instanceof Date && !isNaN(opts.customEpoch)) {
    year = data.effectiveYear - opts.customEpoch.getUTCFullYear() + 1;
  } else if (data?.customEpoch && data.customEpoch !== 'CE??') {
    // Strip 'CE' prefix from chronometer string
    year = parseInt(data.customEpoch.slice(2), 10);
  } else {
    return opts.customLabel ? `${opts.customLabel}??` : 'Y??';
  }
  
  const label = opts.customLabel ?? 'Y';
  const pos = opts.customLabelPosition ?? 'prefix';
  return pos === 'suffix' ? `${year}${label}` : `${label}${year}`;
}
```

### 5. `src/formats/renderers/date/gregorian.js`

**Current stub**: `return \`${now.getMonth() + 1}/${now.getDate()}\``

**Full implementation**:
- Source: `data.now ?? new Date()` (D-16)
- Format: `{M}/{D}` — no zero-padding (D-15), e.g., `4/14`
- Use `getUTCMonth()` and `getUTCDate()` for consistency (UTC-based like all other modules)
- `opts.solarDateDiffsStdDate`: append `+` if `'ahead'`, `-` if `'behind'`, nothing otherwise (D-17)

```js
export function render(data, opts = {}) {
  const now = data?.now ?? new Date();
  const month = now.getUTCMonth() + 1;
  const day = now.getUTCDate();
  const suffix = opts.solarDateDiffsStdDate === 'ahead' ? '+' 
               : opts.solarDateDiffsStdDate === 'behind' ? '-' 
               : '';
  return `${month}/${day}${suffix}`;
}
```

### 6. `src/formats/renderers/date/chinese.js`

**Current stub**: Uses `${month}X` for leap months (wrong — should be just `X`)

**Full implementation** (D-18, D-19, D-20):
- Normal month: `M{month} D{day}` — e.g., `M6 D15`
- Leap/intercalary month: `MX D{day}` — NOT `M6X`, just `MX` (D-19)
- Source: `data.lunisolar` → `{ month, day, isLeap }`
- Missing data fallback: `'??'` (not `'??/??'` as the current stub has)
- `opts.solarDateDiffsStdDate`: same +/- suffix as Gregorian renderer (D-21)

```js
export function render(data, opts = {}) {
  const lunisolar = data?.lunisolar;
  if (!lunisolar || typeof lunisolar !== 'object') return '??';
  const { month, day, isLeap } = lunisolar;
  if (month == null || day == null) return '??';
  
  const monthStr = isLeap ? 'X' : String(month);
  const suffix = opts.solarDateDiffsStdDate === 'ahead' ? '+' 
               : opts.solarDateDiffsStdDate === 'behind' ? '-' 
               : '';
  return `M${monthStr} D${day}${suffix}`;
}
```

### 7. `src/formats/renderers/date/longitudinal.js`

**Current stub**: Passes raw `'SL024'` string directly into output (doesn't strip prefix)

**Full implementation** (D-22, D-23, D-24, D-25, D-26):
- Format: `☉ {SL}° ☽ {LP}°` where angles are zero-padded 3 digits
- Strip `'SL'` prefix from `data.solarLongitude` to get degree string
- Strip `'LP'` prefix from `data.lunarPhase` to get degree string
- Error case: `'SL??'` or `'LP??'` → output `☉ ???° ☽ ???°`
- No day +/- suffix (D-26)
- Unicode: ☉ = U+2609, ☽ = U+263D

```js
export function render(data, opts = {}) {
  const sl = data?.solarLongitude ?? 'SL??';
  const lp = data?.lunarPhase ?? 'LP??';
  
  const slValue = sl === 'SL??' ? '???' : sl.slice(2);
  const lpValue = lp === 'LP??' ? '???' : lp.slice(2);
  
  return `☉ ${slValue}° ☽ ${lpValue}°`;
}
```

---

## Year Boundary Transition Logic

### What DATE-04 Requires

Year boundary correctly transitions when Date format changes (e.g., Chinese New Year vs Jan 1 vs vernal equinox). The three date formats each have different "year start" moments.

### Architecture (from 11-CONTEXT.md D-27 through D-30)

The `effectiveYear` pattern:
- Year renderers accept an optional `data.effectiveYear` — a pre-computed effective Gregorian year
- If `effectiveYear` is set, renderers use it instead of the raw chronometer value
- If absent, renderers fall back to existing `data` fields from compose()

**Phase 14 will compute and inject `effectiveYear`.** Phase 11 only needs to:
1. Accept `data.effectiveYear` in year renderers
2. Use it when present
3. Fall back gracefully when absent

Tick boundary table (architectural note for Phase 14, NOT Phase 11 code):
| Date Format | Year Ticks On |
|---|---|
| Gregorian date | Jan 1 (UTC, adjusted by meridian offset) |
| Chinese date | Chinese New Year |
| Longitudinal date | Spring Equinox (0° solar longitude) |

### Phase 11 Implementation of DATE-04

In each year renderer, the `effectiveYear` fallback pattern IS the DATE-04 implementation for Phase 11. The renderers are DATE-04-ready. Full wiring in Phase 14.

The integration test for year boundary transitions should test that:
1. Year renderers produce different output when `data.effectiveYear` differs from the compose-computed year
2. The transition happens correctly at boundaries (e.g., Jan 15 before CNY uses previous Gregorian year as effectiveYear)

---

## Test Strategy

### Test File Organization

New test files should be created at:
```
tests/formats/renderers/year/holocene.test.js
tests/formats/renderers/year/gregorian.test.js
tests/formats/renderers/year/meghalayan.test.js
tests/formats/renderers/year/custom.test.js
tests/formats/renderers/date/gregorian.test.js
tests/formats/renderers/date/chinese.test.js
tests/formats/renderers/date/longitudinal.test.js
```

This mirrors the `src/formats/renderers/` structure.

Additionally, integration tests should be placed at:
```
tests/integration/year-boundary.test.js
```

### Test Cases Per Renderer

#### Holocene Year Renderer
1. `data.holocene = 12026` → `'H12026'`
2. `data.holocene = '??'` → `'H??'`
3. `data.effectiveYear = 2026` → `'H12026'` (2026 + 9700)
4. `data.effectiveYear = 2025` → `'H11725'` (2025 + 9700, year before transition)
5. Null data → `'H??'`
6. `effectiveYear` takes precedence over `holocene`

#### Gregorian Year Renderer
1. `data.now = new Date(Date.UTC(2026, 3, 14))` → `'2026'`
2. `data.effectiveYear = 2025` → `'2025'`
3. `data.effectiveYear = 2026` → `'2026'`
4. No data → falls back to `new Date()` UTC year
5. `effectiveYear` takes precedence over `now`

#### Meghalayan Year Renderer
1. `data.meghalayan = { stage: 'meghalayan', year: 4226, label: 'Mgh 4226' }` → `'Mgh4226'` (no space)
2. `data.meghalayan = { stage: 'northgrippian', year: 3327, label: 'Nrg 3327' }` → `'Ngp3327'` (Ngp not Nrg)
3. `data.meghalayan = { stage: 'greenlandian', year: 1701, label: 'Ghg 1701' }` → `'Grn1701'` (Grn not Ghg)
4. `data.meghalayan = { stage: 'pre-holocene', year: null, label: '—' }` → `'—'`
5. `data.effectiveYear = 2026` → re-computes stage → `'Mgh4226'`
6. `data.effectiveYear = -2199` (Meghalayan boundary) → `'Mgh1'`
7. `data.effectiveYear = -6325` (Northgrippian boundary) → `'Ngp1'`
8. `data.effectiveYear = -9699` (Greenlandian boundary) → `'Grn1'`
9. `data.effectiveYear = -9700` (pre-Holocene) → `'—'`
10. Missing data → `'??'`

#### Custom Epoch Year Renderer
1. `data.customEpoch = 'CE7'` → `'Y7'`
2. `data.customEpoch = 'CE1'` → `'Y1'`
3. `data.customEpoch = 'CE??'` → `'Y??'`
4. No data → `'Y??'`
5. `data.effectiveYear = 2026`, `opts.customEpoch = new Date(UTC(2020, 0, 1))` → `'Y7'`
6. `opts.customLabel = 'Era'`, `data.customEpoch = 'CE7'` → `'Era7'`
7. `opts.customLabel = 'Era'`, `opts.customLabelPosition = 'suffix'`, `data.customEpoch = 'CE7'` → `'7Era'`

#### Gregorian Date Renderer
1. `data.now = new Date(Date.UTC(2026, 3, 14))` → `'4/14'` (no zero-padding)
2. `data.now = new Date(Date.UTC(2026, 0, 1))` → `'1/1'`
3. `opts.solarDateDiffsStdDate = 'ahead'` → `'4/14+'`
4. `opts.solarDateDiffsStdDate = 'behind'` → `'4/14-'`
5. `opts.solarDateDiffsStdDate = null` (falsy) → `'4/14'`
6. No `data.now` → falls back to `new Date()`

#### Chinese Date Renderer
1. `data.lunisolar = { month: 6, day: 15, isLeap: false }` → `'M6 D15'`
2. `data.lunisolar = { month: 6, day: 1, isLeap: true }` → `'MX D1'` (not `'M6X D1'`)
3. `data.lunisolar = { month: 1, day: 1, isLeap: false }` (CNY) → `'M1 D1'`
4. `opts.solarDateDiffsStdDate = 'ahead'` → `'M6 D15+'`
5. `opts.solarDateDiffsStdDate = 'behind'` → `'MX D1-'` (with leap month)
6. `data.lunisolar = null` → `'??'`
7. `data.lunisolar = '??'` (error string from compose) → `'??'`
8. Missing month/day → `'??'`

#### Longitudinal Date Renderer
1. `data.solarLongitude = 'SL024', data.lunarPhase = 'LP180'` → `'☉ 024° ☽ 180°'`
2. `data.solarLongitude = 'SL000', data.lunarPhase = 'LP000'` → `'☉ 000° ☽ 000°'`
3. `data.solarLongitude = 'SL360', data.lunarPhase = 'LP360'` → `'☉ 360° ☽ 360°'`
4. `data.solarLongitude = 'SL??'` → `'☉ ???° ☽ ???°'` (full error output)
5. `data.lunarPhase = 'LP??'` → `'☉ 024° ☽ ???°'` (only LP is unknown)
6. Missing data → `'☉ ???° ☽ ???°'`
7. `opts.solarDateDiffsStdDate` is ignored — no suffix appended

#### Integration Tests (year-boundary)
1. Year before CNY 2026 (Feb 16, 2026 UTC): `effectiveYear = 2025` → holocene shows `H11725`, not `H11726`
2. Year on/after CNY 2026 (Feb 17, 2026 UTC): `effectiveYear = 2026` → holocene shows `H11726`
3. Gregorian year renderer respects `effectiveYear` independently from holocene
4. Meghalayan near stage boundary transitions correctly with `effectiveYear`

---

## Validation Architecture

How to validate each renderer:

### Year Renderers

Validation approach: **Known-value assertions with constructed data objects**.

All year renderers are pure functions of `data` + `opts`. No external dependencies needed in tests. Supply exact `data.meghalayan`, `data.holocene`, `data.customEpoch` values directly.

For `effectiveYear` tests: supply `{ effectiveYear: N }` and assert expected output.

Boundary tests: test the transition points for each stage (Meghalayan boundary at Gregorian year -2199, Northgrippian at -6325, Greenlandian at -9699, pre-Holocene at -9700).

### Date Renderers

**Gregorian**: Supply `data.now` as a `Date` object with known UTC values.

**Chinese**: Supply `data.lunisolar` as a plain object `{ month, day, isLeap }`. Test the leap month case `Jul 25, 2025` (from existing lunisolar test — leap 6th month day 1). Test CNY `Feb 17, 2026` (month 1, day 1, no leap).

**Longitudinal**: Supply `data.solarLongitude` and `data.lunarPhase` as pre-formatted strings (no real computation needed). Test prefix stripping, zero-padding preservation, and error cases.

### No Mocking Required

All 7 renderers are pure functions. Tests construct the `data` object directly — no need to mock `compose()` or any external modules.

---

## Risks and Unknowns

### Risk 1: `data.now` field not in compose() output

**Observation**: The stubs use `data?.now ?? new Date()`. However, `compose()` in `src/chronometers/index.js` does NOT include a `now` field in its output. The 9 fields are: `holocene`, `beats`, `solar`, `lunisolar`, `solarLongitude`, `lunarPhase`, `solarTime`, `meghalayan`, `customEpoch`.

**Implication for Gregorian date renderer and Gregorian year renderer**: When `effectiveYear` is absent and `data.now` is absent, the fallback `new Date()` is used. This is correct behavior for Phase 11 (Phase 14 injects `data.now`), but test cases should account for the fact that `new Date()` will vary. Tests should supply `data.now` explicitly or use `data.effectiveYear`.

**Resolution**: Always supply explicit test data; don't test the `new Date()` fallback directly unless checking that it doesn't throw.

### Risk 2: Custom epoch renderer reads `data.customEpoch` as string vs. number

`data.customEpoch` from compose() is a string like `'CE7'`, not a number. The current stub does `Y${data.customEpoch}` which would produce `YCE7`. The Phase 11 implementation must strip the `CE` prefix correctly.

When `data.effectiveYear` is used, the renderer needs `opts.customEpoch` (a Date object) to compute the year. If `opts.customEpoch` is missing in the opts, fall back to string parsing.

**Resolution**: Document clearly in the plan: parse `data.customEpoch` with `parseInt(data.customEpoch.slice(2), 10)` when not using `effectiveYear`.

### Risk 3: Meghalayan abbreviation conflict with existing label

The `meghalayan.js` chronometer uses labels `'Nrg'` (Northgrippian) and `'Ghg'` (Greenlandian). The Phase 11 renderer uses **different** abbreviations: `'Ngp'` and `'Grn'`. The existing tests in `tests/pure/meghalayan.test.js` check the label field with old abbreviations — this is fine because the renderer ignores the label field.

**However**: If any existing code elsewhere reads `meghalayan.label` for display, it will show old abbreviations. Phase 11 ONLY affects the renderer. The chronometer itself is unchanged.

**Resolution**: The renderer must NOT use `data.meghalayan.label`. Implementation must re-format using the stage field with new abbreviations.

### Risk 4: Stage re-computation when effectiveYear present

When `data.effectiveYear` is provided to the Meghalayan renderer, the renderer must re-run the stage boundary logic (normally in `meghalayan.js`). This means duplicating the boundary constants.

**Resolution**: Either inline the boundary constants directly in the renderer (simplest), or import a helper from meghalayan.js if a helper is exported. Currently `meghalayan.js` only exports `compute()` — so constants must be inlined or a helper extracted.

**Plan note**: Prefer inlining the constants in the renderer file. No need to modify `meghalayan.js` for this.

### Risk 5: Chinese intercalary month display format change

The current stub uses `${month}X` (e.g., `6X`) for intercalary months. The Phase 11 decision is `MX` (no number) for intercalary. This is a **behavior change from the stub** that could affect any code relying on the stub output. Since the stub is explicitly a placeholder, this is expected — but tests should clearly document the correct behavior.

**Resolution**: Test case must explicitly assert `'MX D15'` (not `'M6X D15'` or `'M6 D15'`).

### Risk 6: `data.now` getUTCMonth vs getMonth

The current stubs use `getMonth()` and `getDate()` (local time). All chronometer modules use UTC (`getUTCFullYear()`, `getUTCMonth()`, etc.). For consistency with the rest of the system, the Gregorian date renderer should use `getUTCMonth()` and `getUTCDate()`.

**Implication**: In tests, use `new Date(Date.UTC(...))` to control the UTC values explicitly.

### Risk 7: No existing renderer tests — need to create test directory

There are no `tests/formats/renderers/` files currently. The test plan must include creating this directory structure. Vitest will auto-discover the new test files because `vitest.config.js` includes `tests/**/*.test.js`.

### Risk 8: Longitudinal renderer currently outputs raw prefix in display

Current stub outputs `☉ SL024° ☽ LP180°` (with prefixes). The real implementation outputs `☉ 024° ☽ 180°`. This is a **breaking change in output format** that DATE-03 (already marked complete in REQUIREMENTS.md) was presumably relying on. However, since there's no live display pipeline yet (Phase 14), this has no downstream impact.

**Resolution**: Implement correctly per D-22 to D-25. Note that DATE-03 is marked complete in REQUIREMENTS.md but likely only the chronometer computation was complete, not the rendering.

---

## Summary of Files to Create/Modify

### Modify (replace stub bodies):
1. `src/formats/renderers/year/holocene.js`
2. `src/formats/renderers/year/gregorian.js`
3. `src/formats/renderers/year/meghalayan.js`
4. `src/formats/renderers/year/custom.js`
5. `src/formats/renderers/date/gregorian.js`
6. `src/formats/renderers/date/chinese.js`
7. `src/formats/renderers/date/longitudinal.js`

### Create (new test files):
8. `tests/formats/renderers/year/holocene.test.js`
9. `tests/formats/renderers/year/gregorian.test.js`
10. `tests/formats/renderers/year/meghalayan.test.js`
11. `tests/formats/renderers/year/custom.test.js`
12. `tests/formats/renderers/date/gregorian.test.js`
13. `tests/formats/renderers/date/chinese.test.js`
14. `tests/formats/renderers/date/longitudinal.test.js`
15. `tests/integration/year-boundary.test.js`

### No changes needed:
- `src/formats/registry.js` — already imports all 7 renderers
- `src/chronometers/meghalayan.js` — boundary constants inline in renderer, no export needed
- `src/chronometers/index.js` — compose() is complete
- All other chronometer modules — data is already correct

---

*Research complete: 2026-04-14*
