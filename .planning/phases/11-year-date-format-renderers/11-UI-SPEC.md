---
phase: 11
slug: year-date-format-renderers
status: draft
shadcn_initialized: false
preset: none
created: 2026-04-14
---

# Phase 11 — UI Design Contract: Year & Date Format Renderers

> Output format contract for renderer string functions. These renderers produce strings, not DOM elements.
> Sections covering CSS, component libraries, and Tailwind are marked "not applicable — renderer outputs strings, not DOM elements."

---

## Design System

| Property | Value |
|----------|-------|
| Tool | not applicable — renderer outputs strings, not DOM elements |
| Preset | not applicable — renderer outputs strings, not DOM elements |
| Component library | not applicable — renderer outputs strings, not DOM elements |
| Icon library | not applicable — renderer outputs strings, not DOM elements |
| Font | not applicable — renderer outputs strings, not DOM elements |

---

## Spacing Scale

not applicable — renderer outputs strings, not DOM elements

---

## Typography

not applicable — renderer outputs strings, not DOM elements

---

## Color

not applicable — renderer outputs strings, not DOM elements

---

## Output String Format Contracts

Each renderer exports `render(data, opts = {}) → string`. This section is the authoritative specification for what those strings look like.

### Year Renderers

#### `year/holocene` — YEAR-01

| Input condition | Output string | Example |
|-----------------|--------------|---------|
| Normal year via `data.holocene` | `H{year}` | `H12026` |
| `data.effectiveYear` present | `H{effectiveYear + 9700}` | `H11725` |
| Pre-Holocene (`data.holocene === '??'`) | `H??` | `H??` |
| Null / missing data | `H??` | `H??` |

- Prefix: `H` (no space between prefix and year)
- No zero-padding on the year number
- `effectiveYear` takes precedence over `data.holocene` when both are present

#### `year/gregorian` — YEAR-02

| Input condition | Output string | Example |
|-----------------|--------------|---------|
| Normal year via `data.now` | `{YYYY}` | `2026` |
| `data.effectiveYear` present | `{effectiveYear}` | `2025` |
| No `data.now`, no `effectiveYear` | Falls back to `new Date().getUTCFullYear()` | `2026` |

- Plain integer string — no prefix, no suffix, no padding
- Always uses UTC year (`getUTCFullYear()`) for consistency with all other modules
- `effectiveYear` takes precedence over `data.now` when both are present

#### `year/meghalayan` — YEAR-03

| Input condition | Output string | Example |
|-----------------|--------------|---------|
| Meghalayan stage | `Mgh{year}` | `Mgh4226` |
| Northgrippian stage | `Ngp{year}` | `Ngp3327` |
| Greenlandian stage | `Grn{year}` | `Grn1701` |
| Pre-Holocene stage | `—` (em dash) | `—` |
| `data.effectiveYear` present | Re-compute stage + year from `effectiveYear` | `Mgh4226` |
| Missing / invalid data | `??` | `??` |

- No space between abbreviation and year number (e.g., `Mgh4226` not `Mgh 4226`)
- The renderer **ignores** `data.meghalayan.label` — formats its own string with the abbreviations above
- The chronometer uses different abbreviations (`Nrg`, `Ghg`); the renderer uses `Ngp`, `Grn`
- Pre-Holocene is the only case that outputs a non-`{prefix}{number}` string

#### `year/custom` — YEAR-04

| Input condition | Output string | Example |
|-----------------|--------------|---------|
| Default (no `opts.customLabel`) | `Y{year}` | `Y42` |
| `opts.customLabel = 'Era'`, prefix position | `Era{year}` | `Era42` |
| `opts.customLabel = 'Era'`, suffix position | `{year}Era` | `42Era` |
| No epoch, no `effectiveYear` | `Y??` | `Y??` |
| `opts.customLabel` set, no data | `{customLabel}??` | `Era??` |

- Default prefix: `Y` (single uppercase letter)
- `opts.customLabel` (string, optional): replaces `Y` with the given label
- `opts.customLabelPosition` (`'prefix'` | `'suffix'`, optional): controls label placement; defaults to `'prefix'`
- Year integer sourced from: (1) `data.effectiveYear - opts.customEpoch.getUTCFullYear() + 1` when both present, (2) integer parsed from `data.customEpoch` string after stripping `CE` prefix
- `CE??` error string from chronometer → renderer returns `Y??` (or `{customLabel}??`)

---

### Date Renderers

#### `date/gregorian` — DATE-01

| Input condition | Output string | Example |
|-----------------|--------------|---------|
| Normal date | `{M}/{D}` | `4/14` |
| Solar ahead of standard meridian | `{M}/{D}+` | `4/14+` |
| Solar behind standard meridian | `{M}/{D}-` | `4/15-` |
| No `data.now` | Falls back to `new Date()` | `4/14` |

- Month and day: no zero-padding
- Separator: `/` (forward slash)
- Source date: `data.now ?? new Date()` — Phase 14 injects `data.now` as effective meridian time
- UTC methods used: `getUTCMonth() + 1`, `getUTCDate()`

#### `date/chinese` — DATE-02

| Input condition | Output string | Example |
|-----------------|--------------|---------|
| Normal (non-intercalary) month | `M{month} D{day}` | `M6 D15` |
| Intercalary (leap) month | `MX D{day}` | `MX D15` |
| Normal month + solar ahead | `M{month} D{day}+` | `M6 D15+` |
| Intercalary month + solar behind | `MX D{day}-` | `MX D1-` |
| Missing / null `data.lunisolar` | `??` | `??` |
| `data.lunisolar = '??'` (error string) | `??` | `??` |
| Missing month or day field | `??` | `??` |

- Month token: `M{number}` for normal months, `MX` (literal X, no number) for intercalary/leap months
- Day token: `D{number}` — no zero-padding
- Space separator between month and day tokens
- Leap month: `isLeap === true` in `data.lunisolar` — display `MX`, not `M{n}X`

#### `date/longitudinal` — DATE-03

| Input condition | Output string | Example |
|-----------------|--------------|---------|
| Both angles available | `☉ {SL}° ☽ {LP}°` | `☉ 024° ☽ 180°` |
| Solar longitude error | `☉ ???° ☽ {LP}°` | `☉ ???° ☽ 180°` |
| Lunar phase error | `☉ {SL}° ☽ ???°` | `☉ 024° ☽ ???°` |
| Both errors / missing data | `☉ ???° ☽ ???°` | `☉ ???° ☽ ???°` |

- Solar longitude symbol: ☉ (U+2609 SUN)
- Lunar phase symbol: ☽ (U+263D FIRST QUARTER MOON)
- Degree symbol: ° (U+00B0 DEGREE SIGN)
- Both angles: zero-padded 3 digits (e.g., `024`, `000`, `360`)
- No day +/- indicator — angles are angular positions, not calendar dates
- Error token: `???` (three question marks) replaces the 3-digit padded angle

---

## Symbol Vocabulary

| Symbol | Unicode | Name | Used in |
|--------|---------|------|---------|
| ☉ | U+2609 | SUN | `date/longitudinal` solar longitude |
| ☽ | U+263D | FIRST QUARTER MOON | `date/longitudinal` lunar phase angle |
| ° | U+00B0 | DEGREE SIGN | `date/longitudinal` angle unit |
| — | U+2014 | EM DASH | `year/meghalayan` pre-Holocene fallback |
| H | ASCII | Holocene prefix | `year/holocene` |
| Y | ASCII | Custom epoch default prefix | `year/custom` |
| Mgh | ASCII | Meghalayan stage abbreviation | `year/meghalayan` |
| Ngp | ASCII | Northgrippian stage abbreviation | `year/meghalayan` |
| Grn | ASCII | Greenlandian stage abbreviation | `year/meghalayan` |
| M | ASCII | Chinese month token | `date/chinese` |
| D | ASCII | Chinese day token | `date/chinese` |
| X | ASCII | Intercalary (leap) month indicator | `date/chinese` |
| + | ASCII | Solar date ahead of standard meridian | `date/gregorian`, `date/chinese` |
| - | ASCII | Solar date behind standard meridian | `date/gregorian`, `date/chinese` |

---

## Number Formatting

| Renderer | Field | Format | Zero-padding | Example |
|----------|-------|--------|-------------|---------|
| `year/holocene` | Year | Integer string | None | `H12026`, `H11725` |
| `year/gregorian` | Year | Integer string | None | `2026`, `2025` |
| `year/meghalayan` | Year | Integer string | None | `Mgh4226`, `Ngp3327` |
| `year/custom` | Year | Integer string | None | `Y42`, `Y1` |
| `date/gregorian` | Month | Integer string | None | `4`, `12` |
| `date/gregorian` | Day | Integer string | None | `14`, `1` |
| `date/chinese` | Month | Integer string | None | `M6`, `M12` |
| `date/chinese` | Day | Integer string | None | `D15`, `D1` |
| `date/longitudinal` | Solar longitude | 3-digit padded integer | Leading zeros to 3 digits | `024`, `000`, `360` |
| `date/longitudinal` | Lunar phase angle | 3-digit padded integer | Leading zeros to 3 digits | `180`, `090`, `000` |

Key rule: **All year numbers and calendar date numbers are unpadded integers.** Only longitudinal angles use zero-padding (fixed 3-digit width for consistent display alignment).

---

## Error / Missing Data String Formats

| Renderer | Error condition | Output |
|----------|----------------|--------|
| `year/holocene` | Missing data / pre-Holocene | `H??` |
| `year/gregorian` | No data (falls back to `new Date()`) | Current UTC year string (never errors) |
| `year/meghalayan` | Missing / invalid `data.meghalayan` | `??` |
| `year/meghalayan` | Pre-Holocene stage | `—` (em dash, not `??`) |
| `year/custom` | No epoch data, no `effectiveYear` | `Y??` |
| `year/custom` | `opts.customLabel` set, no data | `{customLabel}??` |
| `date/gregorian` | No `data.now` | Falls back to `new Date()` (never errors) |
| `date/chinese` | `data.lunisolar` is null, `'??'`, or malformed | `??` |
| `date/chinese` | Missing `month` or `day` field | `??` |
| `date/longitudinal` | `data.solarLongitude === 'SL??'` | `???` in solar position slot |
| `date/longitudinal` | `data.lunarPhase === 'LP??'` | `???` in lunar position slot |
| `date/longitudinal` | Both missing | `☉ ???° ☽ ???°` |

Invariants:
- Renderers **never throw** — all error paths return a string
- Error strings use `??` (double question mark) as the undefined-value token, consistent with chronometer error boundaries
- `year/meghalayan` pre-Holocene uses `—` (em dash) by convention to mean "before recordable time", not the generic `??` error
- `date/longitudinal` error token is `???` (three question marks) to maintain fixed 3-character width at the angle position

---

## Leap Month Notation

Chinese lunisolar calendar intercalary months (闰月, `isLeap === true`) use a distinct notation:

| Month type | Display format | Example |
|-----------|----------------|---------|
| Normal month (e.g., 6th month) | `M{number} D{day}` | `M6 D15` |
| Intercalary/leap month | `MX D{day}` | `MX D15` |

Rules:
- When `isLeap === true`, the month number is **dropped entirely** — replaced by the literal character `X`
- `MX` means "the intercalary month" — the `X` conveys "extra" or "exceptional"
- This applies regardless of which numerical month repeats (e.g., an intercalary 6th month and an intercalary 11th month both render as `MX`)
- The day number is never affected by the leap flag

Rationale: A user encountering `MX D15` during the intercalary period knows they are in the leap insertion between two normal months. Showing a month number would be ambiguous (is this the first or second occurrence of that month?).

---

## Year Boundary Transition Behavior

Renderers implement DATE-04 (year boundary transitions across calendar systems) via the `effectiveYear` pattern:

| Date format active | Year ticks on | `effectiveYear` injected at |
|-------------------|---------------|---------------------------|
| Gregorian date | Jan 1 (UTC, adjusted by meridian offset) | Phase 14 pipeline |
| Chinese date | Chinese New Year | Phase 14 pipeline |
| Longitudinal date | Spring Equinox (0° solar longitude) | Phase 14 pipeline |

Phase 11 renderer behavior:
- When `data.effectiveYear` is present → use it (ignore raw chronometer year values)
- When `data.effectiveYear` is absent → fall back to raw values from `compose()` output

This means renderers are DATE-04-ready in Phase 11, but full wiring (injection of `effectiveYear` based on active Date format) happens in Phase 14.

**Example transition at Chinese New Year 2026 (Feb 17, 2026 UTC):**
- Jan 15, 2026 UTC (before CNY): Phase 14 sets `effectiveYear = 2025`
  - Holocene renders: `H11725`
  - Gregorian renders: `2025`
  - Meghalayan renders: `Mgh4225`
- Feb 17, 2026 UTC (CNY and after): Phase 14 sets `effectiveYear = 2026`
  - Holocene renders: `H11726`
  - Gregorian renders: `2026`
  - Meghalayan renders: `Mgh4226`

---

## Day +/- Indicator Contract

Applies to `date/gregorian` and `date/chinese` only. Controlled by `opts.solarDateDiffsStdDate`.

| `opts.solarDateDiffsStdDate` value | Appended suffix | Meaning |
|------------------------------------|----------------|---------|
| `'ahead'` | `+` | Local solar date is ahead of standard meridian date (user is east of meridian) |
| `'behind'` | `-` | Local solar date is behind standard meridian date (user is west of meridian) |
| absent, `null`, `undefined`, `false`, `''` | *(none)* | Solar and standard dates are aligned |

Standard Time is the authoritative date source for display. The `+`/`-` indicator communicates divergence from that authority — it does NOT mean the date itself is wrong.

The `date/longitudinal` renderer intentionally omits this indicator: angles are angular positions, not calendar dates with a concept of "day".

Computation and injection of `opts.solarDateDiffsStdDate` is deferred to Phase 14. Phase 11 renderers accept and apply the flag but do not compute it.

---

## Renderer Function Signature Contract

```js
// All renderers in src/formats/renderers/year/ and src/formats/renderers/date/
export function render(data, opts = {}) → string

// data: output of compose() from src/chronometers/index.js, plus optional injected fields:
//   data.effectiveYear  — integer, injected by Phase 14 pipeline (optional)
//   data.now            — Date object, injected by Phase 14 pipeline (optional)

// opts: pipeline options (all optional)
//   opts.solarDateDiffsStdDate  — 'ahead' | 'behind' | falsy
//   opts.customEpoch            — Date object (for custom epoch year computation)
//   opts.customLabel            — string (custom epoch display label, default 'Y')
//   opts.customLabelPosition    — 'prefix' | 'suffix' (default 'prefix')
```

Invariants:
- Always returns a string
- Never throws
- No side effects
- No DOM access
- No I/O or async operations
- Pure function of `(data, opts)`

---

## Copywriting Contract

| Element | String |
|---------|--------|
| Holocene year normal | `H12026` |
| Gregorian year normal | `2026` |
| Meghalayan year (Meghalayan stage) | `Mgh4226` |
| Meghalayan year (Northgrippian stage) | `Ngp3327` |
| Meghalayan year (Greenlandian stage) | `Grn1701` |
| Meghalayan year (pre-Holocene) | `—` |
| Custom year (default prefix) | `Y42` |
| Gregorian date normal | `4/14` |
| Gregorian date solar ahead | `4/14+` |
| Gregorian date solar behind | `4/14-` |
| Chinese date normal | `M6 D15` |
| Chinese date leap month | `MX D15` |
| Chinese date leap month solar behind | `MX D15-` |
| Longitudinal date normal | `☉ 024° ☽ 180°` |
| Longitudinal date at origin | `☉ 000° ☽ 000°` |
| Longitudinal date full error | `☉ ???° ☽ ???°` |
| Generic error fallback | `??` |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| not applicable — renderer outputs strings, not DOM elements | — | — |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS — all output strings specified with canonical examples
- [x] Dimension 2 Visuals: not applicable — renderer outputs strings, not DOM elements
- [x] Dimension 3 Color: not applicable — renderer outputs strings, not DOM elements
- [x] Dimension 4 Typography: not applicable — renderer outputs strings, not DOM elements
- [x] Dimension 5 Spacing: not applicable — renderer outputs strings, not DOM elements
- [x] Dimension 6 Registry Safety: not applicable — renderer outputs strings, not DOM elements

**Approval:** approved 2026-04-14
