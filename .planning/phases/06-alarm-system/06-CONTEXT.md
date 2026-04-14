# Phase 6: Alarm System - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Time-based alarm system for Beat Clock. Supports alarms at specific times, offsets from astronomical events (sunrise, sunset, solar noon), and lunar/seasonal day triggers (full moon, new moon, equinox). Template-based condition creation with recurring and one-time alarm modes. Browser Notification API + in-app visual overlay + audio chime for notifications. Alarms only fire when the app tab is open.

Cross-platform packaging with service worker background alarms is Phase 7. Composable condition free-form parsing is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Alarm triggering & notification behavior
- **D-01:** Alarm engine checks conditions on each tick (~864ms interval) — no separate timer needed
- **D-02:** Three notification channels fire simultaneously when alarm triggers:
  - Browser Notification API (standard desktop/mobile notifications)
  - In-app visual overlay (modal/overlay consistent with glassmorphism aesthetic)
  - Audio chime (subtle sound played when alarm fires)
- **D-03:** Alarms only fire when app tab is open — no service worker background execution (deferred to Phase 7 PWA)
- **D-04:** Alarm fires when tick time passes the target time — within 1 beat (~864ms) tolerance is acceptable

### Astronomical event computation
- **D-05:** Precompute astronomical events (sunrise, sunset, solar noon) at startup for the current day
- **D-06:** Recompute astronomical events when location changes (keeps cache fresh)
- **D-07:** Uses existing `suncalc` library — no new astronomical dependencies needed
- **D-08:** Precision tolerance: within 1 beat (~864ms) — no sub-second matching required

### Condition builder (template-based)
- **D-09:** Template slots with parameters — pre-built alarm templates where user fills in values, NOT free-form expression or visual rule builder
- **D-10:** Template library includes:
  - **Time-based triggers:** At specific beat time, at specific standard time
  - **Offset from astronomical events:** X minutes after sunrise, X minutes before sunset, X beats after solar noon
  - **Lunar/seasonal day triggers:** On full moon day, on new moon day, on equinox
  - **Lunar/seasonal offset:** X minutes after sunrise on full moon day, etc.
- **D-11:** Templates are composable — user can combine a time condition with a date condition (e.g., "30 min after sunrise" AND "on full moon day")

### Alarm storage & lifecycle
- **D-12:** localStorage persistence — consistent with Phase 3 location system pattern (`beatclock:` prefix namespace)
- **D-13:** Both one-time and recurring alarm modes — user chooses when creating alarm
- **D-14:** Recurrence patterns: daily, weekly (specific days like Mon-Fri), monthly/lunar events (every full moon, every equinox)
- **D-15:** Enable/disable toggle per alarm — on/off switch without deleting
- **D-16:** No artificial limit on alarm count — trust the user, performance is lightweight
- **D-17:** One-time alarms are automatically deleted after firing; recurring alarms remain active with last-fired timestamp tracked

### Claude's Discretion
- Alarm engine module structure (single file vs split engine/evaluator/store)
- Notification permission request flow and timing
- Audio chime implementation (Web Audio API vs `<audio>` element)
- In-app overlay design (specific glassmorphism styling, animation)
- Template UI component design
- Exact localStorage key naming convention (beyond `beatclock:` prefix)
- Error handling for invalid alarm conditions
- Alarm snooze/dismiss behavior specifics

</decisions>

<canonical_refs>
## Canonical References

### Alarm system
- `.planning/ROADMAP.md` — Phase 6: Alarm System requirements (alarm scheduling, time-based UI, astronomical events, condition builder, templates)
- `.planning/PROJECT.md` — ALARM-01 through ALARM-04 requirements, composable alarm conditions decision
- `.planning/phases/05-atmospheric-visual-design/05-CONTEXT.md` — Glassmorphism patterns, aesthetic constraints, performance requirements

### Existing code
- `src/index.js` — `updateClock()` function, `setInterval(() => updateClock(location), 864)` tick pattern (alarm engine hooks in here)
- `src/chronometers/index.js` — `compose(date, opts)` returns solar, lunisolar data needed for astronomical alarm conditions
- `src/sky.js` — `getSkyGradientColors()` uses suncalc for solar position — pattern for astronomical computation usage
- `src/location/store.js` — localStorage persistence pattern (`beatclock:` prefix) — reuse for alarm storage
- `src/location/ui.js` — Glassmorphism UI patterns (modal, dropdown, panel) — alarm UI should harmonize
- `src/styles.css` — Global styles, `breathe` animation, glassmorphism patterns
- `package.json` — Current dependencies: `suncalc` (sunrise/sunset), `astronomia` (precise astronomical calculations), no notification/audio libraries

</canonical_refs>

<specifics>
## Specific Ideas

- Alarms should feel like phone alarm clock apps — familiar toggle switches, template selection, recurrence patterns
- Audio chime should be subtle and ambient — consistent with the "not a data dashboard" philosophy
- Template slots make it discoverable: "I want an alarm at sunrise" → user picks "After sunrise" template → enters "0 minutes"
- Composability means "30 min after sunrise on full moon day" is possible — template chain, not a single monolithic template
- Notification permission should be requested gracefully — not aggressively on first load

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/chronometers/index.js:compose()`** — Returns solar data (for sunrise/sunset timing) and lunisolar data (moon age, month, isLeap) — all needed for astronomical alarm conditions
- **`src/sky.js`** — Already computes solar position via suncalc; pattern for caching astronomical data
- **`src/location/store.js`** — localStorage CRUD with `beatclock:` prefix — identical pattern for alarm persistence
- **`src/location/ui.js`** — Modal, panel, glassmorphism patterns — alarm UI components should reuse these visual patterns
- **`src/index.js` update loop** — 864ms `setInterval` — alarm engine can hook into existing tick or add parallel check

### Established Patterns
- Dark aesthetic with glassmorphism (`rgba(0,0,0,0.8)`, `rgba(255,255,255,0.2)` borders, `backdrop-filter: blur(10-20px)`)
- CSS transitions with `150ms ease-out` timing
- localStorage with `beatclock:` namespace prefix
- Vanilla JavaScript, no framework
- Module exports pattern: `src/location/ui.js` exports `initLocationSystem(callback)`, alarm module can follow `initAlarmSystem()` pattern
- Composer wraps modules in try/catch for graceful degradation

### Integration Points
- **`src/index.js`** — Alarm engine initialization should hook into the existing update loop, similar to `initLocationSystem()` and `initConverterPanel()`
- **`src/template.html`** — May need new DOM elements for alarm overlay UI, or overlay can be dynamically created
- **`src/styles.css`** — Alarm UI styles should live alongside location/converter styles
- **`package.json`** — May need audio library dependency (or use native Web Audio API)

</code_context>

<deferred>
## Deferred Ideas

- Service worker background alarms (fire when tab is closed) — Phase 7 (Cross-Platform Packaging / PWA)
- Free-form text alarm expression parser — too complex, template slots cover use cases
- Visual rule builder (IFTTT-style drag-and-drop) — deferred if users request more power
- Alarm snooze duration customization — can add later if needed
- Alarm sound customization (different tones per alarm) — deferred
- Alarm history/log of fired alarms — out of scope
- Export/import alarms for backup — can add if users request

### Reviewed Todos (not folded)
No pending todos matched this phase's scope.

</deferred>

---

*Phase: 06-alarm-system*
*Context gathered: 2026-04-13*
