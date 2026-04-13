# Phase 4 Plan: Datetime Converters

**Phase:** 04-datetime-converters  
**Wave:** 1-3 (parallelizable within waves)  
**depends_on:** Phase 2 (modular core — compose()), Phase 3 (location store)  
**files_modified:**
- `src/chronometers/reverse.js` (new — reverse conversion logic)
- `src/converters/ui.js` (new — converter panel UI)
- `src/converters/picker.js` (new — flatpickr integration)
- `src/converters/styles.css` (new — converter panel styles)
- `src/index.js` (modified — init converter system)
- `src/template.html` (modified — add converter panel container)
- `package.json` (modified — add flatpickr dependency)
- `tests/converters/reverse.test.js` (new — reverse conversion tests)
- `tests/converters/ui.test.js` (new — converter UI tests)

**autonomous:** true

---

## Phase Goal

Build bidirectional converters between Gregorian datetime and Beat Clock time systems. Provide a separate converter panel below the clock for historical lookup, reverse conversion, and cross-timezone comparison.

### Must Haves
- Gregorian → Beat Clock conversion (reuse compose())
- Beat Clock → Gregorian reverse conversion (composite key: beats + Holocene + lunisolar)
- Historical lookup for any date+time
- Cross-timezone comparison using saved locations
- Converter panel below clock (separate from main clock display)
- flatpickr datetime picker
- Ambiguity disclaimers on reverse conversion results
- All existing tests remain green (92+ tests)

### Requirements
- CONVERT-01: Gregorian ↔ Holocene/Beats converter
- CONVERT-02: Cross-timezone converter (compare across locations using saved locations from Phase 3)
- CONVERT-03: Historical date lookup

---

## Wave 1: Core Converter Logic

### Task 1.1: Install flatpickr dependency

**read_first:**
- `package.json` (see current dependencies structure)

**acceptance_criteria:**
- `package.json` contains `"flatpickr"` in `dependencies` section
- `npm install` completes without errors
- `node_modules/flatpickr` directory exists after install

**action:**
Run `npm install flatpickr` to add flatpickr as a dependency. Verify `package.json` now includes `"flatpickr": "^4.x.x"` (or latest) in the `dependencies` object alongside existing entries: `"astronomia"`, `"fuse.js"`, `"lunar-javascript"`, `"suncalc"`.

---

### Task 1.2: Create reverse conversion module (src/chronometers/reverse.js)

**read_first:**
- `src/chronometers/beats.js` (forward beats formula — beats are UTC+1/BMT)
- `src/chronometers/holocene.js` (Holocene year ticks on CNY)
- `src/chronometers/lunisolar.js` (lunar-javascript usage pattern: Solar.fromDate, getLunar)
- `src/chronometers/index.js` (compose() function signature: compose(date, opts))
- `.planning/phases/04-datetime-converters/04-RESEARCH.md` (reverse algorithms, code examples)

**acceptance_criteria:**
- `src/chronometers/reverse.js` exists and exports these named functions:
  - `beatsToBMTTime(beats)` — returns `{ hours, minutes, seconds }` object
  - `bmtToUTC(bmtTime)` — returns `{ hours, minutes, seconds }` with hours adjusted by -1
  - `reverseBeatClock({ beats, holoceneYear, lunisolarMonth, lunisolarDay })` — returns `{ gregorianDate, confidence, disclaimer, yearRange? }`
  - `getHoloceneYearRange(holoceneYear)` — returns `{ start: Date, end: Date }` (CNY to CNY)
- `beatsToBMTTime(500)` returns `{ hours: 12, minutes: 0, seconds: 0 }` (500 * 86.4 = 43200 seconds = 12 hours)
- `beatsToBMTTime(0)` returns `{ hours: 0, minutes: 0, seconds: 0 }`
- `bmtToUTC({ hours: 12, minutes: 0, seconds: 0 })` returns `{ hours: 11, minutes: 0, seconds: 0 }`
- `bmtToUTC({ hours: 0, minutes: 0, seconds: 0 })` returns `{ hours: 23, minutes: 0, seconds: 0 }` (wraps around)
- `reverseBeatClock` returns `confidence: 'exact-datetime'` when all four inputs (beats, holoceneYear, lunisolarMonth, lunisolarDay) are provided
- `reverseBeatClock` returns `confidence: 'year-range'` when only holoceneYear is provided
- `reverseBeatClock` returns a `disclaimer` string containing "86.4-second" when beats are provided
- `getHoloceneYearRange(12026)` returns a range where start date is Chinese New Year 2026 (~Feb 17, 2026) and end date is Chinese New Year 2027
- File imports `Lunar` from `'lunar-javascript'` for CNY date calculation
- Reverse function uses `Lunar.fromYmd(gregorianYear, lunisolarMonth, lunisolarDay).getSolar()` for lunisolar→solar conversion

**action:**
Create `src/chronometers/reverse.js` with these four exported functions:

1. **`beatsToBMTTime(beats)`**: Convert a beats value (0-999.99) to BMT (UTC+1) time.
   ```
   totalSeconds = beats * 86.4
   hours = Math.floor(totalSeconds / 3600)
   minutes = Math.floor((totalSeconds % 3600) / 60)
   seconds = Math.floor(totalSeconds % 60)
   return { hours, minutes, seconds }
   ```

2. **`bmtToUTC(bmtTime)`**: Convert BMT time to UTC by subtracting 1 hour with wraparound:
   ```
   utcHours = (bmtTime.hours - 1 + 24) % 24
   return { hours: utcHours, minutes: bmtTime.minutes, seconds: bmtTime.seconds }
   ```

3. **`getHoloceneYearRange(holoceneYear)`**: Returns the Gregorian date range for a Holocene year.
   ```
   gregorianYear = holoceneYear - 9700
   cnyStart = Lunar.fromYmd(gregorianYear, 1, 1).getSolar()
   cnyEnd = Lunar.fromYmd(gregorianYear + 1, 1, 1).getSolar()
   return {
     start: new Date(Date.UTC(cnyStart.getYear(), cnyStart.getMonth() - 1, cnyStart.getDay())),
     end: new Date(Date.UTC(cnyEnd.getYear(), cnyEnd.getMonth() - 1, cnyEnd.getDay()))
   }
   ```

4. **`reverseBeatClock({ beats, holoceneYear, lunisolarMonth, lunisolarDay })`**: Composite reverse converter.
   - If only `beats` provided: return `{ gregorianDate: null, confidence: 'time-only', bmtTime: beatsToBMTTime(beats), disclaimer: 'Beat value provides time only. Add Holocene year and lunisolar date for full datetime. Beat values represent an 86.4-second window. Exact instant may vary ±43.2 seconds.' }`
   - If `holoceneYear` provided (without lunisolar): call `getHoloceneYearRange(holoceneYear)`, return `{ gregorianDate: null, confidence: 'year-range', yearRange, disclaimer: '...same disclaimer...' }`
   - If `holoceneYear` AND `lunisolarMonth` AND `lunisolarDay` provided (without beats): use `Lunar.fromYmd(holoceneYear - 9700, lunisolarMonth, lunisolarDay).getSolar()` to get the Gregorian date, return `{ gregorianDate: new Date(Date.UTC(solar.getYear(), solar.getMonth() - 1, solar.getDay())), confidence: 'exact-date', disclaimer: 'Beat values represent an 86.4-second window...' }`
   - If ALL four provided: get date from lunisolar, get time from beats via `beatsToBMTTime()` → `bmtToUTC()`, set UTC hours/minutes/seconds on the date, return `{ gregorianDate, confidence: 'exact-datetime', disclaimer: 'Beat values represent an 86.4-second window. Exact instant may vary ±43.2 seconds.' }`
   - Any missing inputs return `null` for that component. Minimum input is `beats` alone.

---

### Task 1.3: Create tests for reverse conversion module

**read_first:**
- `tests/pure/beats.test.js` (test patterns: Date.UTC usage, vitest imports)
- `tests/integration/composer.test.js` (integration test patterns)
- `src/chronometers/reverse.js` (the file being tested — created in Task 1.2)

**acceptance_criteria:**
- `tests/converters/reverse.test.js` exists
- Test file uses `// @vitest-environment node` pragma
- Test file imports from `'vitest'` (describe, it, expect) and `'../../src/chronometers/reverse.js'`
- Contains `describe('reverse conversion', () => { ... })` block
- At least 10 individual `it()` test cases covering:
  - `beatsToBMTTime(500)` → `{ hours: 12, minutes: 0, seconds: 0 }`
  - `beatsToBMTTime(0)` → `{ hours: 0, minutes: 0, seconds: 0 }`
  - `beatsToBMTTime(250)` → `{ hours: 6, minutes: 0, seconds: 0 }`
  - `bmtToUTC({ hours: 12, minutes: 0, seconds: 0 })` → `{ hours: 11, minutes: 0, seconds: 0 }`
  - `bmtToUTC({ hours: 0, minutes: 0, seconds: 0 })` → `{ hours: 23, minutes: 0, seconds: 0 }`
  - `getHoloceneYearRange(12026)` returns range where start is Feb 2026 and end is Feb 2027
  - `reverseBeatClock({ beats: 500 })` returns confidence `'time-only'` and disclaimer containing `'86.4-second'`
  - `reverseBeatClock({ beats: 500, holoceneYear: 12026, lunisolarMonth: 1, lunisolarDay: 1 })` returns confidence `'exact-datetime'` and a non-null `gregorianDate` that is a JavaScript Date object
  - `reverseBeatClock({ holoceneYear: 12026 })` returns confidence `'year-range'` and non-null `yearRange` with `start` and `end` properties
  - `npm test` passes (all existing 92+ tests AND new reverse tests)

**action:**
Create `tests/converters/reverse.test.js` with a `describe('reverse conversion')` block containing these test cases:

1. `it('converts @500.00 beats to 12:00:00 BMT', ...)` — expect `beatsToBMTTime(500)` to equal `{ hours: 12, minutes: 0, seconds: 0 }`
2. `it('converts @000.00 beats to 00:00:00 BMT', ...)` — expect `beatsToBMTTime(0)` to equal `{ hours: 0, minutes: 0, seconds: 0 }`
3. `it('converts @250.00 beats to 06:00:00 BMT', ...)` — expect `beatsToBMTTime(250)` to equal `{ hours: 6, minutes: 0, seconds: 0 }`
4. `it('converts BMT 12:00 to UTC 11:00', ...)` — expect `bmtToUTC({ hours: 12, minutes: 0, seconds: 0 })` to equal `{ hours: 11, minutes: 0, seconds: 0 }`
5. `it('wraps BMT 00:00 to UTC 23:00', ...)` — expect `bmtToUTC({ hours: 0, minutes: 0, seconds: 0 })` to equal `{ hours: 23, minutes: 0, seconds: 0 }`
6. `it('returns Holocene year range spanning CNY to CNY', ...)` — call `getHoloceneYearRange(12026)`, expect `range.start.getUTCFullYear()` to be 2026, `range.start.getUTCMonth()` to be 1 (February, 0-indexed), `range.end.getUTCFullYear()` to be 2027
7. `it('returns time-only confidence with beats only', ...)` — call `reverseBeatClock({ beats: 500 })`, expect `result.confidence` to be `'time-only'`, `result.disclaimer` to contain `'86.4-second'`, `result.gregorianDate` to be `null`
8. `it('returns exact-datetime confidence with full composite key', ...)` — call `reverseBeatClock({ beats: 500, holoceneYear: 12026, lunisolarMonth: 1, lunisolarDay: 1 })`, expect `result.confidence` to be `'exact-datetime'`, `result.gregorianDate` to be instance of `Date`
9. `it('returns year-range confidence with Holocene year only', ...)` — call `reverseBeatClock({ holoceneYear: 12026 })`, expect `result.confidence` to be `'year-range'`, `result.yearRange` to have `start` and `end` properties that are Date objects
10. `it('includes disclaimer about 86.4-second window when beats provided', ...)` — call `reverseBeatClock({ beats: 500, holoceneYear: 12026, lunisolarMonth: 1, lunisolarDay: 1 })`, expect `result.disclaimer` to contain `'86.4-second'`

---

## Wave 2: Converter UI Panel

### Task 2.1: Add converter panel container to HTML template

**read_first:**
- `src/template.html` (current HTML structure with `#beats-container` and `#location-selector`)
- `src/index.js` (current init pattern: updateClock, initLocationSystem)

**acceptance_criteria:**
- `src/template.html` contains a `<div id="converter-panel">` element after `<div id="beats-container">`
- `src/template.html` contains `<link>` or `<style>` reference for flatpickr CSS (will be added via import, so just the container is needed)
- `src/template.html` still contains `<div id="location-selector">` and `<div id="beats-container">` (not removed)
- `src/index.js` contains `import { initConverterPanel } from './converters/ui.js'`

**action:**
Modify `src/template.html`: Add `<div id="converter-panel"></div>` after the existing `<div id="beats-container"></div>`. Keep all existing elements (`location-selector`, `beats-container`).

Modify `src/index.js`: Add import line `import { initConverterPanel } from './converters/ui.js';` at the top alongside existing imports. After `initLocationSystem(...)` call, add `initConverterPanel();` to initialize the converter panel.

---

### Task 2.2: Create converter panel UI module (src/converters/ui.js)

**read_first:**
- `src/location/ui.js` (UI module patterns: DOM creation, event listeners, render functions)
- `src/chronometers/index.js` (compose() function — call for Gregorian→Beat Clock conversion)
- `src/chronometers/reverse.js` (reverseBeatClock — call for Beat Clock→Gregorian reverse)
- `src/styles.css` (existing CSS patterns: glassmorphism, rgba backgrounds, backdrop-filter)

**acceptance_criteria:**
- `src/converters/ui.js` exists and exports `initConverterPanel()` function
- `initConverterPanel()` creates DOM with these elements inside `#converter-panel`:
  - `<div class="converter-panel">` wrapper
  - `<h2>` with text "Datetime Converters"
  - Tab switcher with two tabs: `<button data-tab="gregorian-to-clock">` with text "Gregorian → Clock" and `<button data-tab="clock-to-gregorian">` with text "Clock → Gregorian"
  - `<div id="converter-gregorian-to-clock">` panel for Gregorian→Clock conversion
  - `<div id="converter-clock-to-gregorian">` panel for Clock→Gregorian reverse conversion
  - Gregorian→Clock panel contains:
    - `<input id="converter-datetime-input">` for flatpickr datetime picker
    - `<div id="converter-result">` for displaying result
  - Clock→Gregorian panel contains:
    - `<input id="reverse-beats-input" type="number" min="0" max="999.99" step="0.01" placeholder="@XXX.XX">`
    - `<input id="reverse-holocene-input" type="number" placeholder="Holocene year (e.g. 12026)">`
    - `<input id="reverse-lunar-month-input" type="number" min="1" max="12" placeholder="Lunar month (1-12)">`
    - `<input id="reverse-lunar-day-input" type="number" min="1" max="30" placeholder="Lunar day (1-30)">`
    - `<button id="reverse-convert-btn">` with text "Convert"
    - `<div id="reverse-result">` for displaying result
    - `<div id="reverse-disclaimer">` for disclaimer text
- Tab switching works: clicking a tab button shows its panel and hides the other (panels have `hidden` class toggle)
- `initConverterPanel()` does NOT crash if `#converter-panel` element doesn't exist in DOM (returns early)
- Gregorian→Clock panel calls `compose(date, opts)` when datetime changes and displays result in format: `H{holocene} M{month} D{day} {beats} {solar}`
- Clock→Gregorian panel calls `reverseBeatClock()` when Convert button clicked and displays result with disclaimer

**action:**
Create `src/converters/ui.js` with the following structure:

1. **`initConverterPanel()`** — Main entry point. Gets `#converter-panel` element. If not found, return early. Creates inner HTML with tab switcher and two panels. Attaches event listeners for tab switching. Calls `initGregorianToClockPicker()` and `initClockToGregorianForm()`.

2. **Tab HTML structure:**
   ```html
   <div class="converter-panel">
     <h2>Datetime Converters</h2>
     <div class="converter-tabs">
       <button class="converter-tab active" data-tab="gregorian-to-clock">Gregorian → Clock</button>
       <button class="converter-tab" data-tab="clock-to-gregorian">Clock → Gregorian</button>
     </div>
     <div id="converter-gregorian-to-clock" class="converter-panel-content">
       <input id="converter-datetime-input" placeholder="Select date and time..." />
       <div id="converter-result"></div>
     </div>
     <div id="converter-clock-to-gregorian" class="converter-panel-content hidden">
       <input id="reverse-beats-input" type="number" min="0" max="999.99" step="0.01" placeholder="@XXX.XX" />
       <input id="reverse-holocene-input" type="number" placeholder="Holocene year (e.g. 12026)" />
       <input id="reverse-lunar-month-input" type="number" min="1" max="12" placeholder="Lunar month (1-12)" />
       <input id="reverse-lunar-day-input" type="number" min="1" max="30" placeholder="Lunar day (1-30)" />
       <button id="reverse-convert-btn">Convert</button>
       <div id="reverse-result"></div>
       <div id="reverse-disclaimer"></div>
     </div>
   </div>
   ```

3. **Tab switching logic:** Click on `.converter-tab` → remove `active` class from all tabs, add to clicked. Show corresponding panel (remove `hidden`), hide other panel (add `hidden`).

4. **`initGregorianToClockPicker()`** — Initializes flatpickr on `#converter-datetime-input` (see Task 2.3). On `onChange`, calls `compose(selectedDate, activeLocation)` and displays result text in `#converter-result` using format: `H{holocene} M{monthStr} D{day} {beats} {solar}` where monthStr uses leap format (`isLeap ? '${month}X' : '${month}'`).

5. **`initClockToGregorianForm()`** — On `#reverse-convert-btn` click: reads values from the four inputs, calls `reverseBeatClock({ beats, holoceneYear, lunisolarMonth, lunisolarDay })`, displays result in `#reverse-result`. If `gregorianDate` is not null, format as `YYYY-MM-DD HH:MM:SS UTC`. Display disclaimer from result in `#reverse-disclaimer`. If `gregorianDate` is null, display "Insufficient input — provide at least beats, or beats + Holocene year + lunar date for full conversion."

6. Uses `getActiveLocation()` from `'../location/store.js'` to get lat/lon for solar calculations in Gregorian→Clock conversion. If no active location, passes `{}` opts (solar will show `S??`).

---

### Task 2.3: Create flatpickr integration (src/converters/picker.js)

**read_first:**
- `src/converters/ui.js` (created in Task 2.2 — sees how picker is used)
- `src/chronometers/index.js` (compose() function called on picker onChange)
- `.planning/phases/04-datetime-converters/04-RESEARCH.md` (flatpickr setup pattern)

**acceptance_criteria:**
- `src/converters/picker.js` exists and exports `initGregorianToClockPicker(inputElement, onConvert)` function
- Function creates flatpickr instance with these config options:
  - `enableTime: true`
  - `dateFormat: "Y-m-d H:i"`
  - `time_24hr: true`
  - `defaultDate: new Date()`
  - `onChange` callback calls `onConvert(selectedDates[0])` with the selected Date
- File imports `flatpickr` from `'flatpickr'`
- File imports `'flatpickr/dist/flatpickr.min.css'`
- Returns the flatpickr instance
- `npm test` passes (no regression from existing tests)

**action:**
Create `src/converters/picker.js`:
```javascript
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';

export function initGregorianToClockPicker(inputElement, onConvert) {
  return flatpickr(inputElement, {
    enableTime: true,
    dateFormat: 'Y-m-d H:i',
    time_24hr: true,
    defaultDate: new Date(),
    onChange: (selectedDates, dateStr) => {
      if (selectedDates.length > 0 && selectedDates[0]) {
        onConvert(selectedDates[0]);
      }
    }
  });
}
```

---

### Task 2.4: Create converter panel CSS styles

**read_first:**
- `src/styles.css` (existing CSS patterns: rgba backgrounds, backdrop-filter, border-radius, transitions, .hidden class)
- `src/converters/ui.js` (created in Task 2.2 — sees CSS class names used)

**acceptance_criteria:**
- `src/converters/styles.css` exists
- Contains `.converter-panel` class with: `max-width: 600px`, `margin: 1rem auto`, `padding: 1.5rem`, `background: rgba(0, 0, 0, 0.8)`, `border: 1px solid rgba(255, 255, 255, 0.2)`, `border-radius: 12px`, `backdrop-filter: blur(20px)`
- Contains `.converter-tabs` with `display: flex`, `gap: 0.5rem`, `margin-bottom: 1rem`
- Contains `.converter-tab` with padding, background, border-radius, cursor:pointer, and `.converter-tab.active` with different background
- Contains `.converter-panel-content` and `.converter-panel-content.hidden` (hidden has `display: none`)
- Contains `#converter-datetime-input`, `#reverse-beats-input`, `#reverse-holocene-input`, `#reverse-lunar-month-input`, `#reverse-lunar-day-input` styling: `width: 100%`, `padding: 0.75rem`, `background: rgba(255, 255, 255, 0.1)`, `border: 1px solid rgba(255, 255, 255, 0.2)`, `border-radius: 8px`, `color: inherit`
- Contains `#converter-result`, `#reverse-result`, `#reverse-disclaimer` styling: `margin-top: 1rem`, `padding: 0.75rem`, `background: rgba(255, 255, 255, 0.05)`, `border-radius: 8px`
- Contains `#reverse-disclaim` styling with `color: rgba(255, 255, 255, 0.6)`, `font-size: 0.85rem`, `font-style: italic`
- Contains `#reverse-convert-btn` styling: `width: 100%`, `padding: 0.75rem`, `background: rgba(255, 255, 255, 0.2)`, `border: none`, `border-radius: 8px`, `color: inherit`, `cursor: pointer`
- CSS file is imported in `src/index.js` via `import './converters/styles.css';`

**action:**
Create `src/converters/styles.css` with the style rules specified in acceptance_criteria. All styles follow the existing glassmorphism pattern from `src/styles.css`: dark rgba backgrounds, white rgba borders, backdrop-filter blur, border-radius 8-12px.

Modify `src/index.js` to add `import './converters/styles.css';` alongside existing CSS import.

---

### Task 2.5: Wire converter panel into main app entry point

**read_first:**
- `src/index.js` (current entry point — sees init pattern, imports)
- `src/converters/ui.js` (created in Task 2.2 — exports initConverterPanel)
- `src/converters/styles.css` (created in Task 2.4)

**acceptance_criteria:**
- `src/index.js` contains these import statements:
  - `import { initConverterPanel } from './converters/ui.js';`
  - `import './converters/styles.css';`
- `src/index.js` calls `initConverterPanel()` after `initLocationSystem(...)` initialization
- `src/index.js` still calls `updateClock(null)` for immediate render on page load
- `src/index.js` still calls `initLocationSystem(...)` with the callback that sets up updateInterval
- `npm test` passes (no regression)

**action:**
Modify `src/index.js` to add two imports at the top:
1. `import { initConverterPanel } from './converters/ui.js';`
2. `import './converters/styles.css';`

After the existing `initLocationSystem(...)` call block, add: `initConverterPanel();`

---

## Wave 3: Cross-Timezone Comparison + Integration

### Task 3.1: Add cross-timezone comparison panel to converter UI

**read_first:**
- `src/converters/ui.js` (created in Task 2.2 — existing tab/panel structure)
- `src/location/store.js` (loadLocations, getActiveLocation — reuse for cross-timezone)
- `src/chronometers/index.js` (compose() — called for each location)
- `src/chronometers/reverse.js` (not needed for cross-timezone, but read for context)

**acceptance_criteria:**
- `src/converters/ui.js` has a third tab: `<button data-tab="cross-timezone">` with text "Cross-Timezone"
- `src/converters/ui.js` has a third panel: `<div id="converter-cross-timezone" class="converter-panel-content hidden">`
- Cross-timezone panel contains:
  - `<input id="cross-timezone-datetime-input">` for flatpickr datetime picker (reuse picker module)
  - `<div id="cross-timezone-locations">` container for location comparison results
  - `<button id="cross-timezone-compare-btn">` with text "Compare"
- `#cross-timezone-locations` displays results as a table or list showing each saved location's:
  - Location name
  - Beats value (same across all locations)
  - Solar percent (varies by location)
  - Holocene year
  - Lunisolar date
- Cross-timezone panel calls `loadLocations()` from `'../location/store.js'` to get saved locations
- For each saved location, calls `compose(instant, { latitude: loc.lat, longitude: loc.lon })` and displays results
- If no saved locations exist, displays message: "Save locations first in the location selector to compare across timezones."
- Tab switching includes the new cross-timezone tab (shows/hides correctly with `hidden` class)
- `npm test` passes

**action:**
Modify `src/converters/ui.js`:

1. Add third tab button in the tabs HTML: `<button class="converter-tab" data-tab="cross-timezone">Cross-Timezone</button>`

2. Add third panel HTML:
   ```html
   <div id="converter-cross-timezone" class="converter-panel-content hidden">
     <input id="cross-timezone-datetime-input" placeholder="Select date and time..." />
     <button id="cross-timezone-compare-btn">Compare</button>
     <div id="cross-timezone-locations"></div>
   </div>
   ```

3. Create `initCrossTimezonePicker()` function:
   - Initializes flatpickr on `#cross-timezone-datetime-input` (reuse pattern from picker module)
   - On `#cross-timezone-compare-btn` click: calls `loadLocations()` from `'../location/store.js'`
   - If locations array is empty, set `#cross-timezone-locations` innerHTML to `<p class="no-locations-msg">Save locations first in the location selector to compare across timezones.</p>`
   - Otherwise, for each location, call `compose(instant, { latitude: loc.lat, longitude: loc.lon })` and build result HTML
   - Result format per location:
     ```
     <div class="timezone-result">
       <h3>{loc.name}</h3>
       <div class="result-value">H{holocene} M{monthStr} D{day} {beats} {solar}</div>
     </div>
     ```
   - Highlight that beats are identical across locations (add visual indicator or note)

4. Update tab switching logic to handle the third tab.

---

### Task 3.2: Add CSS styles for cross-timezone comparison results

**read_first:**
- `src/converters/styles.css` (created in Task 2.4 — existing converter styles)
- `src/styles.css` (existing patterns for reference)

**acceptance_criteria:**
- `src/converters/styles.css` contains `.timezone-result` class with: `padding: 0.75rem`, `margin-top: 0.5rem`, `background: rgba(255, 255, 255, 0.05)`, `border-radius: 8px`
- Contains `.timezone-result h3` with: `font-size: 0.95rem`, `margin-bottom: 0.25rem`
- Contains `.timezone-result .result-value` with: `font-size: 1rem`, `font-weight: 600`
- Contains `.no-locations-msg` with: `color: rgba(255, 255, 255, 0.6)`, `font-style: italic`, `padding: 1rem`, `text-align: center`
- Contains `#cross-timezone-compare-btn` styling matching `#reverse-convert-btn` pattern
- Contains `#cross-timezone-datetime-input` styling matching other converter inputs

**action:**
Append these CSS rules to `src/converters/styles.css`:
```css
.timezone-result {
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
}

.timezone-result h3 {
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.timezone-result .result-value {
  font-size: 1rem;
  font-weight: 600;
}

.no-locations-msg {
  color: rgba(255, 255, 255, 0.6);
  font-style: italic;
  padding: 1rem;
  text-align: center;
}

#cross-timezone-compare-btn {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 8px;
  color: inherit;
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  margin-top: 0.75rem;
  transition: background 150ms ease-out;
}

#cross-timezone-compare-btn:enabled:hover {
  background: rgba(255, 255, 255, 0.3);
}

#cross-timezone-datetime-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: inherit;
  font: inherit;
  font-size: 1rem;
}
```

---

### Task 3.3: Create tests for converter UI

**read_first:**
- `tests/location/ui.test.js` (UI test patterns: jsdom environment, DOM mocking, vitest)
- `tests/converters/reverse.test.js` (created in Task 1.3 — test file structure)
- `src/converters/ui.js` (created in Task 2.2 and 3.1 — the file being tested)

**acceptance_criteria:**
- `tests/converters/ui.test.js` exists
- Test file uses `// @vitest-environment jsdom` pragma
- Test file imports from `'vitest'` (describe, it, expect, beforeEach, vi)
- Contains `describe('converter UI', () => { ... })` block
- At least 5 individual `it()` test cases covering:
  - `initConverterPanel()` creates DOM with `#converter-gregorian-to-clock` and `#converter-clock-to-gregorian` panels
  - Tab switching works: clicking "Clock → Gregorian" tab shows `#converter-clock-to-gregorian` and hides `#converter-gregorian-to-clock`
  - Cross-timezone tab exists: panel contains `#converter-cross-timezone` element
  - Reverse convert form has inputs: `#reverse-beats-input`, `#reverse-holocene-input`, `#reverse-lunar-month-input`, `#reverse-lunar-day-input`, `#reverse-convert-btn`
  - `initConverterPanel()` returns early without error when `#converter-panel` doesn't exist
- `npm test` passes (all existing tests + new UI tests + new reverse tests)

**action:**
Create `tests/converters/ui.test.js` with these test cases:

1. Set up DOM in `beforeEach`: create `#converter-panel` div, append to document.body. Clean up in `afterEach`.

2. `it('creates converter panels with correct structure', ...)` — import and call `initConverterPanel()`, query for `#converter-gregorian-to-clock` and `#converter-clock-to-gregorian`, expect both to exist (not null).

3. `it('switches tabs correctly', ...)` — call `initConverterPanel()`, find the "Clock → Gregorian" tab button (data-tab="clock-to-gregorian"), click it, expect `#converter-clock-to-gregorian` to NOT have `hidden` class and `#converter-gregorian-to-clock` to have `hidden` class.

4. `it('includes cross-timezone tab and panel', ...)` — call `initConverterPanel()`, query for `[data-tab="cross-timezone"]` and `#converter-cross-timezone`, expect both to exist.

5. `it('has reverse conversion form inputs', ...)` — call `initConverterPanel()`, query for `#reverse-beats-input`, `#reverse-holocene-input`, `#reverse-lunar-month-input`, `#reverse-lunar-day-input`, `#reverse-convert-btn`, expect all to exist.

6. `it('returns early when converter-panel container is missing', ...)` — remove `#converter-panel` from DOM, call `initConverterPanel()`, expect no error thrown (function should return undefined or early).

---

### Task 3.4: Run full test suite and fix any regressions

**read_first:**
- `vitest.config.js` (test configuration)
- `package.json` (test script: `npm test`)

**acceptance_criteria:**
- `npm test` exits with code 0 (all tests pass)
- Test output shows at least 100 tests passing (92 existing + at least 8 new)
- No test failures, no errors
- All three test files in `tests/converters/` exist: `reverse.test.js`, `ui.test.js`
- All existing test files still pass (no regression from phases 1-3)

**action:**
Run `npm test`. If any tests fail, diagnose and fix:
- If reverse conversion tests fail: check `src/chronometers/reverse.js` logic (beats formula, lunisolar conversion)
- If UI tests fail: check DOM element IDs match between `src/converters/ui.js` and test selectors
- If existing tests fail: check that `src/index.js` modifications didn't break imports, check that flatpickr CSS import doesn't affect jsdom
- Re-run `npm test` until all tests pass.

---

## Verification Criteria

Phase is complete when:

1. **CONVERT-01**: Gregorian → Clock conversion works via flatpickr datetime picker → compose() → displays `H{year} M{month} D{day} {beats} {solar}`
2. **CONVERT-01**: Clock → Gregorian reverse conversion works via composite input (beats + Holocene + lunisolar) → reverseBeatClock() → displays Gregorian datetime with disclaimer
3. **CONVERT-02**: Cross-timezone comparison shows multiple saved locations side-by-side with identical beats and varying solar percents
4. **CONVERT-03**: Historical lookup works — any past or future date+time can be entered and converted
5. Converter panel is visible below the clock on page load (separate panel, not modal)
6. flatpickr datetime picker is functional (24hr format, date+time selection)
7. Reverse conversion displays ambiguity disclaimer ("86.4-second window")
8. All existing tests pass (92+ from phases 1-3)
9. New tests exist and pass (reverse.test.js, ui.test.js)
10. `npm test` exits 0 with 100+ total tests

---

## Risk Mitigation

- **flatpickr CSS in jsdom tests**: If flatpickr CSS import causes jsdom issues, use dynamic import or conditional import in test environment
- **lunar-javascript leap month edge cases**: reverse converter handles negative month values via `Lunar.fromYmd()` which accepts them natively
- **No saved locations for cross-timezone**: Graceful message displayed instead of empty results
- **Pre-Gregorian dates**: lunar-javascript supports 1900-2100; dates outside this range will produce `S??` or `??` via composer's try/catch
