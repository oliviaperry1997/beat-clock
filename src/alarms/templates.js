/**
 * Alarm template definitions.
 * Pre-built templates for time-based, astronomical, lunar, and seasonal alarms.
 */

/**
 * @typedef {Object} TemplateParam
 * @property {string} key - Parameter key
 * @property {string} label - Display label
 * @property {string} type - Input type (number)
 * @property {number} [min] - Minimum value
 * @property {number} [max] - Maximum value
 */

/**
 * @typedef {Object} AlarmTemplate
 * @property {string} label - Display label
 * @property {string} category - Template category
 * @property {TemplateParam[]} params - Parameter definitions
 * @property {Function} build - Build function returning condition object
 */

/** @type {Record<string, AlarmTemplate>} */
export const TEMPLATES = {
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

  'at-time': {
    label: 'At specific standard time',
    category: 'time',
    params: [
      { key: 'hours', label: 'Hour (0-23)', type: 'number', min: 0, max: 23 },
      { key: 'minutes', label: 'Minutes (0-59)', type: 'number', min: 0, max: 59 }
    ],
    build(params) {
      return {
        type: 'standard-time',
        template: 'at-time',
        params: { hours: Number(params.hours), minutes: Number(params.minutes) }
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

  'after-solar-noon': {
    label: 'X beats after solar noon',
    category: 'astro',
    params: [
      { key: 'offsetBeats', label: 'Beats after', type: 'number', min: 0, max: 1000 }
    ],
    build(params) {
      return {
        type: 'astro-offset-beats',
        template: 'after-solar-noon',
        params: { offsetBeats: Number(params.offsetBeats), event: 'solarNoon' }
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
    params: [],
    build() {
      return {
        type: 'date-trigger',
        template: 'on-full-moon',
        params: {},
        dateFilter: { type: 'lunar-phase', params: { phase: 'full-moon' } }
      };
    }
  },

  'on-new-moon': {
    label: 'On new moon day',
    category: 'lunar',
    params: [],
    build() {
      return {
        type: 'date-trigger',
        template: 'on-new-moon',
        params: {},
        dateFilter: { type: 'lunar-phase', params: { phase: 'new-moon' } }
      };
    }
  },

  'on-equinox': {
    label: 'On equinox day',
    category: 'seasonal',
    params: [],
    build() {
      return {
        type: 'date-trigger',
        template: 'on-equinox',
        params: {},
        dateFilter: { type: 'equinox' }
      };
    }
  },

  'on-solstice': {
    label: 'On solstice day',
    category: 'seasonal',
    params: [],
    build() {
      return {
        type: 'date-trigger',
        template: 'on-solstice',
        params: {},
        dateFilter: { type: 'solstice' }
      };
    }
  }
};

/**
 * Get a template by key.
 * @param {string} templateKey - Template key
 * @returns {AlarmTemplate|null}
 */
export function getTemplate(templateKey) {
  return TEMPLATES[templateKey] || null;
}

/**
 * Get templates grouped by category.
 * @returns {Object} Templates grouped by category
 */
export function getTemplatesByCategory() {
  const result = { time: [], astro: [], lunar: [], seasonal: [] };
  for (const [key, template] of Object.entries(TEMPLATES)) {
    if (result[template.category]) {
      result[template.category].push({ key, ...template });
    }
  }
  return result;
}
