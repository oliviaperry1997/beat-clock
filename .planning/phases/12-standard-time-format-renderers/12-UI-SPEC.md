---
phase: 12
slug: standard-time-format-renderers
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-14
---

# Phase 12 — UI Design Contract

> Visual and interaction contract for `meridian-select.js` — the meridian/offset selector
> UI component. The three renderers (24h.js, decimal.js, longitudinal.js) are pure
> computation and have no UI of their own.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none (vanilla JS, no component framework) |
| Preset | not applicable |
| Component library | none |
| Icon library | Unicode characters only (inline in HTML) |
| Font | system-ui stack: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif` |

**Styling approach:** plain CSS class names, no CSS Modules, no CSS-in-JS, no Tailwind.
Styles live in a dedicated `meridian-select.css` file (co-located or imported from
`src/formats/renderers/stdtime/`), following the same import pattern as
`src/converters/styles.css` and `src/location/styles.css`. No inline styles.
No CSS custom properties (the existing codebase doesn't use them — all values are
literal `rgba()` and `px` quantities).

---

## Spacing Scale

The existing codebase uses `rem`-based spacing throughout (no `px` tokens in spacing).
All values below are the observed `rem` literals in `src/styles.css` and component CSS,
mapped to approximate pixel equivalents at `1rem = 16px`.

| Token | rem value | ~px | Usage |
|-------|-----------|-----|-------|
| xs | `0.25rem` | 4px | Inline margin between label and value; gap between weekday chips |
| sm | `0.5rem` | 8px | Gap between `<select>` and custom input; dropdown top margin; chip `gap` |
| md | `0.75rem` | 12px | Padding inside preset options and inputs (matches `.saved-location`, `.param-input`) |
| lg | `1rem` | 16px | Section margin-top (matches `#saved-list`, `#geolocation-panel`); toggle padding |
| xl | `1.5rem` | 24px | Modal inner padding; modal-header margin-bottom |
| 2xl | `2rem` | 32px | Alarm overlay padding |

Exceptions: the main clock `#beats-container` uses `clamp(2.5rem, 6vw, 5rem)` for
its display font — this is outside the component spacing system.

---

## Typography

All interactive components inherit `font: inherit` from the body, which resolves to
the system-ui stack at `font-weight: 300` for the body (clock display). Component
text uses normal-weight overrides as noted.

| Role | Size | Weight | Line Height | Notes |
|------|------|--------|-------------|-------|
| Body / default | `1rem` (16px) | 300 (inherited from body) | 1.4 | Base for all component text |
| Label / secondary | `0.9rem` (14.4px) | 400 | 1.4 | Preset option text, `.location-name` pattern |
| Caption / meta | `0.8rem` (12.8px) | 400 | 1.4 | Status text, `.result-meta`, section dividers |
| Section heading | `1rem` (16px) | 600 | 1.2 | Group labels (e.g. "Common Offsets", "Custom") |
| Category label | `0.8rem` (12.8px) | 400 | 1 | Uppercase, `letter-spacing: 0.05em`, opacity 0.7 — matches `.template-category` pattern |
| Input text | `0.95rem` (15.2px) | 400 | inherit | Custom degree `<input type="number">` — matches converter inputs |

---

## Color

The app is fully dark. No light mode. Background is a dynamic sky gradient (applied to
`body` by `sky.js`) that spans deep night blues through dawn/dusk oranges. All components
sit on top of this gradient using glassmorphic dark surfaces.

| Role | Value | Usage |
|------|-------|-------|
| Surface / resting | `rgba(0, 0, 0, 0.3)` | Selector toggle background — matches `.location-toggle` |
| Surface / elevated | `rgba(0, 0, 0, 0.8)` | Open dropdown panel — matches `.location-dropdown` |
| Surface / input | `rgba(255, 255, 255, 0.1)` | `<input>` fields, unselected preset options |
| Surface / selected | `rgba(255, 255, 255, 0.2)` | Selected preset, `.date-option.selected` |
| Surface / hover | `rgba(255, 255, 255, 0.1)` | Hover on options — matches `.saved-location:hover` |
| Surface / active-strong | `rgba(255, 255, 255, 0.15)` | Active/selected list item — matches `.saved-location.active` |
| Border / resting | `rgba(255, 255, 255, 0.2)` | All borders at rest — universal pattern in this codebase |
| Border / focused | `rgba(255, 255, 255, 0.4)` | Input focus ring — matches all `:focus` borders |
| Border / selected | `rgba(255, 255, 255, 0.4)` | Selected preset outline — matches `.date-option.selected` |
| Text / primary | `rgba(255, 255, 255, 0.95)` | Main text, labels |
| Text / secondary | `rgba(255, 255, 255, 0.7)` or `opacity: 0.7` | Captions, placeholder text, inactive items |
| Text / placeholder | `rgba(255, 255, 255, 0.5)` | Placeholder text in `<input>` elements |
| Accent / success | `#4ade80` | Active/selected indicator checkmark — matches `.active-indicator`, `.geolocation-status.success` |
| Accent / error | `#f87171` | Validation error state — matches `.location-status--error`, `.error` |
| Backdrop | `blur(10px)` | Backdrop filter on floating panels — matches `.location-toggle`, `.location-dropdown` |

Accent reserved for: the selected-state checkmark indicator (✓ glyph), valid input border, and error message text. **Not used** for all interactive elements or general hover states.

---

## Copywriting Contract

### Selector toggle (collapsed state)

| Element | Copy |
|---------|------|
| Toggle label — no selection yet | `UTC` |
| Toggle label — preset selected | The preset's own label (e.g. `UTC+5.5 IST`) |
| Toggle label — custom value | `Custom (±NNN°)` where NNN is the stored degrees, e.g. `Custom (+45°)` |
| Toggle arrow glyph | `▼` (matches `.dropdown-arrow`) |
| ARIA label | `"Change meridian offset"` |

### Preset labels — 24h format mode

The `<select>` element's `<option>` labels when `format = 'stdTime:24h'`:

| Offset | Label |
|--------|-------|
| 0h (0°) | `UTC` |
| +1h (+15°) | `UTC+1` |
| +2h (+30°) | `UTC+2` |
| +3h (+45°) | `UTC+3` |
| +3.5h (+52.5°) | `UTC+3.5 IRST` |
| +4h (+60°) | `UTC+4` |
| +5h (+75°) | `UTC+5` |
| +5.5h (+82.5°) | `UTC+5.5 IST` |
| +5.75h (+86.25°) | `UTC+5.75 NPT` |
| +6h (+90°) | `UTC+6` |
| +7h (+105°) | `UTC+7` |
| +8h (+120°) | `UTC+8` |
| +9h (+135°) | `UTC+9` |
| +9.5h (+142.5°) | `UTC+9.5 ACST` |
| +10h (+150°) | `UTC+10` |
| +11h (+165°) | `UTC+11` |
| +12h (+180°) | `UTC+12` |
| +13h (+195°) | `UTC+13` |
| +14h (+210°) | `UTC+14` |
| −1h (−15°) | `UTC−1` |
| −2h (−30°) | `UTC−2` |
| −3h (−45°) | `UTC−3` |
| −4h (−60°) | `UTC−4` |
| −5h (−75°) | `UTC−5` |
| −6h (−90°) | `UTC−6` |
| −7h (−105°) | `UTC−7` |
| −8h (−120°) | `UTC−8` |
| −9h (−135°) | `UTC−9` |
| −10h (−150°) | `UTC−10` |
| −11h (−165°) | `UTC−11` |
| −12h (−180°) | `UTC−12` |
| Custom | `Custom…` |

Note: `−` is U+2212 MINUS SIGN, not U+002D HYPHEN-MINUS, for visual clarity. Implementer
may use `−` (minus sign) or `-` (hyphen) per preference — consistency is the contract.

### Preset labels — decimal format mode

The `<select>` when `format = 'stdTime:decimal'` (10 steps: −500 to +500 beats):

| Offset | Label |
|--------|-------|
| 0 beats (0°) | `0 beats (UTC)` |
| +100 beats (+36°) | `+100 beats` |
| +200 beats (+72°) | `+200 beats` |
| +300 beats (+108°) | `+300 beats` |
| +400 beats (+144°) | `+400 beats` |
| +500 beats (+180°) | `+500 beats` |
| −100 beats (−36°) | `−100 beats` |
| −200 beats (−72°) | `−200 beats` |
| −300 beats (−108°) | `−300 beats` |
| −400 beats (−144°) | `−400 beats` |
| −500 beats (−180°) | `−500 beats` |
| Custom | `Custom…` |

### Preset labels — longitudinal format mode

The `<select>` when `format = 'stdTime:longitudinal'`. Due to 361 possible integer
values (−180 to +180), the select uses a representative set of named intervals rather
than every integer degree. Implementer may use `<input type="number">` directly as the
primary control for this mode (see Component Spec below).

Representative step labels (every 15°, i.e. every hour):

| Degrees | Label |
|---------|-------|
| 0° | `0° (UTC)` |
| +15° | `+15°` |
| +30° | `+30°` |
| … | `+Nd°` |
| +180° | `+180°` |
| −15° | `−15°` |
| … | `−Nd°` |
| −180° | `−180°` |
| Custom | `Custom…` |

Full 1° resolution is available only via the Custom input. The select shows 15° steps
(25 options + Custom). Alternatively, for longitudinal mode the implementer may skip
the `<select>` entirely and render only the `<input type="number">` directly, since
the precision requirement makes presets less useful.

### Custom input

| Element | Copy |
|---------|------|
| Input placeholder | `Degrees (−180 to +180)` |
| Input label (visually hidden or tooltip) | `"Custom meridian offset in degrees"` |
| Error — out of range | `"Enter a value between −180 and 180"` |
| Error — not a number | `"Enter a number"` |

### Status / feedback

| State | Copy |
|-------|------|
| Snapped to interval | *(no copy — silent UI snap, no toast/notification)* |
| Value applied | *(no copy — immediate display update is the feedback)* |

---

## Component Spec

### Overview

`meridian-select.js` exports a single factory function:

```js
export function createMeridianSelector(opts = {}) {
  // opts.format: 'stdTime:24h' | 'stdTime:decimal' | 'stdTime:longitudinal'
  // opts.initialDegrees: number  — default 0 (UTC, Prime Meridian)
  // opts.onChange: function(degrees: number) — emits degrees on every change

  // Returns the root DOM element for caller to insert into the document.
  return el; // HTMLDivElement
}
```

The selector is a **pure DOM factory**: no global state, no document.body access, no
localStorage. It accepts `opts.onChange` as the only output channel.

---

### DOM Structure

```
<div class="meridian-selector">

  <!-- Primary control: native <select> for presets -->
  <select class="meridian-preset-select" aria-label="Meridian offset">
    <option value="0">UTC</option>
    <option value="15">UTC+1</option>
    ...
    <option value="custom">Custom…</option>
  </select>

  <!-- Secondary control: revealed only when "Custom…" is selected -->
  <div class="meridian-custom-panel" hidden>
    <input
      type="number"
      class="meridian-custom-input"
      min="-180"
      max="180"
      step="any"
      placeholder="Degrees (−180 to +180)"
      aria-label="Custom meridian offset in degrees"
    />
    <span class="meridian-custom-error hidden" role="alert"></span>
  </div>

</div>
```

**Notes:**
- The root element has `class="meridian-selector"`.
- The `<select>` option `value` attributes carry the **longitude in degrees** (as a
  numeric string), except for the last option which uses the literal string `"custom"`.
- The `.meridian-custom-panel` uses the HTML `hidden` attribute (not a CSS class) when
  collapsed, matching the simplest DOM toggle pattern.
- Phase 14 inserts the root element into the appropriate panel container; `meridian-select.js`
  does not know or control where it appears in the page.

---

### `<select>` element visual appearance

The `<select>` element uses `font: inherit`, `color: inherit`, and mimics the button
aesthetic from the existing app. Because native `<select>` elements are difficult to
fully style across browsers, the selector uses a **wrapper div** with the `select`
inside, applying `pointer-events: none` to a custom arrow glyph (▼) overlaid on top,
OR uses the native appearance with minimal override. Match `.location-toggle` button
style for the collapsed toggle trigger.

```css
.meridian-preset-select {
  width: 100%;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.95);
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  appearance: none;
  -webkit-appearance: none;
  /* custom arrow injected via background-image or a sibling span */
}
```

---

### Custom input panel

The `.meridian-custom-panel` is revealed when the user selects `Custom…`. It contains:

1. `<input type="number">` — accepts floating-point degrees, `min="-180"`, `max="180"`,
   `step="any"`.
2. An error `<span>` with `role="alert"` for out-of-range / non-numeric feedback.

The `<input>` fires `onChange(degrees)` on every valid `input` event (live update).
Invalid input (out of range, NaN) triggers the error state but does NOT call `onChange` —
the last valid value is held until the user corrects the input.

Pattern mirrors `src/location/ui.js:309-325` (manual lat/lon input validation).

---

### Format switching behavior

When `opts.format` changes (called externally, e.g. by Phase 14 when the format selector
changes), the selector must:

1. Rebuild the `<select>` options for the new format's interval set.
2. Auto-snap the current stored degrees to the nearest valid interval for the new format:
   - `24h` mode: snap to nearest 15° (`Math.round(degrees / 15) * 15`)
   - `decimal` mode: snap to nearest 36° (`Math.round(degrees / 36) * 36`)
   - `longitudinal` mode: snap to nearest 1° (`Math.round(degrees)`)
3. Update the `<select>` selected option to match the snapped value (or show `Custom…`
   if snapped value doesn't match a preset exactly, which shouldn't happen for 24h/decimal).
4. Call `opts.onChange(snappedDegrees)` to notify Phase 14 of the value change.

Expose a `setValue(degrees, format)` method on the returned element (or a returned
control object) so Phase 14 can drive the selector externally:

```js
// Option A: attach to the element
el.setValue = (degrees, format) => { ... };

// Option B: return a control object
return { element: el, getValue: () => currentDegrees, setValue: (d, f) => { ... } };
```

Either pattern is acceptable. Option B (control object) is preferred for testability.

---

### Events emitted

The selector communicates **only through `opts.onChange(degrees: number)`**. No custom
DOM events are dispatched. The degrees value emitted is always a valid float in [−180, +180].

---

## Interaction States

### `<select>` (preset picker)

| State | Visual |
|-------|--------|
| Resting | `background: rgba(0, 0, 0, 0.3)`, `border: 1px solid rgba(255, 255, 255, 0.2)`, `border-radius: 8px` |
| Hover | `background: rgba(0, 0, 0, 0.5)` — matches `.location-toggle:hover` |
| Focus (keyboard) | `outline: none; border-color: rgba(255, 255, 255, 0.4)` — matches all `:focus` patterns |
| Open (native) | Browser-native dropdown; no custom override needed |
| Disabled | `opacity: 0.5; cursor: not-allowed` — matches `#add-manual-btn:disabled` |

### Custom `<input type="number">`

| State | Visual |
|-------|--------|
| Resting | `background: rgba(255, 255, 255, 0.1)`, `border: 1px solid rgba(255, 255, 255, 0.2)`, `border-radius: 8px` — matches `.param-input` |
| Focus | `outline: none; border-color: rgba(255, 255, 255, 0.4); background: rgba(255, 255, 255, 0.15)` — matches `#city-search:focus` |
| Valid | `border-color: rgba(255, 255, 255, 0.4)` (no separate valid color; the app doesn't use green for valid text inputs, only for the location system's coordinate inputs) |
| Invalid / out-of-range | `border-color: #f87171` — matches `.invalid` class in location UI |
| Disabled | `opacity: 0.5; cursor: not-allowed` |

### Error message span

| State | Visual |
|-------|--------|
| Hidden | `display: none` (or `.hidden` class) |
| Visible | `color: #f87171; font-size: 0.8rem; margin-top: 0.25rem` — matches `.error` / `.location-status--error` |

### Transition timing

All interactive state transitions use `transition: background 150ms ease-out` or
`transition: opacity 150ms ease-out`, matching the universal timing constant used
throughout the codebase. No spring animations, no cubic-bezier overrides.

---

## Accessibility

### Keyboard navigation

| Key | Behavior |
|-----|----------|
| `Tab` | Focus moves to `<select>`, then to custom `<input>` (when visible) |
| `↑` / `↓` | Native `<select>` arrow key navigation through options |
| `Enter` / `Space` | Opens native `<select>` dropdown (browser-native) |
| `Escape` | Closes native `<select>` dropdown (browser-native) |
| Any character | Native `<select>` type-ahead (browser-native) |
| `Tab` (in custom input) | Moves focus out of component |

No custom keyboard handling required — all key behaviors are browser-native for
`<select>` and `<input type="number">`.

### ARIA

| Element | ARIA attribute | Value |
|---------|---------------|-------|
| `<select>` | `aria-label` | `"Meridian offset"` |
| `<input>` | `aria-label` | `"Custom meridian offset in degrees"` |
| Error span | `role` | `"alert"` (auto-announced by screen readers on content change) |
| `.meridian-custom-panel` | `hidden` | HTML `hidden` attribute (removes from accessibility tree when not visible) |

No `aria-expanded` on the select (it's a native element; the browser manages this).
No `aria-live` on the select (the error span with `role="alert"` covers live feedback).

### Color contrast

All text is `rgba(255, 255, 255, 0.9)` or higher on dark surfaces
(`rgba(0, 0, 0, 0.3)` to `rgba(0, 0, 0, 0.8)`). The minimum contrast ratio at
`rgba(255,255,255,0.9)` on `rgba(0,0,0,0.8)` exceeds WCAG AA (4.5:1) at all opacity
levels in this range.

---

## Integration Notes

### What this component does

`meridian-select.js` is a **pure UI component**. It:

- Takes an `opts.onChange(degrees)` callback and fires it when the selection changes
- Returns a DOM element (or control object) for the caller to insert into the page
- Has no knowledge of renderers, the format registry, localStorage, or the display pipeline

### What this component does NOT do

- Does **not** persist anything to localStorage (Phase 10 `config.js` handles persistence)
- Does **not** call any renderer directly
- Does **not** know its position in the page
- Does **not** seed its initial value from the user's location longitude (D-20: default is always `0°`)

### Phase 14 wiring contract

Phase 14 is responsible for:

1. **Creating** the selector: `createMeridianSelector({ format, initialDegrees, onChange })`
2. **Injecting** the element into the appropriate panel in the DOM
3. **Converting** the emitted degrees to hours before calling renderers:
   ```js
   opts.onChange = (degrees) => {
     const meridianOffsetHours = degrees / 15;
     // pass to all three stdtime renderers as opts.meridianOffset
     saveFormatConfig({ meridianDegrees: degrees }); // Phase 10 persistence
   };
   ```
4. **Updating** the selector when the active Standard Time format changes:
   ```js
   selector.setValue(storedDegrees, newFormat); // triggers auto-snap + re-render
   ```

### Internal degree representation

The component stores and emits **longitude degrees** (float, range −180 to +180). This
is the canonical unit — all conversion to hours (`degrees / 15`) happens in Phase 14,
never inside `meridian-select.js`.

### Default value

On first load, before any user interaction: `0°` (Prime Meridian / UTC). This is hardcoded.
The location system's longitude is intentionally NOT used as the seed value (D-20).

### Format-mode context

The selector's `opts.format` string uses the format registry key format:
- `'stdTime:24h'` — hour-interval mode
- `'stdTime:decimal'` — 100-beat-interval mode  
- `'stdTime:longitudinal'` — degree-interval mode (or direct input)

Phase 14 passes the currently active Standard Time format key when constructing and
updating the selector.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| None | N/A — vanilla JS only | not required |

No npm packages are added by this component. No third-party UI libraries. No icon fonts.
Unicode glyphs used: `▼` (U+25BC, dropdown arrow), `✓` (U+2713, checkmark) — both
already present in the existing codebase.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending

---

*Phase: 12-standard-time-format-renderers*
*UI-SPEC authored: 2026-04-14*
*Scope: meridian-select.js only — 24h.js, decimal.js, longitudinal.js are pure computation with no UI*
