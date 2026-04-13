/**
 * Location store module — localStorage CRUD operations.
 * 
 * Manages saved locations and active location selection with
 * persistence via localStorage.
 */

const STORAGE_KEYS = {
  LOCATIONS: 'beatclock:locations',
  ACTIVE_ID: 'beatclock:activeLocationId'
};

/**
 * Load all saved locations from localStorage.
 * @returns {Array} Array of location objects, or empty array if none saved
 */
export function loadLocations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Save locations array to localStorage.
 * @param {Array} locations - Array of location objects
 */
export function saveLocations(locations) {
  try {
    localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  } catch (e) {
    console.warn('Failed to save locations to localStorage:', e.message);
  }
}

/**
 * Get the currently active location ID.
 * @returns {string|null} Active location ID or null
 */
export function getActiveLocationId() {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  } catch {
    return null;
  }
}

/**
 * Set the active location ID.
 * @param {string|null} id - Location ID to set as active, or null to clear
 */
export function setActiveLocationId(id) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ID);
    }
  } catch (e) {
    console.warn('Failed to set active location ID:', e.message);
  }
}

/**
 * Get the currently active location object.
 * @returns {object|null} Active location object or null
 */
export function getActiveLocation() {
  const locations = loadLocations();
  const activeId = getActiveLocationId();
  if (!activeId || !locations.length) return null;
  return locations.find(loc => loc.id === activeId) || null;
}

/**
 * Add a new location to the store.
 * @param {object} location - Location object with name, latitude, longitude, etc.
 * @returns {object} The saved location with an id field
 */
export function addLocation(location) {
  const locations = loadLocations();
  const id = location.id || `loc_${Date.now()}`;
  const entry = {
    ...location,
    id,
    createdAt: location.createdAt || Date.now()
  };
  locations.push(entry);
  saveLocations(locations);

  // If this is the first location, make it active
  if (locations.length === 1) {
    setActiveLocationId(id);
  }

  return entry;
}

/**
 * Remove a location from the store.
 * @param {string} id - Location ID to remove
 */
export function removeLocation(id) {
  let locations = loadLocations();
  locations = locations.filter(loc => loc.id !== id);
  saveLocations(locations);

  // If active was removed, clear active or set to first available
  if (getActiveLocationId() === id) {
    setActiveLocationId(locations.length > 0 ? locations[0].id : null);
  }
}

/**
 * Switch the active location.
 * @param {string} id - Location ID to activate
 * @returns {object|null} The newly active location, or null if not found
 */
export function switchActiveLocation(id) {
  const locations = loadLocations();
  const exists = locations.some(loc => loc.id === id);
  if (exists) {
    setActiveLocationId(id);
    return locations.find(loc => loc.id === id);
  }
  return null;
}
