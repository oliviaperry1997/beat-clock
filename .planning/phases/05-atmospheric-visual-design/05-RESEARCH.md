# Phase 05 Research: Atmospheric Visual Design

## Research Summary

Investigated six technical areas for implementing atmospheric visual design: CSS gradient animation, solar-to-color mapping, subtle pulse animations, moon phase rendering, typography upgrades, and existing codebase pattern harmonization.

---

## 1. CSS Gradient Animation Patterns

### Recommended Approach: CSS Custom Properties + requestAnimationFrame

**Pattern:** Update CSS custom properties on `:root` (or a dedicated background element) via `requestAnimationFrame`, with a CSS `transition` on the `background-image` property for smooth interpolation.

```css
:root {
  --bg-color-start: #1a1a2e;
  --bg-color-end: #16213e;
}

body {
  background: linear-gradient(180deg, var(--bg-color-start), var(--bg-color-end));
  transition: --bg-color-start 1s ease-out, --bg-color-end 1s ease-out;
}
```

**Problem:** CSS transitions don't natively interpolate CSS custom properties used inside `linear-gradient()`. The gradient is a computed image, not an animatable property.

### Working Solutions

**Option A: Individual color property transitions on pseudo-element (Recommended)**

Use a pseudo-element or dedicated div for the background, and transition its `background-color` (which IS animatable). Layer two gradients with opacity crossfading:

```css
#sky-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--sky-top, #1a1a2e);
  transition: background 1.5s ease-out;
}
```

**Option B: CSS `@property` registered custom properties (Modern, Best DX)**

Register custom properties as `<color>` types so CSS transitions can interpolate them:

```css
@property --sky-top {
  syntax: '<color>';
  initial-value: #1a1a2e;
  inherits: true;
}
@property --sky-bottom {
  syntax: '<color>';
  initial-value: #16213e;
  inherits: true;
}

body {
  background: linear-gradient(180deg, var(--sky-top), var(--sky-bottom));
  transition: --sky-top 1.5s ease-out, --sky-bottom 1.5s ease-out;
}
```

**Browser support:** Chrome 85+, Safari 16.4+, Firefox 128+. Firefox support is recent enough for a personal tool. This is the cleanest approach.

**Option C: Direct inline style updates on each tick (Simplest, no tricks)**

Since updates happen every ~864ms (not 60fps), direct `style.background` assignment is perfectly fine:

```js
function updateSkyGradient(topColor, bottomColor) {
  document.body.style.background = `linear-gradient(180deg, ${topColor}, ${bottomColor})`;
}
```

No DOM thrashing because this is one assignment per 864ms tick — negligible cost.

### Recommendation

**Use Option C for simplicity** — one `style.background` assignment per tick is trivially lightweight. If smoother transitions are desired, add a full-screen fixed `div` behind the clock with CSS `transition: background 1.5s ease-out` and update it inline. The 864ms update interval is slow enough that there's zero performance concern.

### Pitfall to Avoid

- **DO NOT** use `setInterval` at 60fps to animate gradient colors — wasteful for a background that changes once per beat tick.
- **DO NOT** try to animate `background-image` directly — browsers can't interpolate between gradient image values.
- **DO NOT** use `@keyframes` for sky colors — the colors are data-driven (solar position), not fixed animation keyframes.

---

## 2. Solar Position to Color Mapping

### What suncalc Provides

From `src/chronometers/solar.js`, the project already calls `SunCalc.getTimes(date, lat, lon)` which returns:

```js
{
  sunrise: Date,
  sunset: Date,
  solarNoon: Date,
  nadir: Date,
  civilDawn: Date,       // Sun 6 degrees below horizon
  civilDusk: Date,       // Sun 6 degrees below horizon
  nauticalDawn: Date,    // Sun 12 degrees below horizon
  nauticalDusk: Date,
  astronomicalDawn: Date,// Sun 18 degrees below horizon
  astronomicalDusk: Date,
  goldenHourEnd: Date,
  goldenHour: Date
}
```

### Deriving Sky States

Map the current time to one of these phases based on suncalc times:

| Phase | Time Range | Sky Top Color | Sky Bottom Color |
|-------|-----------|---------------|------------------|
| Deep Night | After astronomical dusk → before astronomical dawn | `#0a0a1a` (near-black navy) | `#0d1117` (dark charcoal-navy) |
| Night | After nautical dusk → before nautical dawn | `#0f1923` (deep navy) | `#131a2e` (dark navy) |
| Astronomical Twilight | After nautical dusk → before nautical dawn | `#1a2332` (twilight blue) | `#1a1a2e` (deep navy) |
| Civil Dawn/Dusk | Between civil dawn and sunrise OR sunset and civil dusk | `#2d1b4e` (purple) → `#f4a498` (peach) | `#1a1040` (deep purple) → `#c4786a` (coral) |
| Golden Hour | Between sunrise and golden hour end OR golden hour start and sunset | `#87CEEB` (sky blue) | `#f4a498` (warm peach) |
| Day | Between golden hour end and golden hour start | `#5B9BD5` (clear blue) | `#87CEEB` (light sky blue) |

### Interpolating Between States

Rather than discrete state snaps, compute a **solar progress factor** (0→1) between the current phase's start and end time, and use it to interpolate between the two boundary colors:

```js
function lerpColor(colorA, colorB, t) {
  // t is 0→1 progress between the two times
  const r = Math.round(colorA[0] + (colorB[0] - colorA[0]) * t);
  const g = Math.round(colorA[1] + (colorB[1] - colorA[1]) * t);
  const b = Math.round(colorA[2] + (colorB[2] - colorA[2]) * t);
  return `rgb(${r}, ${g}, ${b})`;
}
```

### Recommended Color Palette

**Dawn/Sunrise:** (peach → coral → soft orange)
- `#f4a498` → `#e8846c` → `#d4684a`

**Midday:** (crisp blue)
- `#5B9BD5` → `#87CEEB`

**Dusk/Sunset:** (purple → magenta → deep coral)
- `#6b3fa0` → `#c4786a` → `#e8846c`

**Night:** (navy → charcoal)
- `#0a0a1a` → `#131a2e` → `#1a2332`

### Pitfall to Avoid

- **DO NOT** hardcode time-based colors (e.g., "6am = dawn colors") — use suncalc times so it adapts to latitude/season.
- **DO NOT** use suncalc's `getPosition()` (altitude/azimuth) for color mapping — the sunrise/sunset times are cleaner for defining phases.
- **DO NOT** try to model atmospheric scattering physics — use curated sky color palettes with smooth interpolation.
- **When no location is set:** Use a default neutral dark gradient (the `S??` case from solar.js). `#1a1a2e` → `#0d1117` works as a safe default.

---

## 3. CSS Subtle Pulse Animation

### Recommended Pattern: CSS Keyframes with Micro-Scale

```css
@keyframes beat-pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.008);
    opacity: 0.97;
  }
}

#beats-container.beating {
  animation: beat-pulse 864ms ease-in-out;
}
```

**Key design decisions:**

1. **Scale value:** 1.005–1.012 range. Larger than 1.015 becomes noticeable and jarring. 1.008 is the sweet spot — subliminal.
2. **Opacity shift:** 0.96–0.98 on the pulse peak. Creates a subtle "dim then brighten" effect mimicking heartbeat.
3. **Timing function:** `ease-in-out` for organic feel. `ease-out` also works for a sharper beat.
4. **Duration:** 864ms matching the update interval.

### Application Method

Add/remove a CSS class on each tick from `updateClock()`:

```js
function updateClock(userLocation) {
  // ... existing code ...
  const container = document.querySelector("#beats-container");
  container.textContent = clockText;

  // Trigger pulse: remove class, force reflow, re-add
  container.classList.remove('beat-pulse');
  void container.offsetWidth; // force reflow
  container.classList.add('beat-pulse');
}
```

### Alternative: Continuous Breathing Animation

If a per-tick pulse is too mechanical, use a continuous slow "breathing" animation:

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.005); }
}

#beats-container {
  animation: breathe 4s ease-in-out infinite;
}
```

This creates a gentle, ambient motion independent of the beat tick — more "living organism" than "metronome."

### Combined Approach (Recommended)

Use **continuous breathing** (4s cycle) for ambient motion, plus **subtle text-shadow glow** that shifts with the beat:

```css
@keyframes breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.005); }
}

#beats-container {
  animation: breathe 4s ease-in-out infinite;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
  will-change: transform; /* GPU-accelerated */
}
```

### Pitfall to Avoid

- **DO NOT** use large scale values (>1.02) — the brief says "barely perceptible."
- **DO NOT** combine scale with color shifts — too many simultaneous changes feel busy.
- **DO NOT** animate on every 864ms tick with a full keyframe cycle — causes visual stutter. Use continuous animation OR per-tick class toggle, not both simultaneously.
- **DO** use `will-change: transform` to promote the element to its own compositor layer for smooth 60fps animation.
- **DO** use `transform` (not `width`/`height`/`font-size`) — transforms are GPU-accelerated and don't trigger layout recalculation.

---

## 4. Moon Phase SVG/CSS Rendering

### Available Data

The project uses `lunar-javascript` which provides lunar data. From `src/chronometers/lunisolar.js`:

```js
const lunar = solar.getLunar();
// lunar.getMonth(), lunar.getDay(), lunar.isLeap
```

**lunar-javascript also provides moon illumination data:**

```js
const lunar = solar.getLunar();
const illumination = lunar.getIllumination(); // 0.0 to 1.0
const moonAge = lunar.getMoonAge(); // days into lunar cycle (0-29.5)
```

This gives us the exact phase: new moon (0), waxing crescent, first quarter (7.4), waxing gibbous, full (14.75), waning gibbous, last quarter (22.1), waning crescent.

### Recommended Approach: Inline SVG with Clip Path

Render an SVG circle with a dynamically calculated clip path representing the illuminated portion:

```html
<svg width="24" height="24" viewBox="0 0 24 24" id="moon-indicator">
  <circle cx="12" cy="12" r="10" fill="#2a2a3e" /> <!-- dark side -->
  <path id="moon-illumination" fill="#f5f5dc" />   <!-- lit side -->
</svg>
```

Calculate the SVG path based on moon age:

```js
function moonPhaseSVGPath(moonAge, size = 10) {
  const phase = (moonAge / 29.53) * 2 * Math.PI;
  const cx = size, cy = size;
  const r = size;

  // Determine illuminated side and width
  const cosPhase = Math.cos(phase);
  const sweep = cosPhase >= 0 ? 1 : 0; // waxing vs waning
  const width = Math.abs(cosPhase) * r;

  // Build SVG arc path
  const d = `M ${cx} ${cy - r}
    A ${r} ${r} 0 0 ${sweep} ${cx} ${cy + r}
    A ${width} ${r} 0 0 ${1 - sweep} ${cx} ${cy - r}
    Z`;

  return d;
}
```

### Simpler Alternative: Unicode Moon Phase Characters

Unicode has moon phase emoji/characters (U+1F311 through U+1F318):

| Phase | Unicode | Character |
|-------|---------|-----------|
| New Moon | U+1F311 | 🌑 |
| Waxing Crescent | U+1F312 | 🌒 |
| First Quarter | U+1F313 | 🌓 |
| Waxing Gibbous | U+1F314 | 🌔 |
| Full Moon | U+1F315 | 🌕 |
| Waning Gibbous | U+1F316 | 🌖 |
| Last Quarter | U+1F317 | 🌗 |
| Waning Crescent | U+1F318 | 🌘 |

```js
const moonEmojis = ['🌑', '🌒', '🌓', '🌔', '🌕', '🌖', '🌗', '🌘'];
function getMoonEmoji(moonAge) {
  const index = Math.round((moonAge / 29.53) * 7) % 8;
  return moonEmojis[index];
}
```

**Pros:** Zero CSS/SVG complexity, renders consistently across modern browsers.
**Cons:** Emoji rendering varies by platform (Apple shows colored emoji, not monochrome).

### Recommended: Monochrome SVG Moon (Best Visual Fit)

For an atmospheric/ambient aesthetic, a subtle monochrome SVG moon works best:

```html
<svg class="moon" width="20" height="20" viewBox="0 0 20 20">
  <circle cx="10" cy="10" r="9" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
  <path id="moon-lit" fill="rgba(255,255,255,0.6)" d="...computed..."/>
</svg>
```

Position it subtly near the clock (top-right of the display, or integrated into the single line).

### Pitfall to Avoid

- **DO NOT** use a heavy moon phase library — `lunar-javascript` already provides the data.
- **DO NOT** use CSS `clip-path` with complex shapes — browser support is good but SVG paths are more precise for moon arcs.
- **DO NOT** make the moon indicator large or prominent — it should be a subtle detail, not a dashboard widget.
- **DO** extract `moonAge` from `lunar-javascript` — check if `lunar.getMoonAge()` is available. If not, compute from illumination: the library's `Solar` class can access the lunar object with full phase data.

### Integration Point

Modify `src/chronometers/lunisolar.js` to also return `moonAge` and `illumination`:

```js
return {
  month: Math.abs(month),
  day,
  isLeap,
  moonAge: lunar.getMoonAge(),       // 0-29.5 days
  illumination: lunar.getIllumination(), // 0.0-1.0
};
```

---

## 5. Typography Upgrade Patterns

### Option A: System Font Stack (Recommended for Performance)

```css
#beats-container {
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display',
    'Inter', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
```

**Pros:** Zero load time, native performance, matches OS aesthetic.
**Cons:** Inconsistent across platforms (Arial on Windows, SF Pro on Mac).

### Option B: Inter from Google Fonts

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');

#beats-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

**Pros:** Consistent cross-platform, modern geometric sans-serif, designed for UI.
**Cons:** Adds network request (~40KB for woff2 subset). Can be self-hosted.

### Option C: Self-Hosted Inter (Best of Both)

Download Inter WOFF2 from [github.com/rsms/inter](https://github.com/rsms/inter) and bundle with webpack via `file-loader` or place in `src/fonts/`.

### Recommended Font Treatment

For the single-line clock display:

```css
#beats-container {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: clamp(2.5rem, 6vw, 5rem); /* Responsive scaling */
  font-weight: 300; /* Light weight for elegance */
  letter-spacing: 0.08em; /* Slight tracking for large text */
  line-height: 1;
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.15);
  font-variant-numeric: tabular-nums; /* Prevents number width jitter */
}
```

**Key decisions:**

- **Font weight 300 (light)** — large text looks heavier; light weight keeps it airy and modern.
- **Letter-spacing 0.05–0.1em** — wide tracking on large displays feels premium.
- **`font-variant-numeric: tabular-nums`** — critical for clock displays. Prevents digits from shifting width as numbers change (e.g., "1" vs "8" have different widths in proportional fonts).
- **`clamp()` for responsive sizing** — scales smoothly from 2.5rem on mobile to 5rem on desktop without media queries.

### Semantic Hierarchy Within Single Line

Since all values are shown on one line (`H2026 M4 D13 @345 S72`), use CSS to create visual hierarchy:

```html
<!-- Option: wrap segments in spans for styling -->
<span class="cal-date">H2026 M4 D13</span>
<span class="separator"> · </span>
<span class="beats">@345</span>
<span class="separator"> · </span>
<span class="solar">S72</span>
<span class="moon-indicator">🌓</span>
```

```css
.cal-date { font-weight: 300; opacity: 0.9; }
.beats { font-weight: 600; opacity: 1; } /* Primary emphasis */
.solar { font-weight: 400; opacity: 0.8; }
.separator { opacity: 0.3; margin: 0 0.2em; }
```

### Pitfall to Avoid

- **DO NOT** use `font-weight: 900` (current) — too heavy for large atmospheric display. Feels aggressive, not ambient.
- **DO NOT** use `Arial` — PROJECT.md calls for modern, Apple-esque aesthetic. Arial is generic.
- **DO** use `tabular-nums` — without it, the clock display will visibly jitter as digit widths change.
- **DO NOT** add too many font weights — each weight adds ~30KB. Use 2-3 weights max (300, 400, 600).
- **DO** use `clamp()` instead of media queries for font size — smoother scaling, less CSS.

---

## 6. Existing Codebase Patterns & Harmonization

### Established Glassmorphism Pattern

From `src/styles.css`, `src/location/styles.css`, and `src/converters/styles.css`:

```css
/* Standard glass card */
background: rgba(0, 0, 0, 0.8);
border: 1px solid rgba(255, 255, 255, 0.2);
border-radius: 12px;
backdrop-filter: blur(20px);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
```

```css
/* Interactive element */
background: rgba(255, 255, 255, 0.1);
border: 1px solid rgba(255, 255, 255, 0.15);
transition: background 150ms ease-out;
```

### Harmonization Strategy

The new atmospheric background should sit **behind** all existing UI. The glassmorphism panels (location selector, converter panel) will naturally adapt to any background because they use semi-transparent `backdrop-filter: blur()`.

**Layer structure:**
```
<body> (sky gradient background, updated every tick)
  └── #sky-bg (fixed, z-index: -1) — or directly on body
      └── #location-selector (absolute, top-right, glass)
      └── #beats-container (centered, large text)
      └── #converter-panel (centered below clock, glass)
```

### Responsive Pattern

Current responsive breakpoint from `src/location/styles.css`:

```css
@media (max-width: 768px) {
  .modal-content { width: 95%; max-height: 90vh; }
  .location-selector { top: 0.5rem; right: 0.5rem; }
}
```

Extend this pattern for clock scaling:

```css
@media (max-width: 768px) {
  #beats-container {
    font-size: clamp(2rem, 8vw, 3.5rem);
    padding: 0 1rem;
  }
}
```

### Integration with Existing JS

The `updateClock()` function in `src/index.js` already calls `compose()` which returns `solar` and `lunisolar` data. The sky color and moon phase can be computed from the same data without additional API calls:

```js
function updateClock(userLocation) {
  const now = new Date();
  const result = compose(now, {
    latitude: userLocation?.latitude,
    longitude: userLocation?.longitude,
  });

  // ... existing clock text update ...

  // New: update sky background
  updateSkyBackground(now, userLocation);

  // New: update moon indicator
  updateMoonIndicator(result.lunisolar);
}
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/styles.css` | Replace current minimal styling with new atmospheric styles |
| `src/index.js` | Add sky background update + moon indicator calls to `updateClock()` |
| `src/chronometers/lunisolar.js` | Return `moonAge` and `illumination` |
| `src/template.html` | Possibly add `<div id="sky-bg">` element (or use body) |

### Dependencies

No new dependencies needed. The project already has:
- **suncalc** — sunrise/sunset times for sky phase calculation
- **lunar-javascript** — moon age and illumination data

---

## Summary: Implementation Roadmap

### Task Grouping for Planning

1. **Sky Background System** — Create full-screen gradient background driven by solar position data, updating every ~864ms
2. **Color Palette & Interpolation** — Define dawn/day/dusk/night color palettes, implement RGB interpolation between states
3. **Beat Pulse Animation** — Add subtle CSS breathing/pulse animation to clock text
4. **Moon Phase Indicator** — Extract moon age from lunisolar data, render SVG moon phase element
5. **Typography Overhaul** — Replace Arial with Inter (or system font stack), apply light weight, tracking, tabular-nums
6. **Responsive Scaling** — Use `clamp()` for font size, adjust padding/margins for mobile
7. **Default/No-Location State** — Handle `S??` case with neutral dark gradient

### Key Technical Decisions Summary

| Decision | Recommendation |
|----------|---------------|
| Gradient animation method | Direct inline style update per tick (864ms is slow enough) |
| Color interpolation | RGB lerp between phase boundary colors using suncalc times |
| Pulse animation | Continuous `breathe` keyframes (4s) + `will-change: transform` |
| Moon rendering | Inline SVG with computed arc path from moonAge |
| Font choice | Inter (self-hosted) with system font fallback stack |
| Responsive sizing | `clamp(2.5rem, 6vw, 5rem)` |
| Numeric stability | `font-variant-numeric: tabular-nums` |
