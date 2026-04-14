# Phase 13: Solar Time Format Renderers - Research

## RESEARCH COMPLETE

**Researcher:** gsd-phase-researcher  
**Date:** 2026-04-14  
**Phase:** 13 — Solar Time Format Renderers  
**Requirements:** SOLTIME-01, SOLTIME-02, SOLTIME-03, SOLTIME-04

---

## Executive Summary

Phase 13 implements four solar time renderers plus a description mapping module by modifying the existing `solarTime` chronometer to return an object instead of a string, then building renderers that consume this structured data. The phase has 35 locked decisions covering chronometer data shape, precision philosophy, format specifications, polar edge cases, and solar/standard date comparison logic.

**Key insights for planning:**

1. **Chronometer modification is the foundation**: The existing `solarTime.js` chronometer (Phase 9) currently returns `'ST{HH}:{MM}'` strings but must be modified to return `{ hours, minutes, totalMinutes, degrees }` objects. This is a breaking change that requires updating both the chronometer and all four renderer stubs simultaneously.

2. **Renderer architecture is well-established**: Phase 11 and Phase 12 established clear patterns: named `render(data, opts)` exports, null-safe data access (`data?.solarTime`), consistent error fallbacks matching output width, and zero-throw error handling. All solar time renderers must follow these patterns.

3. **suncalc polar edge cases are well-documented**: Testing confirms that `suncalc.getTimes()` returns `Invalid Date` for events that don't occur (polar day, polar night, white nights). The descriptive renderer must detect missing events via `isNaN(event.getTime())` checks and apply compartmentalized fallback logic.

4. **Date comparison logic is a cross-cutting concern**: Solar time renderers must compute whether the solar date differs from the standard date and pass `opts.solarDateDiffsStdDate` to date renderers. This requires access to both `data.solarTime.totalMinutes` and a standard time analog (which doesn't exist in the current chronometer output — a gap identified in research).

5. **Test coverage is extensive but focused**: Phase 12 tests show the pattern: basic format validation, meridian offset handling, midnight crossing, extreme offsets, error fallbacks. Solar time tests should mirror this structure but replace meridian offsets with location-dependent solar calculations.

---

## Renderer Architecture Patterns

### Common Renderer Structure (from Phase 11/12)

All renderers follow this contract:

```javascript
/**
 * [Renderer name and purpose]
 * @param {object} data - Chronometer data from compose()
 * @param {object} [opts] - Pipeline options
 * @returns {string} Formatted string, never throws
 */
export function render(data, opts = {}) {
  // 1. Null-safe data access with early error fallback
  if (data == null) return '[fallback]';
  
  // 2. Extract and validate required data
  const source = data?.[sourceKey];
  if (!source) return '[fallback]';
  
  // 3. Extract opts with defaults
  const option = opts.optionName ?? defaultValue;
  
  // 4. Compute output in try/catch
  try {
    // ... formatting logic ...
    return formattedString;
  } catch (_) {
    return '[fallback]';
  }
}
```

### Key Patterns Observed

**Error fallback philosophy** (from Phase 11 D-32, Phase 12 D-04):
- Error strings match expected output width: `'??:??'` for `HH:MM`, `'@???'` for `@NNN`, `'🜨 ???°'` for degrees
- Fallbacks use Unicode escapes when necessary: `'\u23F2 ???\u00B0'` prevents encoding issues
- Never throw exceptions — always return a valid string

**Null-safe data access pattern** (from Phase 11/12 implementations):
- Check `data == null` first (catches both `null` and `undefined`)
- Use optional chaining: `data?.solarTime`
- Provide fallback: `const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();`

**Opts handling pattern** (from Phase 12 D-25):
- All opts have defaults: `const meridianOffset = opts.meridianOffset ?? 0;`
- Consistent naming across related renderers: `opts.meridianOffset` for all three stdtime renderers
- Optional flags use boolean defaults: `opts.showSeconds` defaults to `false`

**Date object validation** (from stdtime/24h.js:30):
```javascript
const raw = data.now;
const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();
```

**Zero-padding and formatting** (from stdtime/24h.js:37-38):
```javascript
const h = String(adjustedHours).padStart(2, '0');
const m = String(now.getUTCMinutes()).padStart(2, '0');
```

**Mathematical wrapping** (from stdtime/decimal.js:45):
```javascript
// Double-modulo handles both positive and negative values
const adjustedMs = ((msOfDay + meridianOffsetMs) % 86400000 + 86400000) % 86400000;
```

### Integration with Registry

From `src/formats/registry.js`:
- Registry imports renderers as named `render` functions: `import { render as render24hSolarTime } from './renderers/solartime/24h.js';`
- Registry mapping: `solarTime: { '24h': render24hSolarTime, decimal: renderDecimalSolarTime, ... }`
- Registry already has all four solar time renderers imported (lines 25-28)
- No registry modifications needed — only update the renderer implementations

---

## solarTime Chronometer Current State

### Current Implementation

File: `src/chronometers/solarTime.js` (38 lines)

**Current return type:** String (`'ST{HH}:{MM}'`)

**Current formula:**
1. Validates `latitude` and `longitude` from `opts` (returns `'ST??'` if missing)
2. Computes equation of time using `astronomia.eqtime.eSmart(jde)` (in radians, converted to minutes)
3. Computes longitude offset: `longitude * 4` minutes
4. Adds offsets to UTC time: `utcMinutes + lonOffsetMin + eotMin`
5. Normalizes to 0-1440 range: `((solarMinutes % 1440) + 1440) % 1440`
6. Rounds minutes: `Math.round(normalized % 60)`
7. Returns formatted string: `ST{HH}:{MM}`

### Required Modifications (per D-01, D-02, D-03)

**New return type:** Object or `null`

```javascript
{
  hours: 14,           // 0-23, solar hours since solar midnight
  minutes: 32,         // 0-59
  totalMinutes: 872,   // minutes since solar midnight (for degree conversion)
  degrees: 218.0       // (totalMinutes / 1440) * 360, for longitudinal renderer
}
```

**Error case:** Return `null` when latitude/longitude unavailable (replaces `'ST??'` string)

**Backward compatibility consideration:** The existing stub renderers in `src/formats/renderers/solartime/*.js` currently check for string fallback (`typeof solarTime === 'string'`). These checks must be removed as part of Phase 13 implementation.

### Modification Strategy

The chronometer modification is straightforward:

1. Keep all existing calculation logic (equation of time, longitude offset, normalization)
2. Change lines 34-37 from:
   ```javascript
   const hours = Math.floor(normalized / 60);
   const minutes = Math.round(normalized % 60);
   return `ST${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
   ```
   To:
   ```javascript
   const hours = Math.floor(normalized / 60);
   const minutes = Math.round(normalized % 60);
   const totalMinutes = hours * 60 + minutes;
   const degrees = (totalMinutes / 1440) * 360;
   return { hours, minutes, totalMinutes, degrees };
   ```
3. Change line 15 from `return 'ST??';` to `return null;`

**Testing impact:** The chronometer has no existing unit tests (confirmed by absence in `tests/pure/` directory). New tests should be added as part of Phase 13.

---

## suncalc Library API

### getTimes() Method

**Signature:** `SunCalc.getTimes(date, latitude, longitude)`

**Returns:** Object with event times as `Date` objects (or `Invalid Date` for missing events)

**Available events** (from testing and existing code):
- `solarNoon` — Sun at highest altitude
- `nadir` — Sun at lowest altitude (solar midnight)
- `sunrise` — Sun crosses horizon (0° altitude) ascending
- `sunset` — Sun crosses horizon (0° altitude) descending
- `sunriseEnd` — Bottom edge of sun leaves horizon
- `sunsetStart` — Bottom edge of sun touches horizon
- `dawn` — Civil dawn (sun at -6° altitude)
- `dusk` — Civil dusk (sun at -6° altitude)
- `nauticalDawn` — Nautical dawn (sun at -12° altitude)
- `nauticalDusk` — Nautical dusk (sun at -12° altitude)
- `nightEnd` — Astronomical dawn (sun at -18° altitude)
- `night` — Astronomical dusk (sun at -18° altitude)
- `goldenHourEnd` — Morning golden hour ends (sun at 6° altitude)
- `goldenHour` — Evening golden hour begins (sun at 6° altitude)

### Events Used in Phase 13 (per D-25)

Required for descriptive renderer:
- `sunrise` — Horizon crossing ascending (0°)
- `sunset` — Horizon crossing descending (0°)
- `solarNoon` — Highest altitude
- `nightEnd` — Astronomical dawn (-18°)
- `night` — Astronomical dusk (-18°)
- **Midnight** — Computed as `solarNoon + 12 hours` (not provided by suncalc)

### Missing Event Detection

**Signal:** When an event doesn't occur, `getTimes()` returns an `Invalid Date` object for that event.

**Detection pattern** (from `src/sky.js:59`):
```javascript
const times = SunCalc.getTimes(date, latitude, longitude);
if (!sunrise || !sunset || !dawn || !dusk) {
  return { phase: 'deep-night', progress: 0 };
}
```

**Validation pattern** (from `src/chronometers/solar.js:20`):
```javascript
if (!sunrise || !sunset || isNaN(sunrise.getTime()) || isNaN(sunset.getTime())) {
  return 'S??';
}
```

**Best practice for Phase 13:**
```javascript
const times = SunCalc.getTimes(date, latitude, longitude);
const hasEvent = (event) => event && event instanceof Date && !isNaN(event.getTime());
const hasSunrise = hasEvent(times.sunrise);
const hasSunset = hasEvent(times.sunset);
```

### Tested Polar Cases

**Test location:** Svalbard (78°N, 15°E)

**Polar day (June 21):**
```javascript
sunrise: Invalid Date    // Sun never dips below horizon
sunset: Invalid Date
nightEnd: Invalid Date   // Sun never reaches -18°
night: Invalid Date
solarNoon: [valid]       // Sun still has a highest point
```

**Polar night (December 21):**
```javascript
sunrise: Invalid Date    // Sun never rises above horizon
sunset: Invalid Date
nightEnd: 2026-12-21T06:38:26.816Z  // Sun reaches -18° (twilight exists!)
night: 2026-12-21T15:20:00.533Z
solarNoon: [valid]       // Sun still has a highest point (below horizon)
```

**Key insight:** Polar night still has twilight phases when the sun is between -18° and 0°. The "sun never rises but stays above -18°" case (D-26.3) is not tested but theoretically possible at latitudes near the polar circle.

---

## Polar Edge Case Matrix

### Edge Cases from D-26

| Case | Condition | Missing Events | Available Events | Descriptive Strategy |
|------|-----------|----------------|------------------|----------------------|
| **1. Polar day** | Sun ≥ 0° all day | sunrise, sunset, nightEnd, night | solarNoon, (nadir) | Skip night phases, use day phases only: Late Afternoon → Early Morning |
| **2. White nights** | Sun sets but never reaches -18° | nightEnd, night | sunrise, sunset, solarNoon, (nadir) | Skip astronomical twilight and night phases: Evening Twilight → Morning Twilight |
| **3. Twilight only** | Sun never rises but stays above -18° | sunrise, sunset, night, nightEnd (possibly) | solarNoon, nadir, twilight events | Use twilight phases only, skip day and deep night |
| **4. Polar night** | Sun < -18° all day | sunrise, sunset | nightEnd, night, solarNoon, nadir | Use night label only, or partition into Early Night → Midnight → Late Night using computed midnight |

### Detection Logic Pattern

**Compartmentalized detection** (per D-26 philosophy):

```javascript
const times = SunCalc.getTimes(date, latitude, longitude);
const hasSunrise = hasEvent(times.sunrise);
const hasSunset = hasEvent(times.sunset);
const hasNightEnd = hasEvent(times.nightEnd);
const hasNight = hasEvent(times.night);

// Case 1: Polar day
if (!hasSunrise && !hasSunset && !hasNightEnd && !hasNight) {
  return polarDayLabels(date, times);
}

// Case 2: White nights
if (hasSunrise && hasSunset && !hasNightEnd && !hasNight) {
  return whiteNightLabels(date, times);
}

// Case 3: Polar night (sun never above -18°)
if (!hasSunrise && !hasSunset && hasNightEnd && hasNight) {
  return polarNightLabels(date, times);
}

// Case 4: Normal solar cycle
return normalLabels(date, times);
```

### Fallback Altitude Bands (D-27)

When events are missing or edge case detection fails, use simplified altitude-based labels:
- Sun ≥ 0°: "Day"
- Sun -18° to 0°: "Twilight"
- Sun < -18°: "Night"

**Implementation note:** This requires `SunCalc.getPosition(date, latitude, longitude).altitude` to determine current sun altitude. The `getPosition()` method is available in suncalc (confirmed from documentation).

---

## Test Patterns and Approaches

### Renderer Test Structure (from Phase 12)

**File location:** `tests/formats/renderers/solartime/*.test.js`

**Test categories observed:**
1. **Basic output format** — Verify correct format with known inputs
2. **Data variants** — Different chronometer data shapes
3. **Opts handling** — Default opts, custom opts, missing opts
4. **Edge cases** — Boundary values, wraparound, extreme inputs
5. **Error fallbacks** — Null data, undefined data, invalid data

**Example from `tests/formats/renderers/stdtime/24h.test.js`:**
- 163 lines, 27 test cases
- Organized in `describe()` blocks by category
- Uses fixed `Date.UTC()` timestamps for reproducibility
- Tests both default and explicit opts values
- Verifies fallback strings match expected format

### Solar Time Test Approach

**Challenge:** Solar time depends on location and equation of time, making it harder to create reproducible test cases than stdtime (which only depends on UTC offset).

**Recommended strategy:**

1. **Mock chronometer data** (not real solar calculations):
   ```javascript
   const mockSolarTime = {
     hours: 14,
     minutes: 32,
     totalMinutes: 872,
     degrees: 218.0
   };
   const data = { solarTime: mockSolarTime };
   ```

2. **Test renderers independently from chronometer** — Phase 13 tests should verify that renderers correctly format the data structure, not that solar calculations are correct (chronometer tests cover that).

3. **Use known reference dates for integration tests** — E.g., equinoxes at specific latitudes where solar time ≈ clock time, simplifying validation.

4. **Polar edge case tests use Invalid Date detection:**
   ```javascript
   it('returns fallback label when all events are invalid', () => {
     const data = {
       solarTime: { hours: 12, minutes: 0, totalMinutes: 720, degrees: 180 },
       location: { latitude: 89, longitude: 0 },
       now: new Date('2026-12-21T12:00:00Z')
     };
     const result = renderDescriptive(data);
     expect(result).toBe('Night'); // fallback for polar night
   });
   ```

**Test file organization:**
- `tests/formats/renderers/solartime/24h.test.js` — 24h solar time renderer
- `tests/formats/renderers/solartime/decimal.test.js` — Decimal solar beats
- `tests/formats/renderers/solartime/longitudinal.test.js` — Longitudinal solar time
- `tests/formats/renderers/solartime/descriptive.test.js` — Descriptive labels
- `tests/formats/renderers/solartime/descriptions.test.js` — Description mapping module (if exported separately)

---

## Date Comparison Integration

### How Phase 11 Date Renderers Consume the Flag

From `src/formats/renderers/date/gregorian.js:27-29`:
```javascript
const suffix = opts.solarDateDiffsStdDate === 'ahead' ? '+'
             : opts.solarDateDiffsStdDate === 'behind' ? '-'
             : '';
return `${month}/${day}${suffix}`;
```

**Pattern:** Simple ternary chain checking for `'ahead'` or `'behind'` string values.

**Used by:** Gregorian date renderer (D-17) and Chinese date renderer (D-21). Longitudinal date renderer does not use it (D-26, D-33).

### Solar Time Renderer Responsibility (D-30 through D-35)

**Comparison logic** (D-32):
```javascript
const solarDayOfYear = Math.floor(data.solarTime.totalMinutes / 1440);
const stdDayOfYear = Math.floor(data.stdTime.totalMinutes / 1440);
```

**Result values** (D-33):
- `'ahead'` when `solarDayOfYear > stdDayOfYear` (user is east of standard meridian)
- `'behind'` when `solarDayOfYear < stdDayOfYear` (user is west of standard meridian)
- `null` or absent when dates match

**Implementation location** (D-35): Shared helper function that all three solar time renderers call before returning. Suggested signature:
```javascript
function computeDateDiff(solarTime, stdTime) {
  if (!solarTime || !stdTime) return null;
  const solarDay = Math.floor(solarTime.totalMinutes / 1440);
  const stdDay = Math.floor(stdTime.totalMinutes / 1440);
  if (solarDay > stdDay) return 'ahead';
  if (solarDay < stdDay) return 'behind';
  return null;
}
```

**Integration with renderers:**
```javascript
export function render(data, opts = {}) {
  // ... format solar time ...
  const formatted = `${hours}:${minutes}`;
  
  // Compute date comparison (Phase 14 will pass this to date renderers)
  opts.solarDateDiffsStdDate = computeDateDiff(data.solarTime, data.stdTime);
  
  return formatted;
}
```

### Critical Gap Identified

**Problem:** The comparison logic requires `data.stdTime.totalMinutes`, but the current chronometer output (from `compose()`) doesn't include a `stdTime` object with `totalMinutes`.

**Evidence:**
- `src/chronometers/index.js` doesn't create a `stdTime` object
- Standard time renderers compute directly from `data.now` (UTC Date object)
- There's no analog to `solarTime.totalMinutes` for standard time

**Potential solutions:**

1. **Option A (recommended):** Create the comparison in Phase 14 pipeline code (not in renderers), where both `data.now` (standard time) and `data.solarTime` are available. The pipeline computes `opts.solarDateDiffsStdDate` and passes it to both solar time renderers (read-only) and date renderers (consumer).

2. **Option B:** Add a `stdTime` chronometer module that returns `{ totalMinutes }` based on the active meridian offset. This requires expanding Phase 13 scope.

3. **Option C:** Solar time renderers compute standard time minutes inline:
   ```javascript
   const utcMinutes = data.now.getUTCHours() * 60 + data.now.getUTCMinutes();
   const meridianOffsetMinutes = (opts.meridianOffset ?? 0) * 60;
   const stdMinutes = ((utcMinutes + meridianOffsetMinutes) % 1440 + 1440) % 1440;
   ```

**Recommendation for planning:** Clarify this with the user. The decisions document (D-35) says "all three solar time renderers can call [the helper] before returning their formatted string," implying the renderers compute it. However, the formula in D-32 requires `data.stdTime.totalMinutes`, which doesn't exist. This is a specification gap that must be resolved during planning.

---

## Validation Architecture

### No Formal Validation Layer

Phase 11 and Phase 12 did not implement a separate validation architecture. Validation is implicit:

- **Type checking:** `data == null`, `raw instanceof Date`, `!isNaN(raw)`
- **Range validation:** None (e.g., meridianOffset can be any number)
- **Fallback on invalid:** Return error string, don't throw

### Polar Edge Case "Validation"

The descriptive renderer's polar edge case detection is a form of input validation:
- Check which events are present
- Apply appropriate label selection strategy
- Fall back to altitude bands if needed

This should be encapsulated in `descriptions.js` as a pure function:
```javascript
/**
 * Get time-of-day description label for a given date and location.
 * @param {Date} date - Current date
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {string} Description label or fallback
 */
export function getDescription(date, latitude, longitude) {
  // ... event detection, polar case handling, label selection ...
}
```

The `descriptive.js` renderer then calls this function and returns the result.

---

## Risks and Considerations

### 1. Chronometer Breaking Change

**Risk:** Modifying `solarTime.js` to return an object instead of a string is a breaking change. Any code that depends on the string format will fail.

**Mitigation:**
- The only consumers are the four stub renderers in `src/formats/renderers/solartime/*.js`, which are updated in the same phase
- The composer in `src/chronometers/index.js` wraps `solarTime` in try/catch, so errors won't break the app
- The error fallback in `compose()` line 74 should be updated from `'ST??'` to `null` to match the new return type

### 2. Date Comparison Specification Gap

**Risk:** D-32 formula requires `data.stdTime.totalMinutes`, which doesn't exist in current architecture.

**Mitigation:** Resolve during planning (see "Date Comparison Integration" section above). Clarify whether:
- Solar time renderers compute standard time inline (Option C)
- Phase 14 pipeline computes the comparison (Option A)
- A new `stdTime` chronometer is added (Option B, out of Phase 13 scope)

### 3. Polar Edge Case Complexity

**Risk:** The 16-label event-anchored system (D-24) with 4 polar edge cases (D-26) is the most complex logic in this phase. Bugs in event detection or label boundaries could produce incorrect descriptions.

**Mitigation:**
- Encapsulate all polar logic in `descriptions.js` as a single pure function
- Write extensive tests covering all 4 polar cases plus normal case
- Use altitude-band fallback (D-27) as a safety net
- Test with known polar reference dates (solstices at high latitudes)

### 4. suncalc Event Timing Edge Cases

**Risk:** suncalc returns events for the calendar date at the location, but evening events may be on the next UTC day (observed in `src/sky.js:124-130`). This can cause off-by-one errors when partitioning the day into phases.

**Mitigation:**
- Follow the pattern from `sky.js`: check if current time is before morning events, then use yesterday's evening events
- Use `.getTime()` for all time comparisons to avoid Date object comparison issues
- Test around midnight UTC with locations that have large timezone offsets

### 5. Precision Mismatch with Tick Rate

**Risk:** D-04 precision philosophy says solar time uses "softer" precision to avoid awkward refresh behavior. The app tick rate is 864ms (~1 centibeat). Without seconds in the 24h format, the display will jump by 1 minute when `Math.round(seconds / 60)` crosses a boundary.

**Mitigation:**
- This is by design per D-05 (no seconds in 24h format)
- The user has explicitly accepted this tradeoff
- Document in code comments that refresh rate and precision are intentionally misaligned

### 6. Unicode Symbol Compatibility

**Risk:** The 🜨 symbol (U+1F728, alchemical Earth) is in Unicode 6.0 but may not render on older devices. It's a higher-codepoint emoji-like character.

**Mitigation:**
- Use Unicode escape in source: `'\u{1F728}'` or `'\uD83D\uDF28'` (surrogate pair)
- Test rendering on target browsers (modern browsers should support Unicode 6.0+)
- Consistent with existing use of ☉ (U+2609) and ☽ (U+263D) in Phase 11 renderers, which have had no reported issues

---

## Recommended Approach

### Phase 13 Implementation Sequence

**Wave 1: Foundation**
1. Modify `src/chronometers/solarTime.js` to return object instead of string
2. Update error fallback in `src/chronometers/index.js` (line 74) from `'ST??'` to `null`
3. Write unit tests for modified chronometer (new file: `tests/pure/solarTime.test.js`)

**Wave 2: Simple Renderers**
4. Implement `src/formats/renderers/solartime/24h.js` — reads `data.solarTime.{hours, minutes}`
5. Implement `src/formats/renderers/solartime/decimal.js` — reads `data.solarTime.totalMinutes`
6. Implement `src/formats/renderers/solartime/longitudinal.js` — reads `data.solarTime.degrees` and `opts.chosenLongitude`
7. Write unit tests for each renderer (mock data strategy)

**Wave 3: Descriptive System**
8. Implement `src/formats/renderers/solartime/descriptions.js` — pure function for label selection, polar edge case detection, event partitioning
9. Implement `src/formats/renderers/solartime/descriptive.js` — calls descriptions module, returns label
10. Write unit tests for description mapping (polar cases, label boundaries, altitude fallback)
11. Write integration tests for descriptive renderer (full suncalc integration with reference dates)

**Wave 4: Date Comparison** (after clarifying specification gap)
12. Resolve D-32 specification gap: clarify where `stdTime.totalMinutes` comes from
13. Implement date comparison helper (location TBD based on resolution)
14. Update solar time renderers to compute/set `opts.solarDateDiffsStdDate`
15. Write integration tests verifying date comparison logic

**Wave 5: Final Integration**
16. Run full test suite (all 570+ existing tests + new solar time tests)
17. Manual verification with live location data at various latitudes
18. Verify registry imports are correct (should already be set up)

### Parallel Execution Opportunities

- Waves 1 and 2 can partially overlap (modify chronometer, then implement simple renderers immediately)
- Within Wave 2, all three simple renderers can be implemented in parallel (no dependencies)
- Wave 3 (descriptive) can proceed independently of Wave 4 (date comparison)
- Test writing can parallel implementation (TDD approach)

### Critical Path

1. Chronometer modification (Wave 1) blocks all renderer implementation
2. Resolving date comparison spec gap (Wave 4.12) blocks date comparison implementation
3. All waves must complete before final integration (Wave 5)

### Success Criteria Checklist

- [ ] `solarTime.js` returns `{ hours, minutes, totalMinutes, degrees }` or `null`
- [ ] All four renderers registered in registry (already done)
- [ ] 24h renderer outputs `HH:MM` format without seconds
- [ ] Decimal renderer outputs `@NNN` integer format without centibeats
- [ ] Longitudinal renderer outputs `🜨 NNN°` integer format with Earth symbol
- [ ] Descriptive renderer implements 16-label event-anchored system
- [ ] Polar day edge case handled (skip night phases)
- [ ] White nights edge case handled (skip astronomical twilight and night)
- [ ] Polar night edge case handled (night label or Early/Late Night partitions)
- [ ] Altitude fallback implemented (Day/Twilight/Night)
- [ ] Date comparison logic computes `'ahead'`/`'behind'`/`null`
- [ ] All error fallbacks match format width (`'??:??'`, `'@???'`, `'🜨 ???°'`, `'Day'`)
- [ ] Zero-throw error handling in all renderers
- [ ] Unit tests pass for all renderers
- [ ] Integration tests pass for polar edge cases
- [ ] No regression in existing 570 tests

---

**Research complete.** All architectural patterns documented, polar edge cases validated with suncalc testing, one specification gap identified (date comparison `stdTime.totalMinutes` source), and implementation sequence planned. Ready for planning phase.
