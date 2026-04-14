# Pitfalls Research — Modular Datetime Formats

**Date:** 2026-04-14
**Focus:** Common mistakes when adding format customization to existing Beat Clock

## Pitfall 1: Conflating Computation with Presentation

**Problem:** Mixing format rendering logic into existing chronometer modules, making them format-aware instead of keeping them format-agnostic.

**Why it's bad:** Existing chronometer modules follow a clean pattern — they compute values and return raw data. If we add format logic (e.g., "render as Gregorian" vs "render as Holocene") inside the chronometers, we break the single-responsibility principle and make every chronometer aware of every format.

**Prevention:** Keep chronometers as pure computation. Format rendering happens in the `src/formats/` layer. Chronometers compute → registry selects format → renderer displays.

**Phase to address:** Phase 1 (architecture setup) — establish this boundary early.

## Pitfall 2: Solar Longitude Precision

**Problem:** Using approximate solar longitude formulas that drift over time, causing incorrect angle display especially for dates far from J2000.0 epoch.

**Why it's bad:** Users who care about astronomical precision will notice if the solar longitude is off by even 1-2 degrees. The Point of Aries reference point must be correct.

**Prevention:** Use `astronomia` (already present) for precise VSOP87-based solar position calculation. The approximation formulas (USNO) are good to ~1° — acceptable for display but document the precision level. If precision matters, astronomia gives sub-arcminute accuracy.

**Phase to address:** Phase 2 (new chronometer modules) — test solar longitude against known reference dates.

## Pitfall 3: Lunar Phase Angle Reference Point

**Problem:** Using an arbitrary new moon as reference point, causing the phase angle to drift over long periods due to lunar orbit perturbations.

**Why it's bad:** The synodic month varies slightly (29.27 to 29.83 days). A simple "days since known new moon modulo 29.53" approach will accumulate error.

**Prevention:** Use `suncalc.getMoonIllumination()` which calculates phase from actual sun-earth-moon geometry, not a fixed cycle. This gives accurate phase angles for any date without drift.

**Phase to address:** Phase 2 (new chronometer modules) — verify against known moon phase dates.

## Pitfall 4: Equation of Time Confusion

**Problem:** Confusing apparent solar time (what a sundial shows) with mean solar time (what clocks show), and not communicating the difference to users.

**Why it's bad:** The equation of time can cause up to ~16 minutes difference between apparent and mean solar time. If users see "solar noon = 12:14" they might think it's wrong unless they understand the distinction.

**Prevention:** Decide clearly: does "Solar Time 24h" show apparent solar time (sundial time, varies with equation of time) or mean solar time (averaged over the year)? Document the choice in the UI. Mean solar time is probably more intuitive for users.

**Phase to address:** Phase 5 (solar time formats) — make the choice explicit in the UI.

## Pitfall 5: Meridian Offset Edge Cases

**Problem:** Not handling midnight crossing correctly when a meridian offset pushes the time into the previous or next day.

**Why it's bad:** If UTC is 01:00 and user selects UTC-5, the local time should be 20:00 the *previous day*. If the date component doesn't reflect this, the display is inconsistent.

**Prevention:** When computing meridian-offset time, always work with full Date objects (not just hours/minutes) so day boundaries are handled correctly. Test edge cases: UTC midnight ± large offsets.

**Phase to address:** Phase 4 (standard time formats) — include midnight crossing tests.

## Pitfall 6: localStorage Schema Migration

**Problem:** Adding format config to localStorage without versioning, making future migrations difficult.

**Why it's bad:** The alarm system and location system both use schema versioning (`beatClock_alarms_v1`, `beatClock_location_v1`). If format config doesn't follow this pattern, adding features later (like named presets in a future milestone) becomes a migration nightmare.

**Prevention:** Use `beatClock_formats_v1` from the start. Include version field in config object. Plan for migration function even if not needed yet.

**Phase to address:** Phase 3 (format configuration) — follow existing storage patterns.

## Pitfall 7: Tick Interval Misalignment

**Problem:** Format display updates at the 864ms tick interval, but some formats (especially longitudinal angles) change continuously and may appear "jumpy" at this granularity.

**Why it's bad:** Solar longitude changes ~1° per day (~0.004° per second). At 864ms intervals, the change is imperceptible — no issue. But lunar phase angle changes ~13° per day (~0.005° per second) — also imperceptible at tick rate. However, time displays (HH:MM) should update on the second for responsiveness.

**Prevention:** Keep 864ms tick for chronometer computation (it's designed around beat timing). For time display formats, consider a separate 1-second update cycle for HH:MM formats. Or accept that 864ms ≈ 1 beat and that's the app's identity.

**Phase to address:** Phase 1 (architecture) — decide on tick strategy early.

## Pitfall 8: UI Clutter

**Problem:** Four dropdown selectors competing for screen space with the main clock display and existing atmospheric visual design.

**Why it's bad:** The atmospheric design (sky gradients, moon phase, beat pulse) creates an immersive experience. Prominent dropdown selectors break the aesthetic and make the app feel like a settings panel rather than an ambient time experience.

**Prevention:** Make selectors minimal and unobtrusive:
- Appear only on hover/focus near the component
- Use subtle styling that matches the glassmorphic aesthetic
- Consider: small format label next to each value that transforms into a dropdown on click
- Test on mobile — selectors need to work with touch

**Phase to address:** Phase 6 (format selector UI) — design for minimal visual impact.

## Pitfall 9: Decimal Beats Generalization

**Problem:** Swatch .beats is specifically tied to Biel, Switzerland time (UTC+1). Generalizing the formula for arbitrary meridian offsets isn't as simple as adding an offset.

**Why it's bad:** The Swatch .beats formula: `((UTC+1 hours * 3600 + minutes * 60 + seconds) / 86.4) % 1000`. If you naively substitute a different offset, you get incorrect results because the beat day starts at midnight in the reference meridian.

**Prevention:** Generalize the formula: `beats = ((timeAtOffsetMeridian in seconds from midnight) / 86.4) % 1000`. The key is computing "seconds from midnight at the chosen meridian" correctly.

**Phase to address:** Phase 4 (standard time formats) — test against known Swatch .beats calculator.

## Pitfall 10: Description Label Granularity

**Problem:** Too many or too few time-of-day description labels, making the Solar Time Descriptive format either overwhelming or useless.

**Why it's bad:** If there are 20 different labels, users won't remember them. If there are only 3 ("day", "twilight", "night"), the feature isn't useful.

**Prevention:** Aim for 8-12 distinct, memorable labels:
- Deep Night, Astronomical Twilight, Nautical Twilight, Civil Twilight, Dawn, Golden Hour, Day, Solar Noon, Afternoon, Golden Hour, Dusk, Evening
- Test with users (even just the developer) for memorability
- Consider: pair labels with subtle icons (☀️ 🌅 🌇 🌙)

**Phase to address:** Phase 5 (solar time formats) — iterate on label set during implementation.

---
*Research completed: 2026-04-14*
