# Beat Clock

## What This Is

A cross-platform alternative time clock that displays time through multiple astronomical and calendrical lenses — Holocene year, lunar cycles, Swatch Internet Time (.beats), and solar position — with an atmospheric, ambient visual design. Users can explore time across locations, convert between time systems, set alarms tied to astronomical events, and compose custom time-based conditions.

## Core Value

Make the invisible rhythms of time — lunar cycles, solar arcs, alternative calendars — tangible and beautiful in everyday use.

## Requirements

### Validated

- ✓ Basic beat clock display with Holocene year, lunation, days since equinox, Swatch .beats, solar percent — existing (v0)
- ✓ Geolocation-based solar calculations — existing (v0)
- ✓ Webpack build pipeline — existing (v0)

### Active

- [ ] **REFACTOR-01**: Restructure code into modular chronometry components — each clock element (lunar, solar, beats, Holocene) is an independent, pluggable module
- [ ] **REFACTOR-02**: Support swappable time systems — toggle between different calendar/time display configurations
- [ ] **REFACTOR-03**: Improve code organization, file structure, and separation of concerns across the codebase
- [ ] **REFACTOR-04**: Upgrade visual design to atmospheric/ambient aesthetic — backgrounds reflecting time of day, subtle animations, immersive typography
- [ ] **LOCATION-01**: Manual location changing — users can search cities by name or enter lat/lon coordinates directly
- [ ] **CONVERT-01**: Gregorian ↔ Holocene/Beats converter — translate standard dates/times to beat clock format and back
- [ ] **CONVERT-02**: Cross-timezone converter — compare beat clock times across multiple locations simultaneously
- [ ] **CONVERT-03**: Historical date lookup — see what the beat clock showed for any past date/time
- [ ] **ALARM-01**: Time-based alarms — set alarms at specific Beat times or standard times
- [ ] **ALARM-02**: Astronomical event alarms — alerts for sunrise, sunset, equinox, moon phases
- [ ] **ALARM-03**: Advanced composable alarm conditions — "30 min after sunrise", "halfway between solar noon and sunset", "sunrise on full moon day"
- [ ] **ALARM-04**: Alarm template library for common astronomical conditions + custom rule builder for power users
- [ ] **PLATFORM-01**: Cross-platform architecture — structure for web, mobile (PWA), and desktop from the start

### Out of Scope

- User accounts / authentication — personal tool, no multi-user needs
- Social sharing features — focus on personal time exploration first
- Real-time collaboration — not relevant to the core value

## Context

**Technical environment:**
- Current stack: Vanilla JavaScript, Webpack 5, css-loader, style-loader, html-webpack-plugin
- Dependencies: `suncalc` (sunrise/sunset/moon illumination), `astronomia` (precise astronomical calculations including equinox dates and Julian date conversions)
- Output: Single-page web app with large centered clock display
- Build: `webpack-dev-server` for development, outputs to `dist/`

**Existing architecture:**
- `src/index.js` — All clock logic (161 lines): Holocene year, March equinox calculation, days since equinox, lunation counting, Swatch .beats, solar percent, geolocation
- `src/styles.css` — Minimal styling (large centered text)
- `src/template.html` — Basic HTML shell

**Key patterns in current code:**
- Astronomical calculations use `astronomia` library for precision (Julian dates, equinox)
- Solar calculations use `suncalc` for sunrise/sunset times
- Clock updates on ~864ms interval (approximately 1 beat)
- Geolocation API for user's position, with fallback to null

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
| Modular chronometry architecture | Each time system component should be independently pluggable and testable | — Pending |
| Composable alarm conditions | User wants both templates ("30 min after sunrise") AND custom rule builder | — Pending |
| Atmospheric/ambient visual design | Not a data dashboard — immersive, beautiful, sky-reflecting visuals | — Pending |
| City search + manual lat/lon | Users should find locations easily but also have precision control | — Pending |

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
*Last updated: 2025-04-13 after initialization*
