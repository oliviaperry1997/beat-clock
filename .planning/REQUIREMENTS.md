# Requirements: Beat Clock

**Defined:** 2026-04-14
**Core Value:** Make the invisible rhythms of time — lunar cycles, solar arcs, alternative calendars — tangible and beautiful in everyday use.

## v1.0 Requirements

Requirements for Modular Datetime Formats milestone. Each maps to roadmap phases.

### Year Format

- [x] **YEAR-01**: User can display year in Holocene format (H year, ticks on Chinese New Year)
- [x] **YEAR-02**: User can display year in Gregorian format (standard calendar year)
- [x] **YEAR-03**: User can display year in Meghalayan format (counting up from 4.2kya event, 2200 BCE = Mgh 1, 2026 CE = Mgh 4226)
- [x] **YEAR-04**: User can display year in Custom format (user-defined epoch date as year 1, counts forward)

### Date Format

- [x] **DATE-01**: User can display date in Gregorian format (standard month/day)
- [x] **DATE-02**: User can display date in Chinese lunisolar format (Chinese month/day with leap month notation)
- [x] **DATE-03**: User can display date in Longitudinal format (Solar Longitude 0-360° from Point of Aries + Lunar Phase Angle 0-360° from New Moon)
- [x] **DATE-04**: Year boundary transitions correctly when Date format changes (e.g., Chinese New Year vs Jan 1 vs Meghalayan epoch) — note: Year format is independently selected but boundary behavior must be consistent

### Standard Time Format

- [ ] **STDTIME-01**: User can display Standard Time in 24h format with customizable hour-interval meridian offset (default: UTC/Prime Meridian = 0°)
- [ ] **STDTIME-02**: User can display Standard Time in Decimal beats format with customizable 100-beat-interval offset
- [ ] **STDTIME-03**: User can display Standard Time in Longitudinal format with customizable degree-based longitude offset
- [ ] **STDTIME-04**: Meridian/offset selection provides presets for common values + custom input for precision
- [ ] **STDTIME-05**: Midnight crossing handled correctly when meridian offset pushes time to previous/next day

### Solar Time Format

- [x] **SOLTIME-01**: User can display Solar Time in 24h local format (based on user's location sun position)
- [x] **SOLTIME-02**: User can display Solar Time in Decimal format (local solar beats)
- [x] **SOLTIME-03**: User can display Solar Time in Longitudinal format (solar angle-based time at chosen longitude — differs from Standard Time longitudinal by using actual sun position, not fixed meridian offset)
- [ ] **SOLTIME-04**: User can display Solar Time in Descriptive format (time-of-day descriptions: golden hour, blue hour, civil twilight, nautical twilight, astronomical twilight, deep night, solar noon, day, etc.)

### Format System

- [ ] **FORMAT-01**: Per-component dropdown format selectors — each of the 4 components (Year, Date, Standard Time, Solar Time) has a dropdown to select its active format
- [ ] **FORMAT-02**: Format configuration persistence — single active configuration saved to localStorage with schema versioning (`beatClock_formats_v1`)
- [ ] **FORMAT-03**: Format selection immediately updates display without page reload
- [ ] **FORMAT-04**: Default format configuration loads on first visit (Holocene year, Gregorian date, UTC 24h standard time, Descriptive solar time)
- [ ] **FORMAT-05**: Format selectors are minimal and unobtrusive — styled to match atmospheric aesthetic, appear on hover/focus

## Future Requirements

Deferred to future releases. Tracked but not in current roadmap.

### Year Format

- **YEAR-F01**: Additional year systems (e.g., Japanese era, Islamic calendar, etc.)

### Date Format

- **DATE-F01**: Additional date systems (e.g., ISO week date, Persian calendar, etc.)
- **DATE-F02**: Reinstating the original Holocene lunation/yeardate system (deprecated in v1.0)

### Format System

- **FORMAT-F01**: Named format presets (save multiple configurations with names)
- **FORMAT-F02**: Multiple simultaneous formats per component (stacked display)
- **FORMAT-F03**: Format string editor (template-based customization)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Named format presets | Single configuration only for this milestone |
| Multiple formats per component | One active format at a time |
| Format string editor | Dropdown selectors, not templates |
| Cross-platform packaging | Deferred until core features are complete |
| Polish & verification | Will be addressed after this milestone |
| User accounts / auth | Personal tool, no multi-user needs |
| Social sharing | Focus on personal time exploration first |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| YEAR-01 | Phase 11 | Complete |
| YEAR-02 | Phase 11 | Complete |
| YEAR-03 | Phase 11 | Complete |
| YEAR-04 | Phase 11 | Complete |
| DATE-01 | Phase 11 | Complete |
| DATE-02 | Phase 11 | Complete |
| DATE-03 | Phase 11 | Complete |
| DATE-04 | Phase 11 | Complete |
| STDTIME-01 | Phase 12 | Pending |
| STDTIME-02 | Phase 12 | Pending |
| STDTIME-03 | Phase 12 | Pending |
| STDTIME-04 | Phase 12 | Pending |
| STDTIME-05 | Phase 12 | Pending |
| SOLTIME-01 | Phase 13 | Complete |
| SOLTIME-02 | Phase 13 | Complete |
| SOLTIME-03 | Phase 13 | Complete |
| SOLTIME-04 | Phase 13 | Pending |
| FORMAT-01 | Phase 14 | Pending |
| FORMAT-02 | Phase 10 | Pending |
| FORMAT-03 | Phase 14 | Pending |
| FORMAT-04 | Phase 10 | Pending |
| FORMAT-05 | Phase 14 | Pending |

**Coverage:**
- v1.0 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after initial definition*
