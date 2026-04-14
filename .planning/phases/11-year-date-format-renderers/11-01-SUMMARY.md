# Plan 11-01 Summary: Test Stub Files (Wave 0)

## What Was Built

8 test stub files created under `tests/formats/renderers/`:

### Year renderer tests (`tests/formats/renderers/year/`)
1. `holocene.test.js` — 8 test cases covering `H{year}` format, `effectiveYear` precedence, `H??` error paths (YEAR-01)
2. `gregorian.test.js` — 7 test cases covering UTC year rendering, `effectiveYear` precedence, fallback to `new Date()` (YEAR-02)
3. `meghalayan.test.js` — 12 test cases covering `Mgh`/`Ngp`/`Grn` abbreviations (not `Nrg`/`Ghg`), pre-Holocene em dash, stage boundary re-computation via `effectiveYear` (YEAR-03)
4. `custom.test.js` — 9 test cases covering `Y{year}` default prefix, `CE` string parsing, `opts.customLabel`/`opts.customLabelPosition`, `Y??` fallback (YEAR-04)

### Date renderer tests (`tests/formats/renderers/date/`)
5. `gregorian.test.js` — 8 test cases covering `M/D` UTC format without zero-padding, `+`/`-` solar divergence suffix (DATE-01)
6. `chinese.test.js` — 11 test cases covering `M{n} D{d}` normal, `MX D{d}` intercalary (not `M6X`), `+`/`-` suffix, `??` error paths (DATE-02)
7. `longitudinal.test.js` — 10 test cases covering `☉ {SL}° ☽ {LP}°` format, prefix stripping, `???` error tokens, no `+`/`-` suffix (DATE-03)
8. `year-boundary.test.js` — 13 integration test cases verifying `effectiveYear` drives all year renderers consistently across CNY boundary, Meghalayan stage boundaries, custom epoch computation (DATE-04)

## Commits

Each task committed atomically with `--no-verify`:
- `8d6b463` — test(11-01): add holocene year renderer test stub (YEAR-01)
- `97466c2` — test(11-01): add gregorian year renderer test stub (YEAR-02)
- `672ded5` — test(11-01): add meghalayan year renderer test stub (YEAR-03)
- `47b131c` — test(11-01): add custom epoch year renderer test stub (YEAR-04)
- `638ade7` — test(11-01): add gregorian date renderer test stub (DATE-01)
- `de37fbd` — test(11-01): add chinese date renderer test stub (DATE-02)
- `3d3fc42` — test(11-01): add longitudinal date renderer test stub (DATE-03)
- `9b59850` — test(11-01): add year boundary integration test stub (DATE-04)

## Test Status at Wave 0

Tests are **intentionally failing** — this is the expected Wave 0 state. Renderer stubs produce wrong output; Wave 1 and Wave 2 plans will implement the renderers to make these tests pass.

Summary of failures observed:
- `holocene.test.js`: partial failures (stub doesn't handle `effectiveYear`)
- `gregorian.test.js`: partial failures (stub uses `getFullYear` not `getUTCFullYear`, no `effectiveYear`)
- `meghalayan.test.js`: all fail (stub always outputs `Mgh {year}` with space, no stage routing)
- `custom.test.js`: most fail (stub outputs raw `CE7` not parsed year)
- `date/gregorian.test.js`: partial failures (no `+`/`-` suffix support)
- `date/chinese.test.js`: most fail (wrong leap format `6X` instead of `X`, no null guards)
- `date/longitudinal.test.js`: all fail (stub includes raw `SL`/`LP` prefixes in output)
- `date/year-boundary.test.js`: most fail (depends on `effectiveYear` support across all renderers)

## Deviations from Plan

None. All 8 files match the plan content exactly.

## Self-Check: PASSED

- [x] All 8 test files exist at correct paths
- [x] All files use `// @vitest-environment node`
- [x] All files use `import { render } from '../../../../src/formats/renderers/...'`
- [x] All 8 requirement IDs represented: YEAR-01, YEAR-02, YEAR-03, YEAR-04, DATE-01, DATE-02, DATE-03, DATE-04
- [x] Each task committed individually with `--no-verify`
- [x] Tests fail as expected (Wave 0 intent)
- [x] SUMMARY.md created
