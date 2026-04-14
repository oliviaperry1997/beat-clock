---
plan: 12-03
phase: 12
title: Longitudinal renderer implementation + tests
status: complete
started: 2026-04-14
completed: 2026-04-14
---

# Summary: Plan 12-03 — Longitudinal Renderer Implementation + Tests

## What Was Built

Replaced the stub `src/formats/renderers/stdtime/longitudinal.js` (which used the wrong `☉` symbol and `opts.longitudeOffset`) with a full production implementation that:
- Expresses time as 0–360° on the daily arc (0° = meridian midnight, 180° = meridian noon)
- Uses `⌚` (U+231A WATCH) symbol, not `☉` (U+2609 SUN)
- Applies fractional `meridianOffset` (hours) with double-modulo handling
- Handles midnight crossing (both directions)
- Returns `'⌚ ???°'` error fallback when `data` is null/undefined
- Falls back to `new Date()` when `data.now` is absent or invalid

Created comprehensive test suite at `tests/formats/renderers/stdtime/longitudinal.test.js` with 24 tests.

## Key Files

### key-files.created
- tests/formats/renderers/stdtime/longitudinal.test.js

### key-files.modified
- src/formats/renderers/stdtime/longitudinal.js

## Deviations from Plan

None. All test expectations verified against manual calculations.

## Verification

- `npx vitest run tests/formats/renderers/stdtime/longitudinal.test.js` → 24 tests, all pass

## Self-Check: PASSED
