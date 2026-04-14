---
phase: 9
slug: new-chronometry-modules
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 9 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.4 |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npx vitest run tests/pure/solarLongitude.test.js tests/pure/lunarPhase.test.js tests/pure/solarTime.test.js tests/pure/meghalayan.test.js tests/pure/customEpoch.test.js` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds (new module tests), ~30 seconds (full suite) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/pure/{new-module}.test.js`
- **After every plan wave:** Run `npm test` (full suite — ensures no regression in existing 268+ tests)
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | DATE-03 | — | solarLongitude module exports compute(date, opts) | unit | `npx vitest run tests/pure/solarLongitude.test.js` | ❌ W0 | ⬜ pending |
| 09-01-02 | 01 | 1 | DATE-03 | — | solarLongitude returns 0° at vernal equinox, 90° at solstice | unit | `npx vitest run tests/pure/solarLongitude.test.js` | ❌ W0 | ⬜ pending |
| 09-01-03 | 01 | 1 | DATE-03 | — | lunarPhase module exports compute(date, opts) | unit | `npx vitest run tests/pure/lunarPhase.test.js` | ❌ W0 | ⬜ pending |
| 09-01-04 | 01 | 1 | DATE-03 | — | lunarPhase returns ~0° at new moon, ~180° at full moon | unit | `npx vitest run tests/pure/lunarPhase.test.js` | ❌ W0 | ⬜ pending |
| 09-01-05 | 01 | 1 | SOLTIME-01 | — | solarTime module exports compute(date, opts) with EOT correction | unit | `npx vitest run tests/pure/solarTime.test.js` | ❌ W0 | ⬜ pending |
| 09-02-01 | 02 | 1 | YEAR-03 | — | meghalayan module exports compute(date, opts), returns 4226 for 2026 CE | unit | `npx vitest run tests/pure/meghalayan.test.js` | ❌ W0 | ⬜ pending |
| 09-02-02 | 02 | 1 | YEAR-04 | — | customEpoch module returns year count from opts.customEpoch | unit | `npx vitest run tests/pure/customEpoch.test.js` | ❌ W0 | ⬜ pending |
| 09-02-03 | 02 | 1 | — | — | customEpoch returns fallback when opts.customEpoch missing | unit | `npx vitest run tests/pure/customEpoch.test.js` | ❌ W0 | ⬜ pending |
| 09-03-01 | 03 | 2 | — | — | All 5 new modules wired into composer try/catch | integration | `npm test` | ✅ | ⬜ pending |
| 09-03-02 | 03 | 2 | — | — | No regression in existing chronometer tests | regression | `npx vitest run tests/pure/ tests/integration/composer.test.js` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/pure/solarLongitude.test.js` — stubs with known reference values (vernal equinox 0°, solstice 90°)
- [ ] `tests/pure/lunarPhase.test.js` — stubs with known new moon/full moon dates
- [ ] `tests/pure/solarTime.test.js` — stubs with known equation of time values
- [ ] `tests/pure/meghalayan.test.js` — stubs: 2026 CE = Mgh 4226
- [ ] `tests/pure/customEpoch.test.js` — stubs: custom epoch from opts
- [ ] Existing vitest framework already installed and configured

*Existing test infrastructure covers all needs. Vitest already configured with jsdom environment.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Composer integration visual check | — | Verify new modules appear in composer output alongside existing ones | Run dev server, check console output includes solar longitude, lunar phase, solar time values |

*All core phase behaviors have automated verification via unit tests.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
