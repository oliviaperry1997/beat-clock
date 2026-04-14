---
phase: 11
plan: 08
status: complete
executed: 2026-04-14
---

# Plan 08 Summary: Longitudinal Date Renderer

## Outcome

Replaced the stub body in `src/formats/renderers/date/longitudinal.js` with a full implementation. All 10 tests pass.

## Tasks Completed

### Task 11-08-01 — Replace stub with full longitudinal renderer

**File modified:** `src/formats/renderers/date/longitudinal.js`

**What changed:**
- Old stub passed raw `data.solarLongitude` and `data.lunarPhase` strings directly into the output, producing e.g. `☉ SL024° ☽ LP180°` (with prefixes included — wrong)
- New implementation strips the `SL` and `LP` prefixes via `.slice(2)` before interpolating
- Added exact-equality check for error tokens: `sl === 'SL??'` → `'???'`, `lp === 'LP??'` → `'???'`
- Function signature updated to `render(data, opts = {})` (opts parameter added, intentionally ignored per D-26)
- `opts.solarDateDiffsStdDate` is ignored — no `+`/`-` suffix appended (angles are not calendar dates)
- `data` nullability handled via optional chaining with `'SL??'`/`'LP??'` fallbacks

**Output format:** `☉ {3-digit-angle}° ☽ {3-digit-angle}°`
- Unicode escapes: `\u2609` (☉ SUN), `\u263D` (☽ FIRST QUARTER MOON), `\u00B0` (° DEGREE SIGN)
- Zero-padding preserved from chronometer strings (chronometer already zero-pads to 3 digits)
- Error token: `???` (3 chars, maintains fixed-width alignment)

**Commit:** `feat(11-08): implement longitudinal date renderer (strip SL/LP prefixes, Unicode symbols, ??? error)`

## Test Results

```
Test Files  1 passed (1)
     Tests  10 passed (10)
```

All 10 test cases pass:
1. `render({ solarLongitude: 'SL024', lunarPhase: 'LP180' })` → `'☉ 024° ☽ 180°'`
2. `render({ solarLongitude: 'SL000', lunarPhase: 'LP000' })` → `'☉ 000° ☽ 000°'`
3. `render({ solarLongitude: 'SL360', lunarPhase: 'LP360' })` → `'☉ 360° ☽ 360°'`
4. `render({ solarLongitude: 'SL??', lunarPhase: 'LP180' })` → `'☉ ???° ☽ 180°'`
5. `render({ solarLongitude: 'SL024', lunarPhase: 'LP??' })` → `'☉ 024° ☽ ???°'`
6. `render({ solarLongitude: 'SL??', lunarPhase: 'LP??' })` → `'☉ ???° ☽ ???°'`
7. `render(null)` → `'☉ ???° ☽ ???°'`
8. `render({})` → `'☉ ???° ☽ ???°'`
9. `render(data, { solarDateDiffsStdDate: 'ahead' })` → `'☉ 024° ☽ 180°'` (no `+`)
10. Output does not contain `'SL'` or `'LP'` prefix strings

## Acceptance Criteria

- [x] `src/formats/renderers/date/longitudinal.js` contains `export function render(data, opts = {})`
- [x] File contains `sl.slice(2)`
- [x] File contains `lp.slice(2)`
- [x] File contains `'SL??'`
- [x] File contains `'LP??'`
- [x] File contains `'???'`
- [x] File does NOT contain raw prefix pass-through
- [x] `npx vitest run tests/formats/renderers/date/longitudinal.test.js` exits 0
