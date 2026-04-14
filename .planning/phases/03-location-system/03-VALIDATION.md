---
phase: 3
slug: location-system
status: ready
nyquist_compliant: true
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
| 3-01-01 | 01 | 1 | LOCATION-01 | — | City database filter script runs and produces valid JSON | unit | `node scripts/filter-cities.js && test -f src/data/cities.json` | ❌ W0 | ⬜ pending |
| 3-01-02 | 01 | 1 | LOCATION-01 | — | Manual lat/lon validation accepts valid, rejects invalid | unit | `npm test -- --run tests/location/validation.test.js` | ❌ W0 | ⬜ pending |
| 3-01-03 | 01 | 1 | LOCATION-01 | — | Fuzzy search returns correct results for partial queries | unit | `npm test -- --run tests/location/search.test.js` | ❌ W0 | ⬜ pending |
| 3-02-01 | 02 | 2 | LOCATION-01 | — | Location saves to localStorage correctly | unit | `npm test -- --run tests/location/store.test.js` | ❌ W0 | ⬜ pending |
| 3-02-02 | 02 | 2 | LOCATION-01 | — | Browser geolocation wrapper handles permissions and timeouts | unit | `npm test -- --run tests/location/geolocation.test.js` | ❌ W0 | ⬜ pending |
| 3-02-03 | 02 | 2 | LOCATION-01 | — | Location UI renders search, manual input, saved locations | integration | `npm test -- --run tests/location/` | ❌ W0 | ⬜ pending |
| 3-03-01 | 03 | 3 | LOCATION-01 | — | Location change triggers clock update, existing tests pass | integration | `npm test -- --run && npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `scripts/filter-cities.js` — City database filter build script
- [ ] `tests/location/validation.test.js` — Lat/lon validation tests
- [ ] `tests/location/search.test.js` — Fuzzy search tests
- [ ] `tests/location/store.test.js` — localStorage CRUD tests
- [ ] `tests/location/geolocation.test.js` — Browser geolocation wrapper tests

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
