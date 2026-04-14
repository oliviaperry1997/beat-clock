# Research Summary — Modular Datetime Formats

**Date:** 2026-04-14
**Milestone:** v1.0 Modular Datetime Formats

## Stack Additions

**Zero new dependencies required.** All calculations can be done with existing stack:
- `astronomia` → Solar ecliptic longitude (precise VSOP87)
- `suncalc` → Lunar phase angle, solar time data, twilight phases
- `lunar-javascript` → Chinese lunisolar year names (already integrated)
- Native `<select>` elements → Format selector UI
- Native JavaScript Date → Meridian-based time math

This is a significant advantage — no bundle cost, no new integration points, no version conflicts.

## Feature Table Stakes

**Year:** Holocene (existing), Gregorian (trivial), Chinese lunisolar (existing) — expose via dropdown
**Date:** Holocene M/D (existing), Gregorian (trivial), Lunisolar (existing), Solar Longitude + Lunar Phase Angle (new chronometer modules)
**Standard Time:** 24h with meridian offset (math), Decimal beats (generalize existing), Longitudinal (degree-based offset)
**Solar Time:** 24h local (equation of time), Decimal local (solar + beats), Descriptive (altitude-to-label mapping)
**UI:** Per-component dropdown selectors, localStorage persistence

## Watch Out For

1. **Computation vs Presentation boundary** — Keep chronometers format-agnostic; format rendering in separate layer
2. **Solar longitude precision** — Use astronomia, not approximations, for accuracy
3. **Equation of time** — Decide apparent vs mean solar time and document in UI
4. **Midnight crossing** — Meridian offsets can push time to previous/next day
5. **localStorage versioning** — Use `beatClock_formats_v1` from the start
6. **UI clutter** — Selectors must be minimal to preserve atmospheric aesthetic
7. **Decimal beats generalization** — Swatch .beats is Biel-specific; generalizing requires computing "seconds from midnight at chosen meridian"

## Suggested Build Order

1. New chronometer modules (solarLongitude, lunarPhase, solarTime)
2. Format configuration (localStorage CRUD)
3. Format registry (orchestration layer)
4. Year format renderers (simplest — existing data)
5. Date format renderers (includes longitudinal)
6. Standard Time format renderers (meridian-based)
7. Solar Time format renderers (includes descriptive)
8. Format selector UI (dropdowns)
9. Integration (connect to display pipeline)

---
*Research synthesized: 2026-04-14*
