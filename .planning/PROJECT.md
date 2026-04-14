# Beat Clock

## What This Is

A cross-platform alternative time clock that displays time through multiple astronomical and calendrical lenses — Holocene year, lunar cycles, Swatch Internet Time (.beats), and solar position — with an atmospheric, ambient visual design. Users can customize how each time component (Year, Date, Standard Time, Solar Time) is displayed, choosing from multiple format systems including Gregorian, Holocene, lunisolar, longitudinal angles, and descriptive solar time.

## Core Value

Make the invisible rhythms of time — lunar cycles, solar arcs, alternative calendars — tangible and beautiful in everyday use.

## Current Milestone: v1.0 Modular Datetime Formats

**Goal:** Enable user-customizable display formats for each of the 4 clock components (Year, Date, Standard Time, Solar Time), with dropdown selectors for format selection and localStorage persistence.

**Target features:**
- Year format system: Holocene, Gregorian, Chinese lunisolar (cycle name + stem-branch)
- Date format system: Holocene (M/D), Gregorian, Lunisolar (Chinese), Solar Longitude + Lunar Phase Angle (longitudinal)
- Standard Time format system: 24h (customizable meridian offset), Decimal beats (customizable beat-interval offset), Longitudinal (degree-based offset)
- Solar Time format system: 24h (local), Decimal beats (local), Descriptive (time-of-day descriptions like golden hour, blue hour)
- Per-component dropdown format selectors
- Single active format per component, persisted to localStorage

## Requirements

### Validated

- ✓ Basic beat clock display with Holocene year, lunation, days since equinox, Swatch .beats, solar percent — existing (v0)
- ✓ Geolocation-based solar calculations — existing (v0)
- ✓ Webpack build pipeline — existing (v0)
- ✓ Modular chronometry core — independent pluggable modules (v0)
- ✓ Location system — city search, lat/lon input, persistence (v0)
- ✓ Datetime converters — Gregorian ↔ Holocene/Beats, cross-timezone, historical (v0)
- ✓ Atmospheric visual design — sky gradients, moon phase, beat pulse, typography (v0)
- ✓ Alarm system — time-based, astronomical events, composable conditions (v0)

### Active

- [ ] **YEAR-01**: Year format customization — Holocene, Gregorian, Chinese lunisolar (stem-branch + cycle year)
- [ ] **DATE-01**: Date format customization — Holocene (M/D), Gregorian, Lunisolar (Chinese month/day)
- [ ] **LONG-01**: Longitudinal date display — Solar Longitude (0-360° from Point of Aries) and Lunar Phase Angle (0-360° from New Moon)
- [ ] **STDTIME-01**: Standard Time 24h format — customizable hour-interval meridian offset (default: UTC/Prime Meridian)
- [ ] **STDTIME-02**: Standard Time Decimal format — customizable 100-beat-interval offset
- [ ] **STDTIME-03**: Standard Time Longitudinal format — degree-based offset selection
- [ ] **SOLTIME-01**: Solar Time 24h format — local solar time based on user's location
- [ ] **SOLTIME-02**: Solar Time Decimal format — local decimal beats
- [ ] **SOLTIME-03**: Solar Time Descriptive format — time-of-day descriptions (golden hour, blue hour, twilight phases, etc.)
- [ ] **FORMAT-01**: Per-component dropdown format selectors — UI for switching formats
- [ ] **FORMAT-02**: Format configuration persistence — single active config saved to localStorage

### Out of Scope

- User accounts / authentication — personal tool, no multi-user needs
- Social sharing features — focus on personal time exploration first
- Real-time collaboration — not relevant to the core value
- Named format presets — single configuration only for this milestone
- Multiple simultaneous formats per component — one active format at a time
- Cross-platform packaging — deferred until core features are complete
- Polish & verification — will be addressed after this milestone

## Context

**Technical environment:**
- Current stack: Vanilla JavaScript, Webpack 5, css-loader, style-loader, html-webpack-plugin
- Dependencies: `suncalc` (sunrise/sunset/moon illumination), `astronomia` (precise astronomical calculations including equinox dates and Julian date conversions)
- Output: Single-page web app with large centered clock display
- Build: `webpack-dev-server` for development, outputs to `dist/`

**Existing architecture (post-v0):**
- `src/chronometers/` — 7 module files (holocene, beats, solar, lunisolar, oldSystem, composer, chineseNewYear)
- `src/index.js` — Reduced to DOM update + geolocation bootstrap only (33 lines)
- `src/styles.css` — Minimal styling (large centered text)
- `src/template.html` — HTML shell
- `src/sky.js` — Dynamic sky gradient system (130 lines)
- `src/alarms/` — Alarm system modules (store, templates, astro-cache, evaluator, notifications, ui, engine)
- `src/location/` — Location system modules (database, search, storage, geolocation, ui)
- `src/converters/` — Datetime converter modules
- Webpack 5 build pipeline functional
- Vitest test suite: 268+ tests passing

**Key patterns in current code:**
- Astronomical calculations use `astronomia` library for precision (Julian dates, equinox)
- Solar calculations use `suncalc` for sunrise/sunset times
- Clock updates on ~864ms interval (approximately 1 beat)
- Geolocation API for user's position, with fallback to null
- Modular chronometry: each time system is an independent, testable module
- Error-boundary pattern: composer wraps each module in try/catch

**Design inspiration:**
- Atmospheric/ambient — time of day reflected in visuals
- Think: sky colors shifting with solar position, subtle animations that breathe with lunar cycles
- Not a data dashboard — more of an immersive time experience

## Constraints

- **[Performance]** Must remain lightweight — no heavy framework bloat, fast load times
- **[Accuracy]** Astronomical calculations must remain precise — refactoring cannot degrade calculation quality
- **[Cross-platform]** Architecture should support web → PWA → desktop progression without rewrites
- **[Personal]** Built for individual use — no backend, no auth, no multi-tenancy needed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cross-platform from start (not web-only) | User wants mobile + desktop eventually; building for this from the start prevents costly rewrites | — Pending |
| Modular chronometry architecture | Each time system component should be independently pluggable and testable | ✓ Good |
| Composable alarm conditions | User wants both templates ("30 min after sunrise") AND custom rule builder | ✓ Good |
| Atmospheric/ambient visual design | Not a data dashboard — immersive, beautiful, sky-reflecting visuals | ✓ Good |
| City search + manual lat/lon | Users should find locations easily but also have precision control | ✓ Good |
| Single active format per component | Simplicity over complexity — user picks one format at a time | — Pending |
| Dropdown format selectors | Quick, accessible format switching without complex UI | — Pending |
| Longitudinal angles replace Date slot | Solar Longitude and Lunar Phase Angle are date-scale metrics, not year-scale | — Pending |
| Meridian offset depends on format | 24h → hour-interval, Decimal → beat-interval, Longitudinal → degree-based | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-14 after v1.0 milestone start*
