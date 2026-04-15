# Phase 14: Format Selector UI & Integration - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-15
**Phase:** 14-format-selector-ui-integration
**Areas discussed:** Selector Layout, Display Pipeline, Selector Visibility, Responsive Behavior, Component Interactivity, Dropdown Modal Position, Component Labels, Dropdown Content, Clock Rendering, Hover Styling, Dropdown Dismissal, Format Labels, Dropdown Overlap, Component Spacing, Label Position, Format Change Event, Mobile Touch Interaction, Dropdown Styling, Component Name Display, Integration Testing, Renderer Opts, Meridian Offset, Data Flow, Error Handling

---

## Selector Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Centered stack (top) — all 4 selectors stacked vertically above the clock | Reuses stdtime-picker positioning (top: 1rem, centered). Clean, symmetrical. Year/Date/StdTime/SolarTime in vertical order. | |
| Corner anchors — each selector in a corner (top-left, top-right, bottom-left, bottom-right) | Spreads UI across screen. More spatial but potentially cluttered. Harder to discover all selectors at once. | |
| Single combined selector — one dropdown that switches between components | Minimal UI footprint. User picks component first, then format. More steps to change formats but cleaner aesthetic. | |

**User's choice:** The display components themselves should be the selectors. Hovering over a component should reveal a subtle border around it with its name beneath it, and clicking it should open a dropdown modal with the format selector for that component.

**Notes:** User proposed an alternative not in the options — making the clock components themselves interactive. This is more elegant than separate selector UI elements. The components become discoverable through hover states.

---

## Display Pipeline

| Option | Description | Selected |
|--------|-------------|----------|
| Direct replacement — replace current hardcoded clock string in updateClock() with format registry calls (Recommended) | Current code: 'H${holocene} M${monthStr} D${day} ${stdTime} ${solar}'. Replace each component with getRenderer(component, formatId)(data, opts). Clean, minimal changes. StdTime already uses this pattern. | ✓ |
| Separate DOM elements — each component renders into its own <span> or <div> | Allows per-component CSS styling (color, size). More flexible but adds DOM complexity. Clock text is currently one textContent string. | |
| Hybrid — keep single string for now, add per-component elements in future polish phase | Start simple (direct replacement), refactor later if styling needs arise. Aligns with 'Phase 8: Polish & Verification' being deferred. | |

**User's choice:** Direct replacement — replace current hardcoded clock string in updateClock() with format registry calls (Recommended)

---

## Selector Visibility

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible — selectors always rendered, styled to be unobtrusive (Recommended) | Matches current stdtime-picker behavior (always visible, glassmorphic, low opacity). Simple implementation, no show/hide logic. | |
| Hover to reveal — selectors fade in on clock hover, fade out when mouse leaves | More immersive (clock dominates when idle). Requires hover state management, CSS transitions. Adds complexity. | ✓ |
| Toggle button — single button reveals/hides all selectors | User controls when UI appears. Extra click to access selectors. Adds state management. | |

**User's choice:** Hover to reveal — selectors fade in on clock hover, fade out when mouse leaves

**Notes:** Combined with the interactive components decision, this means component borders and labels appear on hover.

---

## Responsive Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Smaller font, tighter spacing — scale down but keep layout (Recommended) | Current stdtime-picker uses @media (max-width: 640px) to adjust font-size and top offset. Extend this pattern to all selectors. | ✓ |
| Collapsible menu — single hamburger icon on mobile, expands to show all selectors | Mobile-first approach. More complex (menu state, animations). Cleaner on small screens but adds steps to change formats. | |
| No mobile optimization — desktop-only UI for v1.0 | Defer mobile layout until Phase 8 (Polish). Faster to ship but poor mobile UX. | |

**User's choice:** Smaller font, tighter spacing — scale down but keep layout (Recommended)

---

## Component Interactivity

| Option | Description | Selected |
|--------|-------------|----------|
| Independent hover states — each component shows its own hover state separately (Recommended) | Year shows border+name on hover, opens dropdown on click. Date shows its border+name on hover. Simple to implement - each component is independent. | ✓ |
| All-or-nothing — hovering the clock reveals all component borders+names simultaneously | Hovering anywhere on the clock line shows borders+names for all 4 components at once. Single click target to indicate 'this is interactive'. | |
| Sticky hover — border+name persists while mouse is over the clock area, updates as you move between components | Hover Year → Year border+name appears → move mouse to Date → Date border+name appears (Year disappears). Smoother but requires more hover state management. | |

**User's choice:** Independent hover states — each component shows its own hover state separately (Recommended)

---

## Dropdown Modal Position

| Option | Description | Selected |
|--------|-------------|----------|
| Below clicked component — dropdown is anchored to and appears directly under the component | Modal appears centered below the clicked component. Feels anchored to the component. May overlap other components if they're close together. | ✓ |
| Fixed position — dropdown appears in a consistent location regardless of which component is clicked | Modal always appears in same screen position (e.g., center screen or below clock line). Consistent location, no overlap issues. | |
| At cursor position — dropdown follows the click location | Modal appears at click coordinates. Natural but may appear off-screen or in awkward positions. | |

**User's choice:** Below clicked component — dropdown is anchored to and appears directly under the component

---

## Component Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Full names — display complete component names on hover | E.g., 'Year', 'Date', 'Standard Time', 'Solar Time'. Clear and explicit. | ✓ |
| Short names — abbreviated component names (Recommended) | E.g., 'Year', 'Date', 'Std Time', 'Solar'. Shorter, fits better with minimal aesthetic. | |
| Single letters — minimal labels | E.g., 'Y', 'D', 'ST', 'S'. Minimal but may be unclear to first-time users. | |

**User's choice:** Full names — display complete component names on hover

---

## Dropdown Content

| Option | Description | Selected |
|--------|-------------|----------|
| Format names only — simple dropdown list of available formats | E.g., '24h', 'Decimal', 'Longitudinal'. Matches existing stdtime-picker LABELS pattern. | ✓ |
| Format names + preview — show format name and example output (Recommended) | E.g., '24h (HH:MM)', 'Decimal (@NNN)', 'Longitudinal (⌚ NNN°)'. Shows what each format looks like. More informative but takes more space. | |
| Live preview list — render actual current time in each format | Shows current clock value rendered in each available format. Live preview but more complex to implement. | |

**User's choice:** Format names only — simple dropdown list of available formats

---

## Clock Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Separate <span> elements — each component in its own <span> with data-component attribute (Recommended) | Year, Date, StdTime, SolarTime. Allows independent styling, hover detection, click handling. More flexible. | ✓ |
| Single string, detect hover by text position — keep one textContent, calculate which component was hovered | Current approach (single textContent string). Simple but makes hover detection harder - would need text position calculations. | |
| Hybrid — single string with invisible <span> overlays for hover detection | Add invisible spacers between components to detect hover. Hacky but maintains single string rendering. | |

**User's choice:** Separate <span> elements — each component in its own <span> with data-component attribute (Recommended)

---

## Hover Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Border + rounded corners — subtle outline appears on hover (Recommended) | E.g., 1px solid rgba(255,255,255,0.4) with 4px border-radius. Matches glassmorphic aesthetic. Clean visual indicator. | ✓ |
| Background highlight — component background changes on hover | E.g., rgba(255,255,255,0.15). More integrated with current breathe animation but less clear as interaction hint. | |
| Underline — text underline appears on hover | E.g., text-decoration: underline with 2px thickness. Minimal but clearly interactive. May conflict with clock aesthetic. | |
| Border + background — both outline and background change | Combine border + slight background. Maximum visibility but may be too heavy. | |

**User's choice:** Border + rounded corners — subtle outline appears on hover (Recommended)

---

## Dropdown Dismissal

| Option | Description | Selected |
|--------|-------------|----------|
| Close on selection — selecting a format closes the dropdown (Recommended) | User picks a format, dropdown closes immediately. Least friction for single changes. | ✓ |
| Persist until dismissed — dropdown stays open after selection, closes on outside click or Escape | User can explore multiple components without re-clicking. Dropdown closes when clicking outside or pressing Escape. | |
| Auto-close with delay — brief pause after selection, then closes | Dropdown closes 500ms after selection, giving time for visual feedback. Middle ground. | |

**User's choice:** Close on selection — selecting a format closes the dropdown (Recommended)

---

## Format Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Title case — first letter capitalized (Recommended) | Reuse existing LABELS pattern from stdtime-picker.js. E.g., holocene: 'Holocene', gregorian: 'Gregorian'. | ✓ |
| Lowercase — match formatId exactly | E.g., 'holocene', 'gregorian'. Consistent with formatId but less polished. | |
| Uppercase — all caps | E.g., 'HOLOCENE', 'GREGORIAN'. Stronger visual presence but may feel shouty. | |

**User's choice:** Title case — first letter capitalized (Recommended)

---

## Dropdown Overlap

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-flip — dropdown appears below by default, above if not enough space (Recommended) | If dropdown would go off-screen, flip it to appear above the component instead. Standard UI pattern. | |
| Fixed position — all dropdowns appear centered below the clock line | Dropdowns always appear in same predictable location. May feel disconnected from component but no overlap issues. | |
| One at a time — clicking a component closes any open dropdown first | User must close current dropdown before opening another. Simple but adds friction. | ✓ |

**User's choice:** One at a time — clicking a component closes any open dropdown first

**Notes:** User chose "One at a time" which is a different approach than auto-flip. This prevents overlap by ensuring only one dropdown is ever open. The auto-flip behavior is still useful for edge cases where the one open dropdown might go off-screen.

---

## Component Spacing

| Option | Description | Selected |
|--------|-------------|----------|
| Add spacing — increase padding between components for easier hover/click targeting (Recommended) | Current clock: 'H12026 M3 D15 14:32 Golden Hour'. Add 1-2em padding between <span> elements. Easier to click, clearer component boundaries. | |
| Keep current — maintain existing minimal spacing | Keep current spacing. More compact but smaller click targets. May be harder to hover the right component. | ✓ |
| Responsive spacing — tighter on desktop, wider on mobile for touch targets | Keep spacing minimal on desktop, add spacing on mobile for touch targets. Responsive approach. | |

**User's choice:** Keep current — maintain existing minimal spacing

---

## Label Position

| Option | Description | Selected |
|--------|-------------|----------|
| Below component — label appears underneath the hovered text (Recommended) | Label appears below the hovered component. Natural reading flow. May be obscured by dropdown when it opens. | ✓ |
| Above component — label appears on top of the hovered text | Label appears above. Won't be obscured by dropdown. Less natural reading flow. | |
| Fixed position — label appears in consistent screen location | Label appears in fixed position (e.g., bottom of screen or top-right). Always visible but disconnected from component. | |

**User's choice:** Below component — label appears underneath the hovered text (Recommended)

---

## Format Change Event

| Option | Description | Selected |
|--------|-------------|----------|
| Custom events — fire beatclock:formatchange event for each component (Recommended) | Like current STDTIME_FORMAT_CHANGE_EVENT. Each component fires a format change event when selection changes. Allows future features to listen. | ✓ |
| Direct update — no events, just immediately call updateClock() after selection | Just call updateClock() directly. Simpler but less extensible. | |
| Event-driven pipeline — format change event triggers config save and display update | Update both localStorage and UI in response to event. More decoupled but adds complexity. | |

**User's choice:** Custom events — fire beatclock:formatchange event for each component (Recommended)

---

## Mobile Touch Interaction

| Option | Description | Selected |
|--------|-------------|----------|
| Touch to open — tap a component to open its dropdown (Recommended) | Touch triggers click immediately. Standard mobile behavior. No hover state shown. | ✓ |
| Tap to reveal, tap to open — two taps required (first shows hover, second opens) | First tap shows hover state (border+label), second tap opens dropdown. More discoverable but adds friction. | |
| Long-press to reveal — press and hold to see label, then tap to open | Touch and hold shows hover state, release opens dropdown. More complex gesture. | |

**User's choice:** Touch to open — tap a component to open its dropdown (Recommended)

---

## Dropdown Styling

| Option | Description | Selected |
|--------|-------------|----------|
| Match existing dropdowns — glassmorphic with backdrop blur (Recommended) | Matches location dropdown and stdtime-picker: rgba(0,0,0,0.8) background, blur(10px), white border with 0.2 opacity. | ✓ |
| Solid background — less transparency for better contrast | More opaque, clearer separation from background. Better readability but less atmospheric. | |
| Minimal background — very subtle, almost invisible | Even more transparent than current UI. More immersive but may be hard to read. | |

**User's choice:** Match existing dropdowns — glassmorphic with backdrop blur (Recommended)

---

## Component Name Display

| Option | Description | Selected |
|--------|-------------|----------|
| Inline label — small text label beneath component (Recommended) | Small label appears below component on hover. Subtle and atmospheric. | ✓ |
| Browser tooltip — use title attribute | Title attribute on hover. Browser-native, zero CSS. Less control over styling. | |
| No label — border only, no text | No text label, just the border to indicate interactivity. Most minimal. | |

**User's choice:** Inline label — small text label beneath component (Recommended)

---

## Integration Testing

| Option | Description | Selected |
|--------|-------------|----------|
| Manual testing — test full user flow manually (Recommended) | Load page → hover each component → click to open dropdown → select format → verify display updates → refresh → verify persistence. Full user journey. | ✓ |
| Unit tests — test selector logic and event handling with Vitest | Vitest tests for selector initialization, format change events, config updates. Automated but doesn't test visual interaction. | |
| E2E tests — automated browser tests for interaction flow | Playwright/Cypress tests for hover, click, selection. Full coverage but adds tooling complexity. | |
| Hybrid — manual for UX, unit tests for logic | Manual testing for UX, unit tests for business logic. Practical middle ground. | |

**User's choice:** Manual testing — test full user flow manually (Recommended)

---

## Renderer Opts

| Option | Description | Selected |
|--------|-------------|----------|
| Keep showSeconds for stdTime 24h only — other formats don't need opts (Recommended) | Current code has showSeconds:true for 24h. Keep this for stdTime 24h, no seconds for other formats. Matches Phase 12 decision (D-02). | ✓ |
| No opts — pass empty object to all renderers | All renderers always receive empty opts {}. Simpler but ignores renderer-specific needs. | |
| Configurable opts — allow opts to be stored in config and passed to renderers | Read from config, pass to all renderers. Future-proof but no current use case. | |

**User's choice:** Keep showSeconds for stdTime 24h only — other formats don't need opts (Recommended)

---

## Meridian Offset

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcode 0 for now — defer meridian offset UI to Phase 12 follow-up | Current code passes meridianOffset:0 hardcoded. Keep this default until Phase 12 meridian selector is built. | |
| Default to location longitude — auto-set meridian offset from user location | Use current location's longitude as default meridian offset. More useful but requires conversion logic (longitude → hours). | |
| Config-driven with 0 fallback — check config for saved meridian, default to 0 (Recommended) | Read from config if available, else 0. Ready for future meridian selector without building it now. | ✓ |

**User's choice:** Config-driven with 0 fallback — check config for saved meridian, default to 0 (Recommended)

---

## Data Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Pass full data object — renderers get all chronometer data {holocene, beats, solar, lunisolar, solarTime, etc} (Recommended) | Current compose() returns all chronometer data. Pass entire result object to each renderer. Simple, future-proof. | ✓ |
| Component-specific data — filter data object per component | Year renderer gets {holocene}, Date gets {lunisolar}, etc. More explicit but requires mapping logic. | |
| Enhanced data object — add Date to composed data | Wrap compose() result in {now: Date, ...data}. Renderers get both Date object and chronometer data. | |

**User's choice:** Pass full data object — renderers get all chronometer data {holocene, beats, solar, lunisolar, solarTime, etc} (Recommended)

---

## Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Graceful fallback — catch errors, display '??' for failed component (Recommended) | If renderer throws or returns null/undefined, show '??' for that component. Matches existing error fallback pattern. | ✓ |
| Let errors surface — don't catch renderer errors | Keep trying to render every tick. May spam console but won't hide errors during development. | |
| Fallback with single warning — catch error, show '??', log warning once per error type | Try to render, if error show fallback and log once. Less console spam. | |

**User's choice:** Graceful fallback — catch errors, display '??' for failed component (Recommended)

---

## Claude's Discretion

- Exact dropdown width and max-height
- Transition timing for hover/dropdown animations
- Whether to add a visual indicator for the currently active format in the dropdown
- Whether to show keyboard shortcuts (e.g., "Press Escape to close") in dropdown
- Exact z-index values for layering (as long as dropdowns appear above clock)
