---
plan: 12-02
phase: 12
title: Decimal beats renderer implementation + tests
status: complete
started: 2026-04-14
completed: 2026-04-14
---

# Summary: Plan 12-02 — Decimal Beats Renderer Implementation + Tests

## What Was Built

Replaced the stub `src/formats/renderers/stdtime/decimal.js` with a full production implementation that:
- Recomputes beats from meridian midnight using `data.now` — does NOT use `data.beats`
- Applies fractional `meridianOffset` (hours) converted to milliseconds
- Handles midnight crossing (both directions) via double-modulo
- At `meridianOffset: 1` (BMT/UTC+1), output matches `beats.js compute()` exactly
- Returns `'@???'` error fallback when `data` is null/undefined
- Falls back to `new Date()` when `data.now` is absent or invalid

Created comprehensive test suite at `tests/formats/renderers/stdtime/decimal.test.js` with 23 tests including cross-renderer consistency check against `beats.js`.

## Key Files

### key-files.created
- tests/formats/renderers/stdtime/decimal.test.js

### key-files.modified
- src/formats/renderers/stdtime/decimal.js

## Deviations from Plan

None. All test expectations verified against manual calculations and implementation matches spec exactly.

## Verification

- `npx vitest run tests/formats/renderers/stdtime/decimal.test.js` → 23 tests, all pass

## Self-Check: PASSED
