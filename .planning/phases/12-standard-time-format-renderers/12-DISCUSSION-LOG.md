# Phase 12: Standard Time Format Renderers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 12-standard-time-format-renderers
**Areas discussed:** 24h Format Details, Decimal Beats Offset Mechanics, Longitudinal Format Output, Meridian Selector Presets, Midnight Crossing Indicator

---

## 24h Format Details

| Option | Description | Selected |
|--------|-------------|----------|
| `HH:MM` + optional seconds flag | Default `HH:MM`; `opts.showSeconds` flag for callers who want precision; error fallback `'??:??'` | ✓ |
| Always `HH:MM:SS` | Full precision at every render; error fallback `'??:??:??'` | |
| Always `HH:MM` | Ambient/minimal, no seconds ever | |

**User's choice:** `HH:MM` + optional seconds flag (Recommended)
**Notes:** Keeps default compact and consistent with ambient aesthetic while allowing precision when needed.

---

## Decimal Beats Offset Mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Recompute from chosen meridian midnight | Beats count from midnight at the user-chosen meridian. Semantically consistent with 24h renderer. Formula: `(utcMs + meridianOffsetMs) % 86400000 / 86400`. Breaks Swatch BMT spec for non-zero offsets. | ✓ |
| Always BMT / Swatch-compatible | Always use UTC+1 anchor. `beatOffset` param becomes a display label only — no actual computation change. | |

**User's choice:** Recompute from chosen meridian midnight
**Notes:** Success criterion #2 literally says "beats from midnight at chosen meridian." Option A would make the offset parameter a semantic lie.

---

## Longitudinal Format Output

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: meridian + clock `☉ 135°E  00:00` | Shows both longitude identity and clock time | |
| Clock time only `HH:MM` | Same as 24h but degree-driven | |
| Longitude label only `☉ 135°E` | Decorative, shows meridian not time | |
| Time-as-degrees 0–360° from midnight | **User corrected the premise:** longitudinal format IS time expressed as degrees. The longitude IS the time. 0°=midnight, 180°=noon, 360°=midnight. 1° = 4 min. | ✓ |

**User's choice:** Time-as-degrees (user corrected the research assumption)
**Notes:** The research assumed "longitudinal" meant time-at-a-longitude, but the user clarified: it converts standard time INTO degrees, dividing the day into 360° to the nearest 0.01° (2.4 seconds).

**Symbol sub-discussion:**

| Symbol | Description | Selected |
|--------|-------------|----------|
| `☉` sun symbol | Already used for solar/tropical longitude in date renderer — reserved | |
| `⌚` (U+231A watch) | Unicode watch symbol, not color emoji. Represents timekeeping authority. | ✓ |
| Other clock symbols | `⏱`, clock face emoji, etc. | |

**User's rationale:** Wanted a clock symbol to represent the "source of authority for the timekeeping system." Preferred Unicode over emoji. U+231A (⌚) selected as clean, minimal, widely supported.

**Display format:** `⌚ 270.25°` — watch symbol + space + degrees to 2 decimal places + degree sign.

---

## Meridian Selector Presets

| Option | Description | Selected |
|--------|-------------|----------|
| Per-format presets in native unit | Each format has its own presets (hours / beats / degrees) | |
| Unified longitude selector for all | One degree value drives all renderers via conversion | |
| Hybrid (user's answer) | **Longitude-based internally**, UI renders options in format-native units. 24h shows hourly intervals, decimal shows 100-beat intervals, longitudinal shows 1-degree intervals. Format switching auto-snaps to nearest valid interval. | ✓ |

**User's choice:** Longitude-based internally, format-aware UI display
**Notes:** "Use a longitude-based system internally (1 degree = 4 minutes), but render options in the UI based on which format is selected — 1-hour-intervals for 24h clock, 100-beat-intervals for the decimal clock, and 1-degree-intervals for the longitudinal clock. If the format is switched it should auto-swap the offset to the nearest valid interval, but invalid intervals wouldn't necessarily break anything."

**Default meridian:**
- Always 0° (Prime Meridian / UTC) — does NOT seed from user location

---

## Midnight Crossing Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| No indicator — clean time only | Just show the correct wrapped time. Date component shows the correct date independently. | ✓ |
| Show +1/-1 day offset suffix | e.g. `02:00 +1` or `23:00 -1`. Follows Phase 11 +/- suffix pattern. | |

**User's choice:** No indicator — clean time only
**Notes:** "Midnight crossing handled correctly" means the wrap arithmetic is correct, not that a visual badge is shown.

---

## Claude's Discretion

- Exact preset list for selector UI
- Whether selector uses `<select>` + `<input>` or custom dropdown
- Test file structure and naming within `tests/formats/renderers/stdtime/`
- Named export style (following existing `export function render` convention)

## Deferred Ideas

None during this discussion.
