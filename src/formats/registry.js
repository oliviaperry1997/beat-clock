/**
 * Format registry — maps component IDs + format IDs to render functions.
 *
 * Object map lookup pattern: registry[componentId][formatId](data, opts)
 * All renderers registered at init time — no dynamic registration.
 */

// Year renderers
import { render as renderHoloceneYear } from './renderers/year/holocene.js';
import { render as renderGregorianYear } from './renderers/year/gregorian.js';
import { render as renderMeghalayanYear } from './renderers/year/meghalayan.js';
import { render as renderCustomEpochYear } from './renderers/year/custom.js';

// Date renderers
import { render as renderGregorianDate } from './renderers/date/gregorian.js';
import { render as renderChineseDate } from './renderers/date/chinese.js';
import { render as renderLongitudinalDate } from './renderers/date/longitudinal.js';

// Standard Time renderers
import { render as render24hStdTime } from './renderers/stdtime/24h.js';
import { render as renderDecimalStdTime } from './renderers/stdtime/decimal.js';
import { render as renderLongitudinalStdTime } from './renderers/stdtime/longitudinal.js';

// Solar Time renderers
import { render as render24hSolarTime } from './renderers/solartime/24h.js';
import { render as renderDecimalSolarTime } from './renderers/solartime/decimal.js';
import { render as renderLongitudinalSolarTime } from './renderers/solartime/longitudinal.js';
import { render as renderDescriptiveSolarTime } from './renderers/solartime/descriptive.js';

/**
 * Format registry mapping component IDs to format IDs to render functions.
 * @type {Object}
 */
const REGISTRY = Object.freeze({
  year: Object.freeze({
    holocene: renderHoloceneYear,
    gregorian: renderGregorianYear,
    meghalayan: renderMeghalayanYear,
    custom: renderCustomEpochYear,
  }),
  date: Object.freeze({
    gregorian: renderGregorianDate,
    chinese: renderChineseDate,
    longitudinal: renderLongitudinalDate,
  }),
  stdTime: Object.freeze({
    '24h': render24hStdTime,
    decimal: renderDecimalStdTime,
    longitudinal: renderLongitudinalStdTime,
  }),
  solarTime: Object.freeze({
    '24h': render24hSolarTime,
    decimal: renderDecimalSolarTime,
    longitudinal: renderLongitudinalSolarTime,
    descriptive: renderDescriptiveSolarTime,
  }),
});

/**
 * Get the render function for a component + format combination.
 * @param {string} componentId - Component ID ('year', 'date', 'stdTime', 'solarTime')
 * @param {string} formatId - Format ID within the component
 * @returns {Function|null} Render function or null if not found
 */
export function getRenderer(componentId, formatId) {
  return REGISTRY[componentId]?.[formatId] ?? null;
}

/**
 * Get all available format IDs for a component.
 * @param {string} componentId - Component ID
 * @returns {string[]} Array of format IDs, empty array if component not found
 */
export function getAvailableFormats(componentId) {
  const formats = REGISTRY[componentId];
  return formats ? Object.keys(formats) : [];
}

/**
 * Get all component IDs that have registered formats.
 * @returns {string[]} Array of component IDs
 */
export function getAllComponents() {
  return Object.keys(REGISTRY);
}

/**
 * Validate that a component+format combination exists.
 * @param {string} componentId - Component ID
 * @param {string} formatId - Format ID
 * @returns {boolean} True if the combination is registered
 */
export function hasFormat(componentId, formatId) {
  return getRenderer(componentId, formatId) !== null;
}
