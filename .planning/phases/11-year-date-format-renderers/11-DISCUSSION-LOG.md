# Phase 11: Year & Date Format Renderers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-14
**Phase:** 11-year-date-format-renderers
**Areas discussed:** Holocene year display, Meghalayan renderer output, Custom epoch display format, Longitudinal date format, Year boundary (DATE-04), Chinese date display, Day +/- indicator

---

## Holocene Year Display

| Option | Description | Selected |
|--------|-------------|----------|
| H{year} — prefix only | Prefix only: 'H12026'. Matches the existing stub exactly. Clean and concise. | ✓ |
| {year} HE — suffix | Suffix only: '12026 HE'. More common in writing ('Holocene Era'). | |
| Plain number — no label | No label: just '12026'. User knows which format they selected. | |

**User's choice:** `H{year}` prefix only — confirmed the stub default is correct.
**Notes:** Simple, clean. Consistent with existing stub.

---

## Meghalayan Renderer Output

| Option | Description | Selected |
|--------|-------------|----------|
| Use .label from chronometer | Returns 'Mgh 4226', 'Nrg 4001', 'Ghg 3501'. Handles all stages automatically. | |
| Custom abbreviations, no space | Format own string with custom abbreviations. | ✓ |

**User's choice:** Custom formatting with specific abbreviations — NOT using `.label` from the chronometer.
**Notes:** User specified exact abbreviations and formatting:
- Meghalayan → `Mgh` (same as chronometer)
- Northgrippian → `Ngp` (chronometer uses `Nrg` — override)
- Greenlandian → `Grn` (chronometer uses `Ghg` — override)
- No space between abbreviation and year: `Mgh4226`, `Ngp4001`, `Grn3501`

---

## Custom Epoch Display Format

| Option | Description | Selected |
|--------|-------------|----------|
| Plain number — no prefix | Just the year number: '1', '42', '2026'. | |
| ε{year} — greek epsilon prefix | 'ε142'. Distinguishes from Gregorian. | |
| Y{year} — Y prefix (stub default) | 'Y42'. Simple flag. | ✓ (fallback) |
| CE{year} — match chronometer output | 'CE42'. Re-use what compute() already outputs. | |

**User's choice:** `Y{year}` as the fallback default — but the renderer should be designed for future extensibility.
**Notes:** The epoch customizer (Phase 14) will allow users to define their own label string and position (prefix or suffix). The renderer should accept `opts.customLabel` and `opts.customLabelPosition` and apply them when present. When absent, fall back to `Y` prefix.

---

## Longitudinal Date Format

| Option | Description | Selected |
|--------|-------------|----------|
| ☉ 24° ☽ 180° — symbols, no leading zeros | Strip prefixes, no zero-padding. | |
| ☉ 024° ☽ 180° — 3-digit zero-padded | Keep leading zeros for consistent 3-digit width. | ✓ |
| 24° / 180° — plain degrees | No astronomical symbols. | |

**User's choice:** `☉ 024° ☽ 180°` — 3-digit zero-padded, with ☉ and ☽ symbols.
**Notes:** The chronometer returns strings like `'SL024'` and `'LP180'`. The renderer strips the `SL`/`LP` prefixes and uses the numeric portion (with zero-padding preserved). Error fallback `'SL??'`/`'LP??'` renders as `☉ ???° ☽ ???°`.

---

## Year Boundary (DATE-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Defer to Phase 14 — renderers are pure | Renderers just render; wiring in Phase 14. | |
| Date renderers export boundary helpers | Export getBoundaryDate() for year system to consume. | |
| Shared yearBoundary.js module | More modular but extra complexity. | |
| Date system computes effectiveYear, Year adds offset | Clean architecture: pipeline computes effective year, renderers apply offset. | ✓ |

**User's choice:** Date system computes effective year; year renderers apply epoch offsets.
**Notes (from follow-up discussion):** 
- The year tick boundary is determined by the active **Date** format, not the Year format
- Gregorian date → Jan 1; Chinese date → CNY; Longitudinal date → Spring Equinox
- Additionally, the Standard Time meridian offset can push the date across midnight, so the effective date depends on both the Date format AND Standard Time configuration
- Year renderers accept `data.effectiveYear` (set by pipeline). If absent, fall back to compose() values
- Full pipeline wiring (including Standard Time → effective date) is Phase 14 work

---

## Chinese Date Display

| Option | Description | Selected |
|--------|-------------|----------|
| M{month} D{day} for normal, M{month}X D{day} for intercalary | Stub default format. | |
| MX D{day} for intercalary — no month number | When month is intercalary, omit the number entirely. | ✓ |

**User's choice:** `MX D{day}` for intercalary months — no number when the month is a leap/intercalary month.
**Notes:** Normal months: `M6 D15`. Intercalary months: `MX D15` (not `M6X D15`). The `X` alone indicates intercalary status.

---

## Day +/- Indicator

| Option | Description | Selected |
|--------|-------------|----------|
| +1/-1 suffix on day | Append +1 or -1 when meridian offset shifts the date. | |
| No suffix — show offset date directly | The date shown always reflects the effective date after offset. | |
| Switch date + small indicator | Show offset date with ● or * to flag difference. | |
| + / - suffix (no number) | Single character suffix showing direction of divergence. | ✓ |

**User's choice:** Single `+` or `-` suffix — no number, just direction.
**Notes (from detailed discussion):**
- Standard Time is the authoritative date source. The displayed date reflects Standard Time, not UTC or local solar time.
- `+` = local solar date is **ahead** of the standard date (user is east of meridian — they've already crossed midnight locally but standard hasn't yet). Example: `4/14+`
- `-` = local solar date is **behind** the standard date (standard has already crossed to the next day, but user's local solar time hasn't). Example: `4/15-`
- Longitudinal date renderer does NOT use this indicator — angular positions don't have day concepts
- `opts.solarDateDiffsStdDate: 'ahead' | 'behind'` flag is set by Phase 14 pipeline. Absent/falsy = no suffix.

---

## Claude's Discretion

- Exact error fallback value choice within the `'??'` family
- Helper function naming and structure within renderer files
- Whether to use `parseInt()` or regex to strip chronometer prefixes (`SL`/`LP`)
- Test case selection (specific dates and edge cases)
- Whether to use `Object.freeze()` on any constants

## Deferred Ideas

- Custom epoch label/position UI — Phase 14 work; API (`opts.customLabel`, `opts.customLabelPosition`) is defined in Phase 11 but UI input is Phase 14
- `data.effectiveYear` pipeline wiring — Phase 14
- `opts.solarDateDiffsStdDate` computation logic — Phase 14
- Year boundary tick date helpers for Phase 14 orchestration layer
