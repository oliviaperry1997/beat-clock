/**
 * Alarm store & persistence layer.
 * localStorage-based CRUD for alarms with schema versioning.
 */

const STORAGE_KEY = 'beatclock:alarms';
const SCHEMA_VERSION = 1;

/**
 * Load alarms from localStorage.
 * Returns empty array on parse error or missing key.
 * Filters out alarms with version !== SCHEMA_VERSION.
 * @returns {Array}
 */
export function loadAlarms() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const alarms = JSON.parse(data);
    if (!Array.isArray(alarms)) return [];
    return alarms.filter(alarm => alarm.version === SCHEMA_VERSION);
  } catch (e) {
    console.warn('Failed to load alarms:', e);
    return [];
  }
}

/**
 * Save alarms array to localStorage.
 * @param {Array} alarms
 */
export function saveAlarms(alarms) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  } catch (e) {
    console.warn('Failed to save alarms:', e);
  }
}

/**
 * Add a new alarm. Auto-generates ID if not provided.
 * @param {Object} alarm - Alarm object (partial)
 * @returns {Object} The created alarm
 */
export function addAlarm(alarm) {
  const alarms = loadAlarms();
  const newAlarm = {
    id: alarm.id || `alm_${Date.now()}`,
    label: alarm.label || 'Alarm',
    enabled: true,
    oneTime: false,
    recurrence: alarm.recurrence || 'once',
    condition: alarm.condition || {},
    notifications: {
      browser: true,
      inApp: true,
      audio: true,
      ...(alarm.notifications || {})
    },
    createdAt: new Date().toISOString(),
    lastFiredAt: null,
    version: SCHEMA_VERSION
  };
  alarms.push(newAlarm);
  saveAlarms(alarms);
  return newAlarm;
}

/**
 * Update an alarm by ID.
 * @param {string} id - Alarm ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated alarm or null
 */
export function updateAlarm(id, updates) {
  const alarms = loadAlarms();
  const index = alarms.findIndex(a => a.id === id);
  if (index === -1) return null;
  alarms[index] = { ...alarms[index], ...updates };
  saveAlarms(alarms);
  return alarms[index];
}

/**
 * Delete an alarm by ID.
 * @param {string} id - Alarm ID
 */
export function deleteAlarm(id) {
  const alarms = loadAlarms();
  const filtered = alarms.filter(a => a.id !== id);
  if (filtered.length === alarms.length) return; // No change
  saveAlarms(filtered);
}

/**
 * Toggle alarm enabled state.
 * @param {string} id - Alarm ID
 * @returns {Object|null} Updated alarm or null
 */
export function toggleAlarm(id) {
  const alarms = loadAlarms();
  const alarm = alarms.find(a => a.id === id);
  if (!alarm) return null;
  alarm.enabled = !alarm.enabled;
  saveAlarms(alarms);
  return alarm;
}

/**
 * Get only enabled alarms.
 * @returns {Array}
 */
export function getEnabledAlarms() {
  const alarms = loadAlarms();
  return alarms.filter(a => a.enabled === true);
}
