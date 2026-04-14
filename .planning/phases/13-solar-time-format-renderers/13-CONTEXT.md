# Phase 13: Solar Time Format Renderers - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the four Solar Time format renderers (24h, decimal beats, longitudinal, descriptive) with full polar edge case handling and solar/standard date comparison logic.

Requirements: SOLTIME-01, SOLTIME-02, SOLTIME-03, SOLTIME-04

Deliverables:
- `src/formats/renderers/solartime/24h.js` — 24h local solar time (HH:MM, no seconds)
- `src/formats/renderers/solartime/decimal.js` — Local solar decimal beats (integer @NNN, no centibeats)
- `src/formats/renderers/solartime/longitudinal.js` — Solar angle-based time at chosen longitude (🜨 NNN°, integer degrees)
- `src/formats/renderers/solartime/descriptive.js` — Time-of-day descriptions (16-label event-anchored system)
- `src/formats/renderers/solartime/descriptions.js` — Description mapping module (sun altitude/events → label)
- `src/chronometers/solarTime.js` — Modify to return object instead of string
- Unit tests for each renderer and the description mapping
- Polar edge case handling (polar day, polar night, white nights)
- Solar/standard date comparison logic

UI selectors and display pipeline wiring belong in Phase 14. This phase is renderer logic, chronometer modification, and tests only.

</domain>

<decisions>
## Implementation Decisions

### Chronometer Data Shape (all renderers)
- **D-01:** Modify `src/chronometers/solarTime.js` to return an object instead of string:
  ```js
  {
    hours: 14,           // 0-23, solar hours since solar midnight
    minutes: 32,         // 0-59
    totalMinutes: 872,   // minutes since solar midnight (for degree conversion)
    degrees: 218.0       // (totalMinutes / 1440) * 360, for longitudinal renderer
  }
  ```
- **D-02:** Error case: return `null` when latitude/longitude unavailable (replaces `'ST??'` string fallback)
- **D-03:** All three renderers check for null: `if (!data?.solarTime) return '[fallback]';`

### Solar Time Precision Philosophy
- **D-04:** Solar time is inherently less consistent than standard time (equation of time variance), so use "softer" precision across all formats to avoid clunky refresh behavior misaligned with the standard time tick rate
- **D-05:** No seconds in 24h format (HH:MM only)
- **D-06:** No centibeats in decimal format (integer @NNN only)
- **D-07:** No decimal degrees in longitudinal format (integer NNN° only)

### 24h Solar Time Renderer
- **D-08:** Display format: `HH:MM` — two-digit zero-padded hours and minutes. e.g., `14:32`, `08:05`.
- **D-09:** NO seconds display (D-05 precision philosophy)
- **D-10:** Source data: `data.solarTime.hours` and `data.solarTime.minutes` (from modified chronometer)
- **D-11:** Error fallback: `'??:??'` when `data.solarTime` is null

### Decimal Solar Beats Renderer
- **D-12:** Solar midnight anchor: `beats = Math.floor((solarMinutesSinceSolarMidnight / 1440) * 1000)`
- **D-13:** Source: `data.solarTime.totalMinutes` from chronometer
- **D-14:** Round DOWN (Math.floor) to avoid reaching @1000 just before midnight — range is 0-999 beats
- **D-15:** Output format: `@NNN` — integer only, no decimal places. e.g., `@654`, `@042`.
- **D-16:** Error fallback: `'@???'` when `data.solarTime` is null

### Longitudinal Solar Time Renderer
- **D-17:** Computes solar time at the chosen longitude (not user's actual location), then expresses as degrees
- **D-18:** Formula: solar time at chosen longitude → totalMinutes → `Math.floor((totalMinutes / 1440) * 360)`
- **D-19:** Uses actual sun position (equation of time included) at the chosen longitude — differs from Standard Time longitudinal which uses fixed meridian offset
- **D-20:** `opts.chosenLongitude` (in degrees, -180 to +180) specifies the longitude. Default: user's actual longitude if available, else 0°.
- **D-21:** Symbol prefix: 🜨 (U+1F728, alchemical Earth symbol) — maintains consistency with ☉ (solar longitude) and ☽ (lunar phase) astrological symbols used in date renderers
- **D-22:** Display: `🜨 NNN°` — integer degrees only (D-07). e.g., `🜨 218°`, `🜨 042°`.
- **D-23:** Error fallback: `'🜨 ???°'` when solar time cannot be computed

### Descriptive Solar Time Renderer
- **D-24:** 16-label event-anchored system for normal solar cycles (when all events occur):
  - **Astronomical Dawn**: astronomical dawn time ±15 min (sun at -18°)
  - **Morning Twilight**: horizon crossing (sunrise) → astronomical dawn
  - **Sunrise**: sunrise time ±15 min (horizon crossing, sun at 0°)
  - **Early Morning**: (sunrise +15min) → 1/3 way to solar noon
  - **Midmorning**: 1/3 → 2/3 way to solar noon
  - **Late Morning**: 2/3 → (solar noon -15min)
  - **Noon**: solar noon ±15 min (sun at highest altitude)
  - **Early Afternoon**: (noon +15min) → 1/3 way to sunset
  - **Midafternoon**: 1/3 → 2/3 way to sunset
  - **Late Afternoon**: 2/3 → (sunset -15min)
  - **Sunset**: sunset time ±15 min (horizon crossing, sun at 0°)
  - **Evening Twilight**: sunset → astronomical dusk
  - **Astronomical Dusk**: astronomical dusk time ±15 min (sun at -18°)
  - **Early Night**: (dusk +15min) → halfway to midnight
  - **Midnight**: midnight ±15 min (opposite solar noon)
  - **Late Night**: (midnight +15min) → halfway to astronomical dawn

- **D-25:** Event times sourced from `suncalc` library: `getTimes()` provides sunrise, sunset, solar noon, astronomical dawn (`nightEnd`), astronomical dusk (`night`). Midnight is computed as solar noon + 12 hours.

- **D-26:** Polar edge case handling (compartmentalized event detection):
  1. **Sun never sets (polar day, sun ≥ 0° all day)**: Late Afternoon → Early Morning (skip Sunset, Evening Twilight, Astronomical Dusk, all night phases)
  2. **Sun sets but never reaches -18° (white nights)**: Evening Twilight → Morning Twilight (skip Astronomical Dusk, Astronomical Dawn, all night phases)
  3. **Sun never rises but stays above -18°**: Use twilight phases only (skip day phases and deep night phases)
  4. **Sun never rises above -18° (polar night)**: Use "Night" label only, or partition into Early Night → Midnight → Late Night using clock midnight

- **D-27:** Fallback altitude bands when events are missing (simplified system):
  - Sun ≥ 0°: "Day"
  - Sun -18° to 0°: "Twilight"
  - Sun < -18°: "Night"

- **D-28:** Implementation lives in two files:
  - `descriptive.js` — Renderer that calls the description mapper
  - `descriptions.js` — Description mapping module that encapsulates the event detection and label selection logic

- **D-29:** Error fallback: `'Day'` when solar calculations unavailable (matches stub behavior, safest default)

### Solar/Standard Date Comparison Logic
- **D-30:** Solar time renderers compute whether solar date differs from standard date and pass the result to date renderers via `opts.solarDateDiffsStdDate`
- **D-31:** Comparison logic: Compare the calendar date at solar midnight (user's longitude + equation of time) vs calendar date at standard meridian midnight
- **D-32:** Formula:
  ```js
  const solarDayOfYear = Math.floor(data.solarTime.totalMinutes / 1440);
  const stdDayOfYear = Math.floor(data.stdTime.totalMinutes / 1440);
  // Note: totalMinutes can be negative (yesterday) or > 1440 (tomorrow)
  ```
- **D-33:** Set `opts.solarDateDiffsStdDate`:
  - `'ahead'` when `solarDayOfYear > stdDayOfYear` (user is east of standard meridian, solar date is tomorrow)
  - `'behind'` when `solarDayOfYear < stdDayOfYear` (user is west of standard meridian, solar date is yesterday)
  - `null` (or absent) when dates match
- **D-34:** This opts value is passed to date renderers (Phase 11 renderers already handle this flag via D-17, D-21 from Phase 11 CONTEXT.md)
- **D-35:** The comparison logic lives in a shared helper (e.g., `computeDateDiff(solarTime, stdTime)`) that all three solar time renderers can call before returning their formatted string. Phase 14 wiring ensures date renderers receive the opts.

### Renderer Opts Unification
- **D-36:** Solar time renderers use consistent opts naming:
  - `opts.chosenLongitude` (for longitudinal renderer) — degrees, -180 to +180
  - `opts.solarDateDiffsStdDate` (computed and set by solar renderers, passed to date renderers)
- **D-37:** No `showSeconds` or `showCentibeats` opts needed — precision is fixed per D-04 through D-07

### Claude's Discretion
- Exact helper function structure in `descriptions.js` (event detection, label mapping, polar fallback logic)
- Whether to extract the date comparison logic to a standalone utility function or inline it in each renderer
- Test file organization and naming within `tests/formats/renderers/solartime/`
- Specific test cases beyond the required polar edge cases and label transitions
- Whether to use constants/enums for the 16 label strings or inline strings

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Solar Time Format — SOLTIME-01 through SOLTIME-04 definitions
- `.planning/PROJECT.md` §Active — active requirements table

### Roadmap
- `.planning/ROADMAP.md` §Phase 13 — Phase deliverables, success criteria, dependencies

### Prior Phase Context
- `.planning/phases/11-year-date-format-renderers/11-CONTEXT.md` — Date renderer `+`/`-` indicator design (D-17, D-31-33), effectiveYear pattern, error fallback conventions
- `.planning/phases/12-standard-time-format-renderers/12-CONTEXT.md` — Standard time renderer patterns, precision choices, meridian offset architecture, error fallback strings

### Existing Renderer Patterns (read before writing renderers)
- `src/formats/renderers/stdtime/24h.js` — Phase 12 24h renderer pattern (data.now, UTC methods, opts, error fallback)
- `src/formats/renderers/stdtime/decimal.js` — Phase 12 decimal beats pattern (midnight anchor formula)
- `src/formats/renderers/date/gregorian.js` — Phase 11 renderer pattern (canonical error guard, opts.solarDateDiffsStdDate handling)

### Chronometer to Modify
- `src/chronometers/solarTime.js` — Phase 9 solar time chronometer (currently returns string, needs object return per D-01)

### Existing Stubs to Replace
- `src/formats/renderers/solartime/24h.js` — stub to be replaced with full implementation
- `src/formats/renderers/solartime/decimal.js` — stub to be replaced
- `src/formats/renderers/solartime/longitudinal.js` — stub to be replaced
- `src/formats/renderers/solartime/descriptive.js` — stub to be replaced

### External Dependencies
- `suncalc` library — `getTimes()` for sunrise, sunset, solar noon, astronomical dawn/dusk (`nightEnd`, `night`)
- `astronomia` library — `eqtime.eSmart()` for equation of time (already used in solarTime chronometer)

### Format Config & Registry
- `src/formats/` — config.js, registry.js, defaults.js (Phase 10 infrastructure)

### Test Patterns
- `tests/formats/renderers/stdtime/24h.test.js` — Phase 12 test pattern for time renderers
- `tests/formats/renderers/date/gregorian.test.js` — Phase 11 test pattern for renderers

No external specs — all requirements are captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/chronometers/solarTime.js`: Existing solar time calculation with equation of time — modify return value from string to object (D-01), keep core calculation logic
- `src/formats/renderers/stdtime/decimal.js`: Midnight-anchored beats formula — adapt for solar midnight anchor (D-12)
- `src/formats/renderers/date/gregorian.js`: Full implementation template with `opts.solarDateDiffsStdDate` handling (D-17 from Phase 11) — shows how date renderers consume the comparison flag
- `suncalc` library: `getTimes(date, lat, lon)` returns object with `.sunrise`, `.sunset`, `.solarNoon`, `.nightEnd` (astronomical dawn), `.night` (astronomical dusk) — all as Date objects or undefined when events don't occur

### Established Patterns
- All renderers export a named `render(data, opts = {})` function
- Error fallback strings match expected output width (e.g., `'??:??'` for HH:MM)
- Null/undefined checks: `if (!data?.solarTime) return '[fallback]';`
- Integer rounding: `Math.floor()` for beats and degrees to avoid edge cases
- Test files in `tests/formats/renderers/{category}/` mirroring `src/` structure
- Chronometer error pattern: return null instead of throwing

### Integration Points
- `src/formats/registry.js` — Renderers registered here; Phase 13 adds/updates `solartime` entries
- `src/chronometers/index.js` — compose() function includes solarTime; modification to chronometer affects compose() output shape
- Phase 14 wiring: display pipeline passes `data.solarTime` and `data.stdTime` to solar renderers, solar renderers compute and set `opts.solarDateDiffsStdDate`, date renderers receive opts with comparison flag
- Polar edge case detection: `suncalc.getTimes()` returns `undefined` for events that don't occur — this is the signal for polar fallback logic

</code_context>

<specifics>
## Specific Ideas

- **16-label descriptive system**: User's vision is event-anchored time-of-day labels (Dawn, Sunrise, Morning phases, Noon, Afternoon phases, Sunset, Dusk, Night phases, Midnight) with ±15 min event windows and equal partitions of the inter-event periods
- **Polar fallback is compartmentalized**: Missing night events shouldn't disrupt day phase partitions (Late Afternoon can transition directly to Early Morning when sun never sets); missing day events shouldn't disrupt night phase partitions
- **White nights edge case**: When sun sets but never reaches -18°, go from Evening Twilight → Morning Twilight (skip astronomical dusk/dawn and all night phases)
- **Symbol consistency**: 🜨 (alchemical Earth) for longitudinal solar time maintains the astrological symbol pattern used in date renderers (☉ solar longitude, ☽ lunar phase angle)
- **Precision philosophy**: Solar time formats intentionally use lower precision (no seconds, no centibeats, no decimal degrees) because solar time is inherently variable (equation of time), and small units would refresh awkwardly if misaligned with the standard time tick rate
- **Date comparison responsibility**: Solar time renderers compute the solar/standard date difference and pass it to date renderers — tight integration where the solar time renderer is authoritative about the comparison

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 13-solar-time-format-renderers*
*Context gathered: 2026-04-14*
