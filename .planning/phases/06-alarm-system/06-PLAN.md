---
phase: 06-alarm-system
plan: 01
wave: 1
depends_on: []
files_modified: [src/alarms/store.js]
autonomous: true
---

# Plan 01: Alarm Store & Persistence Layer

<objective>
Create the localStorage persistence layer for alarms following the `beatclock:` namespace convention and `src/location/store.js` patterns. Implements CRUD operations for alarms with schema versioning, enable/disable toggle, and one-time alarm auto-deletion support.
</objective>

<task 1>
<read_first>
- src/location/store.js — pattern to replicate for alarm CRUD
- src/chronometers/beats.js — for the beats computation function (needed for beat-time alarm evaluation later)
</read_first>
<action>
Create `src/alarms/store.js` with the following exports and behavior:

1. Define `const STORAGE_KEY = 'beatclock:alarms'` and `const SCHEMA_VERSION = 1`
2. Export `loadAlarms()` — reads `beatclock:alarms` from localStorage, JSON parses, returns array (empty array on parse error or missing key). Filters out alarms with `version !== 1` to handle future migrations.
3. Export `saveAlarms(alarms)` — JSON stringifies array to `beatclock:alarms` with try/catch, console.warn on failure.
4. Export `addAlarm(alarm)` — appends alarm to array, saves. Alarm must have: `id` (auto-generated as `alm_${Date.now()}` if not provided), `label`, `enabled: true`, `oneTime: false`, `recurrence`, `condition`, `notifications: { browser: true, inApp: true, audio: true }`, `createdAt` (ISO string), `lastFiredAt: null`, `version: 1`.
5. Export `updateAlarm(id, updates)` — finds alarm by id, merges updates, saves, returns updated alarm or null.
6. Export `deleteAlarm(id)` — filters out alarm by id, saves.
7. Export `toggleAlarm(id)` — flips `enabled` boolean, saves, returns updated alarm or null.
8. Export `getEnabledAlarms()` — returns array of alarms where `enabled === true`.

ID generation pattern: `alm_${Date.now()}` (matching location's `loc_${Date.now()}`).
</action>
<acceptance_criteria>
- File `src/alarms/store.js` exists
- Contains `const STORAGE_KEY = 'beatclock:alarms'`
- Contains `const SCHEMA_VERSION = 1`
- Exports: `loadAlarms`, `saveAlarms`, `addAlarm`, `updateAlarm`, `deleteAlarm`, `toggleAlarm`, `getEnabledAlarms`
- `addAlarm` generates IDs matching pattern `alm_${...}` (grep for `alm_`)
- `loadAlarms` returns `[]` on parse error (grep for `JSON.parse` with try/catch)
- `toggleAlarm` flips `enabled` property (grep for `!alarm.enabled` or `alarm.enabled = !`)
- All localStorage writes use `beatclock:alarms` key (grep for `STORAGE_KEY`)
</acceptance_criteria>
</task 1>

<task 2>
<read_first>
- src/alarms/store.js (created in task 1)
- tests/location/store.test.js — test pattern to replicate
</read_first>
<action>
Create `tests/alarms/store.test.js` with Vitest tests following the `tests/location/store.test.js` pattern:

1. Mock localStorage with vi.fn() for getItem, setItem, removeItem, clear using the same IIFE pattern as location tests.
2. Test suite for `loadAlarms`:
   - Returns empty array when no alarms saved
   - Returns parsed alarms array when data exists
   - Returns empty array on parse error
3. Test suite for `saveAlarms`:
   - Saves alarms array to localStorage with key `beatclock:alarms`
4. Test suite for `addAlarm`:
   - Adds alarm with auto-generated ID starting with `alm_`
   - Sets default `enabled: true`, `oneTime: false`, `notifications` object
   - Uses custom ID if provided
   - Sets `createdAt` as ISO string and `lastFiredAt: null`
5. Test suite for `updateAlarm`:
   - Updates alarm fields and returns updated alarm
   - Returns null for non-existent ID
6. Test suite for `deleteAlarm`:
   - Removes alarm from list
   - No-op for non-existent ID
7. Test suite for `toggleAlarm`:
   - Flips enabled from true to false
   - Flips enabled from false to true
8. Test suite for `getEnabledAlarms`:
   - Returns only alarms where enabled === true
   - Returns empty array when no alarms exist

Use `beforeEach(() => localStorageMock.clear())` for isolation.
</action>
<acceptance_criteria>
- File `tests/alarms/store.test.js` exists
- Contains `describe('loadAlarms'`, `describe('saveAlarms'`, `describe('addAlarm'`, `describe('updateAlarm'`, `describe('deleteAlarm'`, `describe('toggleAlarm'`, `describe('getEnabledAlarms'`
- Contains `localStorageMock` with `vi.fn()` for getItem, setItem, removeItem, clear
- Contains `beforeEach(() => { localStorageMock.clear() })`
- Test for auto-generated ID checks `result.id.startsWith('alm_')`
- Test for toggle verifies enabled flips between true and false
- `npm test` passes all store tests (run: `npx vitest run tests/alarms/store.test.js`)
</acceptance_criteria>
</task 2>

---
---
phase: 06-alarm-system
plan: 02
wave: 1
depends_on: []
files_modified: [src/alarms/templates.js]
autonomous: true
---

# Plan 02: Alarm Template Definitions

<objective>
Define the pre-built alarm template library with parameter schemas. Templates cover time-based triggers, astronomical offsets, and lunar/seasonal day triggers as specified in D-10. Each template is a plain object with label, category, parameter definitions, and a `build()` function that returns a condition object.
</objective>

<task 1>
<read_first>
- .planning/phases/06-alarm-system/06-RESEARCH.md — template architecture section (Section 5)
- src/chronometers/beats.js — understand beats computation for beat-time template
</read_first>
<action>
Create `src/alarms/templates.js` exporting a `TEMPLATES` object with the following template definitions:

1. **`at-beat`** (category: 'time'): "At specific beat time"
   - params: `{ key: 'beat', label: 'Beat (0-1000)', type: 'number', min: 0, max: 1000 }`
   - build(params): returns `{ type: 'beat-time', template: 'at-beat', params: { beat: Number(params.beat) } }`

2. **`at-time`** (category: 'time'): "At specific standard time"
   - params: `{ key: 'hours', label: 'Hour (0-23)', type: 'number', min: 0, max: 23 }`, `{ key: 'minutes', label: 'Minutes (0-59)', type: 'number', min: 0, max: 59 }`
   - build(params): returns `{ type: 'standard-time', template: 'at-time', params: { hours: Number(params.hours), minutes: Number(params.minutes) } }`

3. **`after-sunrise`** (category: 'astro'): "X minutes after sunrise"
   - params: `{ key: 'offsetMinutes', label: 'Minutes after', type: 'number', min: 0, max: 1440 }`
   - build(params): returns `{ type: 'astro-offset', template: 'after-sunrise', params: { offsetMinutes: Number(params.offsetMinutes), event: 'sunrise' } }`

4. **`after-solar-noon`** (category: 'astro'): "X beats after solar noon"
   - params: `{ key: 'offsetBeats', label: 'Beats after', type: 'number', min: 0, max: 1000 }`
   - build(params): returns `{ type: 'astro-offset-beats', template: 'after-solar-noon', params: { offsetBeats: Number(params.offsetBeats), event: 'solarNoon' } }`

5. **`before-sunset`** (category: 'astro'): "X minutes before sunset"
   - params: `{ key: 'offsetMinutes', label: 'Minutes before', type: 'number', min: 0, max: 1440 }`
   - build(params): returns `{ type: 'astro-offset', template: 'before-sunset', params: { offsetMinutes: Number(params.offsetMinutes), event: 'sunset' } }`

6. **`on-full-moon`** (category: 'lunar'): "On full moon day"
   - params: [] (no parameters)
   - build(): returns `{ type: 'date-trigger', template: 'on-full-moon', params: {}, dateFilter: { type: 'lunar-phase', params: { phase: 'full-moon' } } }`

7. **`on-new-moon`** (category: 'lunar'): "On new moon day"
   - params: [] (no parameters)
   - build(): returns `{ type: 'date-trigger', template: 'on-new-moon', params: {}, dateFilter: { type: 'lunar-phase', params: { phase: 'new-moon' } } }`

8. **`on-equinox`** (category: 'seasonal'): "On equinox day"
   - params: [] (no parameters)
   - build(): returns `{ type: 'date-trigger', template: 'on-equinox', params: {}, dateFilter: { type: 'equinox' } }`

9. **`on-solstice`** (category: 'seasonal'): "On solstice day"
   - params: [] (no parameters)
   - build(): returns `{ type: 'date-trigger', template: 'on-solstice', params: {}, dateFilter: { type: 'solstice' } }`

Also export `getTemplate(templateKey)` that returns the template object or null, and `getTemplatesByCategory()` that returns templates grouped by category: `{ time: [...], astro: [...], lunar: [...], seasonal: [...] }`.
</action>
<acceptance_criteria>
- File `src/alarms/templates.js` exists
- Exports `TEMPLATES` object with keys: `at-beat`, `at-time`, `after-sunrise`, `after-solar-noon`, `before-sunset`, `on-full-moon`, `on-new-moon`, `on-equinox`, `on-solstice`
- Each template has `label`, `category`, `params` (array), and `build` (function)
- Categories used: `'time'`, `'astro'`, `'lunar'`, `'seasonal'`
- Exports `getTemplate` function (grep for `export function getTemplate`)
- Exports `getTemplatesByCategory` function (grep for `export function getTemplatesByCategory`)
- `TEMPLATES['at-beat'].build({ beat: 500 })` returns object with `type: 'beat-time'` and `params.beat === 500`
- `TEMPLATES['on-full-moon'].build()` returns object with `dateFilter.type === 'lunar-phase'` and `dateFilter.params.phase === 'full-moon'`
</acceptance_criteria>
</task 1>

<task 2>
<read_first>
- src/alarms/templates.js (created in task 1)
</read_first>
<action>
Create `tests/alarms/templates.test.js` with the following test suites:

1. Test `getTemplate`:
   - Returns template object for valid key like `'at-beat'`
   - Returns null for invalid key like `'nonexistent'`
2. Test `getTemplatesByCategory`:
   - Returns object with keys `time`, `astro`, `lunar`, `seasonal`
   - `time` category contains `at-beat` and `at-time`
   - `astro` category contains `after-sunrise`, `after-solar-noon`, `before-sunset`
   - `lunar` category contains `on-full-moon`, `on-new-moon`
   - `seasonal` category contains `on-equinox`, `on-solstice`
3. Test individual template build functions:
   - `TEMPLATES['at-beat'].build({ beat: 500 })` returns `{ type: 'beat-time', params: { beat: 500 } }`
   - `TEMPLATES['at-time'].build({ hours: 7, minutes: 30 })` returns `{ type: 'standard-time', params: { hours: 7, minutes: 30 } }`
   - `TEMPLATES['after-sunrise'].build({ offsetMinutes: 30 })` returns `{ type: 'astro-offset', params: { offsetMinutes: 30, event: 'sunrise' } }`
   - `TEMPLATES['before-sunset'].build({ offsetMinutes: 15 })` returns `{ type: 'astro-offset', params: { offsetMinutes: 15, event: 'sunset' } }`
   - `TEMPLATES['on-full-moon'].build()` returns object with `dateFilter.type === 'lunar-phase'` and `dateFilter.params.phase === 'full-moon'`
   - `TEMPLATES['on-equinox'].build()` returns object with `dateFilter.type === 'equinox'`
</action>
<acceptance_criteria>
- File `tests/alarms/templates.test.js` exists
- Contains `describe('getTemplate'`, `describe('getTemplatesByCategory'`
- Tests all 9 template build functions
- Tests `TEMPLATES['at-beat'].build({ beat: 500 })` returns `params.beat === 500`
- Tests `TEMPLATES['on-full-moon'].build()` returns `dateFilter.params.phase === 'full-moon'`
- Tests `TEMPLATES['after-sunrise'].build({ offsetMinutes: 30 })` returns `params.event === 'sunrise'`
- `npm test` passes all template tests
</acceptance_criteria>
</task 2>

---
---
phase: 06-alarm-system
plan: 03
wave: 1
depends_on: []
files_modified: [src/alarms/astro-cache.js]
autonomous: true
---

# Plan 03: Astronomical Event Precomputation Cache

<objective>
Create the astronomical event cache module that precomputes sunrise, sunset, solar noon, moon illumination, equinox dates, and solstice dates for the current day. Cache invalidates on location change. Uses existing suncalc and astronomia libraries. Addresses D-05, D-06, D-07, D-08.
</objective>

<task 1>
<read_first>
- src/sky.js — suncalc usage pattern (SunCalc.getTimes)
- src/chronometers/index.js — composer pattern for module structure
- .planning/phases/06-alarm-system/06-RESEARCH.md — Section 6 (Astronomical Event Computation)
</read_first>
<action>
Create `src/alarms/astro-cache.js` with the following:

1. Import `SunCalc from 'suncalc'` and `{ solstice, moonphase, julian } from 'astronomia'`
2. Module-level cache variables: `let cachedEvents = null`, `let cachedDate = null`, `let cachedLat = null`, `let cachedLon = null`
3. Helper `isSameDay(d1, d2)`: returns true if both dates share year, month, and date
4. Helper `getMeanLunarMonth()`: returns `29.53059` (mean synodic month in days)
5. Export `getAstroEvents(date, latitude, longitude)`:
   - If cache exists and `isSameDay(cachedDate, date)` AND `cachedLat === latitude` AND `cachedLon === longitude`, return cached events
   - Otherwise recompute:
     - Call `SunCalc.getTimes(date, latitude, longitude)` to get sunrise, sunset, solarNoon
     - Call `SunCalc.getMoonIllumination(date)` to get fraction (0-1) and phase (0-1)
     - Compute equinox dates: `solstice.march(year)`, `solstice.september(year)` converted via `julian.JDEToDate()`
     - Compute solstice dates: `solstice.june(year)`, `solstice.december(year)` converted via `julian.JDEToDate()`
     - Compute full moon and new moon dates for current year by iterating from first event, adding `meanLunarMonth` 13 times, converting each JDE to Date
   - Return object: `{ sun: { sunrise, sunset, solarNoon }, moon: { fraction, phase }, equinoxes: { march, september }, solstices: { june, december }, lunarEvents: { fullMoons: [...], newMoons: [...] } }`
   - Cache the result in `cachedEvents`, `cachedDate`, `cachedLat`, `cachedLon`
6. Export `invalidateCache()`: sets all cache variables to null
7. Export helper `isFullMoonDay(moonFraction)`: returns `moonFraction >= 0.98`
8. Export helper `isNewMoonDay(moonFraction)`: returns `moonFraction <= 0.02`
9. Export helper `isEquinoxDay(date, equinoxes)`: returns true if date matches march or september equinox day
10. Export helper `isSolsticeDay(date, solstices)`: returns true if date matches june or december solstice day
11. Export helper `isLunarEventDay(date, lunarEvents, eventType)`: for 'full-moon' or 'new-moon', checks if date matches any fullMoon/newMoon date in the array using isSameDay
</action>
<acceptance_criteria>
- File `src/alarms/astro-cache.js` exists
- Imports `SunCalc from 'suncalc'` and `{ solstice, moonphase, julian } from 'astronomia'`
- Exports: `getAstroEvents`, `invalidateCache`, `isFullMoonDay`, `isNewMoonDay`, `isEquinoxDay`, `isSolsticeDay`, `isLunarEventDay`
- Contains `isSameDay` helper function (grep for `function isSameDay`)
- `getAstroEvents` caches results (grep for `cachedEvents`)
- `invalidateCache` resets cache (grep for `cachedEvents = null`)
- `isFullMoonDay` uses threshold `0.98` (grep for `0.98`)
- `isNewMoonDay` uses threshold `0.02` (grep for `0.02`)
- Returns object with `sun`, `moon`, `equinoxes`, `solstices`, `lunarEvents` keys
</acceptance_criteria>
</task 1>

<task 2>
<read_first>
- src/alarms/astro-cache.js (created in task 1)
- tests/pure/solar.test.js — test pattern for astronomical modules
</read_first>
<action>
Create `tests/alarms/astro-cache.test.js` with the following test suites:

1. Test `isSameDay`:
   - Returns true for same calendar day with different times
   - Returns false for different days
   - Returns false for different months
   - Returns false for different years
2. Test `isFullMoonDay`:
   - Returns true when fraction >= 0.98
   - Returns false when fraction < 0.98
   - Returns true at exactly 0.98
3. Test `isNewMoonDay`:
   - Returns true when fraction <= 0.02
   - Returns false when fraction > 0.02
   - Returns true at exactly 0.02
4. Test `isEquinoxDay`:
   - Returns true when date matches march equinox
   - Returns true when date matches september equinox
   - Returns false for other dates
5. Test `invalidateCache`:
   - After calling, next `getAstroEvents` call will recompute (test by checking cache variable is null via module internals or behavioral test)
6. Test `isLunarEventDay`:
   - Returns true when date matches a full moon date in the array
   - Returns false when date does not match

Note: `getAstroEvents` requires real coordinates and will call suncalc/astronomia — test it integration-style with known coordinates (e.g., latitude 40.7128, longitude -74.0060 for New York) to verify it returns an object with expected keys.
</action>
<acceptance_criteria>
- File `tests/alarms/astro-cache.test.js` exists
- Contains `describe('isSameDay'`, `describe('isFullMoonDay'`, `describe('isNewMoonDay'`, `describe('isEquinoxDay'`, `describe('invalidateCache'`, `describe('isLunarEventDay'`
- `isFullMoonDay(0.98)` returns `true`
- `isFullMoonDay(0.97)` returns `false`
- `isNewMoonDay(0.02)` returns `true`
- `isNewMoonDay(0.03)` returns `false`
- `isEquinoxDay` with march equinox date returns `true`
- `getAstroEvents(new Date(), 40.7128, -74.0060)` returns object with keys `sun`, `moon`, `equinoxes`, `solstices`, `lunarEvents`
- `npm test` passes all astro-cache tests
</acceptance_criteria>
</task 2>

---
---
phase: 06-alarm-system
plan: 04
wave: 1
depends_on: []
files_modified: [src/alarms/evaluator.js]
autonomous: true
---

# Plan 04: Alarm Condition Evaluator

<objective>
Create the alarm condition evaluation engine that determines whether an alarm should fire on a given tick. Evaluates primary conditions (beat-time, standard-time, astro-offset), optional date filters (AND gate), recurrence patterns, and deduplication. Addresses D-01, D-04, D-09, D-11, D-14, D-17.
</objective>

<task 1>
<read_first>
- src/alarms/store.js — alarm object schema
- src/alarms/astro-cache.js — astronomical event helpers
- src/chronometers/beats.js — beats computation for beat-time evaluation
- .planning/phases/06-alarm-system/06-RESEARCH.md — Sections 3, 6, 7, 8 (evaluation logic)
</read_first>
<action>
Create `src/alarms/evaluator.js` with the following exports and logic:

1. Import `{ getAstroEvents, isFullMoonDay, isNewMoonDay, isEquinoxDay, isSolsticeDay, isLunarEventDay }` from `./astro-cache.js`
2. Import `{ compute as computeBeats }` from `../chronometers/beats.js`

3. Export `evaluateAlarm(alarm, now, latitude, longitude)`:
   - Returns `false` if `!alarm.enabled`
   - Gets `events = getAstroEvents(now, latitude, longitude)`
   - Evaluates primary condition: `primaryMatches = evaluateCondition(alarm.condition, now, events)`
   - If `alarm.condition.dateFilter` exists, evaluates date filter: `filterMatches = evaluateDateFilter(alarm.condition.dateFilter, now, events)` — returns false if filter doesn't match
   - Evaluates recurrence: `recurrenceMatches = evaluateRecurrence(alarm, now)` — returns false if recurrence doesn't match
   - Checks dedup: `shouldFireNow = shouldFireAlarm(alarm, now)` — returns false if alarm fired within last 2 beats (~1728ms)
   - Returns true only if all checks pass

4. `evaluateCondition(condition, now, events)`:
   - For `type === 'beat-time'`: computes current beats via `computeBeats(now)`, extracts numeric beat value, returns `Math.abs(currentBeat - condition.params.beat) < 1`
   - For `type === 'standard-time'`: creates target Date with `now.setHours(hours, minutes, 0, 0)`, returns `Math.abs(now - targetTime) < 864` (1-beat tolerance)
   - For `type === 'astro-offset'`: gets `events.sun[condition.params.event]`, adds `offsetMinutes * 60000` ms, returns `Math.abs(now - targetTime) < 864`. Returns false if sun event time is invalid (NaN)
   - For `type === 'astro-offset-beats'`: gets `events.sun[condition.params.event]`, computes beats at that time, adds `offsetBeats`, converts back to time, checks within tolerance
   - For `type === 'date-trigger'`: returns `true` (the dateFilter does the actual work)

5. `evaluateDateFilter(filter, now, events)`:
   - For `type === 'lunar-phase'`: checks `phase === 'full-moon'` → `isFullMoonDay(events.moon.fraction)`, `phase === 'new-moon'` → `isNewMoonDay(events.moon.fraction)`
   - For `type === 'equinox'`: `isEquinoxDay(now, events.equinoxes)`
   - For `type === 'solstice'`: `isSolsticeDay(now, events.solstices)`
   - For `type === 'weekdays'`: `filter.params.days.includes(now.getDay())` where 0=Sun
   - Default: returns `true`

6. `evaluateRecurrence(alarm, now)`:
   - For `'once'` or `'daily'`: returns `true`
   - For `'weekly'`: if condition has `dateFilter.type === 'weekdays'`, checks `filter.params.days.includes(now.getDay())`, else returns `true`
   - For `'monthly'`: returns `true` (fires every month on target date)
   - For `'lunar'`: if condition has `dateFilter.type === 'lunar-phase'`, calls the appropriate `isFullMoonDay`/`isNewMoonDay` check, else returns `true`
   - Default: returns `true`

7. `shouldFireAlarm(alarm, now)`:
   - If `!alarm.lastFiredAt`, returns `true`
   - If `now - new Date(alarm.lastFiredAt) > 1728` (2 beats in ms), returns `true`
   - Otherwise returns `false` (prevent re-firing within same beat window)
</action>
<acceptance_criteria>
- File `src/alarms/evaluator.js` exists
- Exports `evaluateAlarm` function (grep for `export function evaluateAlarm`)
- Imports from `./astro-cache.js` and `../chronometers/beats.js`
- `evaluateCondition` handles types: `'beat-time'`, `'standard-time'`, `'astro-offset'`, `'date-trigger'` (grep for each case)
- `evaluateDateFilter` handles types: `'lunar-phase'`, `'equinox'`, `'solstice'`, `'weekdays'` (grep for each case)
- `evaluateRecurrence` handles: `'once'`, `'daily'`, `'weekly'`, `'monthly'`, `'lunar'` (grep for each case)
- `shouldFireAlarm` uses `1728` ms threshold (grep for `1728`)
- Uses `864` ms tolerance for time matching (grep for `864`)
- `evaluateAlarm` returns `false` when `alarm.enabled === false`
</acceptance_criteria>
</task 1>

<task 2>
<read_first>
- src/alarms/evaluator.js (created in task 1)
- src/alarms/astro-cache.js — for mocking in tests
- tests/pure/beats.test.js — test pattern for pure computation modules
</read_first>
<action>
Create `tests/alarms/evaluator.test.js` with the following test suites:

1. Mock `../alarms/astro-cache.js` with vi.mock() returning:
   - `getAstroEvents`: returns `{ sun: { sunrise: new Date(now - 3600000), sunset: new Date(now + 3600000), solarNoon: new Date(now) }, moon: { fraction: 0.5, phase: 0.5 }, equinoxes: { march: new Date(2026, 2, 20), september: new Date(2026, 8, 22) }, solstices: { june: new Date(2026, 5, 21), december: new Date(2026, 11, 21) }, lunarEvents: { fullMoons: [new Date(2026, 3, 15)], newMoons: [] } }`
   - `isFullMoonDay`, `isNewMoonDay`, `isEquinoxDay`, `isSolsticeDay`, `isLunarEventDay`: vi.fn() returning false by default

2. Mock `../chronometers/beats.js` with `compute` returning `@500.00` for the test date

3. Test `shouldFireAlarm`:
   - Returns true when `lastFiredAt` is null
   - Returns true when last fired > 1728ms ago
   - Returns false when last fired < 1728ms ago

4. Test `evaluateAlarm` with disabled alarm:
   - Returns false when `alarm.enabled === false`

5. Test `evaluateCondition` for `standard-time`:
   - Creates alarm with `condition.type === 'standard-time'`, `params: { hours: 12, minutes: 0 }`
   - Calls with `now` set to 12:00:00 on same day
   - Returns true (within 864ms tolerance)

6. Test `evaluateDateFilter` for `lunar-phase`:
   - Mock `isFullMoonDay` to return true
   - Creates filter `{ type: 'lunar-phase', params: { phase: 'full-moon' } }`
   - Returns true

7. Test `evaluateRecurrence` for `weekly`:
   - Creates alarm with `recurrence: 'weekly'`, `dateFilter: { type: 'weekdays', params: { days: [1, 2, 3, 4, 5] } }`
   - Tests with Monday (getDay() === 1): returns true
   - Tests with Saturday (getDay() === 6): returns false
</action>
<acceptance_criteria>
- File `tests/alarms/evaluator.test.js` exists
- Contains `vi.mock('../alarms/astro-cache.js'` or correct relative path
- Contains `vi.mock('../chronometers/beats.js'`
- Contains `describe('shouldFireAlarm'`, `describe('evaluateAlarm'`, `describe('evaluateCondition'`, `describe('evaluateDateFilter'`, `describe('evaluateRecurrence'`
- Tests disabled alarm returns false
- Tests standard-time condition within tolerance returns true
- Tests weekly recurrence with weekday filter
- Tests shouldFireAlarm dedup with 1728ms threshold
- `npm test` passes all evaluator tests
</acceptance_criteria>
</task 2>

---
---
phase: 06-alarm-system
plan: 05
wave: 1
depends_on: []
files_modified: [src/alarms/notifications.js]
autonomous: true
---

# Plan 05: Notification System (Browser, In-App, Audio)

<objective>
Create the three-channel notification system: Browser Notification API, in-app glassmorphism overlay, and Web Audio API chime. Addresses D-02. Implements lazy permission request, audio context warm-up, and overlay auto-dismiss.
</objective>

<task 1>
<read_first>
- src/location/ui.js — modal creation pattern, glassmorphism CSS patterns
- src/styles.css — glassmorphism patterns to harmonize with
- .planning/phases/06-alarm-system/06-RESEARCH.md — Sections 1 (Browser Notifications), 2 (Audio Chime)
</read_first>
<action>
Create `src/alarms/notifications.js` with the following exports:

1. **Browser Notification** — `ensureNotificationPermission()`:
   - Feature detection: if `!('Notification' in window)` return false
   - If `Notification.permission === 'granted'` return true
   - If `Notification.permission === 'denied'` return false
   - Otherwise calls `Notification.requestPermission()` and returns true if granted

2. **Browser Notification** — `fireBrowserNotification(alarm)`:
   - Checks `Notification.permission !== 'granted'`, returns early
   - Creates `new Notification('Beat Clock', { body: alarm.label || 'Alarm', tag: 'alarm-' + alarm.id, requireInteraction: false })`
   - Sets `notification.onclick = () => { window.focus(); notification.close(); }`

3. **Audio Chime** — `initAudio()` module-level function:
   - Creates `AudioContext` via `new (window.AudioContext || window.webkitAudioContext)()`
   - If `audioCtx.state === 'suspended'`, calls `audioCtx.resume()`
   - Plays silent 10ms tone to satisfy autoplay policy (oscillator with gain=0)

4. **Audio Chime** — `playChime(frequency = 880, duration = 0.3)`:
   - Initializes audio context via `initAudio()` if not already created
   - Creates oscillator (type: 'sine'), gain node
   - Sets envelope: gain ramp from 0 to 0.15 in 0.02s (attack), sustain at 0.15, ramp to 0 at duration (release)
   - Connects oscillator → gain → destination, starts and stops

5. **In-App Overlay** — `showAlarmOverlay(alarm)`:
   - Creates a glassmorphism overlay div if not already present:
     - `<div id="alarm-overlay" class="alarm-overlay">` with inner HTML: alarm label, dismiss button
     - CSS class `alarm-overlay` with: `position: fixed; inset: 0; display: flex; justify-content: center; align-items: center; background: rgba(0,0,0,0.6); z-index: 2000;`
     - Inner content: `background: rgba(0,0,0,0.9); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; backdrop-filter: blur(20px); padding: 2rem; text-align: center;`
     - Title: alarm label or "Alarm"
     - Dismiss button styled with `background: rgba(255,255,255,0.2); border-radius: 8px;`
   - Auto-dismisses after 10 seconds via `setTimeout(() => removeAlarmOverlay(), 10000)`
   - Dismiss button also removes overlay

6. **In-App Overlay** — `removeAlarmOverlay()`:
   - Finds `#alarm-overlay` and removes it from DOM

7. **Fire All** — `fireNotifications(alarm)`:
   - Checks `alarm.notifications` settings
   - If `alarm.notifications.browser`: calls `fireBrowserNotification(alarm)`
   - If `alarm.notifications.inApp`: calls `showAlarmOverlay(alarm)`
   - If `alarm.notifications.audio`: calls `playChime()`
</action>
<acceptance_criteria>
- File `src/alarms/notifications.js` exists
- Exports: `ensureNotificationPermission`, `fireBrowserNotification`, `playChime`, `showAlarmOverlay`, `removeAlarmOverlay`, `fireNotifications`
- `ensureNotificationPermission` checks `'Notification' in window` (grep for this string)
- `fireBrowserNotification` uses `tag: 'alarm-' + alarm.id` (grep for `alarm-`)
- `playChime` uses frequency default `880` and duration `0.3` (grep for `880`)
- `playChime` creates oscillator with type `'sine'` (grep for `sine`)
- `playChime` uses gain envelope with attack `0.02` (grep for `0.02`)
- `showAlarmOverlay` creates element with id `alarm-overlay` (grep for `alarm-overlay`)
- `showAlarmOverlay` uses `backdrop-filter: blur(20px)` (grep for `blur(20px)`)
- `showAlarmOverlay` auto-dismisses after 10000ms (grep for `10000`)
- `fireNotifications` checks `alarm.notifications.browser`, `.inApp`, `.audio`
- Overlay z-index is `2000` (higher than location modal's 1000)
</acceptance_criteria>
</task 1>

<task 2>
<read_first>
- src/alarms/notifications.js (created in task 1)
</read_first>
<action>
Create `tests/alarms/notifications.test.js` with the following test suites:

1. Test `ensureNotificationPermission`:
   - Returns false when Notification API not available (mock `window.Notification` as undefined)
   - Returns true when permission already granted (mock `Notification.permission = 'granted'`)
   - Returns false when permission denied (mock `Notification.permission = 'denied'`)

2. Test `fireBrowserNotification`:
   - Does nothing when permission not granted
   - Creates Notification with correct title, body, and tag when granted
   - Mock `window.Notification` constructor with vi.fn()

3. Test `playChime`:
   - Creates AudioContext on first call
   - Creates oscillator and gain node
   - Mock `window.AudioContext` with vi.fn() returning mock context

4. Test `showAlarmOverlay`:
   - Creates overlay div with id `alarm-overlay`
   - Sets inner HTML with alarm label
   - Sets up dismiss button handler
   - Sets up auto-dismiss timeout

5. Test `removeAlarmOverlay`:
   - Removes `#alarm-overlay` from DOM

6. Test `fireNotifications`:
   - Calls all three channels when all notifications enabled
   - Only calls browser notification when `notifications: { browser: true, inApp: false, audio: false }`
   - Does not call any channel when all disabled
</action>
<acceptance_criteria>
- File `tests/alarms/notifications.test.js` exists
- Contains `describe('ensureNotificationPermission'`, `describe('fireBrowserNotification'`, `describe('playChime'`, `describe('showAlarmOverlay'`, `describe('removeAlarmOverlay'`, `describe('fireNotifications'`
- Mocks `Notification` API with `vi.mock` or manual mock
- Tests `fireBrowserNotification` checks `Notification.permission !== 'granted'`
- Tests `showAlarmOverlay` creates element with `id === 'alarm-overlay'`
- Tests `removeAlarmOverlay` removes element from DOM
- Tests `fireNotifications` respects `alarm.notifications` settings
- `npm test` passes all notification tests
</acceptance_criteria>
</task 2>

<task 3>
<read_first>
- src/styles.css — global styles to append alarm overlay styles to
</read_first>
<action>
Append alarm overlay CSS styles to `src/styles.css` after the existing responsive section. Add the following styles:

```css
/* Alarm Overlay */
.alarm-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0, 0, 0, 0.6);
  z-index: 2000;
  animation: fadeIn 250ms ease-out;
}

.alarm-overlay-content {
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  padding: 2rem;
  text-align: center;
  min-width: 280px;
}

.alarm-overlay-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: rgba(255, 255, 255, 0.95);
}

.alarm-overlay-dismiss {
  padding: 0.75rem 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: inherit;
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  transition: background 150ms ease-out;
}

.alarm-overlay-dismiss:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

Also add responsive adjustments in the `@media (max-width: 768px)` block:
```css
.alarm-overlay-content {
  min-width: auto;
  width: 90%;
  padding: 1.5rem;
}
```
</action>
<acceptance_criteria>
- `src/styles.css` contains `.alarm-overlay` class definition
- Contains `.alarm-overlay-content` with `backdrop-filter: blur(20px)`
- Contains `.alarm-overlay-title` with `font-size: 1.5rem`
- Contains `.alarm-overlay-dismiss` with `background: rgba(255, 255, 255, 0.2)`
- Contains `@keyframes fadeIn` animation
- `z-index: 2000` on `.alarm-overlay`
- Responsive media query includes `.alarm-overlay-content` adjustments
- File still ends with valid CSS (no syntax errors)
</acceptance_criteria>
</task 3>

---
---
phase: 06-alarm-system
plan: 06
wave: 2
depends_on: [01, 02, 03, 04, 05]
files_modified: [src/alarms/ui.js]
autonomous: true
---

# Plan 06: Alarm UI Components (Form, Template Picker, List)

<objective>
Create the alarm UI components: template picker modal, alarm creation form with parameter slots, optional date filter addition, recurrence selector, and alarm list with enable/disable toggles. Follows the glassmorphic patterns established in `src/location/ui.js`. Addresses D-09, D-10, D-11, D-13, D-14, D-15.
</objective>

<task 1>
<read_first>
- src/location/ui.js — modal creation, panel, search patterns to replicate
- src/alarms/store.js — alarm CRUD functions
- src/alarms/templates.js — template definitions and getTemplatesByCategory
- src/alarms/notifications.js — ensureNotificationPermission
- src/styles.css — glassmorphism CSS patterns
</read_first>
<action>
Create `src/alarms/ui.js` with the following exports and structure:

1. Import: `{ addAlarm, updateAlarm, deleteAlarm, toggleAlarm, loadAlarms, getEnabledAlarms }` from `./store.js`
2. Import: `{ getTemplate, getTemplatesByCategory }` from `./templates.js`
3. Import: `{ ensureNotificationPermission }` from `./notifications.js`
4. Import: `{ getActiveLocation }` from `../location/store.js`

5. Export `initAlarmSystem(location)` — following the `initXxxSystem()` pattern:
   - Creates alarm trigger button in DOM (positioned top-left, opposite to location selector)
   - Renders alarm list panel
   - Sets up event listeners for create/toggle/delete/dismiss actions
   - Returns `{ stop() }` cleanup function

6. `createAlarmTrigger()` — creates a button element:
   - `<button id="alarm-trigger" class="alarm-trigger">` with text "🔔" (bell emoji) or "Alarms"
   - Positioned via CSS at `top: 1rem; left: 1rem;`
   - Click handler opens alarm manager modal

7. `createAlarmManager()` — creates the alarm manager modal (following location modal pattern):
   - Modal structure: `<div id="alarm-manager" class="modal hidden">` with same `.modal` and `.modal-content` classes
   - Header: "Alarms" title + close button
   - Tab 1: "Alarm List" — shows existing alarms with toggles, labels, delete buttons
   - Tab 2: "Create Alarm" — template picker → parameter form → recurrence → notifications → save
   - Uses existing CSS classes where possible (`.modal`, `.modal-content`, `.modal-header`)

8. `renderAlarmList()` — renders saved alarms in the list tab:
   - For each alarm: shows label, enabled toggle switch, delete button
   - Toggle handler: calls `toggleAlarm(id)`, re-renders
   - Delete handler: calls `deleteAlarm(id)`, re-renders
   - Shows "No alarms set" when empty

9. `renderTemplatePicker()` — in the create tab:
   - Calls `getTemplatesByCategory()` to get grouped templates
   - Renders category headers and template buttons
   - Template click handler: opens parameter form for that template

10. `renderParameterForm(templateKey)` — renders form with parameter slots:
    - Gets template via `getTemplate(templateKey)`
    - For each param in `template.params`: renders labeled input (number type with min/max)
    - Shows "Add Date Condition" button to optionally add a date filter
    - Shows recurrence selector (once / daily / weekly / lunar)
    - Shows notification toggles (browser / in-app / audio)
    - Shows "Save Alarm" button

11. `renderDateFilterPicker()` — renders date filter options:
    - Options: Full Moon Day, New Moon Day, Equinox Day, Solstice Day, Specific Weekdays
    - User can select one date filter type
    - For weekdays: shows checkbox grid for Mon-Sun

12. `saveAlarmFromForm(formData)` — constructs alarm object and calls `addAlarm()`:
    - Builds condition from template + optional dateFilter
    - Sets recurrence, notifications, label
    - Requests notification permission if browser notification enabled
    - Closes modal, re-renders alarm list
</action>
<acceptance_criteria>
- File `src/alarms/ui.js` exists
- Exports `initAlarmSystem` function (grep for `export.*initAlarmSystem`)
- `initAlarmSystem` accepts `(location)` parameter
- Creates alarm trigger button with id `alarm-trigger` (grep for `alarm-trigger`)
- Creates alarm manager modal with id `alarm-manager` (grep for `alarm-manager`)
- Modal has two tabs: alarm list and create alarm (grep for 'Alarm List' and 'Create Alarm')
- `renderAlarmList` shows toggle and delete for each alarm (grep for `toggleAlarm`, `deleteAlarm`)
- `renderTemplatePicker` uses `getTemplatesByCategory()` (grep for `getTemplatesByCategory`)
- `renderParameterForm` renders inputs from `template.params` (grep for `template.params`)
- Has "Add Date Condition" button (grep for `Add Date Condition`)
- Has recurrence selector with options: once, daily, weekly, lunar (grep for these strings)
- Has notification toggles for browser, inApp, audio (grep for `notifications`)
- `saveAlarmFromForm` calls `addAlarm` (grep for `addAlarm`)
- Uses existing `.modal` and `.modal-content` CSS classes
</acceptance_criteria>
</task 1>

<task 2>
<read_first>
- src/alarms/ui.js (created in task 1)
- src/styles.css — to append alarm UI styles
</read_first>
<action>
Append alarm UI specific styles to `src/styles.css`:

1. **Alarm Trigger Button**:
```css
.alarm-trigger {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 100;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: inherit;
  font: inherit;
  font-size: 1rem;
  cursor: pointer;
  backdrop-filter: blur(10px);
  transition: background 150ms ease-out;
}

.alarm-trigger:hover {
  background: rgba(0, 0, 0, 0.5);
}
```

2. **Alarm List Items**:
```css
.alarm-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.alarm-label {
  font-size: 0.9rem;
  flex: 1;
}

/* Toggle Switch */
.alarm-toggle-switch {
  width: 40px;
  height: 22px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 11px;
  position: relative;
  cursor: pointer;
  transition: background 150ms ease-out;
}

.alarm-toggle-switch.active {
  background: rgba(74, 222, 128, 0.5);
}

.alarm-toggle-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  background: white;
  border-radius: 50%;
  transition: transform 150ms ease-out;
}

.alarm-toggle-switch.active::after {
  transform: translateX(18px);
}

.alarm-remove-btn {
  background: transparent;
  border: none;
  color: #f87171;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0.5rem;
  opacity: 0.7;
  transition: opacity 150ms ease-out;
}

.alarm-remove-btn:hover {
  opacity: 1;
}
```

3. **Template Picker**:
```css
.template-category {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.7;
  margin: 1rem 0 0.5rem;
}

.template-option {
  display: block;
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  margin-bottom: 0.5rem;
  transition: background 150ms ease-out, border-color 150ms ease-out;
}

.template-option:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}
```

4. **Parameter Form**:
```css
.param-field {
  margin-bottom: 1rem;
}

.param-label {
  display: block;
  font-size: 0.85rem;
  opacity: 0.8;
  margin-bottom: 0.25rem;
}

.param-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: inherit;
  font: inherit;
}

.param-input:focus {
  outline: none;
  border-color: rgba(255, 255, 255, 0.4);
}
```

5. **Tab styles** (reuse converter tab pattern or create new):
```css
.alarm-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.alarm-tab {
  flex: 1;
  padding: 0.75rem;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 150ms ease-out, border-color 150ms ease-out;
}

.alarm-tab.active {
  opacity: 1;
  border-bottom-color: rgba(255, 255, 255, 0.5);
}
```

6. Add responsive adjustments to `@media (max-width: 768px)`:
```css
.alarm-trigger {
  top: 0.5rem;
  left: 0.5rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.9rem;
}
```
</action>
<acceptance_criteria>
- `src/styles.css` contains `.alarm-trigger` class with `position: absolute; top: 1rem; left: 1rem;`
- Contains `.alarm-toggle-switch` with `width: 40px; height: 22px;`
- Contains `.alarm-toggle-switch.active` with `background: rgba(74, 222, 128, 0.5)`
- Contains `.alarm-toggle-switch::after` for the knob
- Contains `.template-option` class for template picker
- Contains `.param-input` with glassmorphic styling
- Contains `.alarm-tabs` and `.alarm-tab` classes
- Contains `.alarm-tab.active` with `border-bottom-color`
- Responsive media query includes `.alarm-trigger` adjustments
</acceptance_criteria>
</task 2>

<task 3>
<read_first>
- src/alarms/ui.js (created in task 1)
- tests/location/ui.test.js — test pattern for UI modules
</read_first>
<action>
Create `tests/alarms/ui.test.js` with the following test suites:

1. Mock dependencies:
   - `../../src/alarms/store.js` — mock all CRUD functions with vi.fn()
   - `../../src/alarms/templates.js` — mock `getTemplate`, `getTemplatesByCategory`
   - `../../src/alarms/notifications.js` — mock `ensureNotificationPermission`
   - `../../src/location/store.js` — mock `getActiveLocation`
   - `../../src/chronometers/index.js` — mock `compose`

2. Test `initAlarmSystem`:
   - Creates alarm trigger button in DOM
   - Returns object with `stop()` function
   - Does not throw when body has no existing alarm elements

3. Test alarm list rendering (behavioral test):
   - When `loadAlarms` returns empty array, shows "No alarms set" text
   - When alarms exist, renders each alarm with label and toggle

4. Test template picker:
   - `getTemplatesByCategory` is called to render categories
   - Clicking a template opens parameter form

5. Test parameter form:
   - Renders input fields matching `template.params` length
   - "Save Alarm" button calls `addAlarm` when clicked

6. Test toggle:
   - Clicking toggle calls `toggleAlarm` with correct ID
</action>
<acceptance_criteria>
- File `tests/alarms/ui.test.js` exists
- Contains `vi.mock` for store, templates, notifications modules
- Contains `describe('initAlarmSystem'`
- Tests `initAlarmSystem` returns object with `stop` method
- Tests alarm list shows "No alarms set" when empty
- Tests parameter form renders inputs from template params
- Tests toggle calls `toggleAlarm`
- `npm test` passes all UI tests
</acceptance_criteria>
</task 3>

---
---
phase: 06-alarm-system
plan: 07
wave: 3
depends_on: [01, 02, 03, 04, 05, 06]
files_modified: [src/index.js, src/template.html]
autonomous: true
---

# Plan 07: Integration & Tick Engine

<objective>
Wire the alarm system into the main application. Create the tick-based alarm engine that evaluates alarms on each 864ms tick. Initialize alarm system from index.js. Add alarm overlay DOM element to template.html. Addresses D-01, D-03.
</objective>

<task 1>
<read_first>
- src/index.js — integration point, tick pattern, initLocationSystem callback
- src/alarms/store.js — loadAlarms, getEnabledAlarms
- src/alarms/evaluator.js — evaluateAlarm
- src/alarms/notifications.js — fireNotifications, ensureNotificationPermission
- src/alarms/ui.js — initAlarmSystem
- src/alarms/astro-cache.js — invalidateCache
</read_first>
<action>
Create `src/alarms/engine.js` — the tick-based alarm engine:

1. Import: `{ getEnabledAlarms, updateAlarm, deleteAlarm }` from `./store.js`
2. Import: `{ evaluateAlarm }` from `./evaluator.js`
3. Import: `{ fireNotifications }` from `./notifications.js`
4. Import: `{ getActiveLocation }` from `../location/store.js`

5. Export `initAlarmEngine()` — returns `{ stop(), evaluateNow() }`:
   - Gets active location via `getActiveLocation()`
   - If no active location, logs warning and returns `{ stop: () => {}, evaluateNow: () => {} }`
   - Sets up `setInterval(() => tick(location), 864)` for alarm checking
   - `tick(location)` function:
     - Gets `alarms = getEnabledAlarms()`
     - For each alarm, calls `evaluateAlarm(alarm, new Date(), location.latitude, location.longitude)`
     - If evaluates to true:
       - Calls `fireNotifications(alarm)`
       - If `alarm.oneTime` or `alarm.recurrence === 'once'`: calls `deleteAlarm(alarm.id)`
       - Otherwise: calls `updateAlarm(alarm.id, { lastFiredAt: new Date().toISOString() })`
   - Returns `{ stop: () => clearInterval(intervalId), evaluateNow: () => tick(location) }`

6. Export `handleMissedAlarms()` — for tab visibility change:
   - Gets enabled alarms and active location
   - For each alarm, evaluates against current time (catches up any that should have fired while tab was hidden)
   - Fires and updates as in tick()

Integration in `src/index.js`:
- Import `{ initAlarmEngine }` from `./alarms/engine.js`
- Import `{ invalidateCache }` from `./alarms/astro-cache.js`
- After `initConverterPanel()` call, add:
  ```js
  let alarmEngine = null;
  // Initialize alarm engine when location is ready
  initLocationSystem((location) => {
    updateClock(location);
    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => updateClock(location), 864);

    // Reinitialize alarm engine with new location
    if (alarmEngine) alarmEngine.stop();
    alarmEngine = initAlarmEngine();
  });
  ```
- Add `visibilitychange` event listener: when tab becomes visible, call `handleMissedAlarms()`
- When location changes in `initLocationSystem` callback, call `invalidateCache()` to refresh astro events
</action>
<acceptance_criteria>
- File `src/alarms/engine.js` exists
- Exports `initAlarmEngine` function (grep for `export function initAlarmEngine`)
- `initAlarmEngine` returns object with `stop` and `evaluateNow` methods
- Uses `setInterval` with `864` ms for tick checking
- `tick` function calls `getEnabledAlarms()`, iterates, calls `evaluateAlarm()`
- Fires notifications via `fireNotifications(alarm)`
- Deletes one-time alarms via `deleteAlarm(alarm.id)`
- Updates recurring alarms with `lastFiredAt` via `updateAlarm`
- Exports `handleMissedAlarms` function (grep for `export function handleMissedAlarms`)
- `src/index.js` imports from `./alarms/engine.js` (grep for `alarms/engine`)
- `src/index.js` imports `invalidateCache` from `./alarms/astro-cache.js`
- `src/index.js` calls `initAlarmEngine()` in location callback
- `src/index.js` has `visibilitychange` event listener (grep for `visibilitychange`)
- `src/index.js` calls `invalidateCache()` on location change
</acceptance_criteria>
</task 1>

<task 2>
<read_first>
- src/template.html — HTML shell to add alarm overlay container
- src/index.js (modified in task 1) — verify integration
</read_first>
<action>
Update `src/template.html` to add an empty container for the alarm overlay (the overlay is dynamically created by JS, but having a container in the HTML ensures it's always available). Actually, since `showAlarmOverlay` in notifications.js creates the overlay dynamically via `document.createElement`, no HTML changes are needed.

However, add a meta tag for notification-related permissions in the head (optional but good practice):
```html
<!-- Alarms fire only when tab is open (Phase 6) -->
```

The main integration verification:
1. Run `npm run build` — should succeed without errors
2. Run `npm test` — all existing tests plus new alarm tests should pass
3. Verify the import chain: index.js → alarms/engine.js → alarms/evaluator.js → alarms/astro-cache.js, alarms/store.js, alarms/notifications.js
</action>
<acceptance_criteria>
- `npm run build` exits with code 0
- `npm test` passes all tests (existing + new alarm tests)
- `src/index.js` contains `import` from `./alarms/engine.js`
- `src/index.js` contains `initAlarmEngine()` call
- `src/index.js` contains `visibilitychange` listener
- No console errors when running `npm start` in browser
- Total test count increases (verify with `npm test` output)
</acceptance_criteria>
</task 2>

<task 3>
<read_first>
- src/alarms/engine.js (created in task 1)
- src/alarms/evaluator.js — evaluateAlarm function
- src/alarms/store.js — addAlarm, deleteAlarm
- src/alarms/notifications.js — fireNotifications
</read_first>
<action>
Create `tests/alarms/engine.test.js` with integration-level tests for the alarm engine:

1. Mock dependencies:
   - `../../src/alarms/store.js` — mock `getEnabledAlarms`, `updateAlarm`, `deleteAlarm`
   - `../../src/alarms/evaluator.js` — mock `evaluateAlarm`
   - `../../src/alarms/notifications.js` — mock `fireNotifications`
   - `../../src/location/store.js` — mock `getActiveLocation`

2. Test `initAlarmEngine`:
   - Returns object with `stop()` and `evaluateNow()` methods
   - Sets up interval for tick checking
   - `stop()` clears the interval

3. Test tick behavior:
   - When `evaluateAlarm` returns true for an alarm, `fireNotifications` is called
   - When one-time alarm fires, `deleteAlarm` is called
   - When recurring alarm fires, `updateAlarm` is called with `lastFiredAt`

4. Test `evaluateNow`:
   - Manually triggers a tick evaluation
   - Verifies `getEnabledAlarms` is called
   - Verifies `evaluateAlarm` is called for each alarm

5. Test with no active location:
   - `getActiveLocation` returns null
   - Engine returns no-op `stop` and `evaluateNow` functions

6. Test `handleMissedAlarms`:
   - Calls `getEnabledAlarms` and evaluates each
   - Fires notifications for matching alarms
</action>
<acceptance_criteria>
- File `tests/alarms/engine.test.js` exists
- Contains `vi.mock` for store, evaluator, notifications modules
- Contains `describe('initAlarmEngine'`, `describe('handleMissedAlarms'`
- Tests `initAlarmEngine` returns `{ stop, evaluateNow }`
- Tests `stop()` clears interval (verify clearInterval called via vi.spyOn)
- Tests one-time alarm fires → `deleteAlarm` called
- Tests recurring alarm fires → `updateAlarm` called with `lastFiredAt`
- Tests no active location returns no-op functions
- `npm test` passes all engine tests
</acceptance_criteria>
</task 3>

---
---
phase: 06-alarm-system
plan: 08
wave: 3
depends_on: [07]
files_modified: [tests/integration/alarm-flow.test.js]
autonomous: true
---

# Plan 08: Integration Tests & End-to-End Flow Verification

<objective>
Create integration tests that verify the complete alarm flow from creation to firing, including store → evaluator → notifications chain. Tests one-time alarms, recurring alarms, astronomical event alarms, and composability with date filters. Addresses all requirements ALARM-01 through ALARM-04.
</objective>

<task 1>
<read_first>
- tests/integration/composer.test.js — integration test pattern
- src/alarms/store.js — alarm CRUD
- src/alarms/evaluator.js — condition evaluation
- src/alarms/notifications.js — notification firing
- src/alarms/templates.js — template build functions
- src/alarms/astro-cache.js — astronomical event caching
</read_first>
<action>
Create `tests/integration/alarm-flow.test.js` with the following integration test scenarios:

1. **Mock all external dependencies** (suncalc, astronomia, Notification API, AudioContext, localStorage)

2. **Test: One-time standard-time alarm flow**
   - Create alarm via `addAlarm` with `oneTime: true`, `condition.type === 'standard-time'`, `params: { hours: 12, minutes: 0 }`
   - Verify alarm saved to localStorage
   - Call `evaluateAlarm` with time matching 12:00:00
   - Verify returns true
   - Verify `fireNotifications` would be called
   - Verify alarm deleted after firing

3. **Test: Recurring daily astro-offset alarm flow**
   - Create alarm with `recurrence: 'daily'`, `condition.type === 'astro-offset'`, `params: { offsetMinutes: 30, event: 'sunrise' }`
   - Call `evaluateAlarm` with time 30 minutes after mocked sunrise
   - Verify returns true
   - Verify `lastFiredAt` updated (not deleted)

4. **Test: Composable alarm — 30 min after sunrise on full moon day**
   - Create alarm with `condition.type === 'astro-offset'`, `dateFilter: { type: 'lunar-phase', params: { phase: 'full-moon' } }`
   - Mock `isFullMoonDay` to return true
   - Call `evaluateAlarm` with time matching sunrise + 30 min
   - Verify returns true
   - Mock `isFullMoonDay` to return false
   - Call `evaluateAlarm` with same time
   - Verify returns false (date filter blocks)

5. **Test: Weekly recurrence with weekday filter**
   - Create alarm with `recurrence: 'weekly'`, `dateFilter: { type: 'weekdays', params: { days: [1,2,3,4,5] } }`
   - Test with Monday (getDay=1): evaluateAlarm returns true
   - Test with Saturday (getDay=6): evaluateAlarm returns false

6. **Test: Toggle alarm on/off**
   - Create alarm, verify enabled
   - Call `toggleAlarm(id)`, verify enabled === false
   - Call `evaluateAlarm`, verify returns false (disabled)
   - Call `toggleAlarm(id)`, verify enabled === true

7. **Test: Beat-time alarm**
   - Create alarm with `condition.type === 'beat-time'`, `params: { beat: 500 }`
   - Mock `computeBeats` to return `@500.00`
   - Call `evaluateAlarm`, verify returns true (within 1-beat tolerance)

8. **Test: Notification permission flow**
   - Call `ensureNotificationPermission` with mocked Notification API
   - Verify `requestPermission` is called when permission is 'default'
   - Verify returns true when granted

9. **Test: Audio context warm-up**
   - Call `playChime` for first time
   - Verify AudioContext is created
   - Verify oscillator is started and stopped
</action>
<acceptance_criteria>
- File `tests/integration/alarm-flow.test.js` exists
- Contains tests for: one-time alarm, recurring alarm, composable alarm, weekly recurrence, toggle, beat-time, notification permission, audio
- Test names include: "one-time standard-time alarm", "recurring daily astro-offset alarm", "composable alarm with date filter", "weekly recurrence weekday filter", "toggle alarm on/off", "beat-time alarm"
- Mocks `suncalc`, `astronomia`, `Notification`, `AudioContext`
- Verifies one-time alarm is deleted after firing
- Verifies recurring alarm has `lastFiredAt` updated
- Verifies composable alarm returns false when dateFilter doesn't match
- Verifies disabled alarm evaluateAlarm returns false
- `npm test` passes all integration tests
- Total test count >= 150 (existing ~250 + new alarm tests)
</acceptance_criteria>
</task 2>
