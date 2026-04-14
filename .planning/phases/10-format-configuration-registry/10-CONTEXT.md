# Phase 10: Format Configuration & Registry - Context

**Gathered:** 2026-04-14
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the format orchestration layer: localStorage configuration CRUD with schema versioning (`beatClock_formats_v1`), and the format registry that maps component+format to render function slots. This is infrastructure — no UI selectors yet (Phase 14). Default configuration loads on first visit (Holocene year, Gregorian date, UTC 24h standard time, Descriptive solar time).

Requirements: FORMAT-02, FORMAT-04

</domain>

<decisions>
## Implementation Decisions

### Config API design
- **D-01:** Simple get/set API matching existing store patterns (`src/alarms/store.js`, `src/location/store.js`)
  - `loadFormatConfig()` — returns full config object or defaults
  - `saveFormatConfig(config)` — persists entire config
  - No per-component getters/setters — not needed until Phase 14

### Registry architecture
- **D-02:** Object map lookup — `registry[component][formatId](data)`
  - Nested object: `{ year: { holocene: fn, ... }, date: { gregorian: fn, ... }, ... }`
  - All renderers registered at init time
  - Simple, fast, easy to test — no registration or factory abstraction

### Default config bootstrap
- **D-03:** Always-fallback strategy — every load attempts localStorage first
  - Missing config → return defaults
  - Corrupted JSON → return defaults
  - Wrong schema version → return defaults
  - Single code path handles all cases (matches `alarms/store.js` returning `[]` on error)

### Corrupted config handling
- **D-04:** Silent fallback with `console.warn('Failed to load format config, using defaults')`
  - No UI toast or prompt — belongs in Phase 14 (UI integration)
  - Consistent with `location/store.js` which returns `[]` or `null` on error

### Renderer directory structure
- **D-05:** Nested directory structure matching existing codebase conventions
  - `src/formats/renderers/year/holocene.js`, `src/formats/renderers/date/gregorian.js`, etc.
  - Empty renderer skeleton in this phase — actual implementations in Phases 11-13

### Schema versioning
- **D-06:** Schema version field `version: 1` in config object
  - Key: `beatClock_formats_v1`
  - Migration path: if version mismatch detected, fall back to defaults (no migration logic needed yet since v1)

### Config object shape
- **D-07:** Config object structure: `{ version: 1, components: { year: 'holocene', date: 'gregorian', stdTime: '24h', solarTime: 'descriptive' } }`
  - `components` key holds component→formatId mappings
  - `version` key at top level for schema checking

### Claude's Discretion
- Exact file naming conventions (kebab-case vs camelCase for renderer files)
- Whether to use `Object.freeze()` on defaults object
- Whether registry exports as default or named export
- Exact console.warn message wording

</decisions>

<specifics>
## Specific Ideas

- "Should feel like the existing store modules — simple exports, try/catch, no classes"
- Config key follows existing `beatclock:` namespace convention (lowercase, colon-separated)
- Registry should be importable by `src/index.js` display pipeline without circular dependencies

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Format system
- `.planning/ROADMAP.md` §Phase 10 — Phase requirements, deliverables, success criteria
- `.planning/REQUIREMENTS.md` — FORMAT-02 (persistence), FORMAT-04 (default config) requirements

### Existing patterns to follow
- `src/alarms/store.js` — localStorage CRUD pattern, schema versioning, error handling
- `src/location/store.js` — localStorage CRUD pattern, silent error handling, fallback behavior
- `src/chronometers/index.js` — Composer pattern, module import structure, try/catch error boundaries

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/alarms/store.js`** — Template for localStorage CRUD with schema versioning. Uses `beatclock:alarms` key, version field, try/catch on all operations.
- **`src/location/store.js`** — Template for silent error handling and fallback. Returns empty arrays/null on any error.
- **`src/chronometers/index.js`** — Composer pattern shows how modules are imported and combined. Registry should follow similar import structure.

### Established Patterns
- Storage keys use `beatclock:` prefix (lowercase, colon-separated)
- All store modules use named exports (not default exports)
- All localStorage operations wrapped in try/catch with `console.warn`
- No classes — pure functional modules

### Integration Points
- `src/formats/` directory does not exist yet — this phase creates it
- Registry will be consumed by `src/index.js` display pipeline (Phase 14 integration)
- Renderers will consume data from `compose()` output in `src/chronometers/index.js`

</code_context>

<deferred>
## Deferred Ideas

- Per-component format change events — Phase 14 (UI integration)
- Named format presets — out of scope (single config only per PROJECT.md)
- Multiple simultaneous formats per component — out of scope
- Config UI with validation — Phase 14
- Schema migration logic — not needed until schema changes (future milestone)

</deferred>

---

*Phase: 10-format-configuration-registry*
*Context gathered: 2026-04-14*
