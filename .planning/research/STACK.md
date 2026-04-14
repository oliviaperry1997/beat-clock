# Stack Research — Modular Datetime Formats

**Date:** 2026-04-14
**Focus:** Libraries and tools needed for format customization features

## Existing Stack Assessment

**Already have and sufficient:**
- `suncalc` — Sunrise/sunset, moon position, lunar phase, sunlight phases (dawn, dusk, nautical/astronomical twilight). Already provides all the building blocks for Solar Time Descriptive format.
- `astronomia` — Precise astronomical calculations including Julian dates, equinox calculations. Sufficient for Solar Longitude calculation via its ecliptic position functions.
- `lunar-javascript` — Already added for Chinese lunisolar calendar (leap month detection, cycle/stem-branch year names).

## New Stack Needs

### 1. Solar Ecliptic Longitude
**Need:** Calculate solar ecliptic longitude (0-360° from Point of Aries) for any given date/time.

**Options:**
- **`astronomia` (already present)** — Has `VSOP87` planetary theory for precise solar position. Can derive ecliptic longitude from Julian date. This is the preferred approach since it's already a dependency and provides high precision.
- **`astronomy-engine` (npm)** — Alternative with explicit `eclipticLongitude` function. Lighter weight but would add a new dependency.
- **Approximate formulas (USNO)** — Simple approximation: `L = 280.459 + 0.98564736 * D + corrections` where D is days from J2000.0. Good enough for display purposes (~1° accuracy). Can implement as a few lines of code.

**Recommendation:** Use `astronomia` for precision (already integrated). If bundle size becomes a concern, the USNO approximation is a lightweight fallback.

### 2. Lunar Phase Angle
**Need:** Calculate lunar phase angle (0-360° from New Moon) for any given date/time.

**Options:**
- **`suncalc` (already present)** — Provides `getMoonIllumination(date)` which returns `phase` (0-1) and `angle`. The `phase` value is exactly what we need: 0 = new moon, 0.5 = full moon. Convert: `phaseAngle = phase * 360`.
- **`lunar-javascript` (already present)** — Has moon phase calculation as part of Chinese calendar support.
- **Simple approximation** — Known new moon reference date + synodic month (29.53059 days): `phaseAngle = ((daysSinceKnownNewMoon % 29.53059) / 29.53059) * 360`.

**Recommendation:** Use `suncalc` — already present, API is direct, no new dependency needed.

### 3. Time-of-Day Descriptions
**Need:** Map current solar position to descriptive labels (golden hour, blue hour, twilight phases, etc.)

**Options:**
- **`suncalc` (already present)** — Provides sunlight phase times: `sunrise`, `sunset`, `dawn` (civil), `nauticalDawn`, `nadir`. Golden hour can be derived as the period between dawn and sunrise (morning) and sunset and dusk (evening). Blue hour ≈ civil twilight period.
- **Custom mapping** — Define time-of-day descriptions based on sun altitude angles:
  - "Deep Night" — sun altitude < -18° (astronomical night)
  - "Astronomical Twilight" — sun altitude -18° to -12°
  - "Nautical Twilight" — sun altitude -12° to -6°
  - "Civil Twilight" — sun altitude -6° to 0°
  - "Golden Hour" — sun altitude 0° to ~6° (warm, low sun)
  - "Day" — sun altitude > 6°
  - Plus moon-based descriptors for night ("Moonlit", "New Moon Night")

**Recommendation:** Extend `suncalc` with custom altitude-based mapping. No new library needed — just a description layer that maps sun altitude to human-readable labels.

### 4. Meridian-Based Time Calculation
**Need:** Calculate time at an arbitrary meridian offset (hour-based, beat-based, or degree-based).

**Options:**
- **Native JavaScript Date** — `Date.getTimezoneOffset()` gives offset from UTC in minutes. For custom meridian: `offsetMinutes = (meridianLongitude / 15) * 60`. Then `localTime = utcTime + offsetMinutes`. No new library needed.
- **Degree-based offset** — `timeOffset = (longitudeDegrees / 360) * 24 hours`. Same formula, different input unit.

**Recommendation:** Pure JavaScript — no new dependency. Simple math: longitude → hours → time offset.

### 5. Dropdown UI
**Need:** Per-component format selector dropdowns.

**Options:**
- **Native `<select>` elements** — Lightweight, accessible, no dependency. Styleable with CSS to match atmospheric aesthetic.
- **Custom dropdown component** — More control over styling but more code.

**Recommendation:** Native `<select>` styled to match the atmospheric aesthetic. No new dependency.

## Stack Summary

| Need | Solution | New Dep? |
|------|----------|----------|
| Solar ecliptic longitude | `astronomia` (existing) | No |
| Lunar phase angle | `suncalc` (existing) | No |
| Time-of-day descriptions | `suncalc` + custom altitude mapping | No |
| Meridian-based time | Native JavaScript Date math | No |
| Format selector UI | Native `<select>` elements | No |

**Total new dependencies: 0**

All required calculations can be done with existing stack. This is a significant advantage — no additional bundle cost, no new integration points, no version conflicts.

## Integration Points

- Solar Longitude: Add to `src/chronometers/solar.js` or create new `src/chronometers/solarLongitude.js`
- Lunar Phase Angle: Add to `src/chronometers/lunisolar.js` or create new `src/chronometers/lunarPhase.js`
- Time-of-Day Descriptions: New module `src/formats/solarDescriptions.js`
- Meridian time calculations: New modules in `src/formats/` directory
- Format registry and selectors: New `src/formats/` directory structure

---
*Research completed: 2026-04-14*
