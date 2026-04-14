---
phase: 11
status: issues_found
depth: standard
files_reviewed: 15
findings:
  critical: 1
  warning: 4
  info: 3
  total: 8
---

# Code Review — Phase 11: Year & Date Format Renderers

Reviewed 7 source files and 8 test files covering Chinese, Gregorian, and Longitudinal date renderers, plus Custom, Gregorian, Holocene, and Meghalayan year renderers.

---

## Findings

### CR-001: gregorian date renderer can throw on non-Date `data.now` (critical)

**File:** `src/formats/renderers/date/gregorian.js:23`

**Issue:** The nullish coalescing operator `??` only guards against `null`/`undefined`. If `data.now` is any other non-Date value (e.g., a number `0`, a string, a plain object), the expression `data?.now ?? new Date()` resolves to that non-Date value, and the subsequent `.getUTCMonth()` call throws a `TypeError`. This violates the "never throws" contract.

```js
// Current — throws if data.now is 0, '', {}, etc.
const now = data?.now ?? new Date();
const month = now.getUTCMonth() + 1;
```

**Fix:** Guard with an `instanceof Date` check:

```js
const now = (data?.now instanceof Date) ? data.now : new Date();
```

---

### CR-002: `holocene.js` renders `'HNaN'` when `effectiveYear` is `NaN` (warning)

**File:** `src/formats/renderers/year/holocene.js:16`

**Issue:** `NaN != null` is `true`, so when `data.effectiveYear` is `NaN` the renderer enters the `effectiveYear` branch and returns `'H' + (NaN + 9700)` = `'HNaN'`. This is not the documented error token `'H??'` and looks broken to the user.

```js
// NaN != null → true, but NaN + 9700 = NaN
if (data?.effectiveYear != null) {
  return `H${data.effectiveYear + 9700}`;
}
```

**Fix:** Add an `isNaN` guard:

```js
if (data?.effectiveYear != null && !isNaN(data.effectiveYear)) {
  return `H${data.effectiveYear + 9700}`;
}
```

---

### CR-003: `meghalayan.js` renders `'Mgh NaN'`-equivalent when `effectiveYear` is `NaN` (warning)

**File:** `src/formats/renderers/year/meghalayan.js:55`

**Issue:** Same root cause as CR-002. `NaN != null` is `true`, so `computeStageFromYear(NaN)` is called. All comparisons with `NaN` return `false`, so the function falls through all `if` branches and returns the `greenlandian` result: `{ stage: 'greenlandian', year: NaN + 9700 }` = `'GrnNaN'`.

**Fix:** Align with the holocene fix — guard before delegating:

```js
if (data?.effectiveYear != null && !isNaN(data.effectiveYear)) {
  const result = computeStageFromYear(data.effectiveYear);
  ...
}
```

---

### CR-004: `longitudinal.js` silently outputs malformed strings for non-standard prefixed values (warning)

**File:** `src/formats/renderers/date/longitudinal.js:33`

**Issue:** The renderer only checks for the exact sentinel strings `'SL??'` and `'LP??'`. Any other non-standard value (e.g., `'SL'`, `'SL1'`, `'SL12'`) is passed through `slice(2)` verbatim, producing output with the wrong character-width digit field (e.g., `'☉ °'`, `'☉ 1°'`). The renderer does not throw, but the output silently violates the documented 3-digit width contract.

**Fix:** Validate the stripped value is exactly 3 characters (or falls back to `'???'`):

```js
function extractAngle(raw, prefix, errorSentinel) {
  if (!raw || raw === errorSentinel) return '???';
  const stripped = raw.slice(prefix.length);
  return stripped.length === 3 ? stripped : '???';
}
```

---

### CR-005: `custom.js` duplicates the `label` variable (info)

**File:** `src/formats/renderers/year/custom.js:42`

**Issue:** `label` is assigned in the error fallback block (line 42) and then assigned again identically on line 46 after the block. This is harmless dead work but adds noise.

```js
// line 42 — error path only
const label = opts.customLabel ?? 'Y';
return `${label}??`;

// line 46 — success path
const label = opts.customLabel ?? 'Y';  // ← identical declaration
```

**Fix:** Hoist `label` once before the conditional:

```js
const label = opts.customLabel ?? 'Y';
if (year == null) return `${label}??`;
const pos = opts.customLabelPosition ?? 'prefix';
return pos === 'suffix' ? `${year}${label}` : `${label}${year}`;
```

---

### CR-006: Test gap — `gregorian.js` date renderer not tested with `render(null)` (info)

**File:** `tests/formats/renderers/date/gregorian.test.js`

**Issue:** All other renderers have an explicit `render(null)` test. The gregorian date renderer has no such test. It currently works (optional chaining produces `undefined`, `??` falls back to `new Date()`), but the test gap means any regression in null-safety would go undetected — especially since CR-001 exists.

**Fix:** Add:
```js
it('falls back to new Date() when data is null', () => {
  const result = render(null);
  expect(result).toMatch(/^\d{1,2}\/\d{1,2}$/);
});
```

---

### CR-007: Test gap — unknown stage string in `meghalayan.js` not tested (info)

**File:** `tests/formats/renderers/year/meghalayan.test.js`

**Issue:** The fallback path `STAGE_ABBR[stage]` returns `undefined` for an unrecognised stage, causing `!abbr` to return `'??'`. This defensive path is not tested. An upstream change adding a new stage key would silently produce `'??'` without a failing test to signal the renderer needs updating.

**Fix:** Add:
```js
it('renders ?? for an unknown stage string', () => {
  expect(render({ meghalayan: { stage: 'unknown-stage', year: 100 } })).toBe('??');
});
```

---

### CR-008: Test gap — malformed `data.now` (non-Date object) not tested for gregorian date renderer (warning)

**File:** `tests/formats/renderers/date/gregorian.test.js`

**Issue:** Related to CR-001. There is no test that passes a non-Date value as `data.now` (e.g., `{ now: 0 }` or `{ now: 'not-a-date' }`), so the throw documented in CR-001 is not caught by the test suite. After fixing CR-001, a regression test should be added.

**Fix:** After applying the CR-001 fix, add:
```js
it('falls back to new Date() when data.now is not a Date', () => {
  expect(render({ now: 0 })).toMatch(/^\d{1,2}\/\d{1,2}$/);
  expect(render({ now: 'not-a-date' })).toMatch(/^\d{1,2}\/\d{1,2}$/);
});
```

---

## Summary

| ID | Severity | File | Description |
|----|----------|------|-------------|
| CR-001 | critical | `date/gregorian.js:23` | Non-Date `data.now` causes a throw — violates never-throws contract |
| CR-002 | warning | `year/holocene.js:16` | `NaN` effectiveYear renders `'HNaN'` instead of `'H??'` |
| CR-003 | warning | `year/meghalayan.js:55` | `NaN` effectiveYear renders `'GrnNaN'` instead of `'??'` |
| CR-004 | warning | `date/longitudinal.js:33` | Malformed SL/LP strings produce wrong-width output silently |
| CR-005 | info | `year/custom.js:42` | `label` variable declared twice — minor duplication |
| CR-006 | info | `tests/date/gregorian.test.js` | Missing `render(null)` test |
| CR-007 | info | `tests/year/meghalayan.test.js` | Unknown stage string not tested |
| CR-008 | warning | `tests/date/gregorian.test.js` | Missing test for non-Date `data.now` (needed to cover CR-001 fix) |

The overall quality is high. Most renderers are well-structured with good guard coverage. The one critical issue (CR-001) is a real throw on bad input that violates the stated contract and should be fixed before shipping.
