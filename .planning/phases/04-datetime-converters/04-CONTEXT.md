# Phase 4: Datetime Converters — Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Build bidirectional converters between Gregorian datetime and Beat Clock time systems (Holocene, Beats, Solar, Lunisolar). Provide a separate converter panel UI where users can input any date+time and see what the Beat Clock would show, or input Beat Clock values and find the approximate Gregorian time. Cross-timezone comparison using saved locations from Phase 3. Historical date lookup for any date.

Multi-location comparison views and converters are this phase — location management is Phase 3 (already complete).

</domain>

<decisions>
## Implementation Decisions

### Converter UI
- **D-01:** Separate panel below the clock — converters don't compete with the ambient clock display
- **D-02:** Clock remains the default/primary view — converter panel is secondary

### Historical date lookup
- **D-03:** Any date supported — past and future, no artificial range limits
- **D-04:** Edge cases handled with disclaimers (pre-Gregorian dates, far future dates)

### Time specification
- **D-05:** Users specify both date AND time for conversions — beats and solar are time-dependent
- **D-06:** Date+time picker in converter UI — not just date-only

### Reverse conversion
- **D-07:** Reverse conversion returns best-effort Gregorian datetime with disclaimer about ambiguity
- **D-08:** Users understand that multiple Gregorian times can map to the same converter value

### Cross-timezone comparison
- **D-09:** Uses saved locations from Phase 3 store — no separate location system needed
- **D-10:** Users select which saved locations to compare side-by-side

</decisions>

<specifics>
## Specific Ideas

- Converter panel should feel like a tool, not a dashboard — clean inputs, clear outputs
- Historical lookup: "What did the clock show on July 20, 1969 at 20:17 UTC?"
- Reverse conversion: "What Gregorian time was @500.00 on H12026?" → approximate answer with "±X hours" disclaimer
- Cross-timezone: "Right now in London it's @500.00, in Tokyo it's @583.33" — show beat differences
- All converters reuse existing chronometer modules — no duplicate calculation logic
</specifics>

<canonical_refs>
## Canonical References

### Requirements
- `.planning/ROADMAP.md` — Phase 4: Datetime Converters
- `.planning/PROJECT.md` — CONVERT-01, CONVERT-02, CONVERT-03

### Existing code (reusable)
- `src/chronometers/index.js` — Composer calls each module with `compute(date, opts)`
- `src/chronometers/holocene.js` — `compute(date, opts)` → Holocene year
- `src/chronometers/beats.js` — `compute(date, opts)` → beats string (@XXX.XX)
- `src/chronometers/solar.js` — `compute(date, opts)` → solar percent (SXX/NXX)
- `src/chronometers/lunisolar.js` — `compute(date, opts)` → { month, day, isLeap }
- `src/location/store.js` — Saved locations for cross-timezone comparison
- `src/index.js` — Current entry point, updateClock pattern

### Integration points
- Converters call chronometer `compute()` functions directly — no need to modify modules
- Cross-timezone uses store.getLocations() and store.getActiveLocation()
- Historical lookup: user picks date+time → call compose() with that date
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Chronometer `compute(date, opts)` pattern** — Each module already accepts arbitrary Date objects. No modification needed for historical lookups.
- **Composer `compose(date, opts)`** — Already calls all modules with try/catch. Can be reused for any date, not just "now".
- **Location store** — Phase 3 saved locations available via `loadLocations()`, `getActiveLocation()`.
- **updateClock() pattern** — Renders clock display. Converters can use same formatting logic.

### What converters need to build
- **Gregorian → Beat Clock**: Call compose(date, opts) → format output. Already works, just needs UI.
- **Beat Clock → Gregorian**: Need new logic — beats are one-way (UTC+1 based, no inverse function in codebase).
- **Cross-timezone**: Call compose() for multiple locations at same instant → compare outputs.
- **Historical**: Just compose() with a user-specified Date instead of new Date().

### Established Patterns
- **Module interface** — `compute(date, opts)` returns formatted string or object. Consistent across all modules.
- **Composer error handling** — try/catch per module, returns '??' on failure.
- **Update interval** — 864ms (1 beat). Converters don't need intervals — one-shot calculations.
</code_context>

<deferred>
## Deferred Ideas

- Converter export/share — "share this conversion" feature
- Batch conversion — convert a list of dates at once
- Calendar view showing Beat Clock values over a month/year
- Timezone converter for standard timezone times (not Beat Clock locations)
- Converter history — remember recent conversions
</deferred>

---

*Phase: 04-datetime-converters*
*Context gathered: 2026-04-13*
