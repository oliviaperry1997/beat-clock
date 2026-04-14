# Phase 9: New Chronometry Modules - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Create new chronometer computation modules for solar longitude, lunar phase, solar time, Meghalayan year, and custom epoch. These are the computational foundation for longitudinal date display and solar time formats. Integration with the existing composer pattern and test suite.

UI selectors, format configuration, and display belong in later phases. This phase is pure computation.

</domain>

<decisions>
## Implementation Decisions

### Solar Longitude
- **D-01:** Use `solar.apparentLongitude(T)` from `astronomia` — includes nutation + aberration corrections, ~0.01° accuracy. Sufficient for integer degree display.
- **D-02:** Return value as degrees (0-360°), converted from radians. Not arcminutes or raw radians.
- **D-03:** Do NOT use VSOP87 — the extra precision (~0.0001°) is wasted at integer display resolution.

### Lunar Phase Angle
- **D-04:** Use `astronomia` `moonposition` module — compute lunar ecliptic longitude, subtract solar apparent longitude to get phase angle.
- **D-05:** Do NOT use `lunar-javascript` internals (`ShouXingUtil`) — undocumented, messy, different reference frame.
- **D-06:** Phase angle: 0° = new moon, 180° = full moon, 0-360° range.

### Solar Time
- **D-07:** Use `astronomia` `equationOfTime(T)` for the equation of time correction. Sub-second accuracy, single function call.
- **D-08:** Solar time = local mean solar time + equation of time correction.

### Holocene Stages (Greenlandian, Northgrippian, Meghalayan)
- **D-09:** The "Meghalayan" module is actually a Holocene stages system — returns which of the three Holocene stages the date falls into, with the year count for that stage.
- **D-10:** Stage boundaries (BCE years, astronomical year numbering in JS):
  - **Greenlandian**: 9700 BCE to 6200 BCE (start of Holocene to 8.2kya event)
  - **Northgrippian**: 6200 BCE to 2200 BCE (8.2kya event to 4.2kya event)
  - **Meghalayan**: 2200 BCE to present (4.2kya event onward)
- **D-11:** Year count per stage counts forward from that stage's epoch:
  - Greenlandian year = `9700 + gregorianYear` (for dates 9700 BCE to 6200 BCE)
  - Northgrippian year = `6200 + gregorianYear` (for dates 6200 BCE to 2200 BCE)
  - Meghalayan year = `2200 + gregorianYear` (for dates 2200 BCE onward)
  - Using JS astronomical year numbering: 2200 BCE = JS year -2199, so -2199 + 2200 = 1 = Mgh 1 ✓
- **D-12:** Module returns an object `{ stage, year, label }` where:
  - `stage`: `'greenlandian' | 'northgrippian' | 'meghalayan'`
  - `year`: the year number within that stage
  - `label`: pre-formatted display string (e.g., `'Mgh 4226'`, `'Nrg 4001'`, `'Ghg 3501'`)
  - This structured return enables the converter (later milestone) to know which stage a date belongs to
- **D-13:** 2026 CE = Mgh 4226 (verified: 2026 + 2200 = 4226)
- **D-14:** Year boundary tick behavior is determined by the active Date system, not by the year system itself. (See D-16.)

### Custom Epoch Year
- **D-15:** Custom epoch date passed via `opts.customEpoch` parameter to `compute(date, opts)`. Keeps module a pure function.
- **D-16:** Year counter increments from the custom epoch date. If `opts.customEpoch` is not provided, return a fallback (e.g., `??` or 0).

### Year Boundary Principle (Cross-cutting)
- **D-17:** Year chronometers are "dumb" counters — they compute a year value given an effective Gregorian year and epoch reference.
- **D-18:** When the year counter ticks (Jan 1, CNY, vernal equinox) is determined by the active Date system, not the Year system. This is an orchestration concern for the composer/format layer, not individual chronometer modules.
- **D-19:** Holocene Stages and Custom Epoch modules follow the same pattern as Holocene: receive a date, compute effective year, return year value. The Date system's tick behavior determines what "effective year" means at the orchestration layer.

### Module Interface
- **D-20:** All new modules export `compute(date, opts)` — same signature as existing chronometers.
- **D-21:** All modules wrapped in composer try/catch — on error, return fallback string (`'??'` or `0` as appropriate). Holocene stages returns `{ stage: '??', year: null, label: '??' }` on error.
- **D-22:** Test pattern: `tests/pure/{moduleName}.test.js` using vitest, matching existing test conventions.

### Claude's Discretion
- Exact return value formatting (number vs formatted string)
- Fallback value choice for missing opts (e.g., custom epoch not provided)
- Internal helper function naming and structure
- Test case selection (specific dates, edge cases)

</decisions>

<canonical_refs>
## Canonical References

### Requirements
- `.planning/REQUIREMENTS.md` §DATE-03 — Longitudinal date display requirements (solar longitude + lunar phase angle)
- `.planning/REQUIREMENTS.md` §SOLTIME-01, SOLTIME-02, SOLTIME-03 — Solar time format requirements
- `.planning/REQUIREMENTS.md` §YEAR-03, YEAR-04 — Meghalayan and Custom epoch year requirements

### Roadmap
- `.planning/ROADMAP.md` §Phase 9 — Phase deliverables, success criteria, dependencies

### Codebase
- `src/chronometers/index.js` — Composer pattern (existing modules, try/catch wrapper)
- `src/chronometers/holocene.js` — Existing year chronometer pattern to follow
- `tests/pure/holocene.test.js` — Test pattern for year-based chronometers

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/chronometers/index.js` — Composer pattern: call each `compute(date, opts)`, wrap in try/catch, combine results
- `src/chronometers/holocene.js` — Pattern: compute effective Gregorian year, add epoch offset, return year
- `src/chronometers/solar.js` — Example of using `suncalc` with opts (latitude, longitude)
- `tests/pure/` — Test pattern: import compute, describe/it/expect, test known dates

### Established Patterns
- Module exports: `export function compute(date, opts = {})`
- Options flow: `opts.latitude`, `opts.longitude` from geolocation
- Return types: numbers for raw values, strings for formatted display
- Error boundary: composer catches and sets result to `'??'`

### Integration Points
- New modules need to be imported and called in `src/chronometers/index.js` composer
- New modules need test files in `tests/pure/`
- `opts.customEpoch` needs to be threaded through from wherever config is read

### Dependency Note
- `astronomia` provides: `solar.apparentLongitude(T)`, `solar.equationOfTime(T)`, `moonposition` module
- All positions in radians — convert to degrees for display

</code_context>

<deferred>
## Deferred Ideas

- Single Meghalayan-only year counter — rejected, user wants all three Holocene stages for converter foundation
- Custom epoch UI for setting the epoch date — Phase 14 (Format Selector UI)
- VSOP87-level precision — not needed at integer display resolution
- Year system-specific tick behavior — rejected, user wants tick behavior governed by Date system

</deferred>

---

*Phase: 09-new-chronometry-modules*
*Context gathered: 2026-04-14*
