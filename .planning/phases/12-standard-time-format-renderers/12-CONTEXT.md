# Phase 12: Standard Time Format Renderers - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the three Standard Time format renderers (24h, decimal beats, longitudinal) with meridian offset support, the meridian selector UI component, and midnight crossing handling.

Requirements: STDTIME-01, STDTIME-02, STDTIME-03, STDTIME-04, STDTIME-05

Deliverables:
- `src/formats/renderers/stdtime/24h.js` — 24h time with hour-based meridian offset (HH:MM default, optional seconds)
- `src/formats/renderers/stdtime/decimal.js` — Decimal beats recomputed from midnight at chosen meridian
- `src/formats/renderers/stdtime/longitudinal.js` — Time expressed as 0–360° longitude (time-as-degrees)
- `src/formats/renderers/stdtime/meridian-select.js` — Meridian selector UI (longitude-based internally, format-aware display)
- Unit tests for each renderer and the selector

UI selectors and display pipeline wiring belong in Phase 14. This phase is renderer logic and selector component only.

</domain>

<decisions>
## Implementation Decisions

### 24h Renderer
- **D-01:** Default display format: `HH:MM` — two-digit zero-padded hours and minutes. e.g. `08:30`, `23:59`.
- **D-02:** Optional seconds via `opts.showSeconds` flag. When `true`, display `HH:MM:SS`. Default: `false`.
- **D-03:** Meridian offset applied as `opts.meridianOffset` (in hours, integer or fractional). Same pattern as current stub: `((utcHours + meridianOffset) % 24 + 24) % 24`. Minutes and seconds are read directly from `data.now` UTC methods — no offset applied to sub-hour components.
- **D-04:** Error fallback: `'??:??' ` (without seconds) or `'??:??:??'` (with seconds) when `data.now` is invalid.
- **D-05:** Source date: `data.now` (injected by Phase 14 pipeline) or falls back to `new Date()`.

### Decimal Beats Renderer
- **D-06:** Recompute beats from midnight at the chosen meridian (Option B — not BMT-anchored). Formula: `(utcMs + meridianOffsetMs) % 86400000 / 86400`. This is semantically consistent with how 24h.js works.
- **D-07:** `opts.meridianOffset` in hours (same unit as 24h renderer, converting to ms internally). This supersedes the stub's `opts.beatOffset` naming — use `meridianOffset` for consistency across all three renderers.
- **D-08:** Output format: `@NNN.NN` — matching existing `beats.js` chronometer output (6 chars total including `@`). e.g. `@270.25`.
- **D-09:** Error fallback: `'@???'` when `data.now` is invalid.
- **D-10:** This format intentionally breaks Swatch Internet Time (BMT/UTC+1) spec. Users selecting a non-zero offset will get locally-midnight-anchored beats, not global Swatch beats. This is the correct semantic.

### Longitudinal Renderer
- **D-11:** The longitudinal Standard Time format converts time itself into degrees: the *longitude IS the time*. This is NOT "clock time at a given longitude" — it is the standard time expressed as a position on the 360° daily arc.
- **D-12:** Scale: 0° = midnight (start of day), 180° = noon, 360° = end of day (wraps to 0°). 1° = 4 minutes = 240 seconds. Full formula: `(utcMs + meridianOffsetMs) % 86400000 / 86400000 * 360`.
- **D-13:** `opts.meridianOffset` in hours (same unit as 24h and decimal renderers). The offset shifts the reference midnight, then the result is expressed in degrees.
- **D-14:** Precision: 2 decimal places. e.g. `270.25`.
- **D-15:** Symbol prefix: `⌚` (U+231A, watch symbol — NOT the ☉ sun symbol, which is reserved for solar/tropical longitude in the date renderer). Display: `⌚ 270.25°`.
- **D-16:** Error fallback: `'⌚ ???°'` when `data.now` is invalid.

### Meridian Selector Component
- **D-17:** Internally longitude-based: one stored value in degrees (−180 to +180). The canonical config key stores longitude degrees.
- **D-18:** UI display adapts to the active Standard Time format:
  - `24h` format: show options in hour intervals (−12h to +14h, step 1h; plus named half-hour/quarter-hour presets: IST +5.5h, NPT +5.75h, ACST +9.5h, IRST +3.5h)
  - `decimal` format: show options in 100-beat-interval steps (converts to/from degrees via 100 beats = 36°)
  - `longitudinal` format: show options in 1-degree steps with the full −180…+180 range
- **D-19:** When format is switched, auto-snap the stored longitude to the nearest valid interval for the new format (e.g., switching to 24h snaps to nearest 15°). Invalid (non-snapped) values don't break renderers — snapping is a UI affordance, not a data constraint.
- **D-20:** Default on first load: 0° (Prime Meridian / UTC). Does NOT seed from user's location longitude.
- **D-21:** "Custom…" entry reveals a `<input type="number">` for arbitrary degree input. Pattern mirrors the location system's manual lat/lon input.
- **D-22:** The selector is a UI component only — it outputs the config value. Persistence to localStorage is handled by the format config system (Phase 10 FORMAT-02). Wiring to the live display pipeline is Phase 14.

### Midnight Crossing
- **D-23:** No day indicator displayed. When meridian offset pushes time across midnight, the renderer simply shows the correct offset time (e.g. UTC 23:00 + offset +3h = `02:00`). The date component independently shows the correct meridian-adjusted date. No `+1`/`-1` suffix on the time string.
- **D-24:** The wrapping math `((utcHours + meridianOffset) % 24 + 24) % 24` already handles this correctly. "Midnight crossing handled" means the arithmetic wraps cleanly — not that any visual indicator is shown.

### Renderer Opts Unification
- **D-25:** All three renderers use `opts.meridianOffset` (in hours, floating-point). The stub naming divergence (`opts.beatOffset`, `opts.longitudeOffset`) is corrected here — a single opts key across all three makes the Phase 14 pipeline simpler. The meridian selector stores degrees; Phase 14 converts degrees→hours before passing to renderers: `meridianOffsetHours = longitudeDegrees / 15`.

### Claude's Discretion
- Exact preset list for the selector UI (within constraints set above)
- Whether meridian selector exposes a `<select>` + `<input>` or a custom dropdown
- Test file location and naming (`tests/formats/renderers/stdtime/`)
- Whether to export named `render` function (matching existing renderer convention)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Standard Time Format — STDTIME-01 through STDTIME-05 definitions
- `.planning/PROJECT.md` §Active — active requirements table

### Existing Renderer Patterns (read before writing renderers)
- `src/formats/renderers/date/gregorian.js` — canonical Phase 11 renderer pattern (data.now, UTC methods, opts, error fallback)
- `src/formats/renderers/year/holocene.js` — effectiveYear fallback pattern
- `src/chronometers/beats.js` — current beats formula (BMT anchor) and @NNN.NN output format

### Existing Stubs to Replace
- `src/formats/renderers/stdtime/24h.js` — stub to be replaced with full implementation
- `src/formats/renderers/stdtime/decimal.js` — stub to be replaced
- `src/formats/renderers/stdtime/longitudinal.js` — stub to be replaced

### Format Config & Registry
- `src/formats/` — config.js, registry.js, defaults.js (Phase 10 infrastructure being built on)

### Test Patterns
- `tests/formats/renderers/date/gregorian.test.js` — canonical test structure for Phase 11 renderers

No external specs — all requirements are captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/chronometers/beats.js`: beats formula — adapt by swapping BMT anchor for user meridian offset
- `src/formats/renderers/date/gregorian.js`: full implementation template — error guard pattern, opts handling, UTC methods
- `src/formats/renderers/stdtime/24h.js`: existing stub has correct skeleton (`meridianOffset`, hour wrap math) — extend, don't rewrite
- Location system manual input pattern (`src/location/ui.js`): `<input type="number">` with min/max for precision input — reuse for meridian selector custom input

### Established Patterns
- All renderers export a named `render(data, opts = {})` function
- UTC methods used throughout — `getUTCHours()`, `getUTCMinutes()`, `getUTCSeconds()`
- `data.now` injection pattern: `const raw = data?.now; const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();`
- Error fallback strings match the expected output width (e.g., `'??:??'` for `HH:MM`)
- Test files in `tests/formats/renderers/{category}/` mirroring `src/` structure

### Integration Points
- `src/formats/registry.js` — renderers registered here; Phase 12 adds `stdtime` entries
- Phase 14 wiring: meridian selector output (degrees) → `meridianOffsetHours = degrees / 15` → passed as `opts.meridianOffset` to all three renderers
- `data.now` is a `Date` object injected by the Phase 14 pipeline, adjusted for the active meridian

</code_context>

<specifics>
## Specific Ideas

- The longitudinal format's core insight (from user): "the longitude IS the time" — it divides the day into 360°, not a geographic lookup
- Meridian selector internal representation: degrees (float, −180 to +180). All renderer opts use hours converted at call site (`degrees / 15`). This is the conversion bridge.
- The `⌚` (U+231A) watch symbol was chosen specifically because it's a Unicode character (not color emoji) and represents timekeeping authority, distinct from `☉` (solar longitude) and `☽` (lunar phase) used in date renderers.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-standard-time-format-renderers*
*Context gathered: 2026-04-14*
