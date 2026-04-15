/**
 * Location UI module — DOM rendering for location selector, modal, search, and manual input.
 * 
 * Integrates store, search, validation, and geolocation modules into
 * a cohesive user interface for location management.
 */

import { getActiveLocation, loadLocations, addLocation, removeLocation, switchActiveLocation } from './store.js';
import { initSearch, searchCities } from './search.js';
import { validateLocationInput, findNearestCity } from './validation.js';
import { detectLocation, isGeolocationAvailable } from './geolocation.js';

// Lazy-loaded city data
let citiesPromise = null;

function loadCities() {
  if (!citiesPromise) {
    citiesPromise = import('../data/cities.json').then(mod => mod.default);
  }
  return citiesPromise;
}

// State
let onLocationSelected = null;
let searchInitialized = false;

/**
 * Initialize the full location system.
 * 
 * @param {function} callback - Called with { latitude, longitude } when location is ready
 */
export async function initLocationSystem(callback) {
  onLocationSelected = callback;

  const locations = loadLocations();
  
  if (locations.length > 0) {
    // Has saved locations — load active one
    const active = getActiveLocation();
    if (active) {
      renderLocationSelector();
      callback({ latitude: active.latitude, longitude: active.longitude });
      return;
    }
  }

  // First visit — attempt geolocation
  renderLocationSelector();
  
  if (isGeolocationAvailable()) {
    try {
      const statusEl = document.getElementById('location-status');
      if (statusEl) statusEl.textContent = 'Detecting your location...';
      
      const detected = await detectLocation({ timeout: 8000 });
      const location = addLocation({
        name: 'My Location',
        latitude: detected.latitude,
        longitude: detected.longitude,
        source: 'geolocation'
      });
      
      renderLocationSelector();
      callback({ latitude: location.latitude, longitude: location.longitude });
    } catch (err) {
      console.warn('Geolocation failed:', err.message);
      const statusEl = document.getElementById('location-status');
      if (statusEl) {
        statusEl.textContent = "Couldn't detect location. Search for a city or enter coordinates.";
        statusEl.className = 'location-status location-status--error';
      }
      openLocationManager();
    }
  } else {
    // No geolocation support — open manager directly
    openLocationManager();
  }
}

/**
 * Render the location selector dropdown in the DOM.
 */
function renderLocationSelector() {
  const container = document.getElementById('location-selector');
  if (!container) {
    createLocationSelector();
    return;
  }

  // If container exists but is empty (no children populated yet), create the full UI
  if (container.children.length === 0 && !container.classList.contains('location-selector')) {
    container.remove();
    createLocationSelector();
    return;
  }

  const locations = loadLocations();
  const active = getActiveLocation();

  const activeNameEl = document.getElementById('active-location-name');
  if (activeNameEl && active) {
    activeNameEl.textContent = formatLocationName(active);
  }

  renderSavedLocationsList();
}

/**
 * Create the location selector DOM elements.
 */
function createLocationSelector() {
  // Create selector container
  const selector = document.createElement('div');
  selector.id = 'location-selector';
  selector.className = 'location-selector';
  
  const locations = loadLocations();
  const active = getActiveLocation();
  
  selector.innerHTML = `
    <button id="location-toggle" class="location-toggle" aria-label="Change location">
      <span id="active-location-name">${active ? formatLocationName(active) : 'Select Location'}</span>
      <span class="dropdown-arrow">▼</span>
    </button>
    <div id="location-dropdown" class="location-dropdown hidden">
      <div id="saved-locations" class="saved-locations"></div>
      <button id="manage-locations-btn" class="manage-btn">+ Add Location...</button>
    </div>
    <div id="location-status" class="location-status"></div>
  `;
  
  // Insert before beats container
  const beatsContainer = document.getElementById('beats-container');
  if (beatsContainer) {
    beatsContainer.parentNode.insertBefore(selector, beatsContainer);
  } else {
    document.body.appendChild(selector);
  }
  
  // Event listeners
  const toggle = document.getElementById('location-toggle');
  const dropdown = document.getElementById('location-dropdown');
  
  toggle.addEventListener('click', () => {
    dropdown.classList.toggle('hidden');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!selector.contains(e.target)) {
      dropdown.classList.add('hidden');
    }
  });
  
  document.getElementById('manage-locations-btn').addEventListener('click', () => {
    dropdown.classList.add('hidden');
    openLocationManager();
  });
  
  renderSavedLocationsList();
}

/**
 * Render the saved locations list in the dropdown.
 */
function renderSavedLocationsList() {
  const container = document.getElementById('saved-locations');
  if (!container) return;
  
  const locations = loadLocations();
  const activeId = localStorage.getItem('beatclock:activeLocationId');
  
  container.innerHTML = locations.map(loc => `
    <div class="saved-location ${loc.id === activeId ? 'active' : ''}" data-id="${loc.id}">
      <span class="location-name">${formatLocationName(loc)}</span>
      ${loc.id === activeId ? '<span class="active-indicator">✓</span>' : ''}
    </div>
  `).join('');
  
  // Add click handlers
  container.querySelectorAll('.saved-location').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.id;
      const location = switchActiveLocation(id);
      if (location && onLocationSelected) {
        onLocationSelected({ latitude: location.latitude, longitude: location.longitude });
        renderLocationSelector();
        document.getElementById('location-dropdown')?.classList.add('hidden');
      }
    });
  });
}

/**
 * Open the location manager modal.
 */
async function openLocationManager() {
  // Check if modal already exists
  let modal = document.getElementById('location-manager');
  if (!modal) {
    modal = createLocationManager();
  }
  
  modal.classList.remove('hidden');
  
  // Initialize search if not done yet
  if (!searchInitialized) {
    try {
      const cities = await loadCities();
      initSearch(cities);
      searchInitialized = true;
    } catch (err) {
      console.warn('Failed to load city database:', err);
    }
  }
  
  // Focus search input
  const searchInput = document.getElementById('city-search');
  if (searchInput) searchInput.focus();
}

/**
 * Close the location manager modal.
 */
function closeLocationManager() {
  const modal = document.getElementById('location-manager');
  if (modal) {
    modal.classList.add('hidden');
  }
}

/**
 * Create the location manager modal DOM elements.
 */
function createLocationManager() {
  const modal = document.createElement('div');
  modal.id = 'location-manager';
  modal.className = 'modal hidden';
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Add Location</h2>
        <button id="close-manager" class="modal-close" aria-label="Close">×</button>
      </div>
      
      <!-- Search panel -->
      <div id="search-panel">
        <input type="text" id="city-search" placeholder="Search city..." autocomplete="off" />
        <div id="search-results"></div>
      </div>
      
      <!-- Manual input panel -->
      <div id="manual-panel">
        <div class="manual-input-group">
          <input type="number" id="manual-lat" placeholder="Latitude" step="any" min="-90" max="90" />
          <input type="number" id="manual-lon" placeholder="Longitude" step="any" min="-180" max="180" />
        </div>
        <input type="text" id="manual-name" placeholder="Location name (optional)" />
        <button id="add-manual-btn" disabled>Add Location</button>
        <div id="manual-error" class="error hidden"></div>
      </div>
      
      <!-- Geolocation button -->
      <div id="geolocation-panel">
        <button id="detect-location-btn">
          <span class="icon">◎</span> Detect My Location
        </button>
        <div id="geolocation-status"></div>
      </div>
      
      <!-- Saved locations list -->
      <div id="saved-list">
        <h3>Saved Locations</h3>
        <ul id="saved-list-items"></ul>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Event listeners
  document.getElementById('close-manager').addEventListener('click', closeLocationManager);
  
  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeLocationManager();
    }
  });
  
  // Close on outside click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeLocationManager();
    }
  });
  
  // Search input (debounced)
  let searchTimeout = null;
  document.getElementById('city-search').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      handleSearch(e.target.value);
    }, 200);
  });
  
  // Manual input validation
  const latInput = document.getElementById('manual-lat');
  const lonInput = document.getElementById('manual-lon');
  const addBtn = document.getElementById('add-manual-btn');
  
  const validateManualInput = () => {
    const result = validateLocationInput(latInput.value, lonInput.value);
    addBtn.disabled = !result.valid;
    if (result.valid) {
      latInput.classList.remove('invalid');
      lonInput.classList.remove('invalid');
      latInput.classList.add('valid');
      lonInput.classList.add('valid');
    } else {
      if (latInput.value) latInput.classList.toggle('invalid', !validateLocationInput(latInput.value, '0').valid);
      if (lonInput.value) lonInput.classList.toggle('invalid', !validateLocationInput('0', lonInput.value).valid);
    }
  };
  
  latInput.addEventListener('input', validateManualInput);
  lonInput.addEventListener('input', validateManualInput);
  
  addBtn.addEventListener('click', () => {
    const result = validateLocationInput(latInput.value, lonInput.value);
    if (result.valid) {
      const name = document.getElementById('manual-name').value || 
                   `${result.latitude.toFixed(4)}, ${result.longitude.toFixed(4)}`;
      addLocation({
        name,
        latitude: result.latitude,
        longitude: result.longitude,
        source: 'manual'
      });
      onLocationChange();
      closeLocationManager();
    }
  });
  
  // Geolocation button
  document.getElementById('detect-location-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('geolocation-status');
    statusEl.textContent = 'Detecting...';
    statusEl.className = 'geolocation-status loading';
    
    try {
      const detected = await detectLocation({ timeout: 8000 });
      
      // Try to find nearest city for naming
      const cities = await loadCities();
      const nearest = findNearestCity(detected.latitude, detected.longitude, cities, 50);
      const name = nearest ? `${nearest.name}, ${nearest.country}` : 'My Location';
      
      addLocation({
        name,
        latitude: detected.latitude,
        longitude: detected.longitude,
        source: 'geolocation'
      });
      
      statusEl.textContent = 'Location saved!';
      statusEl.className = 'geolocation-status success';
      
      setTimeout(() => {
        onLocationChange();
        closeLocationManager();
      }, 500);
    } catch (err) {
      statusEl.textContent = err.message + '. Try manual input.';
      statusEl.className = 'geolocation-status error';
    }
  });
  
  renderModalSavedLocations();
  
  return modal;
}

/**
 * Handle city search input.
 */
function handleSearch(query) {
  const resultsContainer = document.getElementById('search-results');
  if (!resultsContainer) return;
  
  if (!query || query.trim().length < 2) {
    resultsContainer.innerHTML = '';
    return;
  }
  
  try {
    const results = searchCities(query);
    
    if (results.length === 0) {
      resultsContainer.innerHTML = '<div class="no-results">No cities found. Try manual input or check spelling.</div>';
      return;
    }
    
    resultsContainer.innerHTML = results.map(city => `
      <div class="search-result" data-id="${city.id}">
        <div class="result-name">${city.name}, ${city.admin_name || city.country}</div>
        <div class="result-meta">Pop: ${formatPopulation(city.population)} | ${city.lat.toFixed(1)}°, ${city.lng.toFixed(1)}°</div>
      </div>
    `).join('');
    
    // Add click handlers
    resultsContainer.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        const cityId = el.dataset.id;
        const city = results.find(c => c.id === cityId);
        if (city) {
          addLocation({
            name: `${city.name}, ${city.country}`,
            latitude: city.lat,
            longitude: city.lng,
            country: city.country,
            source: 'search'
          });
          onLocationChange();
          closeLocationManager();
        }
      });
    });
  } catch (err) {
    console.warn('Search error:', err);
    resultsContainer.innerHTML = '<div class="error">Search unavailable. Try manual input.</div>';
  }
}

/**
 * Render saved locations list in the modal.
 */
function renderModalSavedLocations() {
  const container = document.getElementById('saved-list-items');
  if (!container) return;
  
  const locations = loadLocations();
  const activeId = localStorage.getItem('beatclock:activeLocationId');
  
  container.innerHTML = locations.map(loc => `
    <li class="saved-list-item ${loc.id === activeId ? 'active' : ''}">
      <button class="location-switch-btn" data-id="${loc.id}">
        ${loc.id === activeId ? '✓ ' : ''}${formatLocationName(loc)}
      </button>
      <button class="location-remove-btn" data-id="${loc.id}" aria-label="Remove ${loc.name}">×</button>
    </li>
  `).join('');
  
  // Switch handlers
  container.querySelectorAll('.location-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const location = switchActiveLocation(btn.dataset.id);
      if (location) {
        onLocationChange();
        renderModalSavedLocations();
      }
    });
  });
  
  // Remove handlers
  container.querySelectorAll('.location-remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeLocation(btn.dataset.id);
      renderModalSavedLocations();
      renderLocationSelector();
    });
  });
}

/**
 * Called when a location is added or switched.
 */
function onLocationChange() {
  const active = getActiveLocation();
  if (active && onLocationSelected) {
    onLocationSelected({ latitude: active.latitude, longitude: active.longitude });
  }
  renderLocationSelector();
}

/**
 * Format a location object for display.
 */
function formatLocationName(loc) {
  return `${loc.name}, ${loc.country}`;
}

/**
 * Format population for display.
 */
function formatPopulation(pop) {
  if (!pop) return 'N/A';
  if (pop >= 1000000) return (pop / 1000000).toFixed(1) + 'M';
  if (pop >= 1000) return (pop / 1000).toFixed(0) + 'K';
  return pop.toString();
}
