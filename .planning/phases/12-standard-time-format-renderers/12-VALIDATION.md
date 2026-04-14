---
phase: 12
slug: standard-time-format-renderers
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-14
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (globals: true, jsdom default, node override per-file) |
| **Config file** | `vite.config.js` (root) |
| **Quick run command** | `npx vitest run tests/formats/renderers/stdtime` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds (quick), ~15 seconds (full) |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/formats/renderers/stdtime`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 12-01-01 | 01 | 1 | STDTIME-01 | unit | `npx vitest run tests/formats/renderers/stdtime/24h.test.js` | ⬜ pending |
| 12-01-02 | 01 | 1 | STDTIME-02 | unit | `npx vitest run tests/formats/renderers/stdtime/decimal.test.js` | ⬜ pending |
| 12-01-03 | 01 | 1 | STDTIME-03 | unit | `npx vitest run tests/formats/renderers/stdtime/longitudinal.test.js` | ⬜ pending |
| 12-02-01 | 02 | 2 | STDTIME-04 | unit+dom | `npx vitest run tests/formats/renderers/stdtime/meridian-select.test.js` | ⬜ pending |
| 12-03-01 | 03 | 3 | STDTIME-05 | unit | `npx vitest run tests/formats/renderers/stdtime` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/formats/renderers/stdtime/24h.test.js` — stub/skeleton for STDTIME-01
- [ ] `tests/formats/renderers/stdtime/decimal.test.js` — stub/skeleton for STDTIME-02
- [ ] `tests/formats/renderers/stdtime/longitudinal.test.js` — stub/skeleton for STDTIME-03
- [ ] `tests/formats/renderers/stdtime/meridian-select.test.js` — stub/skeleton for STDTIME-04

*Note: The `tests/formats/renderers/stdtime/` directory does not yet exist — it must be created in Wave 0.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Meridian selector UI renders correctly in browser | STDTIME-04 | Visual/DOM rendering | Open `npm start`, navigate to stdTime format panel, verify presets load and custom input appears |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
