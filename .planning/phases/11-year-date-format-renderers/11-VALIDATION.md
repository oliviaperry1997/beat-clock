---
phase: 11
slug: year-date-format-renderers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (globals: true, jsdom environment) |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/formats/` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/formats/`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 0 | YEAR-01 | — | N/A | unit | `npx vitest run tests/formats/renderers/year/holocene.test.js` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 0 | YEAR-02 | — | N/A | unit | `npx vitest run tests/formats/renderers/year/gregorian.test.js` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 0 | YEAR-03 | — | N/A | unit | `npx vitest run tests/formats/renderers/year/meghalayan.test.js` | ❌ W0 | ⬜ pending |
| 11-01-04 | 01 | 0 | YEAR-04 | — | N/A | unit | `npx vitest run tests/formats/renderers/year/custom.test.js` | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 0 | DATE-01 | — | N/A | unit | `npx vitest run tests/formats/renderers/date/gregorian.test.js` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 0 | DATE-02 | — | N/A | unit | `npx vitest run tests/formats/renderers/date/chinese.test.js` | ❌ W0 | ⬜ pending |
| 11-02-03 | 02 | 0 | DATE-03 | — | N/A | unit | `npx vitest run tests/formats/renderers/date/longitudinal.test.js` | ❌ W0 | ⬜ pending |
| 11-02-04 | 02 | 0 | DATE-04 | — | N/A | integration | `npx vitest run tests/formats/renderers/date/year-boundary.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/formats/renderers/year/holocene.test.js` — stubs for YEAR-01
- [ ] `tests/formats/renderers/year/gregorian.test.js` — stubs for YEAR-02
- [ ] `tests/formats/renderers/year/meghalayan.test.js` — stubs for YEAR-03
- [ ] `tests/formats/renderers/year/custom.test.js` — stubs for YEAR-04
- [ ] `tests/formats/renderers/date/gregorian.test.js` — stubs for DATE-01
- [ ] `tests/formats/renderers/date/chinese.test.js` — stubs for DATE-02
- [ ] `tests/formats/renderers/date/longitudinal.test.js` — stubs for DATE-03
- [ ] `tests/formats/renderers/date/year-boundary.test.js` — stubs for DATE-04

*All 8 test files must exist (even as stubs) before Wave 1 implementation begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual clock display in browser | DATE-01..04 | Requires browser rendering | Run `npm start`, set display format to each date/year type, verify output looks correct |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
