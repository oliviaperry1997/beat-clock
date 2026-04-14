# ROADMAP — Beat Clock v1.0

**Milestone:** v1.0 — Modular Datetime Formats (user-customizable display formats for Year, Date, Standard Time, Solar Time)
**Granularity:** Standard (5-8 phases, 3-5 plans each)
**Date:** 2026-04-14

## Phases

| Phase | Name | Status | Plans | Progress |
|-------|------|--------|-------|----------|
| 1 | Codebase Audit & Architecture Design | ✅ | ARCHITECTURE.md | 100% |
| 2 | Modular Chronometry Core | ✅ | 02-PLAN.md | 100% |
| 3 | Location System | ✅ | 03-SUMMARY.md | 100% |
| 4 | Datetime Converters | 1/1 | Complete    | 2026-04-13 |
| 5 | Atmospheric Visual Design | ✅ | 05-SUMMARY.md | 100% |
| 6 | Alarm System | ✅ | 06-PLAN.md | 100% |
| 7 | Cross-Platform Packaging | ○ | — | 0% |
| 8 | Polish & Verification | ○ | — | 0% |
| 9 | New Chronometry Modules | 2/2 | Complete    | 2026-04-14 |
| 10 | Format Configuration & Registry | ✅ | 10-SUMMARY.md | 100% |
| 11 | Year & Date Format Renderers | ○ | — | 0% |
| 12 | Standard Time Format Renderers | ○ | — | 0% |
| 13 | Solar Time Format Renderers | ○ | — | 0% |
| 14 | Format Selector UI & Integration | ○ | — | 0% |

## Phase Details

### Phases 1-8: v0 (Refactor + Enhance)

See v0 section above. Phases 1-6 complete. Phases 7-8 deferred until after v1.0.

---

### Phase 9: New Chronometry Modules

Create new chronometer modules for Solar Longitude, Lunar Phase Angle, and Solar Time calculations. These are the computational foundation for longitudinal date display and solar time formats.

**Requirements:** DATE-03, SOLTIME-01, SOLTIME-02, SOLTIME-03

**Deliverables:**
- `src/chronometers/solarLongitude.js` — Solar ecliptic longitude (0-360° from Point of Aries) using astronomia
- `src/chronometers/lunarPhase.js` — Lunar phase angle (0-360° from New Moon) using suncalc
- `src/chronometers/solarTime.js` — Local solar time calculation (equation of time, solar angle-based time at longitude)
- `src/chronometers/meghalayan.js` — Meghalayan age year calculation (4.2kya epoch, 2200 BCE = Mgh 1)
- `src/chronometers/customEpoch.js` — Custom user-defined epoch year calculation
- Unit tests for each new chronometer module
- Integration with existing composer pattern

**Success criteria:**
1. Solar longitude returns correct ecliptic longitude for known reference dates
2. Lunar phase angle returns 0° at new moon, 180° at full moon
3. Solar time calculation includes equation of time correction
4. Meghalayan year returns correct value (2026 CE = Mgh 4226)
5. Custom epoch year counts forward from user-defined date
6. All new modules pass through composer try/catch error boundary
7. No regression in existing chronometer module tests

**Depends on:** Phase 2 (modular core — composer pattern), Phase 3 (location — solar time needs location)

### Phase 10: Format Configuration & Registry

Build the format orchestration layer: localStorage configuration CRUD with schema versioning, and the format registry that maps component+format to render functions.

**Requirements:** FORMAT-02, FORMAT-04

**Deliverables:**
- `src/formats/config.js` — localStorage CRUD with schema versioning (`beatClock_formats_v1`)
- `src/formats/registry.js` — Format registry mapping component IDs to available formats and render functions
- `src/formats/defaults.js` — Default format configuration (Holocene year, Gregorian date, UTC 24h, Descriptive solar)
- `src/formats/renderers/` — Empty renderer directory structure
- Unit tests for config load/save/defaults, registry lookup
- Graceful handling of corrupted/missing config

**Success criteria:**
1. Config saves to localStorage with version field
2. Config loads on page init, falls back to defaults if missing/corrupted
3. Schema version migration path defined (even if no migration needed yet)
4. Registry correctly maps component+format ID to render function slot
5. Default configuration matches specified defaults
6. All tests pass

**Depends on:** Phase 9 (new chronometers — registry needs to know available data fields)

### Phase 11: Year & Date Format Renderers

Implement all Year and Date format renderers. Year is simplest (existing data), Date includes the new longitudinal angles.

**Requirements:** YEAR-01, YEAR-02, YEAR-03, YEAR-04, DATE-01, DATE-02, DATE-03, DATE-04

**Deliverables:**
- `src/formats/renderers/year/holocene.js` — Holocene year renderer
- `src/formats/renderers/year/gregorian.js` — Gregorian year renderer
- `src/formats/renderers/year/meghalayan.js` — Meghalayan year renderer
- `src/formats/renderers/year/custom.js` — Custom epoch year renderer
- `src/formats/renderers/date/gregorian.js` — Gregorian date renderer
- `src/formats/renderers/date/chinese.js` — Chinese lunisolar date renderer
- `src/formats/renderers/date/longitudinal.js` — Solar Longitude + Lunar Phase Angle renderer
- Year boundary transition handling (DATE-04)
- Unit tests for each renderer
- Integration tests for year boundary transitions across calendar systems

**Success criteria:**
1. Each year format renders correct value from chronometer data
2. Gregorian date renders standard month/day
3. Chinese date renders Chinese month/day with leap month notation
4. Longitudinal date renders both angles as integers (☉ XXX° ☽ XXX°)
5. Year boundary correctly transitions when Date format changes (e.g., Chinese New Year vs Jan 1)
6. All renderers handle missing/invalid data gracefully
7. All tests pass

**Depends on:** Phase 9 (new chronometers — solar longitude, lunar phase, meghalayan, custom epoch), Phase 10 (format registry)

### Phase 12: Standard Time Format Renderers

Implement all Standard Time format renderers with meridian offset customization.

**Requirements:** STDTIME-01, STDTIME-02, STDTIME-03, STDTIME-04, STDTIME-05

**Deliverables:**
- `src/formats/renderers/stdtime/24h.js` — 24h time with hour-interval meridian offset
- `src/formats/renderers/stdtime/decimal.js` — Decimal beats with 100-beat-interval offset
- `src/formats/renderers/stdtime/longitudinal.js` — Degree-based longitude offset time
- `src/formats/renderers/stdtime/meridian-select.js` — Meridian/offset selector UI component (presets + custom input)
- Midnight crossing handling
- Unit tests for each format
- Edge case tests: midnight crossing, DST boundaries, extreme offsets

**Success criteria:**
1. 24h format correctly displays time at chosen meridian offset
2. Decimal beats correctly computes beats from midnight at chosen meridian
3. Longitudinal format correctly computes time from degree-based offset
4. Meridian selector provides presets (UTC, UTC±1-12, etc.) + custom input
5. Midnight crossing: time correctly shows previous/next day when offset crosses midnight
6. All edge cases handled (extreme offsets, invalid inputs)
7. All tests pass

**Depends on:** Phase 10 (format registry)

### Phase 13: Solar Time Format Renderers

Implement all Solar Time format renderers including the descriptive time-of-day system.

**Requirements:** SOLTIME-01, SOLTIME-02, SOLTIME-03, SOLTIME-04

**Deliverables:**
- `src/formats/renderers/solartime/24h.js` — 24h local solar time
- `src/formats/renderers/solartime/decimal.js` — Local solar decimal beats
- `src/formats/renderers/solartime/longitudinal.js` — Solar angle-based time at chosen longitude
- `src/formats/renderers/solartime/descriptive.js` — Time-of-day descriptions
- `src/formats/renderers/solartime/descriptions.js` — Description mapping (sun altitude → label)
- Unit tests for each format
- Tests for description label accuracy against known sun altitude thresholds

**Success criteria:**
1. 24h solar time correctly displays local solar time (includes equation of time)
2. Decimal solar beats correctly computes local solar beats
3. Solar longitudinal format shows solar angle-based time at chosen longitude (differs from Standard Time longitudinal by using actual sun position)
4. Descriptive format shows correct label for sun altitude (golden hour, blue hour, twilight phases, etc.)
5. Description labels are memorable and useful (8-12 distinct labels)
6. All tests pass

**Depends on:** Phase 9 (solarTime chronometer), Phase 10 (format registry)

### Phase 14: Format Selector UI & Integration

Build the per-component dropdown selectors, wire up the display pipeline, and complete integration.

**Requirements:** FORMAT-01, FORMAT-03, FORMAT-05

**Deliverables:**
- `src/formats/selectors/ui.js` — Dropdown selector manager (creates/manages 4 component selectors)
- `src/formats/selectors/styles.css` — Selector styling (glassmorphic, minimal, atmospheric aesthetic)
- `src/index.js` update — Integrate format registry into display pipeline
- Format selection immediately updates display
- Selectors appear on hover/focus, minimal when idle
- End-to-end integration tests

**Success criteria:**
1. Each of 4 components (Year, Date, Standard Time, Solar Time) has a dropdown selector
2. Selecting a format immediately updates display without page reload
3. Selectors are styled to match atmospheric aesthetic
4. Selectors are minimal and unobtrusive (appear on hover/focus)
5. Format selection persists via config (tested in Phase 10)
6. Display pipeline correctly routes chronometer data → registry → active renderer → DOM
7. No regression in existing functionality (alarm, location, sky, converters)
8. All tests pass
9. Manual verification of full user journey: load page → change formats → refresh → formats persist

**Depends on:** Phase 11 (Year/Date renderers), Phase 12 (Standard Time renderers), Phase 13 (Solar Time renderers), Phase 10 (format registry)

---
*Roadmap created: 2026-04-14*
