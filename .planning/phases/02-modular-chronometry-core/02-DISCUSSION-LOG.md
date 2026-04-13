# Phase 2: Modular Chronometry Core - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 02-modular-chronometry-core
**Areas discussed:** Display format transition, Module error handling, Composer configurability, Test strategy

---

## Display Format Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Immediate switch | Once all modules are extracted, flip the display format in one commit. Old format disappears. | ✓ |
| Toggle-able via config | Add config flag to switch between old and new formats for comparison/testing | |
| Both formats visible | Show both old and new simultaneously (two lines) | |

**User's choice:** Immediate switch — old format replaced in one commit, oldSystem.js stays in code but produces no visible output.

---

## Module Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Per-module graceful degradation | Each module wrapped in try/catch in composer. Failing module returns fallback string, rest of clock renders normally. | ✓ |
| Fail fast — whole clock breaks | No error wrapping. If a module throws, the clock stops (current behavior). | |

**User's choice:** Per-module graceful degradation — failing modules return fallback string (like `??` or `E!`), with console.warn logging for developer diagnosis.

---

## Composer Configurability

| Option | Description | Selected |
|--------|-------------|----------|
| Simple hard-coded imports | Import the 4 active modules directly. Adding/removing = editing one import line. Defer config-driven to later. | ✓ |
| Config-driven from the start | Build settings object pattern now: `{ modules: ['holocene', 'beats', ...] }`. Foundation for REFACTOR-02 immediately. | |
| Hybrid — simple now, easy to extend | Hard-coded imports now, but structure return object so config-driven conversion later is trivial. | |

**User's choice:** Simple hard-coded imports — defer config-driven pattern to REFACTOR-02 swappable systems work.

---

## Test Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Vitest — lightweight, ESM-native | ~30KB dev dep, fast, zero config, works with Webpack. Unit test per module. | ✓ |
| No test framework — inline verification | Skip test framework. Add verification scripts that run known dates through modules. | |
| Jest — battle-tested but heavier | Established standard but ~500KB dependencies. Overkill for 5 pure functions. | |

**User's choice:** Vitest with unit tests per module + one integration test for composer.

| Follow-up | Description | Selected |
|-----------|-------------|----------|
| Unit + integration | Test each chronometer with known dates, plus integration test for composer output | ✓ |
| Unit tests only | Test compute() functions in isolation, skip composer integration test | |

---

## Claude's Discretion

The following areas were deferred to Claude's judgment:
- Exact test fixture dates and expected values (researcher should derive from library output)
- Vitest configuration details (config file location, coverage thresholds)
- Whether to add a `npm test` script alongside existing scripts
- Exact fallback string format for error handling (`'??'`, `'E!'`, `'--'` — pick consistently)

## Deferred Ideas

- Config-driven composer — deferred to REFACTOR-02 implementation
- Toggle-able display format — not needed with immediate switch
- Both formats visible simultaneously — deferred to Phase 5 if desired
