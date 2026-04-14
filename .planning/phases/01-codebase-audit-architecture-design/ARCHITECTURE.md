# Beat Clock Architecture

**Phase:** 01 — Codebase Audit & Architecture Design
**Date:** 2026-04-13
**Status:** Proposed

---

## Requirements Mapping

| Requirement | Architecture Decision | Phase Reference |
|-------------|----------------------|-----------------|
| **REFACTOR-01**: Modular chronometry components — each clock element is an independent, pluggable module | Extract each calculation into a standalone ES module under `src/chronometers/` with a uniform `compute(date, opts)` contract. Composer pattern aggregates results. No shared mutable state. | Phase 1 (this document) |
| **REFACTOR-02**: Swappable time systems — toggle between different calendar/time display configurations | Composer decouples rendering from calculation. Adding or removing a chronometer = one import line change. Future: config-driven composer that reads enabled modules from a settings object. | Phase 1 (foundation), Phase 2 (toggle UI) |
| **REFACTOR-03**: Code organization — clean file structure separating concerns | Single `chronometers/` directory with one file per time system. Entry point (`index.js`) handles DOM and geolocation only. No business logic in entry point after migration. | Phase 1 (this document) |

---

## Current Architecture

### File Structure

```
src/
├── index.js          # All logic — 161 lines, single file (D-18: audit depth confirmed)
├── styles.css        # Minimal styling
└── template.html     # HTML shell
```

### Function Table

| Function | Lines | Type | Dependencies | Complexity | Extraction Difficulty |
|----------|-------|------|--------------|------------|----------------------|
| `getHoloceneYear` | 5-7 | Pure | None | O(1) | Trivial |
| `marchEquinoxJDE` | 9-18 | Pure | None | O(1) | Trivial |
| `getSpringEquinox` | 20-30 | Pure | `marchEquinoxJDE`, `astronomia/julian` | O(1) | Low |
| `getDaysSinceEquinox` | 32-35 | Pure | None | O(1) | Trivial |
| `getLunationSinceEquinox` | 37-52 | Pure | `getNextNewMoon` | O(1) | Low |
| `getNextNewMoon` | 54-77 | Approximate search | `suncalc` | O(n) ~700 iterations | Medium |
| `getBeats` | 79-87 | Pure | None | O(1) | Trivial |
| `getNextSunrise` | 89-99 | Pure | `suncalc` | O(1) | Low |
| `getPreviousSunset` | 101-111 | Pure | `suncalc` | O(1) | Low |
| `getSolarPercent` | 113-127 | Pure | `suncalc`, `getNextSunrise`, `getPreviousSunset` | O(1) | Low |
| `updateClock` | 130-140 | Side-effect | All calculation functions | O(1) | N/A (DOM logic) |
| `convertGregorianToCustom` | 142-157 | Side-effect | All calculation functions | O(1) | N/A (DOM logic) |

### Update Interval

- **864ms** — approximately 1 Swatch beat (1 beat = 86.4 seconds / 100 = 0.864 seconds)
- Dominated by DOM update cost, not calculation time

### 23:00 UTC Equinox Anchor

The equinox date is shifted to the previous 23:00 UTC for day-counting purposes:

```js
anchorTime.setUTCHours(23, 0, 0, 0);
if (equinoxDateUTC.getUTCHours() < 23) {
  anchorTime.setUTCDate(anchorTime.getUTCDate() - 1);
}
```

This creates a day boundary at 23:00 UTC instead of midnight, likely to align with the beat clock's UTC+1 (Biel Mean Time) bias. **This is a deliberate design decision, not a bug.** When replacing the equinox anchor with Chinese New Year (per D-03), the anchor semantics must be decided explicitly.

### Geolocation Bootstrap

```js
navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
```

- Success: stores `{ latitude, longitude }`, calls `updateClock`, sets 864ms interval
- Error: calls `updateClock(null)`, solar falls back to `'S??'`
- **BUG:** No immediate render on load — first render waits for geolocation callback (violates D-09)

### Current Display Format

```
H{holoceneYear} L{moon.lunation}.{moon.percent} D{daysSinceEquinox} @{beats} {solar}
```

Example: `H12026 L3.47 D23 @672.34 S75`

---

## Issue Inventory

| # | Issue | Severity | Notes |
|---|-------|----------|-------|
| 1 | No immediate render on load (violates D-09) | **High** | Must fix during migration — render with `null` location first, then re-render when geolocation resolves |
| 2 | `suncalc` moon phase accuracy +/-6 hours | Medium | Acceptable for current display use; borderline for Chinese New Year boundary determination |
| 3 | `getNextNewMoon` hourly stepping (~700 iterations) | Medium | Will be replaced by `astronomia/moonphase.newMoon()` during migration — single O(1) call |
| 4 | Fixed lunar cycle constant (29.53059) vs astronomia's (29.530588861) | Low | Negligible display impact; standardize during migration |
| 5 | `marchEquinoxJDE` re-implements astronomia's solstice table | Low | Dead code — `astronomia/solstice` already provides this functionality |
| 6 | `convertGregorianToCustom` duplicates `updateClock` logic | Low | DRY issue; both functions perform identical calculations |
| 7 | No error handling for invalid dates in `convertGregorianToCustom` | Low | Returns `null` with `console.error` only |
| 8 | Webpack config is development-only (no production mode) | Low | Out of scope for Phase 1 |

---

## Proposed Modular Architecture

### File Structure

```
src/
├── index.js                    # Entry point: DOM update + geolocation bootstrap only
├── styles.css                  # Visual styling (Phase 4: atmospheric redesign)
├── template.html               # HTML shell
└── chronometers/
    ├── index.js                # Composer — imports and calls all chronometers
    ├── chineseNewYear.js       # Shared utility: Chinese New Year date lookup (D-03 coupling)
    ├── holocene.js             # Holocene year (ticks on Chinese New Year per D-03)
    ├── beats.js                # Swatch Internet Time
    ├── solar.js                # Solar percent (location-dependent)
    ├── lunisolar.js            # Chinese lunisolar date: { year, month, day, isLeap }
    └── oldSystem.js            # Legacy: lunation + days since equinox (preserved, hidden)
```

### Module Contract

Every chronometer module follows this uniform interface:

```js
/**
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @param {number} [opts.latitude] - Latitude for location-dependent calculations
 * @param {number} [opts.longitude] - Longitude for location-dependent calculations
 * @returns {object|string|number} Result specific to this chronometer
 */
export function compute(date, opts) { ... }
```

This contract (D-12: functional ES modules) ensures:
- All chronometers are independently testable
- No shared mutable state between modules
- Adding a new chronometer = write one file + one import in composer
- The composer can call each module without knowing its internal logic

### Composer Pattern

The composer (`chronometers/index.js`) is a simple aggregator:

```js
import { compute as holocene } from './holocene.js';
import { compute as beats } from './beats.js';
import { compute as solar } from './solar.js';
import { compute as lunisolar } from './lunisolar.js';

export function compose(date, opts) {
  return {
    holocene: holocene(date, opts),
    beats: beats(date, opts),
    solar: solar(date, opts),
    lunisolar: lunisolar(date, opts),
  };
}
```

**Design notes:**
- `oldSystem.js` is NOT imported by the composer. It lives in `chronometers/` for preservation and reference during Phase 2, but produces no output in the new display format (D-06 through D-08: existing systems kept as-is during audit, but hidden in new display).
- The composer is the single point where display composition is defined. Changing the display format = changing the composer's return object.
- Future: config-driven composer that reads enabled modules from a settings object (REFACTOR-02 foundation).

### D-03 Coupling Note

**D-03 states:** "Holocene year number is retained but ticks on Chinese New Year instead of Spring Equinox."

This creates a dependency: `holocene.js` needs to know when Chinese New Year occurs to decide whether the Holocene year has incremented. Both `holocene.js` and `lunisolar.js` need Chinese New Year date lookup.

**Resolution:** Extract Chinese New Year calculation into a shared utility `chineseNewYear.js` that both modules import. This preserves module independence while sharing the expensive calendar lookup:

```
holocene.js      ──import──► chineseNewYear.js
lunisolar.js     ──import──► chineseNewYear.js
```

Neither `holocene.js` nor `lunisolar.js` imports the other — they share a dependency, not a direct coupling.

---

## Library Strategy

### Current Dependencies

| Library | Version | Purpose | Keep? |
|---------|---------|---------|-------|
| `suncalc` | v1.9.0 | Sunrise/sunset times, moon illumination | **Keep** for sunrise/sunset only (adequate ~1-min accuracy for solar percent, ~6KB minified) |
| `astronomia` | v4.1.1 | Julian dates, equinox, precise astronomical calculations | **Keep** — expand usage to `moonphase.newMoon()` and `solstice` modules |

### Proposed Additions

| Library | Version | Purpose | License | Bundle Size | Dependencies |
|---------|---------|---------|---------|-------------|--------------|
| `lunar-javascript` (6tail) | v1.7.7 | Chinese lunisolar calendar (year, month, day, leap months, solar terms) | MIT | ~50-70KB minified (~15-20KB gzipped) | Zero runtime deps |

### Migration Impact

- `lunar-javascript` is CommonJS (`module.exports`) — Webpack handles CJS-to-ESM interop transparently, no config changes needed
- No dependency conflicts — all three libraries are independent
- Total bundle increase: ~50-70KB minified (acceptable for project performance constraints; DOM update dominates at 864ms intervals)
- Tree-shaking: `lunar-javascript` is CommonJS and not tree-shakeable by Webpack. The entire library will be bundled. This is acceptable.

### Library Roles After Migration

| Calculation | Library | Notes |
|-------------|---------|-------|
| Sunrise/sunset times | `suncalc` | Keep existing usage |
| Solar position for solar percent | `suncalc` | Keep existing usage |
| Julian date conversions | `astronomia/julian` | Keep existing usage |
| Equinox/solstice dates | `astronomia/solstice` | Replace `marchEquinoxJDE` (Issue #5) |
| Precise new moon JDE | `astronomia/moonphase` | Replace `getNextNewMoon` (Issue #3) |
| Chinese New Year date | `lunar-javascript` | New dependency, replaces all custom lunar logic |
| Lunisolar year/month/day | `lunar-javascript` | New dependency, provides leap month detection |

---

## Migration Plan

### Extraction Order (per D-22: incremental migration, no branch-and-rewrite)

| Order | Module | Dependencies | Rationale | Verification |
|-------|--------|-------------|-----------|-------------|
| 1 | `holocene.js` | None (pure Date operation) | Zero deps, simplest extraction. Ideal first module to validate the extraction process. | Output matches `getHoloceneYear()` byte-for-byte for current date. |
| 2 | `beats.js` | None (pure Date operation) | Zero deps, independent of other modules. Validates the `compute(date, opts)` contract pattern. | Output matches `getBeats()` byte-for-byte for current time. |
| 3 | `solar.js` | `suncalc`, location | Depends on geolocation but isolated from other chronometers. Validates location-dependent module pattern. | Output matches `getSolarPercent()` for known lat/lon pairs including null fallback. |
| 4 | `lunisolar.js` | `lunar-javascript` (new dep) | The major new module. Replaces old lunation+equinox logic entirely. Introduces Chinese New Year anchoring. | Year, month, day, and leap status match `lunar-javascript` output for known dates. |
| 5 | `oldSystem.js` | Existing logic only | Existing lunation + equinox logic preserved as hidden module. Not imported by composer. Provides reference implementation during Phase 2. | Output matches current display format for verification during transition. |

### Per-Extraction Verification Steps

After each extraction:
1. Remove the original function from `src/index.js`
2. Import from the new module in `chronometers/index.js`
3. Verify the clock still renders correctly (output string must remain byte-for-byte identical for extractions 1-3)
4. Commit atomically with descriptive message (e.g., "Extract holocene chronometer")
5. Run existing application in browser to confirm visual parity

### Display Format Transition

| Phase | Format | Components |
|-------|--------|------------|
| **Current** (pre-migration) | `H{year} L{lunation}.{percent} D{days} @{beats} {solar}` | Holocene year, lunation since equinox, days since equinox, Swatch beats, solar percent |
| **After lunisolar module** (Phase 1 migration) | `H{year} L{lunation}.{percent} D{days} @{beats} {solar}` | Same format — `oldSystem.js` provides legacy values. Lunisolar data computed but not yet displayed. |
| **After Phase 2** (when old system is replaced) | `H{year} M{month} D{day} @{beats} {solar}` | Holocene year (ticks on CNY), Chinese lunisolar month, day, Swatch beats, solar percent |

The display format change is **deferred to Phase 2**. During Phase 1, the new modules are extracted but the output format remains unchanged. The `oldSystem.js` module provides the legacy `L{num}.{pct} D{days}` values while the `lunisolar.js` module is developed and tested in parallel.

### Immediate Render Fix (D-09)

**Current behavior:** First render waits for `navigator.geolocation.getCurrentPosition` callback. If geolocation is slow or the user is prompted for permission, the clock shows nothing.

**Required behavior:** Render immediately on page load with `null` location (solar shows `S??`), then re-render when geolocation resolves.

**Implementation:**
```js
// Render immediately with null location
updateClock(null);
const intervalId = setInterval(() => updateClock(null), 864);

if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      // Update interval to use real location
      clearInterval(intervalId);
      updateClock(userLocation);
      setInterval(() => updateClock(userLocation), 864);
    },
    (error) => {
      // Already rendering with null — no action needed
      console.warn("Geolocation failed:", error.message);
    }
  );
}
```

This fix is applied during the migration of `index.js` entry point logic (after all chronometers are extracted).

### REFACTOR Mapping

| Requirement | Status After Phase 1 |
|-------------|---------------------|
| **REFACTOR-01**: Modular chronometry components | **Done** — all calculations extracted into independent `chronometers/` modules with uniform `compute(date, opts)` contract |
| **REFACTOR-02**: Swappable time systems | **Foundation laid** — composer pattern enables adding/removing modules with one import line. Toggle UI deferred to Phase 2. |
| **REFACTOR-03**: Code organization | **Done** — clean `src/chronometers/` directory with one file per time system. Entry point handles DOM and geolocation only. |

---

## Edge Cases

| Edge Case | Description | Handling |
|-----------|-------------|----------|
| **Leap month display** (D-04) | Chinese lunisolar calendar has leap months (e.g., leap 4th month). Decision D-04: display as `MX` where X is the month number. | `lunar-javascript` returns negative month number for leap months (e.g., -4 = leap 4th month). Check `month < 0` and format as `M{Math.abs(month)}`. |
| **Polar sunrise/sunset** | Above Arctic/Antarctic Circle, sun may not rise or set for months. `suncalc` returns `undefined`. | Current code returns `'S??'`. Preserved in new `solar.js` module via the `getNextSunrise` / `getPreviousSunset` fallback loop (searches up to 3 days). |
| **Geolocation permission denied** | User blocks geolocation request. | Falls back to `null` location, solar shows `'S??'`. Immediate render still works (D-09 fix). |
| **Geolocation timeout** | GPS takes too long to respond. | Error handler called — same fallback as permission denied. |
| **Chinese New Year before Feb 1** | In some years, CNY falls in late January. Holocene year logic must handle this correctly. | `chineseNewYear.js` utility handles all CNY dates in 1900-2100 range. `holocene.js` compares current date against CNY to decide year. |
| **Pre-1900 dates** | Outside `lunar-javascript`'s calculation range (1900-2100). | Not a practical concern — the clock displays current time. If `convertGregorianToCustom` is called with pre-1900 dates, return error or fallback. |
| **Equinox on March 19 or 21** | March equinox can fall on March 19, 20, or 21 UTC depending on year. | `astronomia/solstice` handles this precisely. Replaces the polynomial approximation in `marchEquinoxJDE`. |
| **New moon near midnight UTC** | `suncalc`'s +/-6 hour moon phase error could shift the detected new moon by a day. | Replaced by `astronomia/moonphase.newMoon()` which provides sub-second accuracy (Meeus Chapter 49 with full periodic term corrections). |
| **`convertGregorianToCustom` invalid date** | Passing an unparsable date string. | Current: `console.error` + return `null`. New: throw `TypeError` with descriptive message. |

---

## Deferred Items

The following items are explicitly out of scope for Phase 1 and will be addressed in future phases:

- **Sexagenary cycle** (60-year heavenly stems + earthly branches) — D-02: simpler version chosen; may be added in Phase 5 for advanced display modes
- **24 solar terms** (节气) — D-02: excluded from simpler version; available via `lunar-javascript`'s `getJieQi()` API when needed
- **Multi-line/stacked display format** (Phase 5) — current single-line format (D-05) is maintained; multi-line display deferred
- **Production Webpack configuration** (Issue #8) — out of scope for Phase 1; addressed during Phase 4 visual redesign or deployment prep
- **`convertGregorianToCustom` DRY refactor** (Issue #6) — low severity; deferred until Phase 4 (Datetime Converters)
- **Error handling improvements** (Issue #7) — low severity; deferred to Phase 4 alongside the converter refactor

---

## Phase 1 Deliverables Checklist

- [x] **ARCHITECTURE.md** — This document: complete architecture specification with module contracts, library strategy, migration plan, edge cases, and requirements mapping
- [x] **1-CONTEXT.md** — Phase context, project background, and decision history (pre-existing)
- [x] **1-PLAN.md** — Phase execution plan with task breakdown (pre-existing)
- [x] **1-RESEARCH.md** — Comprehensive research including codebase audit, library evaluation, and technical domain analysis (pre-existing)

All Phase 1 deliverables complete. Ready for `/gsd-transition` to Phase 2.
