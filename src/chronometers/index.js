import { compute as computeHolocene } from './holocene.js';
import { compute as computeBeats } from './beats.js';
import { compute as computeSolar } from './solar.js';
import { compute as computeLunisolar } from './lunisolar.js';

/**
 * Composer — calls each chronometer module and combines results.
 * Wraps each compute() in try/catch for graceful degradation.
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Options passed to each module (latitude, longitude, etc.)
 * @returns {object} Combined chronometer results
 */
export function compose(date, opts = {}) {
  const result = {};

  // Holocene year
  try {
    result.holocene = computeHolocene(date, opts);
  } catch (error) {
    console.warn('holocene', error);
    result.holocene = '??';
  }

  // Beats
  try {
    result.beats = computeBeats(date, opts);
  } catch (error) {
    console.warn('beats', error);
    result.beats = '??';
  }

  // Solar
  try {
    result.solar = computeSolar(date, opts);
  } catch (error) {
    console.warn('solar', error);
    result.solar = '??';
  }

  // Lunisolar
  try {
    result.lunisolar = computeLunisolar(date, opts);
  } catch (error) {
    console.warn('lunisolar', error);
    result.lunisolar = '??';
  }

  return result;
}
