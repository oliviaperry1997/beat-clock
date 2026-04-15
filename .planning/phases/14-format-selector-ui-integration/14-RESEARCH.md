# Research: Phase 14 - Format Selector UI & Integration

## Research Scope

Phase 14 is not a library-selection problem. The repo already has the required primitives:
- format persistence in `src/formats/config.js`
- renderer lookup in `src/formats/registry.js`
- tick-rate switching in `src/formats/tick-rate.js`
- prior selector and dropdown interaction patterns in `src/formats/ui/stdtime-picker.js` and `src/location/ui.js`

The work is to wire those existing pieces into a single interactive display without breaking the current clock, location, alarm, and sky loops.

## Standard Stack

- Use plain DOM modules in vanilla JavaScript. Do not add a UI framework or headless dropdown library.
- Keep styling in CSS modules imported from the selector UI entry, matching the existing `stdtime-picker.css` pattern.
- Use the existing `CustomEvent` + `document.dispatchEvent()` pattern for format changes.
- Use the existing format registry as the source of truth for available format IDs via `getAvailableFormats(componentId)`.
- Use the existing config module as the source of truth for active selections via `getFormat(componentId)` and `setFormat(componentId, formatId)`.
- Keep live refresh behavior driven by `tickRateForFormat(getFormat('stdTime'))`; do not introduce a second timing system.

Confidence: High. This matches the current codebase architecture and avoids adding a new dependency surface.

## Architecture Patterns

### 1. Treat the clock text as four interactive spans

The current `src/index.js` writes one string into `#beats-container`. Phase 14 should switch that to a stable component structure:
- `year`
- `date`
- `stdTime`
- `solarTime`

Use DOM nodes with `data-component` attributes and replace their text on updates, rather than rebuilding unrelated UI elsewhere. This keeps the display itself as the selector surface and matches the saved phase context.

Recommended shape:

```html
<span class="clock-component" data-component="year">H12026</span>
<span class="clock-component" data-component="date">4/15</span>
<span class="clock-component" data-component="stdTime">14:32:01</span>
<span class="clock-component" data-component="solarTime">Late Afternoon</span>
```

Why: the current repo already centers `#beats-container` and styles it as one flex row. Four spans are the minimum structural change needed to preserve layout while enabling per-component hover and click behavior.

Confidence: High.

### 2. Create one selector manager module, not four per-component widgets

Use a single UI module such as `src/formats/selectors/ui.js` that:
- discovers or creates the interactive component spans
- manages one open dropdown at a time
- attaches global dismissal handlers once
- reads labels and available formats from a shared component metadata table

This should be a small imperative controller, closer to `src/location/ui.js` than to a reusable component library.

Suggested internal shape:
- component metadata map: labels, aria label, format label map
- module state: active component ID, dropdown element, cleanup listeners
- exported `initFormatSelectors()` and `renderFormatDisplay(data, location)` or equivalent narrow API

Why: the repo favors functional modules and simple module-level state over class hierarchies.

Confidence: High.

### 3. Keep render pipeline data assembly in `src/index.js`

`src/index.js` owns the application loops today:
- `updateClock()` renders the clock and background
- `restartDisplayLoop()` and `restartAlarmLoop()` derive cadence from the active Standard Time format
- location changes already flow through one top-level coordinator

Phase 14 should preserve that ownership. Do not move app orchestration into the selector UI module.

Recommended pipeline in `updateClock()`:
1. Create `now`
2. Call `compose(now, { latitude, longitude })`
3. Build one shared renderer data object from compose output plus `now`
4. Resolve active formats from config
5. Render components in a deterministic order
6. Update the four DOM spans
7. Continue updating sky and moon indicator exactly as today

Confidence: High.

### 4. Render order matters: solar time before date

Important codebase-specific discovery: the solar time renderers already mutate `opts.solarDateDiffsStdDate` through `computeDateDiff()` in `src/formats/renderers/solartime/date-diff-helper.js`. The Gregorian and Chinese date renderers consume that same option to append `+` or `-`.

That means Phase 14 should render in this order:
1. `year`
2. `solarTime`
3. `date`
4. `stdTime`

or otherwise compute the solar/date diff ahead of the date renderer and pass it into both calls.

If date is rendered before solar time using a shared `opts` object, the suffix feature from Phases 11 and 13 will silently stop working.

Confidence: High. This is verified in current source files.

### 5. Pass one shared data object, but use per-component opts objects

The renderers already expect `(data, opts = {})`. Keep a shared `data` object but create per-call `opts` objects so one renderer's mutations do not leak unpredictably into another.

Recommended approach:
- shared `data` contains `now`, compose output, and any phase-14-computed fields like `effectiveYear`
- per-renderer opts are built from a helper like `getRendererOptions(componentId, formatId, context)`
- if date needs the solar diff, either:
  - render solar first and read the computed flag, or
  - call `computeDateDiff()` once in the pipeline and inject the result into date opts directly

Why: current solar renderers mutate `opts`, which is workable but fragile if the same object is reused everywhere.

Confidence: High.

### 6. Prefer explicit DOM construction over `innerHTML` for selector interactions

The location UI uses `innerHTML` in places, but the format selector UI is smaller and more interaction-heavy. Build the dropdown and its option buttons with `document.createElement()`.

Benefits in this repo:
- easier to attach button handlers per format option
- avoids re-parsing markup on every open/close
- simpler to preserve focus and ARIA attributes
- keeps active-format highlighting and dismissal logic straightforward

Confidence: Medium-High. This is a maintainability recommendation, not a hard requirement.

### 7. Reuse the location dropdown behavior, not the stdtime `<select>` UI

`src/formats/ui/stdtime-picker.js` is useful for:
- event naming
- config save flow
- label mapping

But the actual interaction model for Phase 14 is closer to `src/location/ui.js`:
- anchored popover/dropdown
- outside-click dismissal
- Escape-to-close behavior
- one overlay surface visible at a time

Use the location dropdown as the behavioral reference and the stdtime picker as the event/config reference.

Confidence: High.

### 8. Keep Phase 14 narrowly scoped to format selection only

Do not fold in the deferred Standard Time meridian selector work from Phase 12. Current code still hardcodes `meridianOffset: 0` in `src/index.js`, and the roadmap for Phase 14 does not include a meridian-control UI.

Phase 14 should integrate existing format choice only:
- component format dropdowns
- immediate rerender on selection
- persistence via current config APIs
- display loop restart when Standard Time format changes cadence

Confidence: High.

## Don't Hand-Roll

- Do not introduce a generic dropdown framework or popper engine for this phase. The app has one anchored dropdown at a time and already uses simple absolute positioning elsewhere.
- Do not build a generalized event bus. Stick to `document.dispatchEvent(new CustomEvent(...))` as already used.
- Do not invent a new format metadata registry separate from `src/formats/registry.js`. A small local labels map is enough.
- Do not rebuild app state management. Local module state plus current config/localStorage patterns are sufficient.
- Do not couple selector UI to alarm or location internals. Keep the existing top-level restart functions in `src/index.js` as the integration boundary.

Confidence: High.

## Common Pitfalls

- Rendering the `date` component before `solarTime` and losing the `+`/`-` suffix flow.
- Reusing one mutable `opts` object across all renderer calls and creating hidden cross-component behavior.
- Replacing the whole `#beats-container` tree on every tick and accidentally closing dropdowns or dropping event listeners.
- Leaving the legacy `initStdTimePicker()` active, which would produce two competing Standard Time selectors.
- Forgetting that Standard Time format changes also affect tick cadence, so the display and alarm loops must restart after a relevant format change.
- Attaching document-level click and keydown listeners repeatedly on every render without cleanup.
- Building hover-only affordances that fail on touch devices; Phase 14 needs direct tap-to-open behavior.
- Using raw format IDs as visible labels (`descriptive`, `gregorian`, `longitudinal`) instead of title-case display names.
- Hardcoding selector options instead of reading `getAvailableFormats(componentId)`, which would drift from the actual registry.
- Recomputing sky, moon, or chronometer state inside the selector manager, creating duplicate sources of truth.

Confidence: High.

## Code Examples

### Example 1: Safe component render pipeline

```js
function renderClockComponents(data, context) {
  const rendered = {};
  const shared = { ...data };

  const solarFormatId = getSafeFormat('solarTime', 'descriptive');
  const solarOpts = getRendererOptions('solarTime', solarFormatId, context);
  rendered.solarTime = renderComponent('solarTime', solarFormatId, shared, solarOpts);

  const dateFormatId = getSafeFormat('date', 'gregorian');
  const dateOpts = {
    ...getRendererOptions('date', dateFormatId, context),
    solarDateDiffsStdDate: solarOpts.solarDateDiffsStdDate ?? null,
  };
  rendered.date = renderComponent('date', dateFormatId, shared, dateOpts);

  rendered.year = renderComponent('year', getSafeFormat('year', 'holocene'), shared, {});
  rendered.stdTime = renderComponent(
    'stdTime',
    getSafeFormat('stdTime', '24h'),
    shared,
    getRendererOptions('stdTime', getSafeFormat('stdTime', '24h'), context),
  );

  return rendered;
}
```

Pattern to keep: explicit format resolution, explicit opts per call, and preserving solar/date coupling without relying on accidental mutation.

### Example 2: Shared event contract

```js
const FORMAT_CHANGE_EVENT = 'beatclock:formatchange';

function applyFormatSelection(componentId, formatId) {
  setFormat(componentId, formatId);
  document.dispatchEvent(new CustomEvent(FORMAT_CHANGE_EVENT, {
    detail: { componentId, formatId },
  }));
}
```

This matches the current `stdtime-picker.js` behavior and should remain the only external contract the selector manager emits.

### Example 3: Anchored dropdown behavior

```js
function openDropdown(anchorEl, componentId) {
  closeDropdown();

  const dropdown = buildDropdown(componentId);
  document.body.appendChild(dropdown);

  const anchorRect = anchorEl.getBoundingClientRect();
  const dropdownRect = dropdown.getBoundingClientRect();
  const fitsBelow = anchorRect.bottom + dropdownRect.height + 8 < window.innerHeight;

  dropdown.style.left = `${anchorRect.left + (anchorRect.width / 2)}px`;
  dropdown.style.top = fitsBelow
    ? `${anchorRect.bottom + 8}px`
    : `${anchorRect.top - dropdownRect.height - 8}px`;
}
```

This is enough for the repo's needs. No external positioning library is necessary.

## Feasibility Notes

- The phase is low risk from a dependency standpoint because all required APIs already exist in-repo.
- The main implementation risk is integration correctness in `src/index.js`, not selector styling.
- The strongest regression vector is replacing the legacy string-based clock render while preserving moon, sky, alarms, location updates, and tick-rate behavior.

Confidence: High.

## Recommended Implementation Direction

- Add `src/formats/selectors/ui.js` as the single format selector controller.
- Add `src/formats/selectors/styles.css` for hover, focus, dropdown, and mobile styling.
- Update `src/index.js` to:
  - remove `initStdTimePicker()` usage
  - switch from single text string rendering to four component spans
  - compute format-aware render output via the registry
  - listen for one `beatclock:formatchange` event and rerender/restart loops
- Keep render fallback behavior at the component level (`'??'`) so one failed renderer never blanks the full clock.
- Add focused tests around integration and event-driven rerendering rather than over-testing CSS mechanics.

## Open Questions Resolved By Research

- New library needed? No.
- Separate selector UI outside the clock? No; the display itself should be interactive.
- Can existing renderer contracts support this phase? Yes, with careful render ordering and per-component opts handling.
- Biggest hidden gotcha? The solar-time-to-date suffix dependency through mutable opts.

---

Research confidence summary:
- Architecture direction: High
- Integration details: High
- UI interaction approach: High
- Styling specifics: Medium
