# Phase 3: Location System — Research

**Date:** 2026-04-13
**Status:** Research complete — ready for planning

---

## 1. City Database Options (D-01, D-02)

Three viable options exist for a bundled, offline-capable city database. All are evaluated against the decision to include ~5,000–10,000 major cities with a target file size of ~1–2MB.

### Option A: `worldcities` (Recommended)

| Property | Value |
|---|---|
| npm package | `worldcities` |
| Version | 0.1.8 |
| Cities | ~24,343 (population > 1,000 or admin seats) |
| Source | GeoNames Gazetteer |
| License | Unlicense (public domain) |
| Fields | `city`, `city_alt`, `lat`, `lng`, `country`, `iso2`, `iso3`, `admin_name`, `capital`, `population`, `id` |
| Uncompressed JSON | ~6–8 MB (full dataset) |
| Filtered (pop > 15,000, ~5,000–10,000 cities) | ~800 KB – 1.2 MB uncompressed, ~150–250 KB gzipped |
| Dependencies | None |

**Pros:**
- Zero dependencies, Unlicense — no attribution required
- Well-structured, clean schema with population field for easy filtering
- Actively maintained wrapper around GeoNames
- Can pre-filter to major cities at build time

**Cons:**
- Full bundle is ~6–8 MB; requires pre-filtering step
- Some city name ambiguity without admin_name disambiguation

### Option B: `cities.json`

| Property | Value |
|---|---|
| npm package | `cities.json` |
| Version | 1.1.50 |
| Cities | ~130,000 (population > 1,000 or admin seats down to PPLA3) |
| Source | GeoNames Gazetteer |
| License | CC-BY 4.0 (attribution required) |
| Fields | `id` (geonamesid), `name`, `country` (ISO alpha-2), `admin1`, `admin2`, `lat`, `lon`, `pop` |
| Uncompressed JSON | ~15–20 MB (full dataset) |
| Dependencies | None |

**Pros:**
- Rich metadata including geonamesid for disambiguation
- Regularly updated from GeoNames

**Cons:**
- Much larger dataset; more filtering work needed
- CC-BY license requires attribution notice
- ~130K cities is overkill for this use case

### Option C: Custom extraction from GeoNames

Download `cities15000.zip` from geonames.org directly (~20,000 cities, ~3 MB uncompressed TSV).

| Property | Value |
|---|---|
| Cities | ~20,000 (population > 15,000) |
| Source | geonames.org/export/download/ |
| License | CC-BY 4.0 |
| Format | TSV (needs conversion to JSON) |

**Pros:**
- Direct control over filtering criteria
- Smallest raw download from source

**Cons:**
- Requires build script to convert TSV to JSON
- CC-BY attribution required
- Manual maintenance burden

### Recommendation

**Use `worldcities` v0.1.8 with a pre-filter build step.** Create a script at `scripts/filter-cities.js` that:
1. Reads the full `worldcities` JSON
2. Filters to cities with `population > 15000`
3. Outputs only needed fields: `{ id, name, country, admin_name, lat, lng, population }`
4. Writes to `src/data/cities.json`

This produces a filtered file of ~5,000–10,000 cities at ~800 KB–1.2 MB uncompressed, ~150–250 KB gzipped. Well within the 1–2 MB target.

**Estimated final bundle impact:**
- Filtered cities JSON: ~1 MB (uncompressed) → ~200 KB (gzipped)
- With Webpack, this loads as a static import; gzipped transfer over network is the real cost
- At 200 KB gzipped, load time on 3G is ~1–2 seconds — acceptable for a one-time load

---

## 2. Fuzzy Search Implementation (D-03)

### Option A: `fuse.js` (Recommended)

| Property | Value |
|---|---|
| npm package | `fuse.js` |
| Version | 7.3.0 (latest as of 2026-04) |
| Minified + gzipped | ~5.2 KB |
| Dependencies | None |
| License | Apache-2.0 |

**Pros:**
- Industry-standard fuzzy search for JavaScript
- Configurable threshold, keys, weighting
- Supports multi-field search (search city name AND country simultaneously)
- Tiny bundle footprint (~5 KB gzipped)
- Zero dependencies

**Cons:**
- Requires indexing the city list at runtime (trivial for 5,000–10,000 items)

**Usage pattern:**
```js
import Fuse from 'fuse.js';
import cities from '../data/cities.json';

// Filter to major cities at module load
const majorCities = cities.filter(c => c.population > 15000);

// Initialize Fuse index
const fuse = new Fuse(majorCities, {
  keys: [
    { name: 'name', weight: 0.7 },
    { name: 'admin_name', weight: 0.2 },
    { name: 'country', weight: 0.1 }
  ],
  threshold: 0.3,        // 0.0 = exact, 1.0 = match anything
  includeScore: true,
  minMatchCharLength: 2,
  useExtendedSearch: true
});

// Search
const results = fuse.search('londn').slice(0, 10);
// Returns: [{ item: { name: 'London', country: 'GB', ... }, score: 0.12 }]
```

### Option B: Custom Levenshtein implementation

A hand-rolled implementation using Levenshtein distance or trigram matching.

**Pros:**
- No external dependency
- Full control over algorithm

**Cons:**
- Non-trivial to implement well (~200–400 lines of code)
- fuse.js is only 5 KB gzipped — savings are negligible
- Reinventing a well-tested wheel

### Recommendation

**Use fuse.js v7.3.0.** The 5 KB gzipped cost is trivial and the API is clean. Configure with weighted keys so city name matches rank higher than country matches.

---

## 3. localStorage Patterns (D-04, D-05, D-07, D-08)

### Data model

```js
// Single location object
{
  id: "loc_1712345678",        // Unique ID (timestamp-based or UUID)
  name: "London",              // Display name (city name or custom label)
  country: "GB",               // ISO 3166-1 alpha-2
  adminName: "England",        // State/region (optional)
  latitude: 51.5074,           // Decimal degrees
  longitude: -0.1278,          // Decimal degrees
  population: 8982000,         // From city database (optional for manual entries)
  source: "search",            // "search" | "manual" | "geolocation"
  createdAt: 1712345678000     // Timestamp
}

// localStorage schema
{
  "beatclock:locations": [
    { id: "loc_1", name: "London", ... },
    { id: "loc_2", name: "Tokyo", ... }
  ],
  "beatclock:activeLocationId": "loc_1"
}
```

### Storage module pattern

```js
// src/location/store.js
const STORAGE_KEYS = {
  LOCATIONS: 'beatclock:locations',
  ACTIVE_ID: 'beatclock:activeLocationId'
};

export function loadLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocations(locations) {
  localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
}

export function getActiveLocationId() {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
}

export function setActiveLocationId(id) {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
  }
}

export function getActiveLocation() {
  const locations = loadLocations();
  const activeId = getActiveLocationId();
  return locations.find(loc => loc.id === activeId) || null;
}

export function addLocation(location) {
  const locations = loadLocations();
  const id = location.id || `loc_${Date.now()}`;
  const entry = { ...location, id, createdAt: location.createdAt || Date.now() };
  locations.push(entry);
  saveLocations(locations);

  // If this is the first location, make it active
  if (locations.length === 1) {
    setActiveLocationId(id);
  }

  return entry;
}

export function removeLocation(id) {
  let locations = loadLocations();
  locations = locations.filter(loc => loc.id !== id);
  saveLocations(locations);

  // If active was removed, clear active
  if (getActiveLocationId() === id) {
    setActiveLocationId(locations.length > 0 ? locations[0].id : null);
  }
}

export function switchActiveLocation(id) {
  const locations = loadLocations();
  const exists = locations.some(loc => loc.id === id);
  if (exists) {
    setActiveLocationId(id);
    return locations.find(loc => loc.id === id);
  }
  return null;
}
```

### Key considerations

- **localStorage quota:** ~5–10 MB per origin. Even with 100 saved locations, the JSON will be < 100 KB — no risk of hitting limits.
- **Serialization:** JSON.stringify/parse is fast enough for this data size. No need for IndexedDB.
- **Error handling:** Always wrap localStorage access in try/catch — it can throw on quota exceeded or in private browsing modes.
- **Key namespacing:** Prefix with `beatclock:` to avoid collisions with other apps on the same origin.

---

## 4. Browser Geolocation API (D-12, D-13, D-14, D-15, D-16)

### Current API behavior

```js
navigator.geolocation.getCurrentPosition(success, error, options);
```

**Options:**
```js
{
  enableHighAccuracy: false,  // Use GPS/WiFi; true = more accurate but slower + more battery
  timeout: 10000,             // Max time in ms before error code 3 (TIMEOUT)
  maximumAge: 300000          // Accept cached position up to 5 minutes old
}
```

**Error codes:**
| Code | Constant | Meaning |
|---|---|---|
| 1 | `PERMISSION_DENIED` | User denied the request |
| 2 | `POSITION_UNAVAILABLE` | Location info not available (network issue, etc.) |
| 3 | `TIMEOUT` | Operation timed out |

### Known issues (2025–2026)

- **Chrome timeout bug:** Recent Chrome updates have caused `getCurrentPosition` to frequently return error code 3 (TIMEOUT) even with reasonable timeout values. This happens when the OS location services hang and the browser's internal timer fires before the callback.
- **Workaround:** Use a shorter timeout (5–8 seconds), and always provide a fallback path. Do NOT rely on the `timeout` option alone — wrap the call in a `Promise.race` with your own timeout for reliability.

### Robust geolocation wrapper

```js
// src/location/geolocation.js

export function detectLocation(options = {}) {
  const {
    timeout = 8000,  // Shorter than default — fail fast and fall back
    enableHighAccuracy = false
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    // Own timeout wrapper (Chrome bug workaround)
    const timer = setTimeout(() => {
      reject(new Error('Geolocation request timed out'));
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        clearTimeout(timer);
        const messages = {
          1: 'Location permission denied',
          2: 'Location unavailable',
          3: 'Location request timed out'
        };
        reject(new Error(messages[error.code] || 'Unknown geolocation error'));
      },
      { enableHighAccuracy, timeout: timeout + 2000, maximumAge: 300000 }
    );
  });
}

export function isGeolocationAvailable() {
  return !!(navigator && navigator.geolocation);
}
```

### Permission state detection

```js
// Check if permission was previously denied (non-invasive)
async function getPermissionState() {
  if (navigator.permissions && navigator.permissions.query) {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted' | 'denied' | 'prompt'
    } catch {
      // Not all browsers support this
      return 'unknown';
    }
  }
  return 'unknown';
}
```

### First-run flow (D-14, D-15, D-16)

```
Page loads
  |
  v
Has saved locations in localStorage?
  |
  +-- YES --> Load active location --> Show clock (skip geolocation)
  |
  +-- NO  --> First visit
              |
              v
          Call detectLocation()
              |
              +-- SUCCESS --> Save as first location --> Show clock
              |
              +-- FAILURE --> Show search prompt (D-16)
                              |
                              v
                          Show city search UI with "detect location" button
```

---

## 5. UI Patterns for Location Selection (D-06, D-07)

### Recommended: Dropdown + sidebar pattern

For a vanilla JS project, the simplest effective pattern:

```
+------------------------------------------+
|  Beat Clock                        [v]   |  <- Dropdown showing active city
|                                          |
|  H2026 M4 D13 @567 S45                   |
|                                          |
|  [Manage Locations]                      |  <- Opens modal/panel
+------------------------------------------+
```

**Manage Locations modal/panel:**
```
+------------------------------------------+
|  Saved Locations                    [x]  |
+------------------------------------------+
|  [Search cities...]          [ lat/lon ] |  <- Toggle: search | manual
|                                          |
|  Search results:                         |
|  * London, England, GB                   |
|  * Londonderry, Northern Ireland, GB     |
|  * Longyearbyen, Svalbard, NO            |
|                                          |
|  --- or ---                              |
|  [Detect my location]                    |
|                                          |
|  Saved:                                  |
|  (•) London, England, GB        [remove] |  <- Active indicator
|  ( ) Tokyo, Japan               [remove] |
|  ( ) New York, NY, US           [remove] |
|                                          |
|  [+ Add this location]                   |
+------------------------------------------+
```

### DOM structure

```html
<!-- Location selector dropdown -->
<div id="location-selector" class="location-selector">
  <button id="location-toggle" class="location-toggle">
    <span id="active-location-name">London, GB</span>
    <span class="dropdown-arrow">▼</span>
  </button>
  <div id="location-dropdown" class="location-dropdown hidden">
    <div id="saved-locations" class="saved-locations"></div>
    <button id="manage-locations-btn" class="manage-btn">Manage Locations...</button>
  </div>
</div>

<!-- Location manager modal -->
<div id="location-manager" class="modal hidden">
  <div class="modal-content">
    <div class="modal-header">
      <h2>Saved Locations</h2>
      <button id="close-manager">×</button>
    </div>

    <!-- Mode toggle -->
    <div class="mode-toggle">
      <button id="mode-search" class="active">Search City</button>
      <button id="mode-manual">Enter Coordinates</button>
    </div>

    <!-- Search panel -->
    <div id="search-panel">
      <input type="text" id="city-search" placeholder="Search cities..." />
      <div id="search-results"></div>
      <button id="detect-location-btn">
        <span class="icon">◎</span> Detect my location
      </button>
    </div>

    <!-- Manual input panel -->
    <div id="manual-panel" class="hidden">
      <input type="number" id="manual-lat" placeholder="Latitude" step="any" min="-90" max="90" />
      <input type="number" id="manual-lon" placeholder="Longitude" step="any" min="-180" max="180" />
      <input type="text" id="manual-name" placeholder="Location name (optional)" />
      <button id="add-manual-btn">Add Location</button>
      <div id="manual-error" class="error hidden"></div>
    </div>

    <!-- Saved locations list -->
    <div id="saved-list">
      <h3>Saved Locations</h3>
      <ul id="saved-list-items"></ul>
    </div>
  </div>
</div>
```

### Why this pattern

- **Dropdown** is low-cognitive-load for switching between already-saved locations
- **Modal** provides room for search, manual input, and management without cluttering the main clock view
- **Toggle** between search/manual is a simple CSS class swap
- **Vanilla JS** friendly — no framework needed, just DOM manipulation

---

## 6. Lat/Lon Validation (D-10, D-11)

### Validation rules

```js
// src/location/validation.js

export function validateLatitude(value) {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'Latitude must be a number' };
  }
  if (num < -90 || num > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  return { valid: true, value: num };
}

export function validateLongitude(value) {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'Longitude must be a number' };
  }
  if (num < -180 || num > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  return { valid: true, value: num };
}

export function validateLocationInput(lat, lon) {
  const latResult = validateLatitude(lat);
  if (!latResult.valid) return latResult;

  const lonResult = validateLongitude(lon);
  if (!lonResult.valid) return lonResult;

  return {
    valid: true,
    latitude: latResult.value,
    longitude: lonResult.value
  };
}

// Optional: reverse lookup against city database to suggest a name
export function findNearestCity(lat, lon, cities, maxDistanceKm = 25) {
  // Simple nearest-neighbor using Haversine formula
  let nearest = null;
  let minDist = maxDistanceKm;

  for (const city of cities) {
    const dist = haversineDistance(lat, lon, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...city, distance: dist };
    }
  }

  return nearest;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

### UX flow for manual input

1. User enters lat/lon
2. Validate ranges in real-time (on input blur or keyup)
3. If valid, optionally run `findNearestCity()` to auto-fill a display name
4. If nearest city found within 25 km, suggest: "Nearest city: London, GB. Use this name?"
5. If no city found, let user enter a custom name
6. Save to locations list

---

## 7. File Size Architecture

### Complete bundle impact estimate

| Component | Uncompressed | Gzipped |
|---|---|---|
| Filtered cities JSON (5K–10K cities) | ~800 KB – 1.2 MB | ~150–250 KB |
| fuse.js v7.3.0 | ~16 KB | ~5.2 KB |
| Location manager module (src/location/) | ~8–12 KB | ~3–4 KB |
| CSS additions (modal, dropdown, search) | ~3–5 KB | ~1–2 KB |
| **Total additional** | **~830 KB – 1.23 MB** | **~160–260 KB** |

### Mitigation strategies

- **Lazy loading:** Only import fuse.js and city data when the user opens the location manager for the first time. Use dynamic `import()`:
  ```js
  async function initSearch() {
    const [{ default: Fuse }, { default: cities }] = await Promise.all([
      import('fuse.js'),
      import('../data/cities.json')
    ]);
    // Initialize fuse index
  }
  ```
- With lazy loading, the initial page load adds **zero bytes** — city data only loads on demand.
- **Webpack code splitting:** Configure `splitChunks` to put fuse.js and cities.json in a separate chunk.

---

## 8. Validation Architecture (Nyquist)

### Validation pillars for this phase

| Pillar | What to validate |
|---|---|
| **Input validation** | Lat/lon range checks, city search input (min 2 chars), location name length limits |
| **State validation** | Active location exists in saved list, localStorage data integrity on load |
| **Boundary conditions** | Empty saved list, single location, exactly at poles (lat ±90), date line (lon ±180), equator (lat 0, lon 0) |
| **Error recovery** | Corrupted localStorage data (JSON parse errors), geolocation permission denied → graceful fallback, Chrome timeout → retry suggestion |
| **Data consistency** | Saved locations have valid lat/lon, active location ID references an existing entry, no duplicate IDs |
| **Performance** | Search responds within 200ms for 10K cities, UI doesn't block during city indexing |

### Edge cases to handle

- User clears localStorage mid-session → reinitialize empty state
- User saves a location at exact coordinates where solar calculation fails (e.g., polar night regions) → solar.js already handles this (returns 'S??')
- Two cities with same name in different countries → show country/admin_name in results
- User tries to delete the only saved location → confirm or auto-clear active
- Multiple tabs open simultaneously → localStorage changes in one tab should reflect in others (use `storage` event listener)

### Cross-tab synchronization

```js
// Listen for location changes from other tabs
window.addEventListener('storage', (event) => {
  if (event.key === 'beatclock:locations' || event.key === 'beatclock:activeLocationId') {
    // Refresh UI to reflect new state
    renderSavedLocations();
    renderActiveLocation();
  }
});
```

---

## 9. npm Package Summary

| Package | Version | Purpose | Bundle Impact (gzipped) |
|---|---|---|---|
| `fuse.js` | 7.3.0 | Fuzzy city search | ~5.2 KB |
| `worldcities` | 0.1.8 | City database source | Filtered to ~150–250 KB |

### Dev dependencies (build-time only)

| Package | Purpose |
|---|---|
| (none needed) | City filtering can use a simple Node.js script with built-in fs module |

---

## 10. Integration with Existing Code

### How location system feeds into solar.js

The existing `updateClock(userLocation)` in `src/index.js` already accepts `{ latitude, longitude }`. The new location system replaces the geolocation bootstrap:

**Before (current):**
```js
navigator.geolocation.getCurrentPosition((position) => {
  updateClock({ latitude: position.coords.latitude, longitude: position.coords.longitude });
});
```

**After:**
```js
import { getActiveLocation } from './location/store.js';

const activeLocation = getActiveLocation();
if (activeLocation) {
  updateClock({ latitude: activeLocation.latitude, longitude: activeLocation.longitude });
} else {
  // First visit — attempt geolocation
  attemptFirstRunDetection();
}
```

### Module structure

```
src/
  location/
    store.js          # localStorage CRUD operations
    geolocation.js    # Browser geolocation wrapper
    validation.js     # Lat/lon validation + nearest city
    search.js         # Fuse.js wrapper for city search
    ui.js             # DOM rendering for selector, modal, search results
    cities.json       # Filtered city database (generated by build script)
  data/
    (or src/location/data/)

scripts/
  filter-cities.js    # Build script: reads worldcities, outputs filtered cities.json
```

### Replacing the geolocation bootstrap in index.js

The current `src/index.js` lines 24-44 (the `navigator.geolocation` block) should be replaced with:

```js
import { initLocationSystem } from './location/ui.js';

// Initialize location system (handles first-run, active location, etc.)
initLocationSystem((location) => {
  updateClock(location);
  setInterval(() => updateClock(location), 864);
});
```

---

## 11. Implementation Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Chrome geolocation timeout (error 3) | High | Medium | Short timeout + fallback to search prompt (already designed) |
| City database too large | Low | Medium | Pre-filter to pop > 15,000 at build time |
| localStorage quota exceeded | Very Low | Low | 5 MB limit, locations use < 100 KB even at 100 entries |
| Fuse.js slow on 10K cities | Very Low | Low | fuse.js handles 100K+ items in < 10ms |
| Ambiguous city names | Medium | Low | Show country/admin_name in results; include geonamesid for uniqueness |
| Private browsing blocks localStorage | Medium | Medium | Wrap in try/catch, fall back to in-memory state with warning |

---

## 12. Decision Traceability

| Decision | Research outcome |
|---|---|
| D-01: Bundle local city database | `worldcities` v0.1.8 + pre-filter build step |
| D-02: Major cities only (5K–10K) | Filter by population > 15,000 → ~5K–8K cities |
| D-03: Fuzzy matching | fuse.js v7.3.0, ~5 KB gzipped |
| D-04: No limit on saved locations | localStorage array pattern, no artificial cap |
| D-05: One active location | `beatclock:activeLocationId` key |
| D-06: Dropdown/sidebar selector | Dropdown for quick switch + modal for management |
| D-07: Saved list + active pattern | Array + activeId pattern in store.js |
| D-08: localStorage persistence | Keyed by `beatclock:locations` and `beatclock:activeLocationId` |
| D-10: Toggle search/manual input | Mode toggle with CSS class swap |
| D-12: Detect location button | Robust wrapper with 8s timeout + Chrome bug workaround |
| D-14: First-visit auto-detect | Check localStorage → empty → call geolocation |
| D-16: Auto-detect fails → search prompt | Graceful fallback to search UI |

---

*Research complete. All decisions (D-01 through D-16) have concrete implementation paths.*
*Ready for /gsd-plan-phase.*
