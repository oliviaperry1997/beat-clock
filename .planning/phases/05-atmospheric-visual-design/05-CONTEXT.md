---
phase: 05-atmospheric-visual-design
status: discussed
created: 2026-04-13T20:05:00Z
updated: 2026-04-13T20:05:00Z
---

# Phase 05 Context: Atmospheric Visual Design

## Phase Goal (from ROADMAP.md)

Redesign the visual experience — sky colors reflecting time of day, subtle animations, immersive typography, ambient feel.

**Requirements:**
- REFACTOR-04: Upgrade visual design to atmospheric/ambient aesthetic — backgrounds reflecting time of day, subtle animations, immersive typography

**Depends on:** Phase 2 (modular core — visuals driven by chronometer data)

## Canonical refs
- `.planning/ROADMAP.md` — phase definition
- `.planning/PROJECT.md` — REFACTOR-04 requirement, core value ("tangible and beautiful"), design inspiration ("atmospheric/ambient", "immersive time experience")
- `src/chronometers/index.js` — compose() returns solar, beats, holocene, lunisolar (data driving visuals)
- `src/styles.css` — current minimal styling (starting point for redesign)

## Prior decisions (from Phase 1-4)
- Atmospheric/ambient aesthetic — NOT a data dashboard, more of an immersive time experience (PROJECT.md)
- Glassmorphism patterns established: `rgba(0,0,0,0.8)` backgrounds, `rgba(255,255,255,0.2)` borders, `backdrop-filter: blur(10-20px)`, `border-radius: 8-12px`
- Current clock: single line, 5rem Arial Bold, centered vertically/horizontally
- Update interval: ~864ms (approximately 1 beat)
- Converter panel and location UI already use dark glassmorphism aesthetic — new visuals should harmonize
- Performance constraint: must remain lightweight — no heavy framework bloat

## Decisions

### Background & Sky Colors
- **Solar-driven continuous gradient** — background color computed from solar position data (already calculated via suncalc)
- **Natural sky color palette**: Dawn → warm peach/coral, Midday → crisp sky blue, Dusk → deep purple/magenta, Night → dark navy/charcoal
- **Smooth continuous transition** — gradient shifts gradually every tick (~864ms), organic and imperceptible between ticks but noticeable over hours
- **No separate night mode toggle** — night is just a natural phase of the solar gradient cycle
- **Night appearance**: dark navy/charcoal, very dark almost black, clock glows softly

### Animation & Motion
- **Beat pulse**: subtle scale/opacity pulse on each beat tick (~864ms) — like a heartbeat, not a strobe
- **Lunar cycle**: visual moon phase indicator that waxes/wanes over the ~29.5 day cycle
- **Motion character**: subtle, ambient, breathing — not flashy or dashboard-like
- **Gradient transitions**: smooth CSS transitions (no discrete state snaps)

### Typography & Layout
- **Single line format preserved** — don't break into multi-line hierarchy
- **Visual styling improved** — better font choices, spacing, weight treatment
- **Font: modern clean sans-serif** — like Inter, SF Pro, or system font. Crisp, minimal, Apple-esque
- **Current values displayed**: `H{holocene} M{month} D{day} {beats} {solar}` (plus lunisolar)

### Information Density & States
- **Always show everything** — all values visible by default (Holocene, month, day, beats, solar, lunisolar) with clear visual hierarchy through styling
- **Responsive scaling** — centered display scales for mobile screens, same layout approach as desktop
- **Converter panel** already responsive — keep existing responsive pattern

## Codebase context (from scout)

### Reusable assets
- `src/styles.css` — existing glassmorphism patterns, backdrop-filter, rgba colors
- `src/location/styles.css` — modal, panel, input styling patterns that could inspire clock styling
- `src/converters/styles.css` — tab, panel, input styling consistent with app aesthetic

### Established patterns
- Dark aesthetic with glassmorphism (rgba backgrounds, white borders, blur)
- CSS transitions with `150ms ease-out` timing
- Absolute positioning for overlays (location selector top-right)
- Flexbox centering for main display
- Media query at 768px for responsive adjustments

### Integration points
- `src/index.js` — `updateClock()` function sets `#beats-container.textContent` — visual redesign happens in CSS, JS unchanged
- `src/template.html` — `#beats-container` is the clock display element
- Solar data available in `compose()` result — can drive CSS custom properties or inline styles for gradient

### Technical constraints
- Vanilla JavaScript, no framework
- Webpack 5 build pipeline
- CSS loaded via css-loader/style-loader
- Current CSS: `src/styles.css` (clock) + component-specific CSS files
- Must not add heavy dependencies — CSS-only animations preferred

## Risks & Pitfalls
- **Performance**: Continuous gradient recalculation every 864ms must be lightweight — prefer CSS custom properties over JS DOM manipulation for color updates
- **Over-design**: PROJECT.md says "not a data dashboard" — visual changes should enhance immersion, not add complexity
- **Browser compatibility**: backdrop-filter has good support but ensure fallbacks
- **Animation subtlety**: pulse/breathe must be barely perceptible — easy to overdo

## Deferred Ideas
- None raised during discussion

## Next Steps
- Researcher: investigate solar-driven CSS gradient patterns, moon phase SVG/emoji approaches, beat pulse CSS animation patterns
- Planner: create tasks for background gradient system, animation implementation, typography overhaul, responsive scaling
