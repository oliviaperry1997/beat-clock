# Phase 13: Solar Time Format Renderers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 13-solar-time-format-renderers
**Areas discussed:** Descriptive labels system, Solar time data flow, Longitudinal solar format semantics, Decimal solar beats calculation, Solar/Standard date comparison logic

---

## Descriptive Labels System

### Question 1: Label Style

| Option | Description | Selected |
|--------|-------------|----------|
| Astronomical precision | Comprehensive twilight coverage (astronomical twilight, nautical twilight, civil twilight, golden hour, blue hour, deep night, solar noon, day). ~8-10 labels with precise thresholds. Good for astronomy enthusiasts. | |
| Everyday poetry | Simpler, more poetic labels (deep night, dawn, morning, golden hour, midday, afternoon, dusk, evening, night). ~8-9 labels focused on everyday experience rather than technical altitude bands. | |
| Maximum granularity | Highly granular (15+ labels) covering every significant twilight phase and sub-phase. Maximum information density. | |
| Minimal simplicity | Minimal set (5-6 labels: night, dawn, day, dusk, evening). Less clutter, broader time bands. | |

**User's choice:** Custom label list (freeform)
**Notes:** User provided specific 16-label system: Dawn, Morning Twilight, Sunrise, Early Morning, Midmorning, Late Morning, Noon, Early Afternoon, Midafternoon, Late Afternoon, Sunset, Evening Twilight, Dusk, Early Night, Midnight, Late Night

### Question 2: Altitude Thresholds

| Option | Description | Selected |
|--------|-------------|----------|
| Astronomical standards | Use standard astronomical definitions where applicable (civil twilight -6°, nautical -12°, astronomical -18°) and divide the daytime arc (0° to 90°) into equal bands for morning/midmorning/late morning/afternoon phases. | |
| Equal division | All 16 labels get equal-width altitude bands (-18° to +90° divided into 16 slices). Simplest, but sunrise/sunset won't align with horizon crossing. | |
| Custom thresholds | You'll specify the exact altitude threshold for each label transition. | ✓ |

**User's choice:** Custom thresholds
**Notes:** Pattern-based approach selected (next question)

### Question 3: Threshold Definition Method

| Option | Description | Selected |
|--------|-------------|----------|
| Table format | Provide a table with altitude ranges for each label (e.g., "Dawn: -12° to -6°") | |
| Pattern description | Describe the general pattern and I'll infer the specific thresholds (e.g., "twilight phases use standard definitions, daytime divides into 4-hour equivalents") | ✓ |

**User's choice:** Pattern description
**Notes:** User described event-anchored system with ±15 min windows around solar events (astronomical dawn at -18°, sunrise at 0°, solar noon at max altitude, sunset at 0°, astronomical dusk at -18°). Morning/afternoon phases are equal partitions between events. Night phases partitioned around midnight.

### Question 4: Event Window Size

| Option | Description | Selected |
|--------|-------------|----------|
| ±15 min | ±15 minutes around the exact moment (30-minute total window for Dawn/Sunrise/Noon/Sunset/Dusk) | ✓ |
| ±10 min | ±10 minutes (20-minute total window) | |
| ±30 min | ±30 minutes (1-hour total window) | |
| ±5 min | ±5 minutes (10-minute total window) | |

**User's choice:** ±15 min
**Notes:** Balances meaningful event windows without excessive duration

### Question 5: Polar Fallback Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Altitude fallback | When key events are missing, fall back to altitude-only bands. E.g., if no sunrise: sun >0° = 'Day', sun 0° to -6° = 'Twilight', sun <-18° = 'Night'. Simple 3-5 label system for polar extremes. | ✓ |
| Clock-time fallback | Use clock-time partitions when solar events are missing. E.g., if no sunrise but sun stays visible: divide 24h into Morning (00:00-06:00), Day (06:00-18:00), Evening (18:00-24:00). Keeps granularity but loses solar anchoring. | |
| Single polar label | Show a single label for the entire period. E.g., 'Polar Day' when sun never sets, 'Polar Night' when sun never rises. Simplest, most honest. | |
| Error fallback | Detect polar conditions and return an error fallback like 'Solar time unavailable' — don't attempt descriptive labels in edge cases. | |

**User's choice:** Altitude fallback
**Notes:** User refined to compartmentalized approach: missing night events don't disrupt day phases (Late Afternoon → Early Morning when sun never sets), missing day events don't disrupt night phases. Added white nights case: sun sets but never reaches -18° → Evening Twilight → Morning Twilight. Simplified fallback to 3 bands: Day (≥0°), Twilight (-18° to 0°), Night (<-18°).

---

## Solar Time Data Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Object return | Modify solarTime chronometer to return an object: { hours, minutes, totalMinutes, degrees } where degrees = (totalMinutes / 1440) * 360. All three renderers consume this object. Cleaner, no string parsing. | ✓ |
| String parsing | Keep chronometer returning string 'ST14:32'. Each renderer parses the string to extract hours/minutes. Maintains Phase 9 interface but adds parsing overhead. | |
| Hybrid string + object | Chronometer returns both: string for display compatibility, object for renderer consumption. E.g., { display: 'ST14:32', hours: 14, minutes: 32, degrees: 216 }. Most flexible but more complex. | |

**User's choice:** Object return
**Notes:** Cleanest approach, avoids string parsing overhead. Error case returns null instead of 'ST??'.

---

## Longitudinal Solar Format Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Sun position at longitude | Compute solar time at the chosen longitude (not user's actual location), then express as degrees. Formula: solar time at chosen longitude → minutes → degrees. Uses actual sun position (equation of time included). Symbol: ☉ (sun) to distinguish from Standard Time's ⌚ (watch). | Modified |
| Standard + equation of time | Same as Standard Time longitudinal but add equation of time correction. Minimal difference from Phase 12 implementation. | |
| Solar hour angle | Show the solar angle (sun's hour angle) at the chosen longitude, not the time. Directly astronomical rather than time-derived. | |

**User's choice:** Sun position at longitude (modified)
**Notes:** User requested different symbol — 🜨 (U+1F728, alchemical Earth) instead of ☉ to maintain consistency with astrological symbols (☉ for solar longitude, ☽ for lunar phase angle). Also specified integer degrees only (no decimals) for all solar time formats due to precision philosophy (solar time inherently less consistent, small units would refresh awkwardly).

---

## Decimal Solar Beats Calculation

| Option | Description | Selected |
|--------|-------------|----------|
| Solar midnight anchor | Use solar midnight as anchor: beats = (solarMinutesSinceSolarMidnight / 1440) * 1000, then round to integer. Semantically consistent with 24h solar (both anchored to solar midnight). | ✓ |
| BMT + equation of time | Use BMT (Biel Mean Time, UTC+1) as anchor like Swatch Internet Time, but add equation of time correction. Maintains .beats heritage but adds solar adjustment. | |
| UTC midnight + solar correction | Recompute from UTC midnight at chosen longitude (like Phase 12 decimal), then add equation of time. Hybrid of standard time offset logic + solar correction. | |

**User's choice:** Solar midnight anchor
**Notes:** User emphasized round DOWN (Math.floor) to avoid reaching @1000 just before midnight. Range: 0-999 beats. Integer only, no centibeats (matches precision philosophy from longitudinal discussion).

---

## Solar/Standard Date Comparison Logic

| Option | Description | Selected |
|--------|-------------|----------|
| Solar renderer computes | The solar time renderer computes the flag and passes it to date renderers via opts. Compare UTC date at user's longitude (solar midnight) vs UTC date at standard meridian. If solar date ahead: '+', behind: '-', same: no suffix. | ✓ |
| Pipeline computes (Phase 14) | The display pipeline (Phase 14) compares solar time vs standard time dates before calling renderers, sets opts.solarDateDiffsStdDate for date renderers. Cleaner separation but Phase 14 scope. | |
| Shared helper function | Create a shared helper function that both solar time renderers and date renderers can call. Most reusable but adds another module. | |

**User's choice:** Solar renderer computes
**Notes:** Tight integration where solar time renderers are responsible for the comparison that affects date display. Uses existing Phase 11 date renderer handling of opts.solarDateDiffsStdDate flag.

---

## Claude's Discretion

- Helper function structure in descriptions.js (event detection, label mapping, polar fallback)
- Date comparison logic extraction (standalone utility vs inline)
- Test file organization within tests/formats/renderers/solartime/
- Specific test cases beyond required polar edge cases
- Constants/enums for label strings vs inline strings
