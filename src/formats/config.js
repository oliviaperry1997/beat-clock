/**
 * Format configuration module — localStorage CRUD for display format settings.
 *
 * Manages the user's active format configuration (which format each clock component
 * displays) with schema versioning and graceful fallback to defaults.
 */

const STORAGE_KEY = 'beatclock:formats';
const SCHEMA_VERSION = 1;

/**
 * Default format configuration. Frozen to prevent accidental mutation.
 * @type {Readonly<{version: number, components: {year: string, date: string, stdTime: string, solarTime: string}>}
 */
const DEFAULT_CONFIG = Object.freeze({
  version: 1,
  components: {
    year: 'holocene',
    date: 'gregorian',
    stdTime: '24h',
    solarTime: 'descriptive',
  },
});

/**
 * Load format configuration from localStorage.
 * Returns defaults on missing data, schema mismatch, or any error.
 * @returns {object} Format config object with version and components
 */
export function loadFormatConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };

    const config = JSON.parse(raw);
    if (!config || typeof config !== 'object') return { ...DEFAULT_CONFIG };
    if (config.version !== SCHEMA_VERSION) {
      console.warn('Format config schema version mismatch, using defaults');
      return { ...DEFAULT_CONFIG };
    }

    // Ensure components key exists (defensive for partial saves)
    if (!config.components || typeof config.components !== 'object') {
      config.components = { ...DEFAULT_CONFIG.components };
    }

    return config;
  } catch (e) {
    console.warn('Failed to load format config, using defaults');
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Save format configuration to localStorage.
 * @param {object} config - Format config object with version and components
 */
export function saveFormatConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.warn('Failed to save format config:', e.message);
  }
}

/**
 * Get the active format ID for a component.
 * @param {string} componentId - Component ID ('year', 'date', 'stdTime', 'solarTime')
 * @returns {string|null} Active format ID or null
 */
export function getFormat(componentId) {
  const config = loadFormatConfig();
  return config.components?.[componentId] ?? null;
}

/**
 * Set the active format for a component.
 * @param {string} componentId - Component ID ('year', 'date', 'stdTime', 'solarTime')
 * @param {string} formatId - Format ID to set as active
 */
export function setFormat(componentId, formatId) {
  const config = loadFormatConfig();
  config.components[componentId] = formatId;
  saveFormatConfig(config);
}

/**
 * Reset format configuration to defaults.
 */
export function resetFormatConfig() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to reset format config:', e.message);
  }
}
