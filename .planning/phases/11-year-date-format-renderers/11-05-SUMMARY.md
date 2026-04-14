# Plan 11-05 Summary: Custom Epoch Year Renderer

**Phase:** 11-year-date-format-renderers
**Plan:** 05
**Status:** Complete
**Executed:** 2026-04-14

---

## Objective

Replace the stub body in `src/formats/renderers/year/custom.js` with a full implementation that correctly reads the year from `data.customEpoch` (stripping the `CE` prefix), supports `effectiveYear` override, and supports custom label prefix/suffix via opts.

---

## Tasks Executed

### Task 11-05-01: Implement custom.js renderer

**File modified:** `src/formats/renderers/year/custom.js`

**What was changed:**
- Replaced the 10-line stub (`return \`Y${data?.customEpoch ?? '??'}\``) with a 50-line full implementation
- Added JSDoc documentation covering all parameter options and computation priority

**Key implementation details:**
- **Priority 1:** When `data.effectiveYear != null` AND `opts.customEpoch instanceof Date` (and is valid), computes `year = data.effectiveYear - opts.customEpoch.getUTCFullYear() + 1`
- **Priority 2:** When `data.customEpoch` is a string and not `'CE??'`, strips the `CE` prefix with `.slice(2)` and parses with `parseInt(..., 10)` — e.g., `'CE7'` → `7`
- **Error fallback:** When neither source yields a valid year, returns `${opts.customLabel ?? 'Y'}??` — e.g., `'Y??'` or `'Era??'`
- **Label system:** `opts.customLabel` replaces the default `'Y'`; `opts.customLabelPosition` controls prefix (default) vs suffix placement

**Commit:** `feat(11-05): implement custom epoch year renderer with CE prefix stripping and label options`

---

## Test Results

```
npx vitest run tests/formats/renderers/year/custom.test.js

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

All 9 test cases passed:
1. `render({ customEpoch: 'CE7' })` → `'Y7'` ✓
2. `render({ customEpoch: 'CE1' })` → `'Y1'` ✓
3. `render({ customEpoch: 'CE??' })` → `'Y??'` ✓
4. `render({})` → `'Y??'` ✓
5. `render(null)` → `'Y??'` ✓
6. `render({ effectiveYear: 2026 }, { customEpoch: new Date(Date.UTC(2020, 0, 1)) })` → `'Y7'` ✓
7. `render({ customEpoch: 'CE7' }, { customLabel: 'Era' })` → `'Era7'` ✓
8. `render({ customEpoch: 'CE7' }, { customLabel: 'Era', customLabelPosition: 'suffix' })` → `'7Era'` ✓
9. `render({}, { customLabel: 'Era' })` → `'Era??'` ✓

---

## Acceptance Criteria Verification

- [x] `src/formats/renderers/year/custom.js` contains `export function render(data, opts = {})`
- [x] File contains `opts.customEpoch instanceof Date`
- [x] File contains `data.customEpoch.slice(2)`
- [x] File contains `parseInt(data.customEpoch.slice(2), 10)`
- [x] File contains `data.customEpoch !== 'CE??'`
- [x] File contains `opts.customLabel ?? 'Y'`
- [x] File contains `opts.customLabelPosition ?? 'prefix'`
- [x] File does NOT contain `` `Y${year}` `` hardcoded
- [x] `npx vitest run tests/formats/renderers/year/custom.test.js` exits 0

---

## Must-Haves Verification

- [x] `render({ customEpoch: 'CE7' })` returns `'Y7'` (CE prefix stripped, Y prefix applied)
- [x] `render({ customEpoch: 'CE??' })` returns `'Y??'` (error string handled)
- [x] `render({ effectiveYear: 2026 }, { customEpoch: new Date(Date.UTC(2020, 0, 1)) })` returns `'Y7'`
- [x] `render({ customEpoch: 'CE7' }, { customLabel: 'Era', customLabelPosition: 'suffix' })` returns `'7Era'`
- [x] `render(null)` returns `'Y??'` without throwing
- [x] All custom epoch year renderer tests pass
