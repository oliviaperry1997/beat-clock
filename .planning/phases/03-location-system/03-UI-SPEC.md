# Phase 3: Location System — UI Design Contract

**Created:** 2026-04-13
**Status:** Lightweight spec (not full /gsd-ui-phase workflow)
**Phase:** 03-location-system

---

## 1. Visual Design Principles

- **Atmospheric & ambient** — location UI should feel integrated with the clock, not a separate admin panel
- **Minimal chrome** — avoid heavy modals/dialogs; prefer inline overlays and smooth transitions
- **Typography-first** — city names should be prominent and readable
- **Subtle animations** — search results fade in, location selector slides smoothly

---

## 2. UI Components

### 2.1 Location Selector (Primary Component)

**Purpose:** Display saved locations and allow switching active location

**Placement:** Top-right corner of clock display, or integrated into header area

**Visual states:**
- **Default:** Shows active location name (e.g., "London, UK") with dropdown chevron icon
- **Hover:** Background highlight, cursor pointer
- **Open:** Dropdown panel appears below, showing list of saved locations
- **Empty state:** "+ Add Location" prompt

**Dropdown content:**
```
┌─────────────────────────────────┐
│ London, UK           ✓ Active   │
│ New York, US                    │
│ Tokyo, JP                       │
│                                 │
│ + Add Location...               │
└─────────────────────────────────┘
```

**Interactions:**
- Click dropdown → opens location list
- Click location → sets as active, closes dropdown, triggers clock update
- Click "+ Add Location..." → opens location manager modal
- Active location shows checkmark or highlight

**Responsive behavior:**
- Desktop: Dropdown panel
- Mobile: Bottom sheet or full-screen list

---

### 2.2 Location Manager Modal

**Purpose:** Add new locations via search, manual input, or geolocation

**Trigger:** "+ Add Location..." from dropdown or first-run flow

**Layout:**
```
┌──────────────────────────────────────────┐
│  Add Location                      [✕]   │
├──────────────────────────────────────────┤
│                                          │
│  🔍 Search city...                       │
│  ┌────────────────────────────────────┐  │
│  │ London, United Kingdom             │  │
│  │ London, Canada                     │  │
│  │ Londonderry, UK                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  — OR —                                  │
│                                          │
│  Latitude:  [51.5074    ]                │
│  Longitude: [-0.1278    ]                │
│  [Validate & Add]                        │
│                                          │
│  — OR —                                  │
│                                          │
│  📍 [Detect My Location]                 │
│                                          │
└──────────────────────────────────────────┘
```

**Sections:**

1. **Search Section (D-01, D-02, D-03)**
   - Input field with placeholder "Search city..."
   - Results appear below input as user types (debounced 200ms)
   - Each result shows: `City Name, Country/Region`
   - Fuzzy matching: partial queries match (e.g., "lon" → "London")
   - Click result → adds location, closes modal, triggers clock update

2. **Manual Input Section (D-10, D-11)**
   - Two input fields: Latitude (-90 to 90), Longitude (-180 to 180)
   - Real-time validation feedback (green border for valid, red for invalid)
   - "Validate & Add" button (disabled until both fields valid)
   - On success: adds location with auto-generated name (e.g., "51.5074, -0.1278" or nearest city if found)

3. **Geolocation Section (D-12, D-13)**
   - Single button: "📍 Detect My Location"
   - On click: shows loading spinner while detecting
   - Success: saves location with reverse geocoded name (or coordinates if no name available)
   - Failure: shows error message + suggests manual input or search

**Interactions:**
- Click [✕] or outside modal → closes without saving
- Click search result → adds location, closes modal
- Click "Validate & Add" → adds location, closes modal
- Click "Detect My Location" → attempts geolocation

---

### 2.3 First-Run Flow (D-14, D-15, D-16)

**Scenario A: Geolocation succeeds**
```
1. Page loads → shows "Detecting your location..." briefly
2. Geolocation succeeds → saves location, shows clock
3. Location appears in dropdown as active
```

**Scenario B: Geolocation fails/denied**
```
1. Page loads → shows "Detecting your location..." briefly
2. Geolocation fails → shows inline message:
   "Couldn't detect location. Search for a city or enter coordinates."
3. Location manager modal opens automatically
4. User adds location → shows clock
```

**Visual states:**
- Loading: Subtle spinner or pulsing text
- Success: Smooth transition to clock display
- Failure: Gentle error message (not alarming), location manager opens

---

### 2.4 Search Results Component

**Purpose:** Display fuzzy search results for city selection

**Layout:**
```
┌─────────────────────────────────────┐
│ London, United Kingdom              │
│ Pop: 8.9M  |  51.5°N, 0.1°W        │
├─────────────────────────────────────┤
│ London, Canada                      │
│ Pop: 383K  |  43.0°N, 81.2°W       │
├─────────────────────────────────────┤
│ Londonderry, UK                     │
│ Pop: 85K  |  55.0°N, 7.3°W         │
└─────────────────────────────────────┘
```

**Behavior:**
- Appears below search input (not a dropdown, inline expansion)
- Max 10 results shown at a time
- Each result shows: city name, country/region, population (optional), coordinates (optional)
- Click result → adds location
- Results update as user types (debounced 200ms)
- No results: "No cities found. Try manual input or check spelling."

---

### 2.5 Error States & Messages

| Error | Message | Action |
|-------|---------|--------|
| Geolocation denied | "Location access denied. Search for a city or enter coordinates." | Show search + manual input |
| Geolocation timeout | "Couldn't detect location. Check browser settings or try manual input." | Show search + manual input |
| Invalid lat/lon | "Latitude must be -90 to 90. Longitude must be -180 to 180." | Red border on invalid field |
| localStorage full | "Can't save location. Storage limit reached." (unlikely) | Suggest clearing old locations |
| Corrupted localStorage | "Saved locations corrupted. Starting fresh." | Auto-clear and reinitialize |
| Search API error | "Search unavailable. Try manual input." | Disable search, keep manual input |

---

## 3. Animations & Transitions

| Transition | Duration | Easing | Notes |
|------------|----------|--------|-------|
| Dropdown open/close | 150ms | ease-out | Slide + fade |
| Search results appear | 200ms | ease-out | Fade in |
| Modal open/close | 250ms | ease-out | Scale + fade |
| Location switch | 300ms | ease-in-out | Clock fades briefly, then updates |
| First-run loading | — | — | Subtle pulse animation |
| Error message appear | 200ms | ease-out | Fade in, auto-dismiss after 5s |

---

## 4. Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Desktop | > 1024px | Dropdown panel, modal centered |
| Tablet | 768-1024px | Dropdown panel, modal slightly smaller |
| Mobile | < 768px | Bottom sheet for location list, full-screen modal |

---

## 5. Accessibility Requirements

- All interactive elements keyboard-navigable (Tab, Enter, Escape)
- Search input has visible focus ring
- ARIA labels on dropdown, modal, search input
- Color contrast meets WCAG AA (4.5:1 minimum)
- Error messages announced to screen readers

---

## 6. Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--location-ui-bg` | Inherit from existing CSS variables | Dropdown/modal background |
| `--location-ui-border` | Inherit from existing | Border color |
| `--location-ui-text` | Inherit from existing | Text color |
| `--location-ui-accent` | Inherit from existing | Active location highlight |
| `--location-ui-radius` | 8px | Border radius |
| `--location-ui-shadow` | `0 4px 12px rgba(0,0,0,0.15)` | Dropdown/modal shadow |
| `--location-ui-zindex` | 1000 | Ensure above clock display |

---

## 7. Integration with Existing Visual Design

- Location selector should use existing atmospheric visual design patterns from Phase 2
- Dropdown/modal backgrounds should respect time-of-day sky colors
- Typography should match existing clock font family
- Location UI should not compete visually with clock display — secondary hierarchy

---

## 8. Verification Criteria

- [ ] Dropdown renders saved locations with active state indicator
- [ ] Click location updates clock display within 100ms
- [ ] Search returns results for partial queries ("lon" → "London")
- [ ] Manual input validates lat/lon ranges correctly
- [ ] Geolocation button works and handles permission states
- [ ] First-run flow auto-detects or shows location manager
- [ ] Modal closes on Escape key and outside click
- [ ] All error states display appropriate messages
- [ ] Responsive layout works at 320px, 768px, 1024px, 1440px
- [ ] Keyboard navigation works for all interactive elements

---

*Phase: 03-location-system*
*UI spec created: 2026-04-13 (lightweight — not full /gsd-ui-phase workflow)*
