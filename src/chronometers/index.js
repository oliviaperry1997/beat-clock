import { compute as computeHolocene } from './holocene.js';
import { compute as computeBeats } from './beats.js';
import { compute as computeSolar } from './solar.js';
import { compute as computeLunisolar } from './lunisolar.js';
import { compute as computeSolarLongitude } from './solarLongitude.js';
import { compute as computeLunarPhase } from './lunarPhase.js';
import { compute as computeSolarTime } from './solarTime.js';
import { compute as computeMeghalayan } from './meghalayan.js';
import { compute as computeCustomEpoch } from './customEpoch.js';

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

  // Solar Longitude
  try {
    result.solarLongitude = computeSolarLongitude(date, opts);
  } catch (error) {
    console.warn('solarLongitude', error);
    result.solarLongitude = 'SL??';
  }

  // Lunar Phase
  try {
    result.lunarPhase = computeLunarPhase(date, opts);
  } catch (error) {
    console.warn('lunarPhase', error);
    result.lunarPhase = 'LP??';
  }

  // Solar Time
  try {
    result.solarTime = computeSolarTime(date, opts);
  } catch (error) {
    console.warn('solarTime', error);
    result.solarTime = null;
  }

  // Meghalayan (Holocene Stages)
  try {
    result.meghalayan = computeMeghalayan(date, opts);
  } catch (error) {
    console.warn('meghalayan', error);
    result.meghalayan = { stage: '??', year: null, label: '??' };
  }

  // Custom Epoch
  try {
    result.customEpoch = computeCustomEpoch(date, opts);
  } catch (error) {
    console.warn('customEpoch', error);
    result.customEpoch = 'CE??';
  }

  return result;
}
