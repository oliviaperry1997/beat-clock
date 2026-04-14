/**
 * Alarm engine — state-based alarm evaluation with active-alarm tracking.
 *
 * Alarms transition to "active" when their target time is reached.
 * They keep ringing until dismissed or a timeout elapses.
 */

import { getEnabledAlarms, updateAlarm, deleteAlarm } from './store.js';
import { evaluateAlarm } from './evaluator.js';
import { fireNotifications, stopNotifications } from './notifications.js';
import { getActiveLocation } from '../location/store.js';

// In-memory state: tracks which alarms are currently active
const activeAlarms = new Map();

// Dismiss callback — set by UI or engine consumers
let dismissCallback = null;

/**
 * Set the dismiss callback (called when user dismisses an alarm).
 * @param {function} cb - Called with alarmId
 */
export function setDismissCallback(cb) {
  dismissCallback = cb;
}

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
      const { triggered } = evaluateAlarm(alarm, now, loc.latitude, loc.longitude);
      const isActive = activeAlarms.has(alarm.id);

      if (triggered && !isActive) {
        // Alarm just triggered → fire notifications
        const onDismiss = () => {
          if (dismissCallback) dismissCallback(alarm.id);
        };
        fireNotifications(alarm, onDismiss);
        activeAlarms.set(alarm.id, {
          startedAt: now.toISOString(),
          dismissedAt: null,
        });
        // Mark lastFiredAt in store for persistence
        updateAlarm(alarm.id, { lastFiredAt: now.toISOString() });
      } else if (triggered && isActive) {
        // Alarm already active → check if dismissed or timed out
        const state = activeAlarms.get(alarm.id);
        if (state.dismissedAt) {
          // Dismissed — stop ringing, clean up
          stopNotifications(alarm);
          activeAlarms.delete(alarm.id);

          // One-time alarms are deleted after dismissal
          if (alarm.oneTime || alarm.recurrence === 'once') {
            deleteAlarm(alarm.id);
          }
        } else {
          // Check timeout
          if (alarm.timeoutDuration) {
            const elapsed = now.getTime() - new Date(state.startedAt).getTime();
            if (elapsed > alarm.timeoutDuration) {
              // Timeout elapsed → stop ringing
              stopNotifications(alarm);
              activeAlarms.delete(alarm.id);

              // One-time alarms are deleted after timeout
              if (alarm.oneTime || alarm.recurrence === 'once') {
                deleteAlarm(alarm.id);
              }
            } else {
              // Still ringing → re-fire audio to keep it going
              stopNotifications(alarm);
              const onDismiss = () => {
                if (dismissCallback) dismissCallback(alarm.id);
              };
              fireNotifications(alarm, onDismiss);
            }
          }
          // No timeout → keep ringing indefinitely, no action needed
        }
      } else if (!triggered && isActive) {
        // Condition no longer met (e.g., beat passed for daily alarm)
        // Clean up active state
        const state = activeAlarms.get(alarm.id);
        if (!state.dismissedAt) {
          stopNotifications(alarm);
        }
        activeAlarms.delete(alarm.id);
      }
      // !triggered && !isActive → nothing to do
    }
  }

  const intervalId = setInterval(() => tick(location), 864);

  return {
    stop: () => clearInterval(intervalId),
    evaluateNow: () => tick(location),
    getActiveAlarms: () => {
      const result = [];
      for (const [id, state] of activeAlarms) {
        result.push({ id, ...state });
      }
      return result;
    },
    dismissAlarm: (alarmId) => {
      const state = activeAlarms.get(alarmId);
      if (state) {
        state.dismissedAt = new Date().toISOString();
      }
    }
  };
}

/**
 * Reset the active alarms map (for testing).
 */
export function resetActiveAlarms() {
  activeAlarms.clear();
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
    const { triggered } = evaluateAlarm(alarm, now, location.latitude, location.longitude);
    if (triggered && !activeAlarms.has(alarm.id)) {
      fireNotifications(alarm);
      activeAlarms.set(alarm.id, {
        startedAt: now.toISOString(),
        dismissedAt: null,
      });
      updateAlarm(alarm.id, { lastFiredAt: now.toISOString() });
    }
  }
}
