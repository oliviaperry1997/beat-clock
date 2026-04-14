# Phase 1: Codebase Audit & Architecture Design - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Audit the existing vanilla JS clock app, document its architecture, and design a modular component system. **Key pivot:** The user wants a new timekeeping system modeled after the Chinese lunisolar calendar as the future default display — replacing the current separate lunation count + days-since-equinox approach. Beats, solar percent, and Holocene year number stay; only the lunar/solar date fusion changes. This phase produces documentation and design — no implementation changes yet.

</domain>

<decisions>
## Implementation Decisions

### New timekeeping system (Chinese lunisolar calendar)
- **D-01:** Core display uses a Chinese-style lunisolar calendar — lunar months aligned to solar year via leap month insertion
- **D-02:** Simpler version only — no sexagenary cycle (60-year stems/branches), no 24 solar terms. Just year, month number, day.
- **D-03:** Holocene year number is retained but ticks on Chinese New Year instead of Spring Equinox
- **D-04:** Leap months displayed as `MX` (no numbered month) — visually distinct, e.g., `H12026 MX D15` for day 15 of a leap month
- **D-05:** Single-line display format — month and day as separate tokens: `H12026 M3 D15 @567.89 S42`

### Existing systems kept as-is
- **D-06:** Swatch .beats — unchanged, stays in display
- **D-07:** Solar percent — unchanged, stays in display
- **D-08:** Old lunation + days-since-equinox system — kept in code but NOT displayed by default; becomes an alternative display when Phase 2 (swappable time systems) is implemented

### Initial render behavior
- **D-09:** Clock MUST render immediately on page load — do not wait for geolocation to resolve before rendering
- **D-10:** When location is unavailable (loading or denied), solar component displays `S??`, all other components render normally
- **D-11:** When geolocation resolves, clock re-renders with actual location data — smooth transition, no full re-render needed

### Architecture style
- **D-12:** Functional ES modules — each chronometer is a pure function in its own file (e.g., `chronometers/holocene.js`, `chronometers/lunisolar.js`)
- **D-13:** A composer/registry imports and calls all chronometer modules — no class-based interfaces or plugin registry patterns
- **D-14:** Decomposition targets: Holocene year, Chinese lunisolar date, Swatch beats, solar percent — each as independent module, plus old system (lunation + equinox days) preserved but hidden

### Technology stack direction
- **D-15:** Stay vanilla JS + Webpack — no framework introduction (no Preact, Lit, TypeScript) in this phase
- **D-16:** Use JSDoc for type hints where helpful (chronometer input/output contracts)
- **D-17:** Cross-platform scaffolding deferred to Phase 7 — this phase focuses on code organization only

### Audit depth & documentation
- **D-18:** Light audit approach — document current architecture, identify issues, propose modular file structure
- **D-19:** Output: ARCHITECTURE.md with file tree diagram + migration plan
- **D-20:** Include edge case notes from current implementation (e.g., 23:00 UTC equinox anchor, ~864ms update interval, geolocation fallback behavior)

### Migration strategy
- **D-21:** Incremental module-by-module extraction — extract one chronometer at a time, keep app working after each
- **D-22:** Extraction order: start with most independent modules (Holocene year, beats), work toward coupled ones (solar depends on location, lunisolar depends on new moon calculations)
- **D-23:** No branch-and-rewrite — each extraction is verifiable independently

### Claude's Discretion
- Exact file naming conventions (researcher should propose standard patterns)
- JSDoc detail level
- Whether to add linting/formatting tooling as part of this phase
- Chinese New Year calculation approach (new moon closest to 立春 ~Feb 4, or second new moon after winter solstice — both valid, researcher should recommend)

</decisions>

<specifics>
## Specific Ideas

- The Chinese calendar elegantly unifies lunar months with solar years through leap months — more intuitive than tracking lunation count and days since equinox as separate numbers
- Display format example: `H12026 M3 D15 @567.89 S42` (Holocene year 12026, 3rd lunar month, day 15, @567.89 beats, 42% through current solar/night phase)
- The current `convertGregorianToCustom` function in `index.js` is already a reusable converter — Phase 4 (Datetime Converters) will build on this pattern
- The `getNextNewMoon` function uses hourly stepping — potential performance concern to note in audit; may need refinement for Chinese New Year calculation
- The ~864ms update interval (approximately 1 beat) is a deliberate choice to update at beat granularity
- Old system will be accessible later when swappable time systems (Phase 2) are implemented

</specifics>

<canonical_refs>
## Canonical References

### Project requirements
- `.planning/PROJECT.md` — Core value, all requirements (REFACTOR-01 through REFACTOR-04), constraints, key decisions
- `.planning/ROADMAP.md` — Phase 1 deliverables: documented architecture, modular component design, refactoring migration plan, technology selection

### Codebase
- `src/index.js` — All clock logic (161 lines): Holocene year, March equinox, days since equinox, lunation, Swatch beats, solar percent, geolocation
- `src/styles.css` — Minimal styling (large centered text)
- `src/template.html` — Basic HTML shell
- `package.json` — Dependencies: `suncalc`, `astronomia`; DevDeps: Webpack 5, css-loader, style-loader, html-webpack-plugin

No external specs or ADRs exist — requirements are fully captured in PROJECT.md and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `convertGregorianToCustom()` — Already implements converter logic (Phase 4 prerequisite), takes Gregorian string + optional lat/lon
- `getHoloceneYear()`, `getBeats()` — Pure functions, easy to extract as first modules
- `getNextNewMoon()` — Approximate new moon finder (hourly stepping); foundation for Chinese New Year / lunisolar month calculations, but may need refinement
- `marchEquinoxJDE()` + `getSpringEquinox()` — Equinox calculation with 23:00 UTC anchor quirk (will need replacement with Chinese New Year calculation)

### Established Patterns
- All calculations are pure functional — no classes or state management
- DOM update is separate from calculation (`updateClock` vs calculation functions)
- Geolocation API with fallback to `null` — solar percent returns `'S??'` when location unavailable
- Update interval: ~864ms (1 beat)

### Integration Points
- `#beats-container` DOM element — single output target, will need expansion for multi-display (Phase 5)
- `navigator.geolocation` — will need abstraction for Phase 3 (location system with city search)
- Webpack config at project root — may need adjustment for module structure

</code_context>

<deferred>
## Deferred Ideas

- Sexagenary cycle (60-year heavenly stems + earthly branches) — user explicitly chose simpler version, could be added later as optional display enhancement
- 24 solar terms (节气) — deferred, not needed for simpler lunisolar months
- Multiple lines / stacked display format — user chose single-line; revisit for Phase 5 (visual redesign)

</deferred>

---

*Phase: 01-codebase-audit-architecture-design*
*Context gathered: 2026-04-13*
