# ROADMAP — Beat Clock v0

**Milestone:** v0 — Refactor + Enhance existing Beat Clock into cross-platform atmospheric time display
**Granularity:** Standard (5-8 phases, 3-5 plans each)
**Date:** 2025-04-13

## Phases

| Phase | Name | Status | Plans | Progress |
|-------|------|--------|-------|----------|
| 1 | Codebase Audit & Architecture Design | ✅ | ARCHITECTURE.md | 100% |
| 2 | Modular Chronometry Core | ◐ | 02-PLAN.md | 50% |
| 3 | Location System | ○ | — | 0% |
| 4 | Datetime Converters | ○ | — | 0% |
| 5 | Atmospheric Visual Design | ○ | — | 0% |
| 6 | Alarm System | ○ | — | 0% |
| 7 | Cross-Platform Packaging | ○ | — | 0% |
| 8 | Polish & Verification | ○ | — | 0% |

## Phase Details

### Phase 1: Codebase Audit & Architecture Design

Audit existing code, design modular architecture, plan refactoring strategy.

**Deliverables:**
- Documented codebase architecture
- Modular component design for chronometry system
- Refactoring migration plan
- Technology selection for cross-platform support

**Depends on:** Nothing (first phase)

### Phase 2: Modular Chronometry Core

Extract each clock component (Holocene, lunar, solar, beats) into independent, pluggable modules. Implement swappable time system framework.

**Deliverables:**
- `Chronometer` base interface
- Individual modules: HoloceneYear, Lunation, SolarPercent, SwatchBeats, DaysSinceEquinox
- Time system composer/registry
- Unit tests for each chronometer

**Depends on:** Phase 1 (architecture design)

### Phase 3: Location System

Manual location changing with city search and lat/lon input. Location persistence and multi-location support.

**Deliverables:**
- Location search interface (city database)
- Manual lat/lon input
- Location storage/persistence
- Multi-location selector UI

**Depends on:** Phase 2 (modular core — solar calculations depend on location)

### Phase 4: Datetime Converters

Gregorian ↔ Holocene/Beats conversion, cross-timezone comparison, historical date lookup.

**Deliverables:**
- Gregorian to custom time converter
- Custom time to Gregorian converter
- Cross-timezone comparison view
- Historical date lookup
- Converter UI components

**Depends on:** Phase 2 (modular core — converters use chronometer modules)

### Phase 5: Atmospheric Visual Design

Redesign the visual experience — sky colors reflecting time of day, subtle animations, immersive typography, ambient feel.

**Deliverables:**
- Dynamic background system (sky colors based on solar position)
- Subtle animations (lunar cycle breathing, beat pulsing)
- Typography overhaul
- Responsive layout for all screen sizes

**Depends on:** Phase 2 (modular core — visuals driven by chronometer data)

### Phase 6: Alarm System

Time-based alarms, astronomical event alarms, composable custom conditions with templates and rule builder.

**Deliverables:**
- Alarm scheduling engine
- Time-based alarm UI
- Astronomical event alarm UI
- Composable condition builder
- Alarm templates library
- Notification system

**Depends on:** Phase 2 (modular core — alarms trigger on chronometer events), Phase 3 (location — alarms need location for solar events)

### Phase 7: Cross-Platform Packaging

Structure application for web, PWA, and desktop deployment.

**Deliverables:**
- PWA manifest and service worker
- Desktop packaging (Electron or Tauri)
- Mobile-optimized responsive design
- Platform-specific configurations

**Depends on:** Phase 5 (visual design), Phase 6 (alarm system — notifications need platform support)

### Phase 8: Polish & Verification

Final cleanup, verification of all requirements, performance optimization, documentation.

**Deliverables:**
- All requirements verified
- Performance audit
- Edge case handling
- Documentation updates

**Depends on:** All previous phases

---
*Roadmap created: 2025-04-13*
