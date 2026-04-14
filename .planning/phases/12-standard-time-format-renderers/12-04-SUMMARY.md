# Plan 12-04 Summary: Meridian Selector Component + CSS + Tests

## Status: COMPLETE

## What was built

- `src/formats/renderers/stdtime/meridian-select.js` — pure DOM factory exporting `createMeridianSelector(opts)`. Returns `{ element, getValue, setValue }`. Format-aware presets (24h, decimal, longitudinal), auto-snap on setValue, onChange callback contract, custom input panel with error validation.
- `src/formats/renderers/stdtime/meridian-select.css` — glassmorphic dark UI styles: `.meridian-selector`, `.meridian-preset-select`, `.meridian-custom-panel`, `.meridian-custom-input`, `.meridian-custom-error`, `.meridian-input--invalid`.
- `tests/formats/renderers/stdtime/meridian-select.test.js` — 27 tests covering factory shape, initial state, format presets (24h/decimal/longitudinal), onChange contract, custom input validation, setValue snap logic, and format switching.

## Key fix during execution

The test file required `// @vitest-environment jsdom` explicitly because sibling test files (24h, decimal, longitudinal) all use `// @vitest-environment node`. Without the explicit annotation, vitest reused the node environment (0ms environment setup time), causing `document is not defined`. Adding the explicit annotation forces a fresh jsdom environment (400ms setup).

## Test results

```
Tests  27 passed (27)
```

## Files changed

- `src/formats/renderers/stdtime/meridian-select.js` (created)
- `src/formats/renderers/stdtime/meridian-select.css` (created)
- `tests/formats/renderers/stdtime/meridian-select.test.js` (created)
