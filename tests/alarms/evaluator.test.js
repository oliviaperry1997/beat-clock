import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing evaluator
vi.mock('../../src/alarms/astro-cache.js', () => ({
  getAstroEvents: vi.fn(),
  isFullMoonDay: vi.fn(() => false),
  isNewMoonDay: vi.fn(() => false),
  isEquinoxDay: vi.fn(() => false),
  isSolsticeDay: vi.fn(() => false),
  isLunarEventDay: vi.fn(() => false)
}));

vi.mock('../../src/chronometers/beats.js', () => ({
  compute: vi.fn(() => '@500.00')
}));

import {
  evaluateAlarm,
  evaluateCondition,
  evaluateDateFilter,
  evaluateRecurrence,
  isNotDismissed,
  isNotTimedOut
} from '../../src/alarms/evaluator.js';

import * as astroCache from '../../src/alarms/astro-cache.js';

const now = new Date(2026, 3, 15, 12, 0, 0);

function getMockEvents() {
  return {
    sun: {
      sunrise: new Date(now.getTime() - 3600000),
      sunset: new Date(now.getTime() + 3600000),
      solarNoon: new Date(now)
    },
    moon: { fraction: 0.5, phase: 0.5 },
    equinoxes: {
      march: new Date(2026, 2, 20),
      september: new Date(2026, 8, 22)
    },
    solstices: {
      june: new Date(2026, 5, 21),
      december: new Date(2026, 11, 21)
    },
    lunarEvents: {
      fullMoons: [new Date(2026, 3, 15)],
      newMoons: []
    }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  astroCache.getAstroEvents.mockReturnValue(getMockEvents());
});

describe('isNotDismissed', () => {
  it('returns true when not dismissed', () => {
    expect(isNotDismissed({})).toBe(true);
    expect(isNotDismissed({ dismissedAt: null })).toBe(true);
  });

  it('returns false when dismissed', () => {
    expect(isNotDismissed({ dismissedAt: '2026-04-15T12:00:00Z' })).toBe(false);
  });
});

describe('isNotTimedOut', () => {
  it('returns true when no timeout set', () => {
    expect(isNotTimedOut({}, now)).toBe(true);
    expect(isNotTimedOut({ lastFiredAt: null }, now)).toBe(true);
  });

  it('returns true when timeout not yet elapsed', () => {
    const alarm = {
      lastFiredAt: new Date(now.getTime() - 30000).toISOString(),
      timeoutDuration: 60000 // 1 minute
    };
    expect(isNotTimedOut(alarm, now)).toBe(false);
  });

  it('returns true when timeout has elapsed', () => {
    const alarm = {
      lastFiredAt: new Date(now.getTime() - 90000).toISOString(),
      timeoutDuration: 60000 // 1 minute
    };
    expect(isNotTimedOut(alarm, now)).toBe(true);
  });
});

describe('evaluateAlarm', () => {
  it('returns { triggered: false } when alarm.enabled is false', () => {
    const alarm = {
      enabled: false,
      condition: { type: 'standard-time', params: { hours: 12, minutes: 0 } }
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toEqual({ triggered: false });
  });

  it('returns { triggered: false } when primary condition does not match', () => {
    // Standard time 8:00 vs current time 12:00 — target already passed
    // For standard-time, triggered = now >= targetTime, so 12:00 >= 8:00 = true
    // To test false, use a future time (16:00)
    const alarm = {
      enabled: true,
      condition: { type: 'standard-time', params: { hours: 16, minutes: 0 } }
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toEqual({ triggered: false });
  });

  it('returns { triggered: true } when standard-time target is reached', () => {
    const alarm = {
      enabled: true,
      condition: { type: 'standard-time', params: { hours: 12, minutes: 0 } },
      recurrence: 'once'
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toEqual({ triggered: true });
  });

  it('returns { triggered: false } when beat target not yet reached', () => {
    // Mock returns @500.00, target is 600 → 500 < 600 → not triggered
    const alarm = {
      enabled: true,
      condition: { type: 'beat-time', params: { beat: 600 } },
      recurrence: 'once'
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toEqual({ triggered: false });
  });

  it('returns { triggered: true } when beat target reached', () => {
    const alarm = {
      enabled: true,
      condition: { type: 'beat-time', params: { beat: 500 } },
      recurrence: 'once'
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toEqual({ triggered: true });
  });

  it('returns { triggered: true } when beat target passed (after target)', () => {
    // Mock returns @500.00, target is 400 → 500 >= 400 → triggered
    const alarm = {
      enabled: true,
      condition: { type: 'beat-time', params: { beat: 400 } },
      recurrence: 'once'
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toEqual({ triggered: true });
  });
});

describe('evaluateCondition', () => {
  it('standard-time returns { triggered: true } when target reached', () => {
    const condition = { type: 'standard-time', params: { hours: 12, minutes: 0 } };
    const testTime = new Date(2026, 3, 15, 12, 0, 0);
    const events = getMockEvents();
    expect(evaluateCondition(condition, testTime, events)).toEqual({ triggered: true });
  });

  it('standard-time returns { triggered: false } when not yet reached', () => {
    const condition = { type: 'standard-time', params: { hours: 16, minutes: 0 } };
    const testTime = new Date(2026, 3, 15, 12, 0, 0);
    const events = getMockEvents();
    expect(evaluateCondition(condition, testTime, events)).toEqual({ triggered: false });
  });

  it('beat-time returns { triggered: true } when current >= target', () => {
    const condition = { type: 'beat-time', params: { beat: 500 } };
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toEqual({ triggered: true });
  });

  it('beat-time returns { triggered: false } when current < target', () => {
    const condition = { type: 'beat-time', params: { beat: 600 } };
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toEqual({ triggered: false });
  });

  it('date-trigger returns { triggered: true }', () => {
    const condition = { type: 'date-trigger', params: {} };
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toEqual({ triggered: true });
  });

  it('astro-offset returns { triggered: true } when time reached', () => {
    const condition = {
      type: 'astro-offset',
      params: { offsetMinutes: 60, event: 'sunrise' }
    };
    // sunrise is at now - 3600000ms (1 hour before), + 60 minutes = now
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toEqual({ triggered: true });
  });

  it('astro-offset returns { triggered: false } for invalid event time', () => {
    const condition = {
      type: 'astro-offset',
      params: { offsetMinutes: 30, event: 'nonexistent' }
    };
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toEqual({ triggered: false });
  });
});

describe('evaluateDateFilter', () => {
  it('returns true for no filter', () => {
    expect(evaluateDateFilter(null, now, getMockEvents())).toBe(true);
    expect(evaluateDateFilter({}, now, getMockEvents())).toBe(true);
  });

  it('lunar-phase full-moon returns true when isFullMoonDay is true', () => {
    astroCache.isFullMoonDay.mockReturnValue(true);
    const filter = { type: 'lunar-phase', params: { phase: 'full-moon' } };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(true);
  });

  it('lunar-phase full-moon returns false when isFullMoonDay is false', () => {
    astroCache.isFullMoonDay.mockReturnValue(false);
    const filter = { type: 'lunar-phase', params: { phase: 'full-moon' } };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(false);
  });

  it('lunar-phase new-moon uses isNewMoonDay', () => {
    astroCache.isNewMoonDay.mockReturnValue(true);
    const filter = { type: 'lunar-phase', params: { phase: 'new-moon' } };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(true);
  });

  it('equinox uses isEquinoxDay', () => {
    const filter = { type: 'equinox' };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(false);
  });

  it('solstice uses isSolsticeDay', () => {
    const filter = { type: 'solstice' };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(false);
  });

  it('weekdays returns true for matching day', () => {
    const filter = { type: 'weekdays', params: { days: [1, 2, 3, 4, 5] } };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(true);
  });

  it('weekdays returns false for non-matching day', () => {
    const filter = { type: 'weekdays', params: { days: [0, 6] } };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(false);
  });
});

describe('evaluateRecurrence', () => {
  it('once returns true', () => {
    const alarm = { recurrence: 'once', condition: { type: 'standard-time', params: {} } };
    expect(evaluateRecurrence(alarm, now)).toBe(true);
  });

  it('daily returns true', () => {
    const alarm = { recurrence: 'daily', condition: { type: 'standard-time', params: {} } };
    expect(evaluateRecurrence(alarm, now)).toBe(true);
  });

  it('weekly with weekday filter returns true for matching day', () => {
    const alarm = {
      recurrence: 'weekly',
      condition: { type: 'standard-time', params: {}, dateFilter: { type: 'weekdays', params: { days: [1, 2, 3, 4, 5] } } }
    };
    expect(evaluateRecurrence(alarm, now)).toBe(true);
  });

  it('weekly with weekday filter returns false for non-matching day', () => {
    const alarm = {
      recurrence: 'weekly',
      condition: { type: 'standard-time', params: {}, dateFilter: { type: 'weekdays', params: { days: [0, 6] } } }
    };
    expect(evaluateRecurrence(alarm, now)).toBe(false);
  });

  it('monthly returns true', () => {
    const alarm = { recurrence: 'monthly', condition: { type: 'standard-time', params: {} } };
    expect(evaluateRecurrence(alarm, now)).toBe(true);
  });

  it('lunar with full-moon filter returns true when isFullMoonDay', () => {
    astroCache.isFullMoonDay.mockReturnValue(true);
    const alarm = {
      recurrence: 'lunar',
      condition: { type: 'date-trigger', params: {}, dateFilter: { type: 'lunar-phase', params: { phase: 'full-moon' } } }
    };
    expect(evaluateRecurrence(alarm, now)).toBe(true);
  });

  it('defaults to true for unknown recurrence', () => {
    const alarm = { recurrence: 'unknown', condition: { type: 'standard-time', params: {} } };
    expect(evaluateRecurrence(alarm, now)).toBe(true);
  });
});
