# Phase 14: Format Selector UI & Integration - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the user-facing format selector interface and complete end-to-end integration of the format system. All renderers are implemented (Phases 11-13), config/registry infrastructure exists (Phase 10). This phase delivers the interactive UI and display pipeline integration.

Requirements: FORMAT-01, FORMAT-03, FORMAT-05

Deliverables:
- Interactive clock display — each component becomes clickable
- Per-component hover states — border + label on hover
- Format selector dropdowns — modal dropdown for each component
- Display pipeline integration — replace hardcoded clock string with format registry calls
- Format change event system — `beatclock:formatchange` events for each component
- Responsive mobile behavior — touch-friendly, scaled styling
- End-to-end testing — manual verification of full user journey

</domain>

<decisions>
## Implementation Decisions

### Interactive Clock Components
- **D-01:** Clock display uses separate `<span>` elements for each component with `data-component` attribute
  - `<span data-component="year">H12026</span>`
  - `<span data-component="date">M3 D15</span>`
  - `<span data-component="stdTime">14:32</span>`
  - `<span data-component="solarTime">Golden Hour</span>`
- **D-02:** Each component is independently interactive — hovering one component shows only its hover state
- **D-03:** Keep current minimal spacing between components — no additional padding added

### Hover States
- **D-04:** Visual hover style: subtle border with rounded corners
  - Border: `1px solid rgba(255, 255, 255, 0.4)`
  - Border-radius: `4px`
  - Padding: `0.25rem 0.5rem` to create space for border without shifting layout
- **D-05:** Component label appears inline below the hovered component
  - Font size: `0.75rem` (smaller than clock text)
  - Opacity: `0.7`
  - Labels: "Year", "Date", "Standard Time", "Solar Time" (full names)
- **D-06:** Hover state is independent per component — moving from Year to Date shows Date hover, hides Year hover

### Click Behavior & Dropdown
- **D-07:** Clicking a component opens a dropdown modal anchored below that component
- **D-08:** Only one dropdown open at a time — clicking a component closes any currently open dropdown before opening the new one
- **D-09:** Dropdown position: centered below the clicked component, with auto-flip to above if not enough space below
- **D-10:** Dropdown styling matches existing glassmorphic pattern:
  - Background: `rgba(0, 0, 0, 0.8)`
  - Border: `1px solid rgba(255, 255, 255, 0.2)`
  - Border-radius: `8px`
  - Backdrop-filter: `blur(10px)`
  - Box-shadow: `0 4px 12px rgba(0, 0, 0, 0.15)`
- **D-11:** Dropdown content: list of format names in title case
  - E.g., "Holocene", "Gregorian", "Meghalayan", "Custom"
  - No preview text or live rendering — just format names
  - Use `<button>` elements for each format option
- **D-12:** Dropdown closes immediately when a format is selected
- **D-13:** Dropdown can also be dismissed by clicking outside the dropdown or pressing Escape key

### Display Pipeline Integration
- **D-14:** Replace hardcoded clock string in `updateClock()` with format registry calls
  - Remove: `const clockText = 'H${holocene} M${monthStr} D${day} ${stdTime} ${solar}';`
  - Add: Render each component using `getRenderer(componentId, formatId)(data, opts)`
- **D-15:** Renderer data flow: pass full `compose()` result object plus `now` to all renderers
  - Data shape: `{ now: Date, holocene, beats, solar, lunisolar, solarTime, ... }`
  - Each renderer extracts what it needs from the data object
- **D-16:** Renderer opts handling:
  - Year renderers: no opts needed (pass `{}`)
  - Date renderers: no opts needed (pass `{}`)
  - StdTime 24h: `{ showSeconds: true, meridianOffset: 0 }` (keep current behavior)
  - StdTime decimal/longitudinal: `{ meridianOffset: 0 }`
  - SolarTime renderers: no opts needed (pass `{}`)
  - Meridian offset: read from config if available, else default to `0`
- **D-17:** Error handling: wrap each renderer call in try/catch, fallback to `'??'` for failed component
  - Log error to console: `console.warn('Failed to render ${componentId}:', error.message)`
  - Continue rendering other components even if one fails

### Format Change Event System
- **D-18:** Each component fires a custom event when format changes
  - Event name: `beatclock:formatchange`
  - Event detail: `{ componentId: 'year', formatId: 'holocene' }`
  - Fired after config is saved to localStorage
- **D-19:** Event handler updates display and restarts loops
  - Reuse existing pattern from `handleStdTimeFormatChange()`
  - Call `updateClock(currentLocation)`, `restartDisplayLoop()`, `restartAlarmLoop()`
- **D-20:** Single global event listener for all component format changes
  - `document.addEventListener('beatclock:formatchange', handleFormatChange)`

### Mobile & Responsive Behavior
- **D-21:** Touch interaction: tap to open dropdown immediately (no hover state on mobile)
  - Use `@media (hover: none)` to detect touch devices
  - Tapping a component opens its dropdown directly
- **D-22:** Responsive styling: smaller font and tighter spacing on mobile
  - Use existing `@media (max-width: 640px)` breakpoint
  - Reduce hover label font-size to `0.65rem`
  - Reduce dropdown padding slightly
- **D-23:** Layout maintains current structure — no collapsible menu or hamburger icon

### UI Organization
- **D-24:** No separate selector UI elements — the clock components themselves ARE the selectors
  - Remove or don't build the `src/formats/ui/selectors.js` concept
  - Keep `stdtime-picker.js` as a reference but don't use it in Phase 14
  - All selector logic lives in `src/formats/ui/component-selector.js` (or similar)

### Format Labels Mapping
- **D-25:** Create label maps for each component to convert formatId to display name:
  - Year: `{ holocene: 'Holocene', gregorian: 'Gregorian', meghalayan: 'Meghalayan', custom: 'Custom' }`
  - Date: `{ gregorian: 'Gregorian', chinese: 'Chinese', longitudinal: 'Longitudinal' }`
  - StdTime: `{ '24h': '24h', decimal: 'Decimal', longitudinal: 'Longitudinal' }`
  - SolarTime: `{ '24h': '24h', decimal: 'Decimal', longitudinal: 'Longitudinal', descriptive: 'Descriptive' }`

### Testing Strategy
- **D-26:** Manual testing covers full user journey:
  1. Load page → verify default formats display correctly
  2. Hover each component → verify border + label appear
  3. Click each component → verify dropdown opens below component
  4. Select a format → verify display updates immediately
  5. Refresh page → verify format persists
  6. Test on mobile (or simulate touch) → verify tap-to-open works
  7. Test all 4 components × all their formats = ~14 format combinations
- **D-27:** No automated UI tests in this phase — defer E2E testing to Phase 8 (Polish)

### Claude's Discretion
- Exact dropdown width and max-height
- Transition timing for hover/dropdown animations
- Whether to add a visual indicator for the currently active format in the dropdown
- Whether to show keyboard shortcuts (e.g., "Press Escape to close") in dropdown
- Exact z-index values for layering (as long as dropdowns appear above clock)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` §Format System — FORMAT-01, FORMAT-03, FORMAT-05 definitions
- `.planning/ROADMAP.md` §Phase 14 — Phase deliverables, success criteria, dependencies

### Prior Phase Context
- `.planning/phases/10-format-configuration-registry/10-CONTEXT.md` — Config API (loadFormatConfig, setFormat), registry API (getRenderer, getAvailableFormats), defaults
- `.planning/phases/11-year-date-format-renderers/11-CONTEXT.md` — Year and Date renderer patterns, render(data, opts) signature, error fallbacks
- `.planning/phases/12-standard-time-format-renderers/12-CONTEXT.md` — StdTime renderer patterns, meridianOffset opts, showSeconds flag
- `.planning/phases/13-solar-time-format-renderers/13-CONTEXT.md` — SolarTime renderer patterns, descriptive format, no seconds/centibeats

### Existing Code to Modify
- `src/index.js` — updateClock() function (lines 65-88), handleStdTimeFormatChange() pattern (lines 129-133)
- `src/formats/config.js` — loadFormatConfig(), setFormat() API
- `src/formats/registry.js` — getRenderer(), getAvailableFormats() API

### Existing UI Patterns to Follow
- `src/formats/ui/stdtime-picker.js` — Event pattern (STDTIME_FORMAT_CHANGE_EVENT), select element, change listener
- `src/formats/ui/stdtime-picker.css` — Glassmorphic styling, backdrop blur, focus states
- `src/location/ui.js` — Dropdown positioning and dismissal patterns
- `src/styles.css` lines 56-146 — Location selector/dropdown styling (glassmorphic pattern)

### External Specs
None — all requirements captured in decisions above and REQUIREMENTS.md.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/formats/ui/stdtime-picker.js`** — Template for format change event pattern, select element creation, format label mapping
- **`src/formats/ui/stdtime-picker.css`** — Glassmorphic styling ready to adapt for component hover/dropdown
- **`src/location/ui.js`** — Dropdown modal pattern with outside-click dismissal and keyboard handling
- **`src/index.js` updateClock()** — Current clock rendering (lines 65-88), easy to replace hardcoded string with registry calls
- **Format registry** — `getRenderer(componentId, formatId)` and `getAvailableFormats(componentId)` already work
- **Format config** — `getFormat(componentId)` and `setFormat(componentId, formatId)` already work

### Established Patterns
- Clock display: single `#beats-container` element currently holds one textContent string
- Glassmorphic UI: `rgba(0,0,0,0.8)` background + `blur(10px)` + `rgba(255,255,255,0.2)` border
- Custom events: `new CustomEvent(eventName, { detail: {...} })` + `document.dispatchEvent()`
- Outside-click dismissal: `document.addEventListener('click', handler)` + `event.target.closest('.dropdown')`
- Error fallback: `'??'` string for failed components, matches existing renderer patterns
- Responsive breakpoint: `@media (max-width: 640px)`
- Touch detection: `@media (hover: none)` for touch devices

### Integration Points
- **Clock rendering**: Replace line 79 in `src/index.js` with multi-component rendering
- **Format config**: Already integrated in `src/formats/config.js` (Phase 10)
- **Registry**: Already integrated in `src/formats/registry.js` (Phase 10)
- **Event system**: Use existing `document.addEventListener` pattern from stdtime-picker
- **Tick rate**: Already determined by `tickRateForFormat()` in `src/formats/tick-rate.js`

</code_context>

<specifics>
## Specific Ideas

- **Clock components as selectors**: User's key insight — the display itself becomes the UI. No separate selector controls. Hover reveals interactivity, click opens dropdown.
- **Independent hover states**: Each component's hover state is isolated — moving between components doesn't create cascade effects or confusion.
- **One dropdown at a time**: Prevents UI clutter and cognitive load. User focuses on one format choice at a time.
- **Glassmorphic consistency**: Dropdown styling matches location dropdown and stdtime-picker — cohesive atmospheric aesthetic throughout the app.
- **Touch-friendly**: Tap-to-open on mobile, no confusing hover states on touch devices.
- **Format change event pattern**: Reuse existing `beatclock:formatchange` event naming convention from stdtime-picker — consistent codebase patterns.
- **Graceful error handling**: Never break the entire clock display if one renderer fails — show '??' for failed component, log warning, continue rendering others.

</specifics>

<deferred>
## Deferred Ideas

- Meridian selector UI — current code hardcodes `meridianOffset: 0`, but Phase 12 CONTEXT.md describes a full meridian selector component. Defer this to a Phase 12 follow-up.
- Format preview in dropdowns — showing example output (e.g., "24h (HH:MM)") or live previews would be useful, but adds complexity. Keep dropdowns simple (format names only) for v1.0.
- Keyboard navigation within dropdowns — arrow keys to move between options, Enter to select. Defer to Phase 8 (Polish).
- Multiple dropdowns open simultaneously — could allow comparing formats, but adds UI complexity. One at a time is simpler.
- Named format presets — out of scope per PROJECT.md (single config only).

</deferred>

---

*Phase: 14-format-selector-ui-integration*
*Context gathered: 2026-04-15*
