# Phase 2 Summary: Modular Chronometry Core

**Status:** ✅ Complete
**Date:** 2026-04-13

## What Was Built

Extracted all 5 clock components into independent ES modules under `src/chronometers/`, implemented a composer/registry pattern with per-module error handling, added `lunar-javascript` for Chinese lunisolar calendar support, wrote 27 Vitest tests (21 unit + 6 integration), and transitioned the display format from `H{year} L{lunation}.{pct} D{days} @{beats} {solar}` to `H{year} M{month} D{day} @{beats} {solar}`.

## Files Created/Modified

### New files (13):
- `src/chronometers/index.js` — Composer with `compose(date, opts)`
- `src/chronometers/chineseNewYear.js` — Shared CNY utility
- `src/chronometers/holocene.js` — Holocene year (CNY-ticking)
- `src/chronometers/beats.js` — Swatch Internet Time
- `src/chronometers/solar.js` — Solar percent (S/N prefix)
- `src/chronometers/lunisolar.js` — Lunar month/day/leap
- `src/chronometers/oldSystem.js` — Legacy system (preserved, hidden)
- `vitest.config.js` — Test configuration
- `tests/pure/holocene.test.js` — 5 tests
- `tests/pure/beats.test.js` — 5 tests
- `tests/pure/solar.test.js` — 4 tests
- `tests/pure/lunisolar.test.js` — 4 tests
- `tests/pure/oldSystem.test.js` — 3 tests
- `tests/integration/composer.test.js` — 6 tests

### Modified files (2):
- `src/index.js` — Reduced from 185 lines to 33 lines (DOM + geolocation only)
- `package.json` — Added vitest, jsdom, test scripts

## Verification Results

- **Tests:** 27/27 passing (6 test files)
- **Build:** webpack 5.99.9 compiled successfully
- **No calculation functions** in src/index.js (verified via grep)
- **Composer** imports exactly 4 modules (holocene, beats, solar, lunisolar)
- **oldSystem.js** exists but NOT imported by composer
- **Display format:** `H{holocene} M{month/MX} D{day} @{beats} {solar}`
- **Immediate render:** `updateClock(null)` called before geolocation

## Key Decisions

1. **Holocene CNY ticking (D-03):** Before CNY of current year → use previous year + 9700. This means 2025-01-01 returns 11724 (2024+9700) since it's before CNY 2025-01-29.
2. **lunisolar leap month format:** Displayed as `MX` (e.g., `M6X` for leap 6th month) per D-04.
3. **oldSystem getNextNewMoon:** The `moonphase.new()` refinement API in astronomia v4 produces invalid results, so the iterated JDE from `moonphase.newMoon() + meanLunarMonth * n` is used directly (accurate enough for display).
4. **Test fixture adjustment:** Aug 1, 2025 is day 8 of leap 6th month (not day 1) — Jul 25, 2025 is the correct day 1. Tests use actual library output.
