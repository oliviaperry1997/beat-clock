# Architecture Research — Modular Datetime Formats

**Date:** 2026-04-14
**Focus:** Integration with existing modular chronometry architecture

## Existing Architecture Overview

```
src/
├── chronometers/          # Time calculation modules
│   ├── composer.js        # Wraps all modules, orchestrates updates
│   ├── holocene.js        # Holocene year
│   ├── beats.js           # Swatch .beats
│   ├── solar.js           # Solar position/percent
│   ├── lunisolar.js       # Chinese lunisolar calendar
│   ├── oldSystem.js       # Legacy system
│   └── chineseNewYear.js  # Chinese year names
├── alarms/                # Alarm system (7 modules)
├── location/              # Location system (5 modules)
├── converters/            # Datetime converters
├── sky.js                 # Sky gradient system
├── index.js               # DOM bootstrap (33 lines)
└── styles.css             # Styles
```

**Key patterns:**
- Each chronometer module exports a `compute(date, location)` function
- Composer wraps each in try/catch, aggregates results
- 864ms tick interval drives updates
- `index.js` consumes composer output and updates DOM

## Proposed Architecture for Format System

### New Directory: `src/formats/`

Create a parallel structure for format-related modules:

```
src/formats/
├── registry.js            # Format registry — maps format IDs to render functions
├── config.js              # Format configuration (localStorage CRUD)
├── selectors/             # Format selector UI components
│   └── ui.js              # Dropdown selector manager
├── renderers/             # Format renderers — how each format displays
│   ├── year/
│   │   ├── holocene.js    # Renders Holocene year format
│   │   ├── gregorian.js   # Renders Gregorian year format
│   │   └── chinese.js     # Renders Chinese lunisolar year format
│   ├── date/
│   │   ├── holocene.js    # Renders Holocene date (M/D)
│   │   ├── gregorian.js   # Renders Gregorian date
│   │   ├── lunisolar.js   # Renders Lunisolar date
│   │   └── longitudinal.js # Renders Solar Lon + Lunar Phase angles
│   ├── stdtime/
│   │   ├── 24h.js         # Renders 24h time with meridian offset
│   │   ├── decimal.js     # Renders decimal beats with offset
│   │   └── longitudinal.js # Renders longitudinal time
│   └── solartime/
│       ├── 24h.js         # Renders local solar 24h time
│       ├── decimal.js     # Renders local solar decimal beats
│       ├── descriptive.js  # Renders time-of-day descriptions
│       └── descriptions.js # Description mapping (golden hour, etc.)
└── new-chronometers/      # New calculation modules
    ├── solarLongitude.js  # Solar ecliptic longitude (0-360°)
    ├── lunarPhase.js      # Lunar phase angle (0-360°)
    └── solarTime.js       # Solar time calculations (equation of time)
```

### Integration Points

#### 1. New Chronometer Modules

**`solarLongitude.js`** — Computes solar ecliptic longitude
- Uses `astronomia` for precise calculation
- Exports `compute(date)` → returns degrees (0-360)
- Integrates with existing composer pattern

**`lunarPhase.js`** — Computes lunar phase angle
- Uses `suncalc.getMoonIllumination()` 
- Exports `compute(date)` → returns degrees (0-360)
- Integrates with existing composer pattern

**`solarTime.js`** — Computes local solar time
- Uses `suncalc` for solar position + equation of time
- Exports `compute(date, location)` → returns solar time object
- Integrates with existing composer pattern

#### 2. Format Registry

The format registry is the **orchestration layer** between chronometer data and display:

```javascript
// registry.js
const formats = {
  year: {
    holocene: { label: 'Holocene', render: (data) => ..., needs: ['holocene'] },
    gregorian: { label: 'Gregorian', render: (data) => ..., needs: [] },
    chinese: { label: 'Chinese', render: (data) => ..., needs: ['chineseNewYear'] },
  },
  date: {
    holocene: { label: 'Holocene', render: (data) => ..., needs: ['holocene'] },
    gregorian: { label: 'Gregorian', render: (data) => ..., needs: [] },
    lunisolar: { label: 'Lunisolar', render: (data) => ..., needs: ['lunisolar'] },
    longitudinal: { label: 'Longitudinal', render: (data) => ..., needs: ['solarLongitude', 'lunarPhase'] },
  },
  // ... stdTime, solarTime
};

function getActiveFormat(component) → returns active format ID
function setFormat(component, formatId) → persists to localStorage
function render(component, data) → calls active format's render function
```

**Key design:** Registry does NOT compute values — it only selects *how to display* values that chronometers already compute. This keeps computation and presentation separate.

#### 3. Display Pipeline

Current pipeline:
```
Tick (864ms) → Composer.compute(date, location) → index.js updates DOM
```

New pipeline:
```
Tick (864ms) → Composer.compute(date, location) → Format Registry renders active formats → index.js updates DOM
```

The format registry sits *between* composer output and DOM update. It takes the raw chronometer data and formats it according to the user's active format selections.

#### 4. Configuration

Follow existing localStorage patterns:

```javascript
// config.js — mirrors alarm store and location storage patterns
const CONFIG_KEY = 'beatClock_formats_v1';
const CONFIG_VERSION = 1;

function load() → returns format config or defaults
function save(config) → persists to localStorage
function getFormat(component) → returns active format for component
function setFormat(component, formatId, options) → updates and persists
```

**Default config:**
```javascript
{
  version: 1,
  year: 'holocene',
  date: 'holocene',
  stdTime: { type: '24h', offset: 0 },      // UTC default
  solarTime: 'descriptive'                    // Descriptive default
}
```

#### 5. UI Integration

Format selectors attach to the existing clock display:

- Each component (Year, Date, StdTime, SolarTime) gets a `<select>` element
- Selectors are minimal — appear on hover/focus, subtle when idle
- `change` event → update format registry → re-render component
- Follows existing UI patterns from location modal and alarm UI

## Suggested Build Order

Considering dependencies:

1. **New chronometer modules** (solarLongitude, lunarPhase, solarTime) — foundation for longitudinal and solar time formats
2. **Format configuration** (localStorage CRUD) — needed before UI can work
3. **Format registry** — orchestrates format selection and rendering
4. **Year format renderers** — simplest (existing data, just display)
5. **Date format renderers** — includes longitudinal (depends on step 1)
6. **Standard Time format renderers** — meridian-based calculations
7. **Solar Time format renderers** — includes descriptive (depends on step 1)
8. **Format selector UI** — ties everything together
9. **Integration** — connect registry to display pipeline in index.js

## Modified index.js

Minimal changes to `index.js`:
- Import format registry
- After composer computes, pass data through registry renderers
- Initialize format selectors on DOM ready
- No change to tick interval or geolocation bootstrap

Estimated: +10-15 lines to `index.js` (similar to how alarm integration added ~5 lines).

---
*Research completed: 2026-04-14*
