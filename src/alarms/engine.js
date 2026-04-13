/**
 * Alarm engine — tick-based alarm evaluation and notification system.
 * Integrates with the main app lifecycle and location system.
 */

import { getEnabledAlarms, updateAlarm, deleteAlarm } from './store.js';
import { evaluateAlarm } from './evaluator.js';
import { fireNotifications } from './notifications.js';
import { getActiveLocation } from '../location/store.js';

/**
 * Initialize the alarm engine.
 * Sets up a tick interval that evaluates alarms every 864ms.
 * @param {Object} location - { latitude, longitude }
 * @returns {{ stop: Function, evaluateNow: Function }}
 */
export function initAlarmEngine(location) {
  if (!location) {
    console.warn('Alarm engine: no location provided');
    return { stop: () => {}, evaluateNow: () => {} };
  }

  function tick(loc) {
    const alarms = getEnabledAlarms();
    const now = new Date();

    for (const alarm of alarms) {
      const shouldFire = evaluateAlarm(alarm, now, loc.latitude, loc.longitude);
      if (shouldFire) {
        fireNotifications(alarm);

        // One-time alarms are deleted after firing
        if (alarm.oneTime || alarm.recurrence === 'once') {
          deleteAlarm(alarm.id);
        } else {
          // Update lastFiredAt for deduplication
          updateAlarm(alarm.id, { lastFiredAt: now.toISOString() });
        }
      }
    }
  }

  const intervalId = setInterval(() => tick(location), 864);

  return {
    stop: () => clearInterval(intervalId),
    evaluateNow: () => tick(location)
  };
}

/**
 * Handle missed alarms when tab becomes visible again.
 * Evaluates all enabled alarms against current time to catch up.
 */
export function handleMissedAlarms() {
  const location = getActiveLocation();
  if (!location) return;

  const alarms = getEnabledAlarms();
  const now = new Date();

  for (const alarm of alarms) {
    const shouldFire = evaluateAlarm(alarm, now, location.latitude, location.longitude);
    if (shouldFire) {
      fireNotifications(alarm);

      if (alarm.oneTime || alarm.recurrence === 'once') {
        deleteAlarm(alarm.id);
      } else {
        updateAlarm(alarm.id, { lastFiredAt: now.toISOString() });
      }
    }
  }
}
