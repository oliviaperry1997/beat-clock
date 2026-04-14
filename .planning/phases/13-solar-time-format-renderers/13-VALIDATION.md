---
phase: 13
slug: solar-time-format-renderers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.js (existing) |
| **Quick run command** | `npx vitest run tests/formats/renderers/solartime` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~2-5 seconds (solar renderer tests only), ~10-15 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/formats/renderers/solartime`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | SOLTIME-01 | — | N/A | unit | `npx vitest run tests/formats/renderers/solartime/24h.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SOLTIME-02 | — | N/A | unit | `npx vitest run tests/formats/renderers/solartime/decimal.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SOLTIME-03 | — | N/A | unit | `npx vitest run tests/formats/renderers/solartime/longitudinal.test.js` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | SOLTIME-04 | — | N/A | unit | `npx vitest run tests/formats/renderers/solartime/descriptive.test.js` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

*Note: Task IDs and plan/wave assignments will be filled during planning.*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No Wave 0 setup needed:
- vitest framework already installed and configured
- Test directory structure exists at `tests/formats/renderers/`
- Test patterns established in Phase 11 and 12

---

## Manual-Only Verifications

All phase behaviors have automated verification. No manual-only verifications needed.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
