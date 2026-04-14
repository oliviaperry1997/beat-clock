# Features Research — Modular Datetime Formats

**Date:** 2026-04-14
**Focus:** Feature categories, table stakes, differentiators, complexity analysis

## Feature Categories

### Year Format System

**Table stakes:**
- Holocene year display (already exists — H{year} format)
- Gregorian year display (standard calendar year)
- Chinese lunisolar year display (stem-branch + cycle name, e.g., 甲辰年)

**Differentiators:**
- Seamless switching between year systems via dropdown
- Year system persists across page reloads (localStorage)
- Year display maintains precision and accuracy of existing chronometer modules

**Complexity notes:**
- Holocene year already calculated in `chronometers/holocene.js`
- Gregorian year is trivial (`new Date().getFullYear()`)
- Chinese lunisolar year already calculated in `chronometers/chineseNewYear.js` — stem-branch and cycle name already available
- Key consideration: Chinese New Year doesn't align with Jan 1 — need to handle the transition date correctly (already handled by existing module)

**Dependencies on existing:** All year systems already computed by existing chronometer modules. Feature is about *exposing* these values through UI selection, not *computing* them.

### Date Format System

**Table stakes:**
- Holocene date (M/D with leap month MX support) — already exists
- Gregorian date (standard month/day) — trivial
- Lunisolar date (Chinese month/day with leap month notation) — existing `chronometers/lunisolar.js` provides this

**Differentiators:**
- Solar Longitude + Lunar Phase Angle display (replaces Date slot)
- Both angles displayed as integers (0-360°)
- Real-time angle updates as the Earth orbits / Moon orbits

**Complexity notes:**
- Solar Longitude requires new calculation (ecliptic longitude from Point of Aries) — see STACK.md, use `astronomia`
- Lunar Phase Angle requires new calculation — see STACK.md, use `suncalc`
- Angles update continuously (not discrete like calendar dates) — may want to show decimal or integer degrees
- Display format: "☉ {solarLon}° ☽ {lunarPhase}°" or similar notation
- Both angles are *continuous* values — they change throughout the day, unlike calendar dates which change at midnight

**Dependencies on existing:** Holocene date and Lunisolar date already computed. Solar Longitude and Lunar Phase Angle require new chronometer modules.

### Standard Time Format System

**Table stakes:**
- 24h format with customizable meridian offset (default: UTC = 0°)
- User selects hour-interval offset (e.g., UTC+1, UTC-5, etc.)
- Display: HH:MM format

- Decimal beats format with customizable beat-interval offset (default: @BIH = Beat Internet Hours)
- User selects beat-interval offset (100-beat system)
- Display: @xxx.xx format (existing Swatch .beats)

- Longitudinal format with degree-based offset
- User selects longitude degree
- Display: time calculated from the chosen meridian

**Differentiators:**
- Meridian/offset selection UI — presets for common offsets + custom input
- Offset persists with the format selection
- Real-time display updates at tick interval

**Complexity notes:**
- 24h meridian offset: simple math — `timeAtMeridian = UTC + (longitudeOffset / 15) hours`
- Decimal beats: existing `chronometers/beats.js` calculates Swatch .beats (based on Biel, Switzerland time = UTC+1). For customizable offset, generalize the formula
- Longitudinal format: time derived from the chosen longitude's solar position — different from standard timezone offsets
- Key edge case: midnight crossing when offset puts the time on the previous/next day

**Dependencies on existing:** `chronometers/beats.js` already calculates Swatch .beats (UTC+1 base). Need to generalize for arbitrary offsets.

### Solar Time Format System

**Table stakes:**
- 24h local solar time — time based on user's actual sun position (location-dependent)
- Solar noon = 12:00, solar midnight = 00:00
- Already partially calculated by existing solar module

- Decimal local solar beats — local solar time expressed in .beats format
- Based on local solar position rather than fixed meridian

- Descriptive format — time-of-day descriptions
- Labels like "Golden Hour", "Blue Hour", "Civil Twilight", "Deep Night", "Solar Noon", "Day", "Dusk", "Dawn"
- Based on sun altitude angle

**Differentiators:**
- Descriptive labels update as solar position changes
- Labels match atmospheric visual design aesthetic (complements sky gradient system)
- Descriptions could be paired with sky colors for cohesive experience

**Complexity notes:**
- Solar time requires equation of time calculation (difference between apparent solar time and mean solar time) — `suncalc` provides solar position data
- Equation of time can add ~15 minute variation from clock time — users should understand this is "sun time" not "clock time"
- Descriptive format needs a mapping from sun altitude to labels — see STACK.md for recommended thresholds
- Descriptions should be poetic/useful, not just technical — "Golden Hour" not "Sun Altitude 3.2°"

**Dependencies on existing:** `chronometers/solar.js` already calculates solar position. `sky.js` already uses solar data for sky gradients. `suncalc` provides sunrise/sunset/dawn/dusk times needed for descriptions.

### Format Selection UI

**Table stakes:**
- Per-component dropdown selectors (one per component: Year, Date, Standard Time, Solar Time)
- Each dropdown shows available format options for that component
- Selection immediately updates display
- Active format persists in localStorage

**Differentiators:**
- Dropdowns styled to match atmospheric aesthetic (glassmorphic, subtle)
- Minimal visual footprint — doesn't distract from the clock display itself
- Accessible — keyboard navigation, screen reader friendly

**Complexity notes:**
- Native `<select>` elements are simplest but may need custom styling for aesthetic consistency
- Consider: dropdowns visible on hover/focus, minimal when idle
- localStorage schema needs versioning (existing alarm system uses schema versioning — follow same pattern)

**Dependencies on existing:** None — entirely new feature.

### Format Configuration Persistence

**Table stakes:**
- Single active configuration saved to localStorage
- Configuration includes: active format per component + any associated settings (meridian offset, etc.)
- Configuration loads on page init
- Fallback to defaults if no saved config

**Differentiators:**
- Schema versioning (like alarm system) for future migration
- Graceful handling of corrupted/missing config

**Complexity notes:**
- Follow existing localStorage patterns from location system and alarm system
- Schema version should be tracked (existing systems use `beatClock_location_v1`, `beatClock_alarms_v1`)
- Config structure: `{ version: 1, yearFormat: 'holocene', dateFormat: 'holocene', stdTimeFormat: { type: '24h', offset: 0 }, solarTimeFormat: { type: 'descriptive' } }`

**Dependencies on existing:** Follow patterns from `src/location/storage.js` and `src/alarms/store.js`.

## Anti-Features (Explicitly Excluded)

- **Named format presets** — User explicitly said single config only for this milestone
- **Multiple simultaneous formats per component** — One active format at a time
- **Format string editor** — Dropdown selectors, not template strings
- **Cross-format synchronization** — Each component is independent

## Complexity Summary

| Feature | Complexity | Reason |
|---------|-----------|--------|
| Year formats | Low | Already computed, just expose via UI |
| Date formats (existing) | Low | Already computed, just expose via UI |
| Solar Longitude | Medium | New calculation, needs astronomia integration |
| Lunar Phase Angle | Low | suncalc provides directly |
| Standard Time 24h | Low | Simple math from UTC |
| Standard Time Decimal | Low | Generalize existing beats module |
| Standard Time Longitudinal | Medium | New calculation, longitude-based time |
| Solar Time 24h | Medium | Equation of time calculation |
| Solar Time Decimal | Medium | Combine solar time + beats formula |
| Solar Time Descriptive | Low | suncalc + altitude mapping |
| Format UI | Low | Native select elements |
| Config persistence | Low | Follow existing localStorage patterns |

---
*Research completed: 2026-04-14*
