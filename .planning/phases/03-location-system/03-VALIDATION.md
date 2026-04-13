---
phase: 3
slug: location-system
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-13
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.js` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 3-01-01 | 01 | 1 | LOCATION-01 | — | City database loads and indexes correctly | unit | `npm test -- --run location` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | LOCATION-01 | — | Fuzzy search returns correct results for partial queries | unit | `npm test -- --run search` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | LOCATION-01 | — | Manual lat/lon validation accepts valid, rejects invalid | unit | `npm test -- --run validation` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | LOCATION-01 | — | Location saves to localStorage correctly | unit | `npm test -- --run store` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | LOCATION-01 | — | Active location persists across sessions | unit | `npm test -- --run persistence` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | LOCATION-01 | — | Multiple locations can be saved and switched | unit | `npm test -- --run multi-location` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | LOCATION-01 | — | Browser geolocation wrapper handles permissions and timeouts | unit | `npm test -- --run geolocation` | ❌ W0 | ⬜ pending |
| 3-03-02 | 03 | 3 | LOCATION-01 | — | First-run flow auto-detects or falls back gracefully | integration | `npm test -- --run first-run` | ❌ W0 | ⬜ pending |
| 3-03-03 | 03 | 3 | LOCATION-01 | — | Location change triggers clock update | integration | `npm test -- --run clock-update` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/location/store.test.js` — localStorage CRUD stubs
- [ ] `tests/location/search.test.js` — fuzzy search stubs
- [ ] `tests/location/validation.test.js` — lat/lon validation stubs
- [ ] `tests/location/geolocation.test.js` — browser geolocation wrapper stubs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| City search UI responsiveness | LOCATION-01 | Requires DOM interaction | Type "Lon" in search, verify "London" appears within 200ms |
| Location dropdown rendering | LOCATION-01 | Visual UI element | Open dropdown, verify saved locations display correctly |
| First-run geolocation prompt | LOCATION-01 | Browser API interaction | Clear localStorage, load page, verify geolocation prompt appears |
| Manual lat/lon input UX | LOCATION-01 | Visual UI element | Enter "51.5074, -0.1278", verify validation passes and location saves |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
