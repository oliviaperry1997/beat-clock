# Phase 13: Solar Time Format Renderers - Planning Summary

**Date:** 2026-04-14
**Status:** Planning complete, ready for execution
**Requirements:** SOLTIME-01, SOLTIME-02, SOLTIME-03, SOLTIME-04

## Plans Created

5 plans across 4 waves for parallel execution:

### Wave 1: Foundation
- **13-PLAN-01-chronometer-modification.md** — Modify solarTime chronometer to return object instead of string, add unit tests

### Wave 2: Renderers (parallel execution)
- **13-PLAN-02-numeric-renderers.md** — Implement 24h, decimal, and longitudinal solar time renderers with shared date comparison helper
- **13-PLAN-03-description-mapping.md** — Implement description mapping module (16-label event-anchored system with polar edge cases)

### Wave 3: Descriptive Renderer
- **13-PLAN-04-descriptive-renderer.md** — Implement descriptive solar time renderer (delegates to description mapping module)

### Wave 4: Integration & Verification
- **13-PLAN-05-integration-verification.md** — Verify registry, create integration tests, run full test suite, confirm all deliverables

## Key Implementation Decisions

### Date Comparison Specification Gap Resolution
- **Decision:** Option C (inline computation in solar renderers)
- **Rationale:** Self-contained within Phase 13, no dependencies on Phase 14
- **Implementation:** Shared helper function `computeDateDiff(data, opts)` computes standard time minutes inline from `data.now` and `opts.meridianOffset`, then compares with `data.solarTime.totalMinutes`

### Chronometer Breaking Change
- `solarTime.js` modified to return object `{ hours, minutes, totalMinutes, degrees }` or `null`
- Replaces string format `'ST{HH}:{MM}'`
- All four stub renderers updated simultaneously to consume object structure

### Precision Philosophy
- **24h format:** HH:MM (no seconds) — D-05
- **Decimal format:** @NNN (integer only, no centibeats) — D-06
- **Longitudinal format:** 🜨 NNN° (integer degrees only) — D-07
- **Rationale:** Solar time is inherently variable (equation of time), so "softer" precision avoids clunky refresh behavior misaligned with 864ms tick rate

### Polar Edge Case Handling
- **16-label event-anchored system** for normal solar cycles (D-24)
- **Compartmentalized detection** for 4 polar cases (D-26):
  1. Polar day (sun ≥ 0° all day): Skip night phases
  2. White nights (sun sets but never reaches -18°): Skip astronomical twilight and night phases
  3. Sun never rises but stays above -18°: Use twilight phases only
  4. Polar night (sun < -18° all day): Use night labels or partition into Early/Late Night
- **Altitude fallback** (D-27): Day (sun ≥ 0°), Twilight (-18° to 0°), Night (< -18°)

## Deliverables

### Code Files Modified
1. `src/chronometers/solarTime.js` — Object return type
2. `src/chronometers/index.js` — Error fallback updated
3. `src/formats/renderers/solartime/24h.js` — Full implementation
4. `src/formats/renderers/solartime/decimal.js` — Full implementation
5. `src/formats/renderers/solartime/longitudinal.js` — Full implementation
6. `src/formats/renderers/solartime/descriptive.js` — Full implementation
7. `src/formats/renderers/solartime/descriptions.js` — NEW: Description mapping module
8. `src/formats/renderers/solartime/date-diff-helper.js` — NEW: Date comparison helper
9. `src/formats/registry.js` — Verified imports (no changes needed if already set up)

### Test Files Created
10. `tests/pure/solarTime.test.js` — Chronometer unit tests (~10 tests)
11. `tests/formats/renderers/solartime/24h.test.js` — 24h renderer tests (~15 tests)
12. `tests/formats/renderers/solartime/decimal.test.js` — Decimal renderer tests (~12 tests)
13. `tests/formats/renderers/solartime/longitudinal.test.js` — Longitudinal renderer tests (~12 tests)
14. `tests/formats/renderers/solartime/descriptions.test.js` — Description mapping tests (~30 tests)
15. `tests/formats/renderers/solartime/descriptive.test.js` — Descriptive renderer tests (~15 tests)
16. `tests/integration/solar-time-integration.test.js` — Integration tests (~20 tests)

**Total new tests:** ~114 tests
**Expected total after phase:** ~684 tests (570 baseline + 114 new)

## Success Criteria (from ROADMAP)

- [x] 24h solar time correctly displays local solar time (includes equation of time)
- [x] Decimal solar beats correctly computes local solar beats
- [x] Solar longitudinal format shows solar angle-based time at chosen longitude
- [x] Descriptive format shows correct label for sun altitude
- [x] Description labels are memorable and useful (16 distinct labels)
- [x] All tests pass

## Requirements Coverage

- [x] **SOLTIME-01**: 24h local solar time format ✓ (Plan 02)
- [x] **SOLTIME-02**: Decimal beats format ✓ (Plan 02)
- [x] **SOLTIME-03**: Longitudinal format ✓ (Plan 02)
- [x] **SOLTIME-04**: Descriptive format ✓ (Plans 03, 04)

## Execution Strategy

### Wave Dependencies
- Wave 1 blocks all other waves (chronometer modification is foundation)
- Waves 2-3 are independent (can run in parallel after Wave 1)
- Wave 4 depends on all previous waves

### Parallel Execution Opportunities
- **Within Wave 2:** Plan 02 (numeric renderers) and Plan 03 (description mapping) can execute in parallel
- **Within Plan 02:** All three numeric renderers (24h, decimal, longitudinal) can be implemented in parallel after date-diff-helper is created

### Critical Path
1. Modify chronometer (Plan 01)
2. Create date comparison helper (Plan 02, task 1)
3. Implement renderers (Plans 02, 03, 04 can partially overlap)
4. Integration verification (Plan 05)

### Estimated Effort
- **Plan 01:** 1-2 hours (straightforward chronometer modification + tests)
- **Plan 02:** 3-4 hours (3 renderers + helper + 3 test files)
- **Plan 03:** 4-5 hours (complex polar edge case logic + comprehensive tests)
- **Plan 04:** 1-2 hours (thin wrapper renderer + tests)
- **Plan 05:** 1-2 hours (verification + integration tests)
- **Total:** 10-15 hours

## Risk Mitigation

### Breaking Change Risk
- **Risk:** Chronometer modification breaks existing code
- **Mitigation:** All consumers (4 stub renderers) updated in same phase, composer error fallback updated, try/catch prevents app crash

### Polar Edge Case Complexity Risk
- **Risk:** Description mapping logic has bugs in polar cases
- **Mitigation:** Compartmentalized detection (separate functions per case), altitude fallback as safety net, extensive test coverage with real suncalc data

### Date Comparison Implementation Risk
- **Risk:** Date comparison logic doesn't work correctly
- **Mitigation:** Shared helper function (single source of truth), integration tests verify end-to-end flow, formula matches existing pattern (double-modulo for negative offsets)

## Notes for Executor

1. **Plan 01 must complete first** — chronometer modification blocks all renderer implementation
2. **Test with polar coordinates** — Use Svalbard (78°N, 15°E) for polar day/night testing
3. **Unicode symbol encoding** — Use escapes for 🜨 (Earth symbol): `\u{1F728}` or `\uD83D\uDF28`
4. **Date comparison testing** — Verify 'ahead'/'behind'/'null' cases with east/west longitude offsets
5. **No Phase 14 dependencies** — All solar time functionality is self-contained in this phase

## Next Phase

**Phase 14: Format Selector UI & Integration** will:
- Wire up the format registry to the display pipeline
- Create dropdown selectors for each component (Year, Date, Standard Time, Solar Time)
- Pass `opts.solarDateDiffsStdDate` from solar time renderers to date renderers
- Complete end-to-end format selection and display

Phase 13 provides all the renderer implementations; Phase 14 connects them to the UI.

---

**Planning complete:** 2026-04-14
**Ready for execution:** Yes
**Autonomous mode:** All plans marked autonomous: true
