---
phase: 14
slug: format-selector-ui-integration
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-15
---

# Phase 14 - UI Design Contract

> Visual and interaction contract for the inline clock format selectors and display-pipeline integration.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (vanilla JS + plain CSS) |
| Preset | not applicable |
| Component library | none |
| Icon library | Unicode only (`▼`, `✓`) |
| Font | system-ui stack already used by `#beats-container` |

**Styling approach:** extend the existing app CSS language rather than introducing a new subsystem. Use dedicated selector CSS imported by the selector UI module. Reuse the atmospheric dark glass surface pattern already present in `src/styles.css` and `src/formats/ui/stdtime-picker.css`.

---

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Tight text/icon gaps, active checkmark spacing |
| sm | 8px | Dropdown item padding edges, vertical gaps |
| md | 12px | Selector option padding, label offset |
| lg | 16px | Dropdown inner padding, component hit area growth |
| xl | 24px | Separation between floating UI groups if needed |
| 2xl | 32px | Reserved; not used by the selector UI by default |

Exceptions: hovered clock components use `0.25rem 0.5rem` padding to create the border halo without visually changing the overall composition. This exception is required by the phase context and is the only non-tokenized spacing rule.

---

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.4 |
| Label | 12px | 400 | 1.2 |
| Heading | 14px | 500 | 1.2 |
| Display | `clamp(2.5rem, 6vw, 5rem)` desktop, `clamp(2rem, 8vw, 3.5rem)` mobile | 300 | 1 |

Additional rules:
- Selector labels under hovered items use `0.75rem` desktop and `0.65rem` on mobile.
- Dropdown items inherit the app font stack and stay lighter than a settings panel; this UI should feel like part of the clock, not a separate control bar.
- Numeric clock output keeps `font-variant-numeric: tabular-nums` from `#beats-container`.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `rgba(0, 0, 0, 0.8)` | Open dropdown surfaces |
| Secondary (30%) | `rgba(0, 0, 0, 0.3)` | Resting floating controls and ambient hover backing |
| Accent (10%) | `rgba(255, 255, 255, 0.4)` | Focus border, hovered component border, selected-row emphasis |
| Destructive | `#f87171` | Reserved for error states only |

Supporting tokens:
- Primary text: `rgba(255, 255, 255, 0.95)`
- Secondary text: `rgba(255, 255, 255, 0.7)`
- Resting border: `rgba(255, 255, 255, 0.2)`
- Hover fill: `rgba(255, 255, 255, 0.1)`
- Active row fill: `rgba(255, 255, 255, 0.15)`
- Shadow: `0 4px 12px rgba(0, 0, 0, 0.15)`
- Backdrop: `blur(10px)`

Accent reserved for: hovered component outlines, keyboard focus treatment, and the currently active dropdown option. Do not use accent styling on every interactive element at rest.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | not applicable - this phase has no primary page CTA |
| Empty state heading | not applicable - selectors always have available formats |
| Empty state body | not applicable - registry-backed options prevent empty dropdowns |
| Error state | `Failed to render {Component}. Using fallback.` |
| Destructive confirmation | not applicable - no destructive action in selector UI |

Fixed UI copy:
- Hover labels: `Year`, `Date`, `Standard Time`, `Solar Time`
- Dropdown buttons use title-case format names only, no preview strings
- Active option indicator may be visual only (`✓`) and should not add extra explanatory copy
- No hint copy like `Press Escape to close` in v1

Format label map:

| Component | Format IDs -> Labels |
|-----------|------------------------|
| Year | `holocene -> Holocene`, `gregorian -> Gregorian`, `meghalayan -> Meghalayan`, `custom -> Custom` |
| Date | `gregorian -> Gregorian`, `chinese -> Chinese`, `longitudinal -> Longitudinal` |
| Standard Time | `24h -> 24h`, `decimal -> Decimal`, `longitudinal -> Longitudinal` |
| Solar Time | `24h -> 24h`, `decimal -> Decimal`, `longitudinal -> Longitudinal`, `descriptive -> Descriptive` |

---

## Component Contract

### Overview

The clock display itself becomes the selector surface. There is no detached toolbar and no separate settings row.

The display is composed of four independent inline components:
- `year`
- `date`
- `stdTime`
- `solarTime`

Each component is rendered as its own `<span data-component="..."></span>` inside `#beats-container`.

### DOM Structure

```html
<div id="beats-container" aria-label="Beat Clock display">
  <span class="clock-component" data-component="year">H12026</span>
  <span class="clock-component" data-component="date">4/15</span>
  <span class="clock-component" data-component="stdTime">14:32:08</span>
  <span class="clock-component" data-component="solarTime">Golden Hour</span>
</div>

<div class="format-selector-dropdown" hidden>
  <button type="button" class="format-selector-option is-active">Holocene</button>
  <button type="button" class="format-selector-option">Gregorian</button>
</div>
```

Notes:
- Only one `.format-selector-dropdown` may be visible at a time.
- Dropdown may be appended near `document.body` for positioning simplicity, but its visual anchor must remain the clicked component.
- The component label shown on hover/focus can be implemented with a child element or a pseudo-element, but it must remain tied to the active component only.

### Resting State

- The clock remains visually identical to the current app at first glance.
- No persistent borders, boxes, pills, or dropdown arrows are shown while idle.
- Interactivity is discovered through hover, focus, or touch.

### Hover State

- Hovering one component highlights only that component.
- Highlight style:
  - `border: 1px solid rgba(255, 255, 255, 0.4)`
  - `border-radius: 4px`
  - `padding: 0.25rem 0.5rem`
- The component label appears directly below the hovered or keyboard-focused component.
- Label style:
  - `font-size: 0.75rem`
  - `opacity: 0.7`
  - centered to the component width
- Transition timing: `150ms ease-out` for opacity, background, transform, and border-color changes.

### Open Dropdown State

- Clicking or tapping a component opens a dropdown centered below it.
- If there is insufficient room below, the dropdown flips above the component.
- Open dropdown style:
  - `background: rgba(0, 0, 0, 0.8)`
  - `border: 1px solid rgba(255, 255, 255, 0.2)`
  - `border-radius: 8px`
  - `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15)`
  - `backdrop-filter: blur(10px)`
- Dropdown width is content-based but should not be narrower than the clicked component minus hover padding.
- Max height may clamp with scroll if needed, but Phase 14's option sets are small enough that scrolling is unlikely.

### Option Rows

- Use native `<button type="button">` rows.
- Row styling:
  - full-width text alignment left or center; choose one and keep it consistent within the dropdown
  - minimum target height around 36-40px desktop, slightly larger effective tap area on touch
  - hover background `rgba(255, 255, 255, 0.1)`
  - active option background `rgba(255, 255, 255, 0.15)`
  - focus ring uses `rgba(255, 255, 255, 0.4)`
- The current format may be indicated with a trailing `✓`, stronger opacity, or both.
- No preview text, subtitle, or sample-render output appears inside the dropdown.

---

## Interaction Contract

### Pointer

1. Hover a component -> only that component shows hover border + label.
2. Click a component -> close any currently open dropdown, then open this component's dropdown.
3. Click an option -> save format, dispatch `beatclock:formatchange`, close dropdown immediately.
4. Click outside the dropdown and active component -> close dropdown.

### Keyboard

1. `Tab` reaches each interactive clock component.
2. `Enter` or `Space` on a focused component opens its dropdown.
3. `Tab` moves through dropdown buttons.
4. `Enter` or `Space` on an option selects it.
5. `Escape` closes the current dropdown and returns focus to its owning component.

Arrow-key navigation inside the dropdown is optional for this phase and may be deferred.

### Touch

- On touch devices (`@media (hover: none)`), do not require hover discovery.
- First tap opens the dropdown immediately.
- Hover label treatment may be suppressed on touch if it conflicts with readability; the dropdown itself is the primary affordance.

### Dismissal Rules

- Only one dropdown open at a time.
- Dismiss on outside click.
- Dismiss on `Escape`.
- Dismiss immediately after selection.
- Dismiss when the owning component is removed or rerendered.

---

## Accessibility

### Roles and Labels

- Each interactive clock component uses `role="button"` if not a native button.
- Each component must be keyboard focusable with `tabindex="0"` when implemented as a `span`.
- `aria-label` pattern:
  - `Change Year format`
  - `Change Date format`
  - `Change Standard Time format`
  - `Change Solar Time format`
- Dropdown container may use `role="menu"` and rows `role="menuitemradio"` if implemented consistently; otherwise native button semantics are acceptable and preferred for simplicity.

### Focus

- Focus treatment must be visible on both the inline clock component and open dropdown option.
- Focus border color: `rgba(255, 255, 255, 0.4)`.
- Focus must not be hidden by the glow or animation of `#beats-container`.

### Contrast

- All selector text appears as white-on-dark glass surfaces and must maintain at least the same contrast quality as current location and alarm controls.

---

## Responsive Contract

### Desktop

- Preserve the current immersive centered clock composition.
- Dropdowns feel lightweight and local to the clicked value, not like modal dialogs.

### Mobile (`max-width: 640px`)

- Keep the existing single-line or wrapped-clock structure if the current layout forces wrapping; do not introduce a hamburger or separate settings drawer.
- Reduce label size to `0.65rem`.
- Tighten dropdown padding slightly.
- Preserve comfortable tap targets.

### Touch (`hover: none`)

- Suppress hover-only affordances that cannot be discovered.
- Use direct-open tap behavior.
- Avoid label flicker caused by simulated hover states.

---

## Motion Contract

- Use the app's existing soft timing language.
- Dropdown open/close: `150ms ease-out`
- Hover/focus transitions: `150ms ease-out`
- No spring motion, bounce, or large-scale transforms.
- Small vertical offset for dropdown entrance is acceptable if it stays subtle.

---

## Display Pipeline Contract

### Rendering Flow

The display pipeline is responsible for routing chronometer output through the active registry renderers per component.

Canonical flow:

```js
compose(now, location)
-> derive display data object
-> read active format for each component
-> getRenderer(componentId, formatId)
-> render(data, opts)
-> inject string into matching DOM component
```

### Required Data Behavior

- Every renderer receives the shared data object built from `compose()` plus `now`.
- `stdTime` options:
  - `24h -> { showSeconds: true, meridianOffset: 0 }`
  - `decimal -> { meridianOffset: 0 }`
  - `longitudinal -> { meridianOffset: 0 }`
- Date and year renderers receive any pipeline-calculated flags they already support, but Phase 14 should stay minimal and avoid inventing new renderer APIs.

### Error Handling

- Wrap each component render call independently.
- On renderer failure:
  - show `??` for that component
  - `console.warn('Failed to render ${componentId}:', error.message)`
  - continue rendering the other three components
- A single broken renderer must never blank the whole clock.

### Event Contract

- Format change event name: `beatclock:formatchange`
- Event detail shape: `{ componentId, formatId }`
- Dispatch only after config persistence succeeds or is attempted.
- One global listener in `src/index.js` handles update flow:
  - `updateClock(currentLocation)`
  - `restartDisplayLoop()`
  - `restartAlarmLoop()`

---

## Visual Hierarchy Rules

- The clock remains the hero.
- Selector UI is secondary, discovered only when intent is shown.
- Location selector and alarm trigger remain peripheral controls; the new format selectors should not visually compete with them.
- Open dropdowns may momentarily take focus, but once closed the page should return to a nearly chrome-free look.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| None | N/A - vanilla JS and CSS only | not required |

No third-party UI library, headless menu package, icon package, or utility CSS framework should be introduced for this phase.

---

## Verification Notes

Manual verification for this UI contract should confirm:
- each of the 4 display segments is independently interactive
- dropdown opens anchored to the chosen component
- selection updates the rendered display immediately
- refresh preserves the chosen formats via existing config persistence
- mobile tap behavior works without hover dependency
- one renderer failing does not break the other components

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-04-15
