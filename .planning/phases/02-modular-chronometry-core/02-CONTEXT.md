# Phase 2: Modular Chronometry Core - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Extract each clock component (Holocene, lunisolar, solar, beats, old system) into independent, pluggable ES modules under `src/chronometers/`. Implement the composer/registry pattern. Transition display format from `H{year} L{lunation}.{pct} D{days} @{beats} {solar}` to `H{year} M{month} D{day} @{beats} {solar}`. Add `lunar-javascript` dependency for Chinese lunisolar calendar. Write unit + integration tests with Vitest.

This is a **refactoring phase** — all architecture decisions come from Phase 1's ARCHITECTURE.md. The work is extraction, wiring, and verification. No new features are added (location system, converters, alarms, visual redesign are all later phases).

</domain>

<decisions>
## Implementation Decisions

### Display Format Transition
- **D-24:** Immediate switch — once all modules are extracted, the display format changes in one commit. Old format (`L{lunation}.{pct} D{days}`) is replaced entirely by new format (`M{month} D{day}`). The `oldSystem.js` module remains in code but produces no visible output.
- **D-25:** Display format string: `H{holoceneYear} M{month} D{day} @{beats} {solar}` — single line, space-separated tokens. Leap months display as `MX` (e.g., `M4` for normal 4th month, `M4` → `M4` with leap indicator — see D-04 for exact format: `MX` where X is month number, so leap 4th month = `4X` or `M4X` — researcher should confirm exact formatting).

### Module Error Handling
- **D-26:** Per-module graceful degradation — the composer wraps each `compute()` call in try/catch. If a module throws, it returns a fallback string (`'??'` for numeric components, `'E!'` for errors). The rest of the clock continues rendering normally. This matches the existing solar `S??` pattern for unavailable data.
- **D-27:** Error logging — failed modules log to `console.warn` with module name and error message, so developers can diagnose issues without breaking the user experience.

### Composer Configurability
- **D-28:** Simple hard-coded imports — `chronometers/index.js` imports the 4 active modules (holocene, beats, solar, lunisolar) directly. No config-driven settings object yet. Adding/removing a module = editing one import line.
- **D-29:** Composer structure designed for easy future extension — each module result is a keyed property in the return object, so converting to `config.modules.map()` iteration later is trivial (supports REFACTOR-02 swappable systems foundation without rework).

### Test Strategy
- **D-30:** Vitest as test framework — lightweight (~30KB dev dep), ESM-native, works with Webpack projects, fast execution.
- **D-31:** One test file per chronometer module (`holocene.test.js`, `beats.test.js`, `solar.test.js`, `lunisolar.test.js`, `oldSystem.test.js`) — test `compute()` function with known date inputs → expected outputs.
- **D-32:** One integration test (`composer.test.js`) — verify `compose(date, opts)` returns correct combined output for known dates.
- **D-33:** Test data includes known reference dates: Chinese New Year 2026, equinox dates, specific new moon dates — verify against `lunar-javascript` and `astronomia` output.

### Claude's Discretion
- Exact test fixture dates and expected values (researcher should derive from library output)
- Vitest configuration details (config file location, coverage thresholds)
- Whether to add a `npm test` script alongside existing `npm start` and `npm run dev`
- Exact fallback string format for error handling (`'??'`, `'E!'`, `'--'` — all reasonable, pick consistently)

### Folded Todos
No pending todos matched this phase's scope.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 1 architecture decisions
- `.planning/ROADMAP.md` — Phase 2 deliverables: Chronometer base interface, individual modules, composer/registry, unit tests
- `.planning/STATE.md` — Project state, progress tracking
- `.planning/PROJECT.md` — Core value, REFACTOR-01/02/03 requirements, constraints
- `.planning/phases/01-codebase-audit-architecture-design/1-CONTEXT.md` — Decisions D-01 through D-23 (module contracts, library strategy, migration order)
- `.planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md` — Full modular architecture design with file tree, module contracts, library strategy, migration plan

### Codebase
- `src/index.js` — Current single-file implementation (161 lines), all clock logic
- `src/styles.css` — Visual styling
- `src/template.html` — HTML shell
- `package.json` — Current dependencies: `suncalc`, `astronomia`; Webpack 5 build
- `webpack.config.js` — Build configuration

No external specs or ADRs exist beyond Phase 1 artifacts.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `getHoloceneYear()` — Pure function, trivial extraction target
- `getBeats()` — Pure function, trivial extraction target
- `getSolarPercent()` + helpers — Pure functions using `suncalc`, isolated from other chronometers
- `getLunationSinceEquinox()` + `getNextNewMoon()` — Being replaced by `lunisolar.js` using `lunar-javascript`
- `updateClock()` + `convertGregorianToCustom()` — Will be refactored to use composer output

### Established Patterns
- All calculations are pure functional — no classes or state management (D-12)
- DOM update is separate from calculation (`updateClock` vs calculation functions)
- Geolocation API with fallback to `null` — solar percent returns `'S??'` when location unavailable
- Update interval: ~864ms (1 beat)
- Display renders into `#beats-container` element

### Integration Points
- `#beats-container` DOM element — single output target, display string format changes per D-24
- `chronometers/index.js` — composer file, imports all active modules (D-28)
- `package.json` — needs `lunar-javascript` added as dependency, `vitest` as dev dependency
- `src/index.js` — entry point, will be reduced to DOM update + geolocation bootstrap only

</code_context>

<specifics>
## Specific Ideas

- The display format transition is a clean break — no gradual migration, no toggle. One commit swaps the output string format.
- Error handling mirrors the existing `S??` solar fallback pattern — familiar behavior, no new UX concepts introduced.
- Vitest chosen over Jest to keep the project lightweight and avoid dependency bloat.
- The composer is simple now but structured so that `compose(date, opts).holocene` → `compose(date, opts)[config.activeModules[0]]` conversion later is trivial.
- Test known dates: Chinese New Year 2026 (Feb 17, 2026), Spring Equinox 2026, specific new moon dates, known beat times.
- The old system module (`oldSystem.js`) is preserved but NOT imported by the composer — it exists for reference and future Phase 2 swappable systems.

</specifics>

<deferred>
## Deferred Ideas

- Config-driven composer (settings object declaring active modules) — deferred to when REFACTOR-02 swappable time systems UI is implemented
- Toggle-able display format (query param or config flag to switch old/new format) — not needed with immediate switch approach
- Both formats visible simultaneously — deferred to Phase 5 (atmospheric visual redesign) if multi-line display desired
- Test framework coverage expansion beyond core chronometers — can add tests for edge cases, performance benchmarks later

### Reviewed Todos (not folded)
No pending todos matched this phase's scope.

</deferred>

---

*Phase: 02-modular-chronometry-core*
*Context gathered: 2026-04-13*
