# Phase 11: Year & Date Format Renderers - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement all 7 format renderer functions that were stubbed in Phase 10:
- 4 year renderers: `holocene.js`, `gregorian.js`, `meghalayan.js`, `custom.js`
- 3 date renderers: `gregorian.js`, `chinese.js`, `longitudinal.js`

Also handle year boundary transitions (DATE-04) via the `effectiveYear` pattern, and implement the solar/standard date divergence indicator (`+`/`-` suffix) in date renderers with wiring deferred to Phase 14.

Requirements: YEAR-01, YEAR-02, YEAR-03, YEAR-04, DATE-01, DATE-02, DATE-03, DATE-04

UI selectors and display pipeline wiring belong in Phase 14. This phase is renderer logic and tests only.

</domain>

<decisions>
## Implementation Decisions

### Holocene Year Renderer
- **D-01:** Display format: `H{year}` — prefix only, e.g., `H12026`.
- **D-02:** Reads `data.effectiveYear` if present (set by Phase 14 pipeline); falls back to `data.holocene` (from compose()) if `effectiveYear` is absent.
- **D-03:** Holocene offset = `effectiveGregorianYear + 9700`. Renderer applies this offset directly when `effectiveYear` is used, rather than relying on the pre-computed compose value.

### Gregorian Year Renderer
- **D-04:** Display format: plain year number, e.g., `2026`.
- **D-05:** Reads `data.effectiveYear` if present; falls back to raw UTC year from `data.now ?? new Date()`.

### Meghalayan (Holocene Stages) Renderer
- **D-06:** The renderer does NOT use `data.meghalayan.label` — it formats its own string with custom abbreviations.
- **D-07:** Stage abbreviations (different from what the chronometer labels use):
  - Meghalayan → `Mgh`
  - Northgrippian → `Ngp` (NOT `Nrg`)
  - Greenlandian → `Grn` (NOT `Ghg`)
- **D-08:** Format: `{abbreviation}{year}` — NO space between abbreviation and year, e.g., `Mgh4226`, `Ngp4001`, `Grn3501`.
- **D-09:** Reads `data.meghalayan` for stage information. When `data.effectiveYear` is present, the renderer re-computes stage boundaries against `effectiveYear` rather than using `data.meghalayan.year` directly.
- **D-10:** Pre-Holocene dates (stage `'pre-holocene'`) render as `'—'`.

### Custom Epoch Year Renderer
- **D-11:** Fallback display format: `Y{year}` (matches the Phase 10 stub default) — e.g., `Y42`.
- **D-12:** Future extensibility: renderer should read from `opts.customLabel` (string, optional) and `opts.customLabelPosition` (`'prefix'` | `'suffix'`, optional). When these are set, apply them; when absent, use the `Y` prefix fallback.
- **D-13:** Reads `data.effectiveYear` if present; falls back to `data.customEpoch` value from compose(). When `effectiveYear` is used, applies `effectiveYear - epochYear + 1` offset (where `epochYear` comes from `opts.customEpoch`).
- **D-14:** If no `customEpoch` and no `effectiveYear` is available: return `'Y??'`.

### Gregorian Date Renderer
- **D-15:** Display format: `{M}/{D}` — e.g., `4/14`. No zero-padding on month or day.
- **D-16:** Source date is `data.now ?? new Date()`. The Standard Time meridian determines what `now` is — this flows through the pipeline in Phase 14.
- **D-17:** Day +/- indicator: when `opts.solarDateDiffsStdDate` is set to `'ahead'` or `'behind'`, append `+` or `-` respectively to the displayed date. E.g., `4/14+` (local solar is ahead — user is east of standard meridian) or `4/15-` (local solar is behind — user is west of standard meridian). When flag is absent or falsy, no suffix.

### Chinese Lunisolar Date Renderer
- **D-18:** Display format for normal months: `M{month} D{day}` — e.g., `M6 D15`.
- **D-19:** Display format for intercalary (leap) months: `MX D{day}` — NO month number when `isLeap` is true. E.g., `MX D15`.
- **D-20:** Source data: `data.lunisolar` → `{ month, day, isLeap }` from compose().
- **D-21:** Day +/- indicator: same `opts.solarDateDiffsStdDate` flag as Gregorian date renderer — appended to the full string. E.g., `M6 D15+` or `MX D15-`.

### Longitudinal Date Renderer
- **D-22:** Display format: `☉ {SL}° ☽ {LP}°` — e.g., `☉ 024° ☽ 180°`.
- **D-23:** Zero-padded 3 digits for both angles (consistent width).
- **D-24:** Parse the numeric value from chronometer output: `data.solarLongitude` returns `'SL024'` — strip the `SL` prefix to get `'024'`. Similarly `data.lunarPhase` returns `'LP180'` — strip `LP`.
- **D-25:** When chronometer value is the error fallback (`'SL??'` or `'LP??'`), render as `☉ ???° ☽ ???°`.
- **D-26:** No day +/- indicator for the longitudinal renderer — angles are angular positions, not calendar dates.

### Year Boundary (DATE-04) Architecture
- **D-27:** Year renderers are designed to accept `data.effectiveYear` — a pre-computed effective Gregorian year set by the display pipeline based on the active Date format's tick boundary.
- **D-28:** Tick boundary per date format:
  - Gregorian date → Jan 1 (UTC, adjusted by meridian offset)
  - Chinese date → Chinese New Year
  - Longitudinal date → Spring Equinox (vernal equinox, 0° solar longitude)
- **D-29:** If `data.effectiveYear` is absent (e.g., during unit tests or before Phase 14 wiring), renderers fall back to the value already in `data` from compose().
- **D-30:** The Standard Time meridian offset can also shift the date across midnight — meaning the effective date (and thus effective year) depends on both the active Date format AND the Standard Time meridian setting. This cross-cutting pipeline concern is fully wired in Phase 14.

### Day +/- Indicator Detail
- **D-31:** `opts.solarDateDiffsStdDate` values:
  - `'ahead'` — local solar date is ahead of standard date (user is east of meridian). Display: `+`
  - `'behind'` — local solar date is behind standard date (user is west of meridian). Display: `-`
  - absent/falsy — dates are aligned. No suffix.
- **D-32:** Standard Time is the source of authority for the displayed date. The indicator communicates that the user's local solar time is on a different calendar day than the displayed standard date.
- **D-33:** The longitudinal date renderer does NOT use this indicator (angles don't have day concepts).

### Claude's Discretion
- Exact error fallback value choice within the `'??'` family (e.g., `'Y??'` vs just `'??'`)
- Helper function naming and structure within renderer files
- Whether to use `parseInt()` or regex to strip chronometer prefixes
- Test case selection (specific dates and edge cases beyond required examples)
- Whether to use `Object.freeze()` on any constants

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §YEAR-01, YEAR-02, YEAR-03, YEAR-04 — Year format requirements
- `.planning/REQUIREMENTS.md` §DATE-01, DATE-02, DATE-03, DATE-04 — Date format requirements

### Roadmap
- `.planning/ROADMAP.md` §Phase 11 — Phase deliverables, success criteria, dependencies

### Prior phase context
- `.planning/phases/09-new-chronometry-modules/9-CONTEXT.md` — Holocene Stages architecture (D-09 through D-26), pre-Holocene handling, module interface pattern
- `.planning/phases/10-format-configuration-registry/10-CONTEXT.md` — Registry architecture, renderer directory structure, config object shape

### Existing renderer stubs (to be fleshed out)
- `src/formats/renderers/year/holocene.js` — Holocene year stub
- `src/formats/renderers/year/gregorian.js` — Gregorian year stub
- `src/formats/renderers/year/meghalayan.js` — Meghalayan year stub
- `src/formats/renderers/year/custom.js` — Custom epoch year stub
- `src/formats/renderers/date/gregorian.js` — Gregorian date stub
- `src/formats/renderers/date/chinese.js` — Chinese date stub
- `src/formats/renderers/date/longitudinal.js` — Longitudinal date stub

### Chronometer implementations (data sources)
- `src/chronometers/index.js` — compose() output shape: { holocene, meghalayan, lunisolar, solarLongitude, lunarPhase, customEpoch, ... }
- `src/chronometers/meghalayan.js` — Returns { stage, year, label } where stage is 'meghalayan' | 'northgrippian' | 'greenlandian' | 'pre-holocene'
- `src/chronometers/solarLongitude.js` — Returns string 'SL{3-digit-degrees}' or 'SL??'
- `src/chronometers/lunarPhase.js` — Returns string 'LP{3-digit-degrees}' or 'LP??'
- `src/chronometers/lunisolar.js` — Returns { month, day, isLeap, moonAge, illumination }

### Test patterns
- `tests/pure/holocene.test.js` — Unit test pattern for chronometers
- `tests/formats/registry.test.js` — Test pattern for formats module

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/formats/renderers/` — All 7 stub renderers already exist; this phase replaces stub bodies with real logic
- `src/chronometers/index.js` — compose() function that renderers consume — check output shape
- `src/chronometers/meghalayan.js` — Stage boundary constants useful for re-computing stage when effectiveYear is provided

### Established Patterns
- Renderers export `render(data, opts = {})` — named export, pure function, no side effects
- Error fallback: return `'??'`-family strings (not throw), consistent with chronometer error boundaries
- Pure functional modules — no classes, no mutation
- Test files in `tests/formats/` mirroring `src/formats/` structure

### Integration Points
- `src/formats/registry.js` — Already imports all 7 renderers; renderer function signatures must match `(data, opts)` contract
- `src/chronometers/index.js` — compose() result is the `data` argument passed to renderers
- Phase 14 will set `data.effectiveYear` and `opts.solarDateDiffsStdDate` in the display pipeline

</code_context>

<specifics>
## Specific Ideas

- Meghalayan abbreviation change: user specifically wants `Mgh`/`Ngp`/`Grn` (no space, Ngp instead of Nrg, Grn instead of Ghg)
- Intercalary month display: `MX D{day}` — no number for intercalary months, just `X` as the month indicator
- Longitudinal format uses Unicode symbols: ☉ (U+2609) for solar longitude, ☽ (U+263D) for lunar phase angle
- Standard Time is the authoritative date source — the `+`/`-` indicator shows deviation from that authority, not from UTC

</specifics>

<deferred>
## Deferred Ideas

- Custom epoch label/position UI — the `opts.customLabel` and `opts.customLabelPosition` API is designed in Phase 11 but the actual UI input is Phase 14
- `data.effectiveYear` pipeline wiring — renderers accept it, but the full Standard Time meridian → effective date → effective year pipeline is wired in Phase 14
- `opts.solarDateDiffsStdDate` computation and wiring — the comparison logic that determines whether solar date differs from standard date is Phase 14 work
- Year boundary helpers for Phase 14 — the tick boundary table (Gregorian → Jan 1, Chinese → CNY, Longitudinal → equinox) is an architectural note for Phase 14, not Phase 11 code

</deferred>

---

*Phase: 11-year-date-format-renderers*
*Context gathered: 2026-04-14*
