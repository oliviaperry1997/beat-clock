/**
 * Alarm condition evaluator — state-based model.
 *
 * Instead of checking "within a tolerance window", the evaluator returns:
 *   - { triggered: false } — target not yet reached
 *   - { triggered: true } — target has been reached, alarm should fire
 *
 * The engine keeps the alarm ringing until dismissed or timeout elapses.
 */

import {
  getAstroEvents,
  isFullMoonDay,
  isNewMoonDay,
  isEquinoxDay,
  isSolsticeDay,
  isLunarEventDay
} from './astro-cache.js';

import { compute as computeBeats } from '../chronometers/beats.js';

/**
 * Evaluate whether an alarm's target time has been reached.
 * @param {Object} alarm - Alarm object
 * @param {Date} now - Current time
 * @param {number} latitude - Location latitude
 * @param {number} longitude - Location longitude
 * @returns {{ triggered: boolean }}
 */
export function evaluateAlarm(alarm, now, latitude, longitude) {
  if (!alarm.enabled) {
    return { triggered: false };
  }

  const events = getAstroEvents(now, latitude, longitude);

  // Check primary condition
  const primaryResult = evaluateCondition(alarm.condition, now, events);
  if (!primaryResult.triggered) {
    return { triggered: false };
  }

  // Date filter (AND gate)
  if (alarm.condition.dateFilter) {
    const filterMatches = evaluateDateFilter(alarm.condition.dateFilter, now, events);
    if (!filterMatches) {
      return { triggered: false };
    }
  }

  // Recurrence check
  const recurrenceMatches = evaluateRecurrence(alarm, now);
  if (!recurrenceMatches) {
    return { triggered: false };
  }

  return { triggered: true };
}

/**
 * Evaluate the primary condition type.
 * Returns { triggered: boolean } — true once target is reached.
 */
export function evaluateCondition(condition, now, events) {
  switch (condition.type) {
    case 'beat-time': {
      const beatStr = computeBeats(now);
      const currentBeat = parseFloat(beatStr.replace('@', ''));
      const targetBeat = condition.params.beat;
      // Trigger when current beat has reached or passed the target
      return { triggered: currentBeat >= targetBeat };
    }

    case 'standard-time': {
      const targetTime = new Date(now);
      targetTime.setHours(condition.params.hours, condition.params.minutes, 0, 0);
      return { triggered: now.getTime() >= targetTime.getTime() };
    }

    case 'astro-offset': {
      const eventTime = events.sun[condition.params.event];
      if (!eventTime || isNaN(eventTime.getTime())) {
        return { triggered: false };
      }
      const offsetMs = (condition.params.offsetMinutes || 0) * 60000;
      const targetTime = new Date(eventTime.getTime() + offsetMs);
      return { triggered: now.getTime() >= targetTime.getTime() };
    }

    case 'astro-offset-beats': {
      const eventTime = events.sun[condition.params.event];
      if (!eventTime || isNaN(eventTime.getTime())) {
        return { triggered: false };
      }
      const eventBeatStr = computeBeats(eventTime);
      const eventBeat = parseFloat(eventBeatStr.replace('@', ''));
      const offsetBeats = condition.params.offsetBeats || 0;
      const targetBeat = eventBeat + offsetBeats;
      // Convert beat target to time: each beat = 86.4 seconds
      const beatDiff = targetBeat - eventBeat;
      const targetTime = new Date(eventTime.getTime() + beatDiff * 86.4 * 1000);
      return { triggered: now.getTime() >= targetTime.getTime() };
    }

    case 'date-trigger': {
      return { triggered: true };
    }

    default:
      return { triggered: false };
  }
}

/**
 * Evaluate the date filter (AND gate with primary condition).
 */
export function evaluateDateFilter(filter, now, events) {
  if (!filter || !filter.type) {
    return true;
  }

  switch (filter.type) {
    case 'lunar-phase': {
      if (filter.params.phase === 'full-moon') {
        return isFullMoonDay(events.moon.fraction);
      }
      if (filter.params.phase === 'new-moon') {
        return isNewMoonDay(events.moon.fraction);
      }
      return false;
    }

    case 'equinox': {
      return isEquinoxDay(now, events.equinoxes);
    }

    case 'solstice': {
      return isSolsticeDay(now, events.solstices);
    }

    case 'weekdays': {
      return filter.params.days.includes(now.getDay());
    }

    default:
      return true;
  }
}

/**
 * Evaluate recurrence pattern.
 */
export function evaluateRecurrence(alarm, now) {
  const recurrence = alarm.recurrence || 'once';

  switch (recurrence) {
    case 'once':
    case 'daily':
      return true;

    case 'weekly': {
      if (alarm.condition && alarm.condition.dateFilter && alarm.condition.dateFilter.type === 'weekdays') {
        return alarm.condition.dateFilter.params.days.includes(now.getDay());
      }
      return true;
    }

    case 'monthly':
      return true;

    case 'lunar': {
      if (alarm.condition && alarm.condition.dateFilter && alarm.condition.dateFilter.type === 'lunar-phase') {
        const phase = alarm.condition.dateFilter.params.phase;
        if (phase === 'full-moon') {
          return isFullMoonDay(0.99);
        }
        if (phase === 'new-moon') {
          return isNewMoonDay(0.01);
        }
      }
      return true;
    }

    default:
      return true;
  }
}

/**
 * Check if the alarm has been dismissed.
 * Returns true if the alarm is NOT dismissed (i.e., should keep ringing).
 */
export function isNotDismissed(alarm) {
  return !alarm.dismissedAt;
}

/**
 * Check if the alarm has exceeded its timeout duration.
 * Returns true if no timeout set or timeout has elapsed.
 */
export function isNotTimedOut(alarm, now) {
  if (!alarm.timeoutDuration) {
    return true; // No timeout — rings indefinitely
  }
  if (!alarm.lastFiredAt) {
    return true; // Not yet fired — no timeout check needed
  }
  const elapsed = now.getTime() - new Date(alarm.lastFiredAt).getTime();
  return elapsed > alarm.timeoutDuration;
}
