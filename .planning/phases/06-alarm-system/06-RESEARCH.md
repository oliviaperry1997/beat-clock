# Phase 6: Alarm System - Research

## Overview
This research covers the technical foundations needed to plan the alarm system: Browser Notification API patterns, audio chime implementation, alarm engine architecture, localStorage persistence schema, astronomical event computation, and composable template-based alarm conditions. All findings are grounded in the existing codebase patterns and dependencies.

---

## 1. Browser Notification API — Permission Flow & Best Practices

### API Overview
The standard `Notification` API (part of the Web Notifications API) displays system-level notifications outside the browser tab.

**Feature detection:**
```js
if (!('Notification' in window)) {
  // Browser does not support notifications
  return false;
}
```

**Permission states:**
- `'default'` — user has not been asked yet
- `'granted'` — user has allowed notifications
- `'denied'` — user has blocked notifications (cannot re-request without user manually changing browser settings)

### Permission Request Pattern

The critical rule: **`requestPermission()` MUST be called within a user gesture** (click event). Browsers (Firefox 72+, Safari) will silently ignore or block calls outside user gestures.

**Recommended pattern — lazy permission request:**
```js
async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  // Must be called from a user gesture (e.g., click handler)
  const result = await Notification.requestPermission();
  return result === 'granted';
}
```

**Integration strategy for Beat Clock:**
Request permission when the user first interacts with the alarm UI — for example, when they click "Create Alarm" or toggle notification on in the alarm settings panel. Do NOT request on page load. A subtle "Enable notifications" button in the alarm settings panel is the least intrusive approach.

### Creating Notifications
```js
function fireNotification(alarm) {
  if (Notification.permission !== 'granted') return;

  const notification = new Notification('Beat Clock', {
    body: alarm.label || 'Alarm',
    icon: '/icon.png',  // optional — can use a small clock emoji as fallback
    tag: `alarm-${alarm.id}`,  // unique tag per alarm to prevent stacking
    requireInteraction: false,  // let OS auto-dismiss (~4s)
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}
```

**Key options:**
- `tag` — notifications with the same tag replace each other. Use `alarm-${id}` to keep alarms distinct but prevent a single alarm from spamming.
- `requireInteraction: false` — don't force the notification to stay on screen. Let the OS handle dismissal.
- `icon` — optional. Without a proper icon file, the browser uses its default favicon.

### Mobile Consideration
The `Notification` constructor throws `TypeError` on most mobile browsers. Since this phase is tab-only (no service worker, deferred to Phase 7 PWA), mobile notifications will not work via the constructor. The in-app overlay and audio chime serve as the mobile fallback. This is acceptable for Phase 6.

### Browser Support
| Browser | Support | Notes |
|---------|---------|-------|
| Chrome 22+ | Full | Requires HTTPS |
| Firefox 22+ | Full | Requires user gesture (v72+) |
| Safari 6+ | Full | Requires user gesture |
| Mobile Safari | No | Throws TypeError — needs SW (Phase 7) |
| Mobile Chrome | Limited | May work on some Android versions |

**Risk:** Safari on macOS sometimes silently denies permission if requested without clear user context. The UI must explain why notifications are being requested.

---

## 2. Audio Chime Implementation — Web Audio API vs `<audio>` Element

### Option A: Web Audio API Oscillator (Recommended)

Generate a tone programmatically with no external assets:

```js
let audioCtx = null;

function playChime(frequency = 880, duration = 0.3, type = 'sine') {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  // Resume context if suspended (browser autoplay policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = type;       // 'sine', 'triangle', 'square', 'sawtooth'
  oscillator.frequency.value = frequency;  // Hz

  // Envelope: fade in quickly, sustain, fade out
  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02);  // Attack
  gainNode.gain.linearRampToValueAtTime(0.15, now + duration - 0.05);  // Sustain
  gainNode.gain.linearRampToValueAtTime(0, now + duration);  // Release

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}
```

**Pros:**
- Zero assets needed — no network requests, no bundling
- Full control over frequency, duration, envelope
- Lightweight (~10 lines of code)
- Works offline

**Cons:**
- Requires user gesture to resume `AudioContext` (autoplay policy) — same constraint as `<audio>`
- Slightly more code than `<audio>`
- Tone quality depends on browser's oscillator implementation

### Option B: `<audio>` Element with Base64-Encoded Sound

Embed a short chime as a base64 data URI:

```js
const alarmAudio = new Audio('data:audio/wav;base64,UklGR...');
alarmAudio.volume = 0.3;
alarmAudio.play().catch(() => {});  // handle autoplay rejection
```

**Pros:**
- Simple API — `new Audio(url).play()`
- Can use professionally designed sounds

**Cons:**
- Base64 adds ~1-3KB to the bundle for a short chime
- Need to source or create the audio file
- Less control over playback (no dynamic pitch/duration)
- Still requires user gesture for autoplay policy

### Option C: `<audio>` Element with External File

```js
const alarmAudio = new Audio('/sounds/chime.mp3');
alarmAudio.play().catch(() => {});
```

**Cons:** Adds a network request for the sound file — defeats the purpose of a lightweight personal tool.

### Recommendation

**Use Option A (Web Audio API oscillator)** for Phase 6:
- A gentle sine wave at 880 Hz for 300ms with a soft envelope
- No assets, no network requests, fully self-contained
- Matches the "subtle and ambient" aesthetic decision
- Can be enhanced with sound customization in a future phase

**Autoplay policy workaround:** Initialize the audio context on the first user interaction with the alarm UI (e.g., when opening the alarm panel or creating the first alarm). Play a silent tone to "warm up" the context:

```js
function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  // Play a silent 10ms tone to satisfy autoplay policy
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.01);
}
```

---

## 3. Alarm Engine Architecture — Tick-Based Checking

### Integration Point

The alarm engine hooks into the existing 864ms tick in `src/index.js`:

```js
// Current pattern in src/index.js:
updateInterval = setInterval(() => updateClock(location), 864);
```

Two architectural options:

### Option A: Inline Hook (Simplest)

Extend `updateClock()` to also check alarms:

```js
function updateClock(userLocation) {
  // ... existing clock logic ...
  checkAlarms(now, userLocation);  // NEW
}
```

**Pros:** Single tick source, no additional timers, trivial integration.
**Cons:** Couples alarm logic to clock rendering — if `updateClock` changes, alarms may break.

### Option B: Independent Engine with Shared Tick (Recommended)

Create an `AlarmEngine` that listens to tick events:

```js
// src/alarms/engine.js
export function initAlarmSystem(userLocation) {
  const engine = createAlarmEngine(userLocation);

  // Subscribe to the existing 864ms tick
  const intervalId = setInterval(() => {
    engine.tick(new Date(), userLocation);
  }, 864);

  return { stop: () => clearInterval(intervalId) };
}
```

Integration in `src/index.js`:
```js
let alarmSystem = null;
initLocationSystem((location) => {
  updateClock(location);
  if (updateInterval) clearInterval(updateInterval);
  updateInterval = setInterval(() => updateClock(location), 864);

  // Initialize alarm engine with the same location
  if (alarmSystem) alarmSystem.stop();
  alarmSystem = initAlarmSystem(location);
});
```

**Pros:** Decoupled, testable, follows the `initXxxSystem()` pattern established by `initLocationSystem` and `initConverterPanel`.
**Cons:** Slightly more boilerplate.

### Tick Evaluation Logic

On each tick, the engine:
1. Loads alarms from localStorage (or uses an in-memory cache)
2. For each enabled alarm, evaluates whether the current time matches the trigger condition
3. Fires all three notification channels for matching alarms
4. Marks the alarm as "fired" with a `lastFiredAt` timestamp to prevent re-firing within the same beat window

**Fired-state deduplication:**
```js
function shouldFire(alarm, now) {
  if (!alarm.enabled) return false;
  if (!alarm.lastFiredAt) return true;

  const timeSinceLastFire = now - new Date(alarm.lastFiredAt);
  // Don't re-fire within 2 beats (~1.7s) — prevents double-firing
  return timeSinceLastFire > 1728;
}

function markFired(alarm, now) {
  alarm.lastFiredAt = now.toISOString();
  saveAlarm(alarm);
}
```

### One-Time vs Recurring Behavior

- **One-time alarms:** After firing, automatically delete from localStorage.
- **Recurring alarms:** After firing, update `lastFiredAt` but keep the alarm. The next day's evaluation will match the next occurrence.

---

## 4. localStorage Alarm Persistence — Schema Design

### Existing Pattern (from `src/location/store.js`)

The project uses `beatclock:` prefix with two keys:
- `beatclock:locations` — JSON array of location objects
- `beatclock:activeLocationId` — string ID

### Proposed Alarm Schema

**Single key for all alarms:**
```
beatclock:alarms
```

Value: JSON array of alarm objects.

### Alarm Object Schema

```js
{
  id: 'alm_1712345678901',           // Unique ID (timestamp-based, matching loc_ pattern)
  label: 'Morning sunrise',           // User-facing name
  enabled: true,                      // Toggle on/off without deleting
  oneTime: false,                     // true = delete after firing
  recurrence: 'daily',                // 'daily' | 'weekly' | 'monthly' | 'lunar' | 'once'

  // Condition — composable template-based
  condition: {
    type: 'astro-offset',             // Template type identifier
    template: 'after-sunrise',        // Which template slot
    params: {
      offsetMinutes: 30,              // Minutes offset from the astro event
      event: 'sunrise',               // 'sunrise' | 'sunset' | 'solarNoon'
    },
    // Optional date filter for composability
    dateFilter: {
      type: 'lunar-phase',
      params: { phase: 'full-moon' }  // 'full-moon' | 'new-moon' | 'equinox' | 'solstice'
    }
  },

  // Notification settings
  notifications: {
    browser: true,                    // Browser Notification API
    inApp: true,                      // In-app glassmorphism overlay
    audio: true,                      // Audio chime
  },

  // Metadata
  createdAt: '2026-04-13T06:00:00.000Z',
  lastFiredAt: null,                  // ISO string or null (for dedup)
}
```

### Template Type Examples

**Time-based alarm (specific beat time):**
```js
{
  condition: {
    type: 'beat-time',
    template: 'at-beat',
    params: { beat: 512 }  // .beats value (0-1000)
  }
}
```

**Time-based (standard time):**
```js
{
  condition: {
    type: 'standard-time',
    template: 'at-time',
    params: { hours: 7, minutes: 30 }  // Local time
  }
}
```

**Astro offset (30 min after sunrise):**
```js
{
  condition: {
    type: 'astro-offset',
    template: 'after-sunrise',
    params: { offsetMinutes: 30, event: 'sunrise' }
  }
}
```

**Composable: 30 min after sunrise on full moon day:**
```js
{
  condition: {
    type: 'astro-offset',
    template: 'after-sunrise',
    params: { offsetMinutes: 30, event: 'sunrise' },
    dateFilter: {
      type: 'lunar-phase',
      params: { phase: 'full-moon' }
    }
  }
}
```

**Weekly recurring (Mon-Fri at 7:30):**
```js
{
  recurrence: 'weekly',
  condition: {
    type: 'standard-time',
    template: 'at-time',
    params: { hours: 7, minutes: 30 },
    dateFilter: {
      type: 'weekdays',
      params: { days: [1, 2, 3, 4, 5] }  // JS getDay(): 0=Sun, 1=Mon...
    }
  }
}
```

### Store Module Pattern (matching `src/location/store.js`)

```js
// src/alarms/store.js
const STORAGE_KEY = 'beatclock:alarms';

export function loadAlarms() { ... }    // JSON.parse from localStorage
export function saveAlarms(alarms) { ... }  // JSON.stringify to localStorage
export function addAlarm(alarm) { ... }
export function updateAlarm(id, updates) { ... }
export function deleteAlarm(id) { ... }
export function toggleAlarm(id) { ... }  // Flip enabled state
```

**Schema versioning consideration:** Add a `version: 1` field to the schema for future migrations. If the alarm schema changes, the engine can detect older versions and migrate or discard.

---

## 5. Template-Based Alarm Condition Builder

### Architecture

Templates are pre-defined condition configurations. Each template is a function that returns a condition object:

```js
// src/alarms/templates.js
const TEMPLATES = {
  'at-beat': {
    label: 'At specific beat time',
    category: 'time',
    params: [
      { key: 'beat', label: 'Beat (0-1000)', type: 'number', min: 0, max: 1000 }
    ],
    build(params) {
      return {
        type: 'beat-time',
        template: 'at-beat',
        params: { beat: Number(params.beat) }
      };
    }
  },

  'after-sunrise': {
    label: 'X minutes after sunrise',
    category: 'astro',
    params: [
      { key: 'offsetMinutes', label: 'Minutes after', type: 'number', min: 0, max: 1440 }
    ],
    build(params) {
      return {
        type: 'astro-offset',
        template: 'after-sunrise',
        params: { offsetMinutes: Number(params.offsetMinutes), event: 'sunrise' }
      };
    }
  },

  'before-sunset': {
    label: 'X minutes before sunset',
    category: 'astro',
    params: [
      { key: 'offsetMinutes', label: 'Minutes before', type: 'number', min: 0, max: 1440 }
    ],
    build(params) {
      return {
        type: 'astro-offset',
        template: 'before-sunset',
        params: { offsetMinutes: Number(params.offsetMinutes), event: 'sunset' }
      };
    }
  },

  'on-full-moon': {
    label: 'On full moon day',
    category: 'lunar',
    params: [],  // No parameters needed
    build() {
      return {
        type: 'date-trigger',
        template: 'on-full-moon',
        params: {},
        dateFilter: { type: 'lunar-phase', params: { phase: 'full-moon' } }
      };
    }
  },
  // ... more templates
};
```

### UI Pattern

1. User clicks "Add Alarm"
2. Template picker shows categorized list (Time / Astronomical / Lunar-Seasonal)
3. User picks a template → form with parameter slots appears
4. User fills in values → "Add Date Condition" button to optionally add a date filter
5. User sets recurrence (once / daily / weekly / lunar)
6. User sets label and notification preferences

### Composability Model

The composable model uses `condition.dateFilter` as an optional AND gate. The engine evaluates:
1. Does the primary condition match? (time or astro-offset)
2. If `dateFilter` is set, does the date filter also match today?

This covers "30 min after sunrise AND on full moon day" without needing a full rule engine. For more complex chains (multiple date filters, OR logic), a future version could extend the schema, but the AND gate covers the stated requirements.

---

## 6. Astronomical Event Computation

### Available Libraries and Functions

**suncalc** (already in dependencies):
- `SunCalc.getTimes(date, lat, lon)` — sunrise, sunset, solarNoon, civilDawn, civilDusk, etc.
- `SunCalc.getMoonIllumination(date)` — `fraction` (0=new, 1=full), `phase` (0-1)
- `SunCalc.getMoonPosition(date, lat, lon)` — altitude, azimuth, distance

**astronomia** (already in dependencies):
- `solstice.march(year)` — March equinox JDE
- `solstice.june(year)` — June solstice JDE
- `solstice.september(year)` — September equinox JDE
- `solstice.december(year)` — December solstice JDE
- `moonphase.newMoon(year)` — New moon JDE for a year
- `moonphase.fullMoon(year)` — Full moon JDE for a year
- `moonphase.firstQuarter(year)` — First quarter JDE
- `moonphase.lastQuarter(year)` — Last quarter JDE
- `julian.JDEToDate(jde)` — Convert JDE to JS Date

**lunar-javascript** (already in dependencies):
- `Solar.fromDate(date).getLunar()` — lunar month, day, isLeap

### Precompute Strategy (per D-05 and D-06)

At app startup and on location change, compute today's astronomical events and cache them:

```js
// src/alarms/astro-cache.js
import SunCalc from 'suncalc';
import { solstice, moonphase, julian } from 'astronomia';

let cachedEvents = null;
let cachedDate = null;  // Track which day the cache is for

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export function getAstroEvents(date, latitude, longitude) {
  // Return cached events if still valid for today
  if (cachedEvents && cachedDate && isSameDay(cachedDate, date)) {
    return cachedEvents;
  }

  // Recompute
  const times = SunCalc.getTimes(date, latitude, longitude);
  const moonIllum = SunCalc.getMoonIllumination(date);
  const year = date.getFullYear();

  // Equinox dates for this year (via astronomia)
  const marchEquinox = julian.JDEToDate(solstice.march(year));
  const septemberEquinox = julian.JDEToDate(solstice.september(year));

  // Full moon / new moon dates for this year
  const fullMoons = [];
  const newMoons = [];
  // astronomia returns one event per year; iterate through lunar months
  let jde = moonphase.fullMoon(year);
  for (let i = 0; i < 13; i++) {
    fullMoons.push(julian.JDEToDate(jde));
    jde += moonphase.meanLunarMonth;
  }

  cachedEvents = {
    sun: {
      sunrise: times.sunrise,
      sunset: times.sunset,
      solarNoon: times.solarNoon,
    },
    moon: {
      fraction: moonIllum.fraction,  // 0-1 illumination
      phase: moonIllum.phase,        // 0-1 phase
    },
    equinoxes: {
      march: marchEquinox,
      september: septemberEquinox,
    },
    lunarMonths: {
      fullMoons,
      newMoons,
    }
  };
  cachedDate = new Date(date);

  return cachedEvents;
}

export function invalidateCache() {
  cachedEvents = null;
  cachedDate = null;
}
```

**Key insight:** `astronomia`'s `moonphase.fullMoon(year)` returns the JDE for the first full moon of the year. Adding `moonphase.meanLunarMonth` (29.53059 days) iteratively gives all subsequent full moons. Same for new moons. This avoids needing to call the function 12 times.

### Moon Phase Detection on Any Given Day

To check if "today is a full moon day":

```js
function isFullMoonDay(date, moonFraction) {
  // Full moon = illumination >= 0.98 (nearly 100%)
  return moonFraction >= 0.98;
}

function isNewMoonDay(date, moonFraction) {
  // New moon = illumination <= 0.02 (nearly 0%)
  return moonFraction <= 0.02;
}
```

The `fraction` from `getMoonIllumination` is sufficient for "is it a full moon day" checks. The 0.98 threshold accounts for the fact that the exact full moon moment may not align with midnight — a day is "full moon" if the moon is essentially full at any point that day.

### Equinox Day Detection

```js
function isEquinoxDay(date, equinoxes) {
  const { march, september } = equinoxes;
  return isSameDay(date, march) || isSameDay(date, september);
}
```

### Performance Considerations

- The cache is computed once at startup (~1-2ms) and reused for all tick evaluations
- On location change, call `invalidateCache()` — the next tick will recompute
- astronomia's solstice/moonphase calculations are fast (pure math, no I/O)
- No need for Web Workers — the computation is trivial for a single user

---

## 7. Recurring Alarm Logic — Pattern Implementation

### Recurrence Types and Evaluation

```js
function matchesRecurrence(alarm, now, dateFilter) {
  const { recurrence } = alarm;

  switch (recurrence) {
    case 'once':
      return true;  // One-time alarms always match on their target time

    case 'daily':
      return true;  // Fires every day at the target time

    case 'weekly': {
      // Check if today is one of the target days
      if (dateFilter?.type === 'weekdays') {
        const today = now.getDay();  // 0=Sun, 1=Mon...
        return dateFilter.params.days.includes(today);
      }
      return true;  // No day filter = every day of week
    }

    case 'lunar': {
      // Fires on specific lunar events (full moon, new moon)
      if (dateFilter?.type === 'lunar-phase') {
        return matchesLunarPhase(now, dateFilter.params);
      }
      return true;
    }

    case 'monthly': {
      // Fires on the same day-of-month (e.g., 15th of every month)
      // OR on specific lunar events each month
      if (dateFilter?.type === 'lunar-phase') {
        return matchesLunarPhase(now, dateFilter.params);
      }
      return true;
    }

    default:
      return true;
  }
}
```

### Post-Fire Behavior

```js
function handleAlarmFire(alarm, now) {
  // Fire notifications...
  fireNotifications(alarm);

  if (alarm.oneTime || alarm.recurrence === 'once') {
    // Delete one-time alarms after firing
    deleteAlarm(alarm.id);
  } else {
    // Update lastFiredAt for dedup
    alarm.lastFiredAt = now.toISOString();
    saveAlarm(alarm);
  }
}
```

### The "Next Occurrence" Problem

For UI purposes (showing "Next alarm: Tomorrow at 7:30 AM"), compute the next fire time:

```js
function getNextFireTime(alarm, now) {
  // For time-based alarms:
  if (alarm.condition.type === 'standard-time') {
    const { hours, minutes } = alarm.condition.params;
    let next = new Date(now);
    next.setHours(hours, minutes, 0, 0);

    if (next <= now) {
      next.setDate(next.getDate() + 1);  // Tomorrow
    }

    // For weekly recurrence, advance to next matching day
    if (alarm.recurrence === 'weekly') {
      const allowedDays = alarm.condition.dateFilter?.params?.days || [0,1,2,3,4,5,6];
      while (!allowedDays.includes(next.getDay())) {
        next.setDate(next.getDate() + 1);
      }
    }

    return next;
  }

  // For astro-offset alarms, compute sun time for today or next day...
  // Similar logic, using astro events
}
```

---

## 8. Composable Alarm Conditions — Evaluation Engine

### Condition Evaluation Flow

```js
// src/alarms/evaluator.js
import { getAstroEvents } from './astro-cache.js';

export function evaluateAlarm(alarm, now, latitude, longitude) {
  if (!alarm.enabled) return false;

  const events = getAstroEvents(now, latitude, longitude);
  const { condition } = alarm;

  // Step 1: Evaluate primary condition
  const primaryMatches = evaluateCondition(condition, now, events);
  if (!primaryMatches) return false;

  // Step 2: Evaluate optional date filter (AND gate)
  if (condition.dateFilter) {
    const filterMatches = evaluateDateFilter(condition.dateFilter, now, events);
    if (!filterMatches) return false;
  }

  // Step 3: Evaluate recurrence
  if (!matchesRecurrence(alarm, now, condition.dateFilter)) return false;

  // Step 4: Dedup check
  if (!shouldFire(alarm, now)) return false;

  return true;
}
```

### Primary Condition Evaluators

```js
function evaluateCondition(condition, now, events) {
  switch (condition.type) {
    case 'beat-time': {
      // Convert current time to .beats and compare
      const currentBeats = computeBeats(now);  // Reuse existing beats computation
      return Math.abs(currentBeats - condition.params.beat) < 1;  // Within 1 beat tolerance
    }

    case 'standard-time': {
      const targetHour = condition.params.hours;
      const targetMinute = condition.params.minutes;
      const targetTime = new Date(now);
      targetTime.setHours(targetHour, targetMinute, 0, 0);
      // Within 1 beat (~864ms) tolerance
      return Math.abs(now - targetTime) < 864;
    }

    case 'astro-offset': {
      const { event, offsetMinutes } = condition.params;
      const astroTime = events.sun[event];  // sunrise, sunset, or solarNoon
      if (!astroTime || isNaN(astroTime.getTime())) return false;

      const targetTime = new Date(astroTime.getTime() + offsetMinutes * 60000);
      return Math.abs(now - targetTime) < 864;
    }

    case 'date-trigger': {
      // Pure date trigger (e.g., "on full moon day") — always true
      // The dateFilter does the actual work
      return true;
    }

    default:
      return false;
  }
}
```

### Date Filter Evaluators

```js
function evaluateDateFilter(filter, now, events) {
  switch (filter.type) {
    case 'lunar-phase': {
      const { phase } = filter.params;
      const fraction = events.moon.fraction;
      switch (phase) {
        case 'full-moon': return fraction >= 0.98;
        case 'new-moon': return fraction <= 0.02;
        default: return false;
      }
    }

    case 'equinox': {
      const { march, september } = events.equinoxes;
      return isSameDay(now, march) || isSameDay(now, september);
    }

    case 'weekdays': {
      const today = now.getDay();
      return filter.params.days.includes(today);
    }

    case 'solstice': {
      // Would need solstice.june() and solstice.december() from astronomia
      // Extend astro-cache to include these
      return false;  // Placeholder
    }

    default:
      return true;  // No filter = always match
  }
}
```

---

## Risks & Pitfalls

### 1. Notification Permission on Safari
Safari requires user gestures and may show a system-level permission dialog that users find alarming. **Mitigation:** Use a pre-permission explanation UI (small text explaining "This lets us notify you when alarms fire, even if the tab is in the background").

### 2. Autoplay Policy Blocking Audio
Both Web Audio API and `<audio>` require user gestures before playing sound. **Mitigation:** Warm up the audio context on first alarm UI interaction (as described in Section 2).

### 3. Tab Visibility and Alarm Firing
If the user switches tabs and comes back, alarms that should have fired while the tab was hidden may be missed (since the setInterval still runs but notifications may be suppressed by the browser). **Mitigation:** On `visibilitychange` event back to visible, check if any alarms should have fired during the hidden period and fire them retroactively. This is a design decision — the planner should decide whether to backfire missed alarms or skip them.

### 4. localStorage Size Limits
localStorage has a ~5-10MB limit per origin. Alarms are lightweight (~500 bytes each), so even 1000 alarms would only consume ~500KB. **Not a practical concern** for this use case.

### 5. Clock Drift in setInterval
The 864ms `setInterval` may drift over time. Browsers also throttle `setInterval` in background tabs (minimum 1000ms in Chrome). **Mitigation:** The 1-beat tolerance (864ms) already accounts for this. For alarms with exact time targets, use `setTimeout` with a computed delay to the target time for sub-beat precision if needed.

### 6. Equinox/Solstice Year Boundary
`astronomia`'s solstice functions return events for a calendar year. If the app is open on Dec 31, the cache needs to include the next year's equinox/solstice dates. **Mitigation:** Precompute for current year + 1, or invalidate cache at midnight and recompute.

### 7. Moon Phase Ambiguity
A "full moon day" is defined by the moon's illumination fraction >= 0.98, but the exact full moon moment may be at any hour. A day could have peak illumination at 11:59 PM or 12:01 AM, making it "full" on adjacent days depending on timezone. **Mitigation:** Use a generous threshold (0.98) and accept that a "full moon day" may span 1-2 calendar days near the peak.

### 8. Performance with Many Alarms
With N alarms checked every 864ms, the cost is O(N) per tick. Each evaluation involves a few arithmetic operations and one cache lookup. **100 alarms = ~100 comparisons per tick = negligible.** Even 1000 alarms would be imperceptible.

---

## Recommendations for the Planner

1. **Module structure:** Split into 4 files — `engine.js` (tick loop), `evaluator.js` (condition evaluation), `store.js` (localStorage CRUD), `templates.js` (template definitions). Follow the `src/location/` pattern.

2. **Notification permission timing:** Request on the first alarm creation attempt, not on page load. Show a brief explanation before calling `requestPermission()`.

3. **Audio:** Use Web Audio API oscillator with a soft sine wave (880 Hz, 300ms). Warm up the context on first alarm UI interaction.

4. **Alarm engine integration:** Create `initAlarmSystem(location)` that subscribes to the existing 864ms tick. Call it from `src/index.js` alongside `initLocationSystem` and `initConverterPanel`.

5. **Composable conditions:** Use the `condition.dateFilter` AND-gate pattern. This covers all stated requirements (e.g., "30 min after sunrise on full moon day") without needing a full rule parser.

6. **Precompute strategy:** Cache all astronomical events at startup and on location change. Include equinox/solstice dates for current + next year to avoid year-boundary issues.

7. **Missed alarm handling:** On tab visibility change back to visible, evaluate all enabled alarms against the time range since the tab was hidden. Fire any that should have triggered. This is a judgment call — the planner may choose to skip missed alarms instead.

8. **Schema versioning:** Include `version: 1` in the alarm schema for future-proofing. The store can migrate or discard on version mismatch.

9. **Testing strategy:** Each evaluator function is pure and easily unit-testable. The engine's tick loop can be tested with mock timers (Vitest's `vi.useFakeTimers()`). The store can be tested with mocked localStorage.

10. **CSS patterns:** Reuse the established glassmorphism patterns from `src/location/ui.js` and `src/styles.css` for the alarm overlay UI. The alarm overlay should feel like a natural extension of the location modal.
