# Phase 3: Location System - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace browser geolocation API with a manual location selection system. Users can search cities from a bundled database, enter lat/lon coordinates directly, save multiple locations, and switch between them. One location is active at a time for clock display. Location persistence across sessions.

Multi-location comparison views and datetime converters are separate phases (4+).

</domain>

<decisions>
## Implementation Decisions

### Location search & discovery
- **D-01:** Bundle a local city database — no external API keys needed, works offline, fast
- **D-02:** Major cities only (~5,000-10,000 largest worldwide) — small file size (~1-2MB), good coverage
- **D-03:** City search should support fuzzy matching for better UX

### Multi-location management
- **D-04:** Users can save multiple locations with no hard limit
- **D-05:** One location is "active" at a time for clock display
- **D-06:** Location switching via dropdown or sidebar selector
- **D-07:** Saved list + active pattern — not tabbed comparison (that's Phase 4)

### Persistence strategy
- **D-08:** localStorage for location persistence — simple, works everywhere, no server
- **D-09:** No export/import needed yet — can add in later phase if requested

### Manual lat/lon input
- **D-10:** Toggle between search and manual input modes — both easily accessible
- **D-11:** Manual input for precision users, search for convenience users
- **D-12:** Include a "detect location" button that uses browser geolocation API
- **D-13:** On geolocation failure/denial: show error message + suggest manual input or search

### First-run experience
- **D-14:** On first visit, attempt browser geolocation auto-detection
- **D-15:** If auto-detect succeeds, save it as the first location and show clock
- **D-16:** If auto-detect fails, show search prompt to add a location manually

### Claude's Discretion
- City database library choice (geonames, SimpleMaps, etc.)
- Exact search algorithm (fuzzy matching implementation)
- UI component library for dropdown/selector
- Exact error message wording
- Validation rules for lat/lon input format

</decisions>

<specifics>
## Specific Ideas

- Users should be able to both search for cities AND enter precise coordinates
- "Detect location" button provides convenience without forcing browser geolocation
- First-run should feel magical (auto-detect) but graceful when it fails
- No artificial limits on saved locations — trust the user

</specifics>

<canonical_refs>
## Canonical References

### Location system
- `.planning/ROADMAP.md` — Phase 3: Location System requirements (city search, lat/lon input, persistence, multi-location)
- `.planning/PROJECT.md` — LOCATION-01 requirement: "Manual location changing — users can search cities by name or enter lat/lon coordinates directly"

### Existing code
- `src/index.js` — Current geolocation bootstrap (lines 24-44), `updateClock(userLocation)` function
- `src/chronometers/solar.js` — Solar chronometer consumes `opts.latitude` and `opts.longitude` (returns 'S??' if missing)
- `src/chronometers/index.js` — Composer passes `opts` (including lat/lon) to each module

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`src/index.js:updateClock()`** — Already accepts `userLocation` object with `latitude`/`longitude`. Can be reused with new location system.
- **`src/chronometers/solar.js`** — Already handles missing lat/lon gracefully (returns 'S??'). No changes needed to solar module.
- **`src/chronometers/index.js:compose()`** — Already passes `opts` to all modules. Location system just needs to feed into this.

### Established Patterns
- **Module interface pattern** — Each chronometer exports `compute(date, opts)`. Location opts are `latitude` and `longitude` numbers.
- **Update interval** — Clock updates every ~864ms (1 beat). New location system should trigger re-render on location change.
- **Error handling** — Current code uses `console.warn` for geolocation failures. Should maintain this pattern.

### Integration Points
- **Replace `navigator.geolocation` bootstrap** in `src/index.js` (lines 24-44) with new location system
- **Location object format** — Should match current `{ latitude, longitude }` shape for compatibility with solar.js
- **Clock update trigger** — Location change should call `updateClock(newLocation)` and update the interval

</code_context>

<deferred>
## Deferred Ideas

- Cross-timezone comparison view (Phase 4: Datetime Converters)
- Location export/import for backup — can add if users request
- Reverse geocoding (lat/lon → city name) — not needed yet
- Map-based location picker — could be nice but out of scope

</deferred>

---

*Phase: 03-location-system*
*Context gathered: 2026-04-13*
