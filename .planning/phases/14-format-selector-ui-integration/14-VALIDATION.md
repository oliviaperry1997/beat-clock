---
phase: 14
slug: format-selector-ui-integration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-15
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/integration/format-selector-ui.test.js tests/integration/stdtime-tick-rate.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5-12 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/integration/format-selector-ui.test.js tests/integration/stdtime-tick-rate.test.js`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 12 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | FORMAT-01, FORMAT-05 | T-14-01 | Selector UI builds option buttons with `textContent`, not `innerHTML` | integration | `npx vitest run tests/integration/format-selector-ui.test.js` | ❌ W0 | ⬜ pending |
| 14-02-01 | 02 | 2 | FORMAT-01, FORMAT-03 | T-14-02 | Registry render failures stay component-scoped and never blank the full clock | integration | `npx vitest run tests/integration/format-selector-ui.test.js tests/integration/stdtime-tick-rate.test.js` | ❌ W0 | ⬜ pending |
| 14-03-01 | 03 | 3 | FORMAT-01, FORMAT-03, FORMAT-05 | T-14-03 | Selection persistence and loop restarts verified through jsdom wiring tests | integration | `npx vitest run tests/integration/format-selector-ui.test.js tests/integration/stdtime-tick-rate.test.js` | ❌ W0 | ⬜ pending |
| 14-04-01 | 04 | 4 | FORMAT-01, FORMAT-03, FORMAT-05 | — | N/A | regression | `npm test` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements.

- `tests/integration/format-selector-ui.test.js` — new jsdom wiring coverage for selectors, dropdowns, and persistence
- `tests/integration/stdtime-tick-rate.test.js` — update existing live-loop regression coverage for the new selector surface

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hover border + inline label feel unobtrusive and match the atmospheric aesthetic | FORMAT-05 | Visual polish and hover affordance quality are not reliable in jsdom | Run `npm start`, hover each clock segment, confirm only the active segment shows the 1px border, rounded corners, and the correct label below it |
| Touch behavior opens directly without hover dependency | FORMAT-05 | Touch media behavior and hit target feel need browser/device confirmation | Use device emulation or a touch device, tap each segment, verify the dropdown opens immediately and closes after selection |
| Full user journey persists across refresh | FORMAT-01, FORMAT-03 | Final UX confirmation spans rendering, persistence, and restart behavior | Load page, change all four components at least once, refresh, verify formats persist and display still updates live |

---

## Validation Sign-Off

- [ ] All tasks have `<acceptance_criteria>` with command-verifiable outputs
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all missing test references
- [ ] No watch-mode flags
- [ ] Feedback latency < 12s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
