# Plan 10-1: Format Configuration & Registry

## Scope
Build the complete format orchestration layer: localStorage config CRUD with schema versioning, format registry with object map lookup, default configuration, and empty renderer directory structure. This is pure infrastructure — no UI selectors (Phase 14) and no renderer implementations (Phases 11-13).

## Dependencies
- Depends on: Phase 9 (new chronometers — registry needs to know available data fields)
- Required by: Phase 11 (Year/Date renderers), Phase 12 (Standard Time renderers), Phase 13 (Solar Time renderers), Phase 14 (UI integration)
- File dependencies: None (creates new `src/formats/` directory)

## Requirements Addressed
- FORMAT-02: Format configuration persistence — single active config saved to localStorage with schema versioning (`beatClock_formats_v1`)
- FORMAT-04: Default format configuration loads on first visit (Holocene year, Gregorian date, UTC 24h standard time, Descriptive solar time)

## Tasks

<task id="10-1-1" requirement="FORMAT-02">
  <action>create</action>
  <target>src/formats/config.js</target>
  <description>Create localStorage config module with schema versioning and CRUD operations</description>
  <details>
    Read `src/alarms/store.js` and `src/location/store.js` first to match existing patterns exactly.

    Create `src/formats/config.js` with:
    - STORAGE_KEY constant: `'beatclock:formats'` (lowercase, colon-separated per convention)
    - SCHEMA_VERSION constant: `1`
    - DEFAULT_CONFIG constant: `{ version: 1, components: { year: 'holocene', date: 'gregorian', stdTime: '24h', solarTime: 'descriptive' } }`
      - Use `Object.freeze()` on DEFAULT_CONFIG to prevent accidental mutation
    - `loadFormatConfig()` function:
      - Try `localStorage.getItem(STORAGE_KEY)`
      - If null/undefined → return `{ ...DEFAULT_CONFIG }` (spread to create new copy)
      - If exists → JSON.parse → check `version === SCHEMA_VERSION` → if mismatch, warn and return defaults
      - On any error (parse, access, etc.) → `console.warn('Failed to load format config, using defaults')` → return defaults
    - `saveFormatConfig(config)` function:
      - `localStorage.setItem(STORAGE_KEY, JSON.stringify(config))`
      - On error → `console.warn('Failed to save format config:', e.message)`
    - All functions use named exports (not default exports)
    - All localStorage operations wrapped in try/catch
  </details>
  <verify>
    - File exists at `src/formats/config.js`
    - Contains `const STORAGE_KEY = 'beatclock:formats'`
    - Contains `const SCHEMA_VERSION = 1`
    - Contains `const DEFAULT_CONFIG` with correct default component mappings
    - Exports `loadFormatConfig` and `saveFormatConfig` as named exports
    - `loadFormatConfig` returns defaults when localStorage is empty
    - `loadFormatConfig` returns defaults when localStorage has wrong version
    - `loadFormatConfig` catches and warns on JSON parse errors
    - `saveFormatConfig` catches and warns on storage errors
  </verify>
</task>

<task id="10-1-2" requirement="FORMAT-02 FORMAT-04">
  <action>create</action>
  <target>src/formats/registry.js</target>
  <description>Create format registry with object map lookup for component+format→renderer mapping</description>
  <details>
    Read `src/chronometers/index.js` to understand the composer import pattern.

    Create `src/formats/registry.js` with:
    - Import all renderer stubs (created in task 10-1-3) — they will be empty placeholder functions for now
    - REGISTRY constant — nested object map:
      ```js
      const REGISTRY = {
        year: {
          holocene: renderHoloceneYear,
          gregorian: renderGregorianYear,
          meghalayan: renderMeghalayanYear,
          custom: renderCustomEpochYear,
        },
        date: {
          gregorian: renderGregorianDate,
          chinese: renderChineseDate,
          longitudinal: renderLongitudinalDate,
        },
        stdTime: {
          '24h': render24hStdTime,
          decimal: renderDecimalStdTime,
          longitudinal: renderLongitudinalStdTime,
        },
        solarTime: {
          '24h': render24hSolarTime,
          decimal: renderDecimalSolarTime,
          longitudinal: renderLongitudinalSolarTime,
          descriptive: renderDescriptiveSolarTime,
        },
      };
      ```
    - `getRenderer(componentId, formatId)` function:
      - Returns `REGISTRY[componentId]?.[formatId]` or `null` if not found
    - `getAvailableFormats(componentId)` function:
      - Returns `Object.keys(REGISTRY[componentId] || {})`
    - `getAllComponents()` function:
      - Returns `Object.keys(REGISTRY)`
    - Named exports (not default)
  </details>
  <verify>
    - File exists at `src/formats/registry.js`
    - Contains REGISTRY object with all 4 component groups (year, date, stdTime, solarTime)
    - year registry has: holocene, gregorian, meghalayan, custom
    - date registry has: gregorian, chinese, longitudinal
    - stdTime registry has: 24h, decimal, longitudinal
    - solarTime registry has: 24h, decimal, longitudinal, descriptive
    - Exports `getRenderer`, `getAvailableFormats`, `getAllComponents`
    - `getRenderer('year', 'holocene')` returns a function
    - `getRenderer('unknown', 'format')` returns null
    - `getAvailableFormats('date')` returns array of 3 format IDs
  </verify>
</task>

<task id="10-1-3" requirement="FORMAT-04">
  <action>create</action>
  <target>src/formats/renderers/</target>
  <description>Create empty renderer stub files for all format types</description>
  <details>
    Create the nested directory structure under `src/formats/renderers/`:

    Year renderers (`src/formats/renderers/year/`):
    - `holocene.js` — exports `render(data)` returning placeholder
    - `gregorian.js` — exports `render(data)` returning placeholder
    - `meghalayan.js` — exports `render(data)` returning placeholder
    - `custom.js` — exports `render(data)` returning placeholder

    Date renderers (`src/formats/renderers/date/`):
    - `gregorian.js` — exports `render(data)` returning placeholder
    - `chinese.js` — exports `render(data)` returning placeholder
    - `longitudinal.js` — exports `render(data)` returning placeholder

    Standard Time renderers (`src/formats/renderers/stdtime/`):
    - `24h.js` — exports `render(data)` returning placeholder
    - `decimal.js` — exports `render(data)` returning placeholder
    - `longitudinal.js` — exports `render(data)` returning placeholder

    Solar Time renderers (`src/formats/renderers/solartime/`):
    - `24h.js` — exports `render(data)` returning placeholder
    - `decimal.js` — exports `render(data)` returning placeholder
    - `longitudinal.js` — exports `render(data)` returning placeholder
    - `descriptive.js` — exports `render(data)` returning placeholder

    Each renderer stub should:
    - Accept `data` parameter (the compose() output for that component)
    - Return a string placeholder like `'[TODO: {formatName}]'` or the raw data value
    - Use named export `render`
    - Include JSDoc comment noting this is a stub to be implemented in later phases

    Example stub:
    ```js
    /**
     * Holocene year renderer stub.
     * Full implementation in Phase 11.
     * @param {object} data - Chronometer data (holocene value from compose())
     * @returns {string} Formatted year string
     */
    export function render(data) {
      return `H${data?.holocene ?? '??'}`;
    }
    ```
  </details>
  <verify>
    - 14 renderer stub files exist in correct nested directory structure
    - Each file exports named `render` function
    - Each renderer accepts `data` parameter and returns a string
    - Year renderers return reasonable format (e.g., `H{value}` for holocene)
    - Registry imports all 14 renderers successfully
    - No circular dependencies between config, registry, and renderers
  </verify>
</task>

<task id="10-1-4" requirement="FORMAT-02 FORMAT-04">
  <action>create</action>
  <target>tests/formats/config.test.js</target>
  <description>Create unit tests for config load/save/defaults and corrupted config handling</description>
  <details>
    Read `tests/alarms/store.test.js` or existing test files to match test patterns.

    Create `tests/formats/config.test.js` with Vitest tests covering:
    - Default config structure: loads defaults when localStorage is empty
    - Save and load cycle: save config, load returns same data
    - Schema version mismatch: wrong version → returns defaults
    - Corrupted JSON in localStorage: returns defaults with console.warn
    - localStorage unavailable (mock throws): returns defaults with console.warn
    - DEFAULT_CONFIG has correct component mappings:
      - year: 'holocene', date: 'gregorian', stdTime: '24h', solarTime: 'descriptive'
    - DEFAULT_CONFIG.version === 1
    - Config object shape: { version, components: { year, date, stdTime, solarTime } }

    Use Vitest's mock localStorage:
    ```js
    import { describe, it, expect, beforeEach, vi } from 'vitest';
    import { loadFormatConfig, saveFormatConfig } from '../../src/formats/config.js';

    describe('loadFormatConfig', () => {
      beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
      });

      it('returns defaults when localStorage is empty', () => { ... });
      it('returns saved config when localStorage has data', () => { ... });
      it('returns defaults on schema version mismatch', () => { ... });
      it('returns defaults on corrupted JSON', () => { ... });
      it('warns on corrupted config', () => { ... });
    });

    describe('saveFormatConfig', () => {
      it('saves config to localStorage', () => { ... });
      it('handles storage errors gracefully', () => { ... });
    });
    ```
  </details>
  <verify>
    - Test file exists at `tests/formats/config.test.js`
    - All tests pass: `npx vitest run tests/formats/config.test.js`
    - Tests cover: empty storage, save/load, version mismatch, corrupted JSON, storage errors
    - Default config values match expected mappings
    - console.warn is called on corrupted config
  </verify>
</task>

<task id="10-1-5" requirement="FORMAT-02 FORMAT-04">
  <action>create</action>
  <target>tests/formats/registry.test.js</target>
  <description>Create unit tests for registry lookup and format availability</description>
  <details>
    Create `tests/formats/registry.test.js` with Vitest tests covering:
    - `getRenderer(componentId, formatId)` returns correct renderer function
    - `getRenderer` returns null for unknown component/format
    - `getAvailableFormats(componentId)` returns correct format ID array
    - `getAllComponents()` returns ['year', 'date', 'stdTime', 'solarTime']
    - All registered renderers are callable functions
    - Registry structure matches expected 4 components with correct format counts

    ```js
    import { describe, it, expect } from 'vitest';
    import { getRenderer, getAvailableFormats, getAllComponents } from '../../src/formats/registry.js';

    describe('getRenderer', () => {
      it('returns renderer for valid component+format', () => { ... });
      it('returns null for unknown component', () => { ... });
      it('returns null for unknown format', () => { ... });
    });

    describe('getAvailableFormats', () => {
      it('returns format IDs for year', () => { ... });
      it('returns format IDs for date', () => { ... });
      it('returns empty array for unknown component', () => { ... });
    });
    ```
  </details>
  <verify>
    - Test file exists at `tests/formats/registry.test.js`
    - All tests pass: `npx vitest run tests/formats/registry.test.js`
    - Registry correctly maps all component+format combinations
    - Unknown component/format returns null or empty as expected
  </verify>
</task>

## Execution Order
1. **10-1-1** (config module — independent, foundation for everything)
2. **10-1-3** (renderer stubs — independent, but registry imports them)
3. **10-1-2** (registry — depends on 10-1-3 existing to import renderers)
4. **10-1-4** (config tests — depends on 10-1-1)
5. **10-1-5** (registry tests — depends on 10-1-2 and 10-1-3)

**Parallelization:**
- Wave 1: Tasks 10-1-1 and 10-1-3 (independent)
- Wave 2: Task 10-1-2 (depends on 10-1-3)
- Wave 3: Tasks 10-1-4 and 10-1-5 (depend on their respective modules)

## Files Affected
- Created:
  - `src/formats/config.js`
  - `src/formats/registry.js`
  - `src/formats/renderers/year/holocene.js`
  - `src/formats/renderers/year/gregorian.js`
  - `src/formats/renderers/year/meghalayan.js`
  - `src/formats/renderers/year/custom.js`
  - `src/formats/renderers/date/gregorian.js`
  - `src/formats/renderers/date/chinese.js`
  - `src/formats/renderers/date/longitudinal.js`
  - `src/formats/renderers/stdtime/24h.js`
  - `src/formats/renderers/stdtime/decimal.js`
  - `src/formats/renderers/stdtime/longitudinal.js`
  - `src/formats/renderers/solartime/24h.js`
  - `src/formats/renderers/solartime/decimal.js`
  - `src/formats/renderers/solartime/longitudinal.js`
  - `src/formats/renderers/solartime/descriptive.js`
  - `tests/formats/config.test.js`
  - `tests/formats/registry.test.js`
- Modified: None
- Deleted: None

## Notes
- All modules use named exports (consistent with existing codebase)
- Storage key follows `beatclock:` lowercase convention (not `beatClock:` from REQUIREMENTS.md — use `beatclock:formats` for consistency)
- Renderer stubs are placeholders — actual implementations happen in Phases 11-13
- No UI work in this phase — selectors come in Phase 14
- Registry will be integrated into `src/index.js` display pipeline in Phase 14
- DEFAULT_CONFIG uses `Object.freeze()` to prevent accidental mutation during development
