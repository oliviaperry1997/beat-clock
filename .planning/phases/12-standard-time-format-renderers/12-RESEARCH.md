# Phase 12 Research: Standard Time Format Renderers

**Researched:** 2026-04-14
**Phase:** 12-standard-time-format-renderers
**Status:** Ready for planning

---

## 1. Codebase Context

### What exists that Phase 12 builds on

Phase 10 (format registry + config) and Phase 11 (year & date renderers) are **complete**. The infrastructure this phase depends on is fully in place:

- `src/formats/registry.js` — static registry, already imports and registers all three stdtime stubs
- `src/formats/config.js` — localStorage CRUD with schema versioning (`beatclock:formats`)
- `src/formats/renderers/stdtime/24h.js` — stub with correct skeleton (meridianOffset, hour wrap math)
- `src/formats/renderers/stdtime/decimal.js` — stub (wrong opts key `beatOffset`, wrong logic)
- `src/formats/renderers/stdtime/longitudinal.js` — stub (wrong symbol `☉`, wrong opts key `longitudeOffset`, wrong logic)
- `src/chronometers/beats.js` — reference for BMT-anchored beats formula
- 430 tests currently passing across 37 test files

**There is NO `tests/formats/renderers/stdtime/` directory yet** — it must be created.
**There is NO `src/formats/renderers/stdtime/meridian-select.js`** — must be created.

### Current state of the three stubs

| File | Stub quality | What to change |
|------|-------------|----------------|
| `24h.js` | Good skeleton — `meridianOffset`, wrap math, UTC methods | Fix `adjustedHours` (must be integer before padding), add `showSeconds`, add date-validity guard, fix `new Date()` fallback guard |
| `decimal.js` | Wrong opts key (`beatOffset` → `meridianOffset`), wrong logic (passes through `data.beats` instead of recomputing) | Full rewrite of logic |
| `longitudinal.js` | Wrong symbol (`☉` → `⌚`), wrong opts key (`longitudeOffset` → `meridianOffset`), wrong logic (no computation) | Full rewrite |

---

## 2. Format Registry API

The registry in `src/formats/registry.js` is a **static, frozen object**. There is no dynamic `register()` call.

```js
// Pattern: import → add to REGISTRY object literal
import { render as render24hStdTime } from './renderers/stdtime/24h.js';

const REGISTRY = Object.freeze({
  stdTime: Object.freeze({
    '24h': render24hStdTime,
    decimal: renderDecimalStdTime,
    longitudinal: renderLongitudinalStdTime,
  }),
  // ...
});
```

**Phase 12 does NOT need to modify `registry.js`** — the three stdtime renderers are already imported and registered (pointing at the stubs). Replacing the stub files is sufficient; the registry imports by path and picks up the new exports automatically.

**API surface used by renderers:**
```js
// Consumers call:
const renderer = getRenderer('stdTime', '24h');
const output = renderer(data, opts);

// data shape (injected by Phase 14 pipeline):
// { now: Date, beats: string, solarTime: object, ... }

// opts shape (injected by Phase 14 pipeline):
// { meridianOffset: number }  ← hours, floating-point
```

---

## 3. Renderer Structure

### Interface / contract every renderer must implement

```js
/**
 * @param {object} data  - Chronometer data. data.now is a Date injected by Phase 14.
 * @param {object} opts  - Pipeline options. opts.meridianOffset is hours (float).
 * @returns {string}     - Formatted output string. Never throws.
 */
export function render(data, opts = {}) { ... }
```

**All renderers in this phase follow exactly this signature.** Named export `render` is the only export from each renderer file.

### Established patterns from Phase 11

```js
// 1. data.now guard (canonical pattern from gregorian.js)
const raw = data?.now;
const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();

// 2. UTC methods throughout (never getHours(), getMinutes(), etc.)
const h = now.getUTCHours();
const m = now.getUTCMinutes();
const s = now.getUTCSeconds();
const ms = now.getUTCMilliseconds();

// 3. Error fallback strings matching expected output width
return '??:??';        // 24h no-seconds fallback
return '??:??:??';     // 24h with-seconds fallback
return '@???';         // decimal fallback (note: existing beats uses @000.00 format)
return '⌚ ???°';       // longitudinal fallback

// 4. opts with default
const meridianOffset = opts.meridianOffset ?? 0;
```

### 24h renderer specifics (D-01 through D-05)

The existing stub has a bug: `String(adjustedHours)` where `adjustedHours` is `((utcHours + meridianOffset) % 24 + 24) % 24` — this may return a fractional number when `meridianOffset` is fractional (e.g. IST = +5.5). Hours must be floored:

```js
const adjustedHours = Math.floor(((utcHours + meridianOffset) % 24 + 24) % 24);
```

Minutes and seconds are read directly from UTC without adjustment (D-03).

```js
// Full 24h renderer logic
const meridianOffset = opts.meridianOffset ?? 0;
const raw = data?.now;
const now = (raw instanceof Date && !isNaN(raw)) ? raw : new Date();
const utcHours = now.getUTCHours();
const adjustedHours = Math.floor(((utcHours + meridianOffset) % 24 + 24) % 24);
const h = String(adjustedHours).padStart(2, '0');
const m = String(now.getUTCMinutes()).padStart(2, '0');
if (opts.showSeconds) {
  const s = String(now.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}
return `${h}:${m}`;
```

### Decimal beats renderer specifics (D-06 through D-10)

Recomputed from meridian midnight — NOT from `data.beats` (which is BMT-anchored):

```js
// Compute total UTC milliseconds since midnight
const msOfDay = now.getUTCHours() * 3600000
              + now.getUTCMinutes() * 60000
              + now.getUTCSeconds() * 1000
              + now.getUTCMilliseconds();

const meridianOffsetMs = (opts.meridianOffset ?? 0) * 3600000;
const totalMs = (msOfDay + meridianOffsetMs % 86400000 + 86400000) % 86400000;
const beats = totalMs / 86400;   // 86400ms per beat

return `@${beats.toFixed(2).padStart(6, '0')}`;
// e.g. @270.25 — matching existing beats.js output format
```

Key distinction: `beats.js` uses `bmtOffset = 3600000` (UTC+1). The decimal renderer uses `meridianOffsetMs = opts.meridianOffset * 3600000`. At `meridianOffset = 1`, the outputs must match. This is a useful test case.

**Output format:** `@NNN.NN` — 6 chars total including `@`, zero-padded. E.g. `@000.00`, `@270.25`, `@999.99`. From the existing `beats.js`: `beats.toFixed(2).padStart(6, '0')`.

**Error fallback:** `'@???'` (D-09). Note this is shorter than the happy-path format — acceptable since it signals error state.

### Longitudinal renderer specifics (D-11 through D-16)

Time-as-degrees: `0° = midnight`, `180° = noon`, `360° = end-of-day (wraps to 0°)`.

```js
const meridianOffsetMs = (opts.meridianOffset ?? 0) * 3600000;
const msOfDay = now.getUTCHours() * 3600000 + ...;
const adjustedMs = (msOfDay + meridianOffsetMs % 86400000 + 86400000) % 86400000;
const degrees = adjustedMs / 86400000 * 360;
return `\u231A ${degrees.toFixed(2)}\u00B0`;
// e.g. ⌚ 270.25°
```

Symbol: `⌚` = U+231A WATCH. **NOT** `☉` (U+2609 SUN) which is used in `date/longitudinal.js`.

---

## 4. Time Calculation Patterns

### Core UTC milliseconds-of-day pattern

All three renderers share this fundamental building block:

```js
const msOfDay = now.getUTCHours() * 3600000
              + now.getUTCMinutes() * 60000
              + now.getUTCSeconds() * 1000
              + now.getUTCMilliseconds();
```

`msOfDay` ranges from `0` (midnight UTC) to `86399999` (one ms before midnight UTC).

### Meridian offset application

```js
const meridianOffsetMs = meridianOffset * 3600000;  // hours → ms
// Proper wrap (handles both positive and negative offsets):
const adjustedMs = ((msOfDay + meridianOffsetMs) % 86400000 + 86400000) % 86400000;
```

This double-modulo pattern is the same as used in `24h.js` for hours: `((x % N) + N) % N`.

### Conversion table

| Unit | Conversion |
|------|-----------|
| 1 hour | 3,600,000 ms |
| 1 day | 86,400,000 ms |
| 1 beat | 86,400 ms |
| 1 degree (longitudinal) | 86,400,000 / 360 = 240,000 ms = 4 minutes |
| 100 beats | 8,640,000 ms = 2.4 hours |
| 15° longitude | 3,600,000 ms = 1 hour |

### Beats formula reference (from `beats.js`)

```js
const bmtOffset = 3600000;  // UTC+1
const totalMs = (msOfDay + bmtOffset) % 86400000;
const beats = totalMs / 86400;
return `@${beats.toFixed(2).padStart(6, '0')}`;
```

The decimal renderer replaces `bmtOffset` with `meridianOffsetMs`. At offset=+1h, outputs must match `beats.js`.

### Midnight crossing (D-23, D-24)

Handled entirely by the `((x % N) + N) % N` arithmetic. No visual indicator — the time string just shows the wrapped value. Example:
- UTC 23:00 + offset +3h → `((23 + 3) % 24 + 24) % 24 = 2` → `02:00`
- UTC 01:00 + offset -3h → `((1 - 3) % 24 + 24) % 24 = 22` → `22:00`

---

## 5. Test Patterns

### Canonical test structure

From `tests/formats/renderers/date/gregorian.test.js`:

```js
// @vitest-environment node    ← required directive (not jsdom) for pure renderer tests
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/date/gregorian.js';

describe('gregorian date renderer', () => {
  it('renders [expected output] from data.now', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)) };
    expect(render(data)).toBe('4/14');
  });

  it('falls back to new Date() when data.now is absent', () => {
    const result = render({});
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}$/);  // pattern match for live date
  });
});
```

**Key conventions:**
1. `// @vitest-environment node` at top (not jsdom) — all pure renderer tests use this
2. Relative import path `../../../../src/formats/renderers/...`
3. Test file location mirrors src: `tests/formats/renderers/stdtime/24h.test.js` etc.
4. Controlled dates via `new Date(Date.UTC(...))` — predictable, timezone-independent
5. Pattern-match tests (`.toMatch(regex)`) for fallbacks that use `new Date()`
6. `data = null`, `data = {}`, `data.now = undefined` — all tested for error paths

### Test directory to create

```
tests/formats/renderers/stdtime/
  24h.test.js
  decimal.test.js
  longitudinal.test.js
  meridian-select.test.js      ← for the selector component (if testable in isolation)
```

### Test cases to cover per renderer

**24h renderer:**
- Basic `HH:MM` output (e.g. `08:30`, `23:59`, `00:00`)
- Zero-padding for single-digit hours and minutes
- `showSeconds: true` → `HH:MM:SS` output
- `meridianOffset = 0` → UTC (baseline)
- `meridianOffset = 5.5` (IST) → fractional hour handled (minutes unchanged, hours floored)
- `meridianOffset = -5` → negative offset
- Midnight crossing forward: UTC 23:00 + offset +3 → `02:00`
- Midnight crossing backward: UTC 01:00 + offset -3 → `22:00`
- Extreme offsets: +14h, -12h
- Error fallback: `data.now = undefined`, `data.now = null`, `data.now = new Date('invalid')`
- Error fallback string: `'??:??'` (no seconds) vs `'??:??:??'` (with seconds)

**decimal renderer:**
- `@000.00` at meridian midnight (UTC 00:00, offset 0)
- `@500.00` at meridian noon (UTC 12:00, offset 0)
- `@999.99` at one tick before midnight
- At offset +1h: output matches `beats.js` BMT output at corresponding UTC time
- Fractional offsets (IST +5.5h) computed correctly
- Zero-padding: `@041.67` not `@41.67`
- Midnight crossing: offset shifts computation correctly
- Error fallback: `'@???'`

**longitudinal renderer:**
- `⌚ 0.00°` at meridian midnight
- `⌚ 180.00°` at meridian noon
- `⌚ 270.25°` at a known time
- Symbol is `⌚` (U+231A), NOT `☉`
- 2 decimal places
- Meridian offset shifts result correctly
- Error fallback: `'⌚ ???°'`
- Output wraps correctly (stays in 0–360 range)

**Meridian selector (if testing in isolation):**
- Emits correct degree value for each format's intervals
- Snapping logic: switching from longitudinal to 24h snaps to nearest 15°
- Custom input accepts arbitrary degrees
- Default value is `0`

---

## 6. Meridian Offset Logic

### Internal representation

The meridian selector stores **longitude degrees** (float, −180 to +180). This is the canonical config value.

Phase 14 converts degrees → hours when calling renderers:
```js
const meridianOffsetHours = longitudeDegrees / 15;
```

All three renderers accept `opts.meridianOffset` in **hours** (float).

### Format-native display intervals

| Format | Display unit | Step | Range | Notes |
|--------|-------------|------|-------|-------|
| `24h` | hours | 1h (= 15°) | −12h to +14h | Plus named half/quarter-hour presets |
| `decimal` | beats | 100 beats (= 36°) | −500 to +500 beats (10 steps) | 100 beats = 8,640,000ms = 2.4h = 36° |
| `longitudinal` | degrees | 1° | −180° to +180° | Full range |

### Named half-hour/quarter-hour presets (24h format)

From D-18:
- IST +5.5h (India Standard Time, +82.5°)
- NPT +5.75h (Nepal Time, +86.25°)
- ACST +9.5h (Australian CST, +142.5°)
- IRST +3.5h (Iran Standard Time, +52.5°)

### Auto-snap on format switch (D-19)

When user switches format, the stored longitude snaps to nearest valid interval for new format.

```js
// Example: switching to 24h format → snap to nearest 15°
function snapToHourInterval(degrees) {
  return Math.round(degrees / 15) * 15;
}

// Example: switching to decimal format → snap to nearest 36°
function snapToDecimalInterval(degrees) {
  return Math.round(degrees / 36) * 36;
}
```

Snapping is a UI affordance only — renderers work with any float value.

### Midnight crossing arithmetic

```js
// Canonical wrap — works for any real meridianOffset:
const adjustedMs = ((msOfDay + meridianOffsetMs) % 86400000 + 86400000) % 86400000;
```

Edge cases:
- `meridianOffset = +14h` → shifts +50400000ms → valid wrap
- `meridianOffset = -12h` → shifts -43200000ms → needs `+86400000` to stay positive
- `meridianOffset = 0` → no-op
- `meridianOffset = +24h` → equivalent to 0h (full day wrap)

---

## 7. UI Component Pattern

### Meridian selector (`meridian-select.js`)

From D-17 through D-22 and the location UI pattern:

**Output:** The selector is a pure UI component that emits a degree value. It does NOT persist to localStorage directly — persistence is Phase 10's `config.js` concern (FORMAT-02). Wiring to the live display pipeline is Phase 14.

**Pattern mirrors location UI (`src/location/ui.js`):**
- DOM elements created via `innerHTML` template strings
- Event listeners attached imperatively after DOM creation
- Manual input: `<input type="number" min="-180" max="180" step="any">` pattern
- No framework dependencies — vanilla JS

**Selector structure sketch:**

```js
// meridian-select.js
export function createMeridianSelector(opts = {}) {
  // opts.format: 'stdTime:24h' | 'stdTime:decimal' | 'stdTime:longitudinal'
  // opts.initialDegrees: number (default 0)
  // opts.onChange: function(degrees) — callback when value changes

  const el = document.createElement('div');
  el.className = 'meridian-selector';
  // ...render presets based on opts.format...
  // ...attach custom input...
  // ...call opts.onChange(degrees) on selection...
  return el;
}

// Or export as a function that returns {element, getValue, setValue}
```

**`<select>` + `<input>` vs custom dropdown:** Context pattern uses `<select>` for typed lists. Given the preset counts (24h: ~27 presets; decimal: ~10; longitudinal: 360+), a `<select>` with a "Custom…" option triggering a `<input type="number">` inline is the cleanest pattern matching the location system's manual input section.

**No location data seeding (D-20):** Default is always `0°` (UTC/Prime Meridian). The location system's longitude is not used as the initial value.

---

## 8. Dependencies & Integration Points

### What Phase 10 provides

- `src/formats/registry.js` — already imports and registers the three stubs. No modification needed for Phase 12.
- `src/formats/config.js` — `loadFormatConfig()`, `saveFormatConfig()`, `getFormat()`, `setFormat()` — available but not directly called by renderers. The selector's output will be persisted by Phase 14 using this API.

### What Phase 12 provides to Phase 14

- Three working `render(data, opts)` functions accepting `opts.meridianOffset` in hours
- `createMeridianSelector` (or equivalent) component that emits degree values
- Phase 14 converts degrees → hours and wires the pipeline together

### Data flow (Phase 14 concern — noted for context)

```
localStorage (degrees) 
  → meridian-select.js getValue() → degrees
  → Phase 14 pipeline: meridianOffsetHours = degrees / 15
  → render(data, { meridianOffset: meridianOffsetHours })
  → DOM update
```

### `data.now` injection

`data.now` is a `Date` object representing the current moment. It is NOT timezone-adjusted — it is a plain UTC `Date` that renderers apply the meridian offset to themselves via UTC methods. Phase 14 injects it; Phase 12 renderers fall back to `new Date()` when absent.

---

## 9. Validation Architecture

### Test execution commands

```sh
# Run all stdtime tests (once directory is created):
npx vitest run tests/formats/renderers/stdtime

# Run single test file:
npx vitest run tests/formats/renderers/stdtime/24h.test.js

# Run all format tests:
npx vitest run tests/formats

# Run full suite:
npm test
```

### Validation layers

**Layer 1 — Unit tests per renderer (primary)**
Each renderer tested in complete isolation. Data objects constructed manually. Zero DOM, zero localStorage, no integration.

```
tests/formats/renderers/stdtime/
  24h.test.js         — ≥ 15 test cases
  decimal.test.js     — ≥ 12 test cases
  longitudinal.test.js — ≥ 10 test cases
```

**Layer 2 — Meridian selector tests**
The selector component tests UI logic in isolation. Since it creates DOM elements, tests need jsdom environment. Consider using `// @vitest-environment jsdom` (the default in this project, not `node`).

```
tests/formats/renderers/stdtime/
  meridian-select.test.js  — snap logic, event callbacks, degree emission
```

**Layer 3 — Registry smoke test (already exists)**
`tests/formats/registry.test.js` calls `getRenderer('stdTime', '24h')(...)` and checks it returns a string. When the stubs are replaced with real implementations, these tests continue to pass automatically.

**Layer 4 — Consistency cross-checks**
A single test validating the key relationship: `decimal renderer at offset +1h === beats.js at same UTC time`. This pins the formula to the existing chronometer reference.

**Layer 5 — Edge case sweep**
Dedicated test section per renderer covering:
- Extreme offsets (+14h, -12h, ±24h)
- Fractional offsets (IST +5.5h, NPT +5.75h)
- Both directions of midnight crossing
- DST simulation (DST is not handled by renderers — they are pure UTC arithmetic — but test that fractional offsets don't break formatting)
- Invalid `data.now` (null, undefined, string, NaN Date)

**Layer 6 — Build smoke test**
`npm run build` must succeed after changes (verified by the pre-commit hook on main). Ensures no import errors in the registry.

### Suggested test assertion patterns

```js
// Exact time assertion (use Date.UTC for determinism):
const data = { now: new Date(Date.UTC(2026, 0, 1, 12, 0, 0)) };
expect(render(data, { meridianOffset: 0 })).toBe('12:00');

// Midnight crossing:
const data = { now: new Date(Date.UTC(2026, 0, 1, 23, 0, 0)) };
expect(render(data, { meridianOffset: 3 })).toBe('02:00');

// Error fallback (pattern match to survive if format changes):
expect(render(null)).toMatch(/^\?\?:\?\?$/);
// Or exact match if format is locked:
expect(render(null)).toBe('??:??');

// Formula cross-check (decimal vs beats.js):
import { compute as computeBeats } from '../../../../../src/chronometers/beats.js';
const date = new Date(Date.UTC(2026, 0, 1, 12, 0, 0));
const beatsResult = computeBeats(date);  // BMT = UTC+1
const decimalResult = render({ now: date }, { meridianOffset: 1 });
expect(decimalResult).toBe(beatsResult);
```

---

## 10. Key Risks and Unknowns

### Risk 1: Fractional meridianOffset in 24h renderer — IDENTIFIED, SOLUTION KNOWN

**Risk:** The existing stub does `String(adjustedHours)` on a potentially fractional number (e.g., `5.5h` → `adjustedHours` might be `8.5`).

**Fix:** Apply `Math.floor()` before padding. The minutes/seconds are read separately from UTC methods, so no carry-over calculation needed.

**Verification:** Test with IST offset (+5.5h) and NPT (+5.75h) explicitly.

### Risk 2: Decimal renderer formula — double-modulo correctness

**Risk:** Negative offsets could produce negative intermediate values that single `% 86400000` doesn't handle correctly in JavaScript (JS `%` can return negative for negative operands).

**Fix:** Use `((x % N) + N) % N` pattern (same as the existing hour wrap). Always add `86400000` before the second modulo.

**Verification:** Test `meridianOffset = -12` explicitly. Result should be a positive number of beats.

### Risk 3: @NNN.NN format — zero-padding edge cases

**Risk:** `beats.toFixed(2).padStart(6, '0')` — for beats < 10, this produces `@009.50`. For beats >= 1000, this would exceed 6 chars (`@1000.00` is 8 chars). But beats maxes out at ~999.99 (< 1000), so the padding is safe.

**Verification:** Test boundary: `@999.99` at `22:59:59.XXX UTC` with offset 0. Confirm no overflow.

### Risk 4: Longitudinal output range — always 0–360

**Risk:** The formula `adjustedMs / 86400000 * 360` produces values in [0, 360). At exactly midnight it should be `0.00°` not `360.00°`.

**Verification:** Test UTC midnight (0ms) with offset 0 → `⌚ 0.00°`. Test one ms before midnight → approaches `⌚ 360.00°` but never reaches it exactly.

### Risk 5: Meridian selector test environment

**Risk:** The selector creates DOM elements, so tests need jsdom environment. Other renderer tests use `// @vitest-environment node`. Mixing environments in the same directory is fine since the directive is per-file, but this must be handled correctly.

**Fix:** `meridian-select.test.js` should NOT include `// @vitest-environment node` (use default jsdom) or explicitly set `// @vitest-environment jsdom`. Other test files in the same directory use `// @vitest-environment node`.

### Risk 6: meridian-select.js is a NEW file — no registry entry needed

The selector component is a **UI component**, not a renderer. It does NOT need to be added to `registry.js`. It is imported directly by Phase 14. Phase 12 only needs to create and test the file itself.

### Risk 7: Stub has `☉` symbol in longitudinal.js — wrong per spec

The existing `longitudinal.js` stub returns `☉ ${offset}°`. This uses the sun symbol that is reserved for the date/longitudinal renderer. Phase 12 must replace it with `⌚` (U+231A). Any test that checks for `☉` in stdtime output would be wrong.

### Risk 8: The `opts.beatOffset` and `opts.longitudeOffset` naming in stubs

The stubs used divergent opts keys. Phase 12 unifies everything to `opts.meridianOffset`. If anything in the codebase references the old names (`beatOffset`, `longitudeOffset`), it must be identified and noted for Phase 14 to handle. A quick grep shows no consumers of these opts keys exist outside the stubs themselves, since Phase 14 (the pipeline wiring) is not yet implemented.

### Unknown 1: meridian-select.js selector type — discretion deferred

The CONTEXT.md leaves the exact element type (select+input vs custom dropdown) to implementer's discretion. The location UI uses `<select>` for explicit options and `<input type="number">` for manual input — this pattern is well-established and should be followed.

### Unknown 2: snap logic implementation detail

The CONTEXT.md specifies snap behavior but doesn't prescribe the implementation. The snap function is pure math (nearest multiple) and has no hidden complexity. It's safe to implement inline or as a small utility.

---

## Summary Checklist for Planning

Files to CREATE:
- [ ] `src/formats/renderers/stdtime/meridian-select.js` — new UI component
- [ ] `tests/formats/renderers/stdtime/24h.test.js`
- [ ] `tests/formats/renderers/stdtime/decimal.test.js`
- [ ] `tests/formats/renderers/stdtime/longitudinal.test.js`
- [ ] `tests/formats/renderers/stdtime/meridian-select.test.js`

Files to REPLACE (stubs → full implementations):
- [ ] `src/formats/renderers/stdtime/24h.js`
- [ ] `src/formats/renderers/stdtime/decimal.js`
- [ ] `src/formats/renderers/stdtime/longitudinal.js`

Files that do NOT need modification:
- `src/formats/registry.js` — already imports stubs, picks up new exports
- `src/formats/config.js` — no changes needed

---

*Research complete: 2026-04-14*
*Files read: 12-CONTEXT.md, REQUIREMENTS.md, STATE.md, AGENTS.md, registry.js, chronometers/index.js, beats.js, all 3 stdtime stubs, gregorian.js (date), gregorian.js (year), holocene.js, meghalayan.js, custom.js, chinese.js, longitudinal.js (date), all 4 solartime stubs, config.js, location/ui.js, 5 test files (gregorian, holocene, custom, longitudinal-date, year-boundary, registry, config, beats)*
