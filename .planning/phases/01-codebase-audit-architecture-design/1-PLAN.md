# Plan 1: Codebase Audit & Architecture Design

**Wave:** 1
**Depends on:** none
**Files modified:** `.planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md`
**Autonomous:** true
**Requirements:** [REFACTOR-01, REFACTOR-02, REFACTOR-03]

## Objective

Produce a comprehensive ARCHITECTURE.md document that captures the current codebase state, identifies issues, designs the modular component architecture, and specifies the migration plan. This is a documentation-only plan — no source code changes.

## must_haves

1. ARCHITECTURE.md exists with file tree diagram, current architecture documentation, issue inventory, modular design spec, and migration plan
2. All three requirement IDs (REFACTOR-01, REFACTOR-02, REFACTOR-03) appear in the `requirements` field of this plan's frontmatter
3. Migration plan specifies extraction order, module contracts, and verification criteria per module

## Tasks

### Task 1: Document Current Architecture
- **read_first:**
  - `src/index.js` (full current source — 161 lines)
  - `.planning/phases/01-codebase-audit-architecture-design/1-RESEARCH.md` (audit findings, issue table)
  - `.planning/phases/01-codebase-audit-architecture-design/1-CONTEXT.md` (decisions D-01 through D-23)
- **acceptance_criteria:**
  - `ARCHITECTURE.md` contains section `## Current Architecture`
  - `ARCHITECTURE.md` contains the function table: `getHoloceneYear`, `marchEquinoxJDE`, `getSpringEquinox`, `getDaysSinceEquinox`, `getLunationSinceEquinox`, `getNextNewMoon`, `getBeats`, `getNextSunrise`, `getPreviousSunset`, `getSolarPercent`, `updateClock`, `convertGregorianToCustom`
  - `ARCHITECTURE.md` contains `## Current File Structure` listing `src/index.js`, `src/styles.css`, `src/template.html`, `webpack.config.js`, `package.json`
  - `ARCHITECTURE.md` documents the 864ms update interval
  - `ARCHITECTURE.md` documents the 23:00 UTC equinox anchor quirk
  - `ARCHITECTURE.md` documents geolocation bootstrap pattern with error fallback
- **action:** Write the "Current Architecture" section of ARCHITECTURE.md. Include:
  - Current file structure listing all 5 files
  - Function-by-function table with columns: name, line range, type (pure/side-effect), dependencies, complexity, extraction difficulty
  - Document the geolocation bootstrap (getCurrentPosition with success/error callbacks, 864ms setInterval)
  - Document the 23:00 UTC equinox anchor: the code shifts equinox to previous 23:00 UTC via `anchorTime.setUTCHours(23, 0, 0, 0)` then conditionally subtracts a day if equinox hours < 23
  - Document the display format: `H${holoceneYear} L${moon.lunation}.${moon.percent} D${daysSinceEquinox} ${beats} ${solar}` rendered into `#beats-container`
  - Document existing dependencies: `suncalc` (sunrise/sunset/moon illumination), `astronomia` (solar.trueLongitude, julian.JDEToDate)

### Task 2: Document Issue Inventory
- **read_first:**
  - `.planning/phases/01-codebase-audit-architecture-design/1-RESEARCH.md` section 1.3 (Issues Summary table with 8 items)
  - `src/index.js` (verify each issue against current code)
- **acceptance_criteria:**
  - `ARCHITECTURE.md` contains section `## Issue Inventory`
  - `ARCHITECTURE.md` contains table with columns: #, Issue, Severity, Notes
  - Issue #1: "No immediate render on load (violates D-09)" marked High severity
  - Issue #2: "suncalc moon phase accuracy +/-6 hours" marked Medium severity
  - Issue #3: "getNextNewMoon hourly stepping (700+ iterations)" marked Medium severity
  - Issue #4: "Fixed lunar cycle constant 29.53059 vs astronomia 29.530588861" marked Low severity
  - Issue #5: "marchEquinoxJDE re-implements astronomia solstice table" marked Low severity
  - Issue #6: "convertGregorianToCustom duplicates updateClock logic" marked Low severity
  - Issue #7: "No error handling for invalid dates in convertGregorianToCustom" marked Low severity
  - Issue #8: "Webpack config is development-only (no production mode)" marked Low severity
- **action:** Write the "Issue Inventory" section as a markdown table. Copy all 8 issues from 1-RESEARCH.md section 1.3 verbatim. Include the severity column and notes column. This table will serve as the reference for what needs fixing in later phases.

### Task 3: Design Modular Architecture with File Tree Diagram
- **read_first:**
  - `.planning/phases/01-codebase-audit-architecture-design/1-CONTEXT.md` decisions D-12 through D-14 (functional ES modules, composer/registry, decomposition targets)
  - `.planning/phases/01-codebase-audit-architecture-design/1-RESEARCH.md` section 5 (Modular ES Module Architecture Pattern)
  - `.planning/phases/01-codebase-audit-architecture-design/1-RESEARCH.md` section 9 (Holocene year ticking on Chinese New Year — D-03 coupling)
- **acceptance_criteria:**
  - `ARCHITECTURE.md` contains section `## Proposed Modular Architecture`
  - `ARCHITECTURE.md` contains an ASCII file tree diagram showing `src/chronometers/` directory with 6 files: `holocene.js`, `beats.js`, `solar.js`, `lunisolar.js`, `oldSystem.js`, `index.js`
  - `ARCHITECTURE.md` documents the module contract: `export function compute(date, opts)` with JSDoc signature
  - `ARCHITECTURE.md` documents the composer pattern: `chronometers/index.js` imports all modules and exports `compose(date, opts)` returning object with keys `holocene`, `beats`, `solar`, `lunisolar`
  - `ARCHITECTURE.md` specifies that `oldSystem.js` is preserved but NOT called by the composer by default (hidden, available for Phase 2 swappable time systems per REFACTOR-02)
  - `ARCHITECTURE.md` documents the D-03 coupling: Holocene year ticks on Chinese New Year, requiring a shared `chineseNewYear.js` utility imported by both `holocene.js` and `lunisolar.js`
- **action:** Write the "Proposed Modular Architecture" section. Include:
  - ASCII file tree diagram:
    ```
    src/
    ├── index.js                    # Entry point + DOM update + geolocation bootstrap
    ├── styles.css
    ├── template.html
    └── chronometers/
        ├── index.js                # Composer — imports and calls all chronometers
        ├── chineseNewYear.js       # Shared utility — Chinese New Year date lookup
        ├── holocene.js             # Holocene year (ticks on Chinese New Year per D-03)
        ├── beats.js                # Swatch Internet Time
        ├── solar.js                # Solar percent (location-dependent)
        ├── lunisolar.js            # Chinese lunisolar date (year, month, day, leap)
        └── oldSystem.js            # Legacy: lunation + days since equinox (hidden)
    ```
  - Module contract specification with JSDoc:
    ```js
    /**
     * @param {Date} date - The date to calculate
     * @param {object} [opts] - Optional configuration
     * @param {number} [opts.latitude] - Latitude for location-dependent calculations
     * @param {number} [opts.longitude] - Longitude for location-dependent calculations
     * @returns {object|string|number} Result specific to this chronometer
     */
    export function compute(date, opts) { ... }
    ```
  - Composer pattern specification showing how `chronometers/index.js` imports all modules and exports `compose(date, opts)` returning `{ holocene, beats, solar, lunisolar }`
  - Note that `oldSystem.js` is NOT imported by the composer — it exists as a standalone module for Phase 2 (REFACTOR-02: swappable time systems)
  - Document the D-03 coupling: `chineseNewYear.js` is a shared utility that both `holocene.js` and `lunisolar.js` import, keeping them independent of each other

### Task 4: Document Library Strategy and Technology Selection
- **read_first:**
  - `.planning/phases/01-codebase-audit-architecture-design/1-RESEARCH.md` sections 3-4 (Library Evaluation, Recommended Library Strategy)
  - `package.json` (current dependencies)
- **acceptance_criteria:**
  - `ARCHITECTURE.md` contains section `## Library Strategy`
  - `ARCHITECTURE.md` documents current dependencies: `suncalc` v1.9.0, `astronomia` v4.1.1
  - `ARCHITECTURE.md` recommends adding `lunar-javascript` with justification: zero deps, MIT license, handles Chinese New Year/leap months, 1900-2100 range
  - `ARCHITECTURE.md` recommends keeping `suncalc` for sunrise/sunset only (drop for moon)
  - `ARCHITECTURE.md` recommends expanding `astronomia` usage to include `moonphase.newMoon()` for precise new moon JDE
  - `ARCHITECTURE.md` documents bundle impact: lunar-javascript ~50-70KB minified, ~15-20KB gzipped
  - `ARCHITECTURE.md` documents CommonJS interop note: lunar-javascript uses `module.exports`, Webpack handles transparently
- **action:** Write the "Library Strategy" section. Include three subsections:
  - **Current dependencies:** table listing suncalc v1.9.0 (sunrise/sunset, moon illumination) and astronomia v4.1.1 (Julian dates, equinox)
  - **Proposed additions:** table listing lunar-javascript (Chinese lunisolar calendar, zero deps, MIT, 1900-2100 range, ~50-70KB minified)
  - **Migration impact:** note that lunar-javascript is CommonJS but Webpack handles it transparently, no webpack.config.js changes needed, no dependency conflicts

### Task 5: Write Migration Plan with Extraction Order
- **read_first:**
  - `.planning/phases/01-codebase-audit-architecture-design/1-CONTEXT.md` decisions D-21 through D-23 (incremental extraction, order, no branch-and-rewrite)
  - `.planning/phases/01-codebase-audit-architecture-design/1-RESEARCH.md` section 5.4 (Migration Order)
  - `.planning/PROJECT.md` requirements REFACTOR-01, REFACTOR-02, REFACTOR-03
- **acceptance_criteria:**
  - `ARCHITECTURE.md` contains section `## Migration Plan`
  - `ARCHITECTURE.md` specifies extraction order: 1. Holocene, 2. Beats, 3. Solar, 4. Lunisolar, 5. Old System
  - `ARCHITECTURE.md` documents the verification criteria after each extraction: "clock still renders correctly with byte-identical output"
  - `ARCHITECTURE.md` documents that each extraction is a separate atomic commit
  - `ARCHITECTURE.md` documents that the display format must remain byte-for-byte identical after modules 1-4 extraction
  - `ARCHITECTURE.md` includes the display format transition: current format `H{year} L{lunation}.{percent} D{days} @{beats} {solar}` will change to new format `H{year} M{month} D{day} @{beats} {solar}` once lunisolar module replaces old system
  - `ARCHITECTURE.md` documents the immediate render fix (D-09): render on page load with null location, then re-render when geolocation resolves
  - `ARCHITECTURE.md` references REFACTOR-01 (modular chronometry components), REFACTOR-02 (swappable time systems), REFACTOR-03 (code organization)
- **action:** Write the "Migration Plan" section. Include:
  - **Extraction order table:** 5 rows with columns: Step, Module, Dependencies, Rationale
    1. Holocene year — zero deps, pure Date operation — ideal first extraction
    2. Beats — zero deps, pure Date operation — independent
    3. Solar percent — depends on suncalc + location, but isolated from other chronometers
    4. Lunisolar date — depends on lunar-javascript (new dependency), replaces old lunation+equinox
    5. Old system — existing logic preserved as hidden module for Phase 2
  - **Per-extraction verification:** After each module extraction: (a) remove function from src/index.js, (b) import from new module, (c) verify clock renders with same output, (d) commit atomically
  - **Display format transition:** Document that the output string changes from `H{year} L{lunation}.{percent} D{days} @{beats} {solar}` to `H{year} M{month} D{day} @{beats} {solar}` when the lunisolar module goes live. The old system module preserves the current format internally for Phase 2 toggling.
  - **Immediate render fix:** Current code waits for geolocation before first render (violates D-09). Fix: render immediately on page load with null location (solar shows `S??`), then re-render when geolocation resolves. This is a single change to the geolocation bootstrap in src/index.js.
  - **REFACTOR-01 mapping:** Each chronometer becomes an independent, pluggable module in `src/chronometers/`
  - **REFACTOR-02 mapping:** The composer pattern allows swapping which modules are active — oldSystem.js is prepared but not imported, ready for Phase 2 toggle implementation
  - **REFACTOR-03 mapping:** File structure separates concerns — calculations in chronometers/, DOM update in index.js, styling in styles.css, build config in webpack.config.js

### Task 6: Document Edge Cases and Deferred Items
- **read_first:**
  - `.planning/phases/01-codebase-audit-architecture-design/1-RESEARCH.md` sections 6-7 (Performance Considerations, Edge Cases)
  - `.planning/phases/01-codebase-audit-architecture-design/1-CONTEXT.md` deferred items
- **acceptance_criteria:**
  - `ARCHITECTURE.md` contains section `## Edge Cases`
  - `ARCHITECTURE.md` documents leap month display as `MX` per D-04
  - `ARCHITECTURE.md` documents polar sunrise/sunset handling (suncalc returns undefined, fallback to `S??`)
  - `ARCHITECTURE.md` documents geolocation edge cases: permission denied, timeout, no immediate render
  - `ARCHITECTURE.md` contains section `## Deferred Items`
  - `ARCHITECTURE.md` lists sexagenary cycle as deferred
  - `ARCHITECTURE.md` lists 24 solar terms as deferred
  - `ARCHITECTURE.md` lists multi-line display format as deferred (Phase 5)
- **action:** Write "Edge Cases" and "Deferred Items" sections. Edge cases table with columns: Edge Case, Description, Handling. Include: leap month display (lunar-javascript returns negative month number, check `month < 0`, display as `MX`), polar sunrise/sunset (suncalc returns undefined, current code returns `S??`), geolocation permission denied (fallback to null, solar shows `S??`), geolocation timeout (falls back to error handler). Deferred items list: sexagenary cycle (60-year stems/branches), 24 solar terms (节气), multi-line/stacked display format (Phase 5 visual redesign).

### Task 7: Write ARCHITECTURE.md Header, Summary, and Requirements Mapping
- **read_first:**
  - `.planning/ROADMAP.md` Phase 1 deliverables
  - `.planning/PROJECT.md` requirements REFACTOR-01, REFACTOR-02, REFACTOR-03
- **acceptance_criteria:**
  - `ARCHITECTURE.md` starts with `# Beat Clock Architecture` header
  - `ARCHITECTURE.md` contains `## Requirements Mapping` section with explicit REFACTOR-01, REFACTOR-02, REFACTOR-03 entries
  - `ARCHITECTURE.md` contains `## Phase 1 Deliverables Checklist` with all 4 deliverables from ROADMAP.md checked off
  - `ARCHITECTURE.md` is a complete, self-contained document (no references to external files for understanding)
  - `ARCHITECTURE.md` contains at least 80 lines of substantive content
- **action:** Add the document header, requirements mapping, and deliverables checklist. Header: `# Beat Clock Architecture` with subtitle `Codebase audit, modular design, and migration plan for Phase 1`. Requirements mapping table: REFACTOR-01 -> `src/chronometers/` directory with 5 independent modules, REFACTOR-02 -> composer pattern with oldSystem.js prepared but not imported, ready for Phase 2 toggle, REFACTOR-03 -> separation of concerns with calculations in chronometers/, DOM in index.js, styles in styles.css. Deliverables checklist: (1) Documented codebase architecture — Current Architecture + Issue Inventory sections, (2) Modular component design — Proposed Modular Architecture section, (3) Refactoring migration plan — Migration Plan section, (4) Technology selection — Library Strategy section.

## Verification

After all tasks complete, verify:

1. **File exists:** `.planning/phases/01-codebase-audit-architecture-design/ARCHITECTURE.md` exists and is non-empty
2. **Content completeness:** `ARCHITECTURE.md` contains all 7 sections: Current Architecture, Issue Inventory, Proposed Modular Architecture, Library Strategy, Migration Plan, Edge Cases, Deferred Items, Requirements Mapping, Phase 1 Deliverables Checklist
3. **File tree diagram:** `ARCHITECTURE.md` contains ASCII tree diagram with `src/chronometers/` directory and all 6 module files
4. **Requirement IDs:** `ARCHITECTURE.md` contains strings `REFACTOR-01`, `REFACTOR-02`, `REFACTOR-03`
5. **Decision references:** `ARCHITECTURE.md` references D-01 through D-23 where relevant
6. **Module contract:** `ARCHITECTURE.md` documents `export function compute(date, opts)` pattern
7. **Extraction order:** `ARCHITECTURE.md` specifies Holocene -> Beats -> Solar -> Lunisolar -> Old System order
8. **Library strategy:** `ARCHITECTURE.md` recommends `lunar-javascript` addition
9. **Immediate render fix:** `ARCHITECTURE.md` documents the D-09 violation and fix

## PLANNING COMPLETE
