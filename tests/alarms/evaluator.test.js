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
  shouldFireAlarm
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

describe('shouldFireAlarm', () => {
  it('returns true when lastFiredAt is null', () => {
    const alarm = { lastFiredAt: null };
    expect(shouldFireAlarm(alarm, now)).toBe(true);
  });

  it('returns true when last fired > 1728ms ago', () => {
    const alarm = { lastFiredAt: new Date(now.getTime() - 2000).toISOString() };
    expect(shouldFireAlarm(alarm, now)).toBe(true);
  });

  it('returns false when last fired < 1728ms ago', () => {
    const alarm = { lastFiredAt: new Date(now.getTime() - 1000).toISOString() };
    expect(shouldFireAlarm(alarm, now)).toBe(false);
  });
});

describe('evaluateAlarm', () => {
  it('returns false when alarm.enabled is false', () => {
    const alarm = {
      enabled: false,
      condition: { type: 'standard-time', params: { hours: 12, minutes: 0 } }
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toBe(false);
  });

  it('returns false when primary condition does not match', () => {
    const alarm = {
      enabled: true,
      condition: { type: 'standard-time', params: { hours: 8, minutes: 0 } }
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toBe(false);
  });

  it('returns true when all checks pass', () => {
    const alarm = {
      enabled: true,
      condition: { type: 'standard-time', params: { hours: 12, minutes: 0 } },
      recurrence: 'once',
      lastFiredAt: null
    };
    expect(evaluateAlarm(alarm, now, 40.7128, -74.0060)).toBe(true);
  });
});

describe('evaluateCondition', () => {
  it('standard-time returns true within tolerance', () => {
    const condition = { type: 'standard-time', params: { hours: 12, minutes: 0 } };
    const testTime = new Date(2026, 3, 15, 12, 0, 0);
    const events = getMockEvents();
    expect(evaluateCondition(condition, testTime, events)).toBe(true);
  });

  it('standard-time returns false outside tolerance', () => {
    const condition = { type: 'standard-time', params: { hours: 8, minutes: 0 } };
    const testTime = new Date(2026, 3, 15, 12, 0, 0);
    const events = getMockEvents();
    expect(evaluateCondition(condition, testTime, events)).toBe(false);
  });

  it('beat-time returns true within 1-beat tolerance', () => {
    const condition = { type: 'beat-time', params: { beat: 500 } };
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toBe(true);
  });

  it('date-trigger returns true', () => {
    const condition = { type: 'date-trigger', params: {} };
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toBe(true);
  });

  it('astro-offset returns true when within tolerance', () => {
    const condition = {
      type: 'astro-offset',
      params: { offsetMinutes: 3600, event: 'sunrise' }
    };
    // sunrise is at now - 3600000ms (1 hour before), + 3600 minutes = way in future
    // Let's set offsetMinutes to 60 (1 hour) to match now
    condition.params.offsetMinutes = 60;
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toBe(true);
  });

  it('astro-offset returns false for invalid event time', () => {
    const condition = {
      type: 'astro-offset',
      params: { offsetMinutes: 30, event: 'nonexistent' }
    };
    const events = getMockEvents();
    expect(evaluateCondition(condition, now, events)).toBe(false);
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
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(false); // not equinox day
  });

  it('solstice uses isSolsticeDay', () => {
    const filter = { type: 'solstice' };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(false); // not solstice day
  });

  it('weekdays returns true for matching day', () => {
    // April 15, 2026 is a Wednesday (getDay() === 3)
    const filter = { type: 'weekdays', params: { days: [1, 2, 3, 4, 5] } };
    expect(evaluateDateFilter(filter, now, getMockEvents())).toBe(true);
  });

  it('weekdays returns false for non-matching day', () => {
    const filter = { type: 'weekdays', params: { days: [0, 6] } }; // weekend only
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
    // April 15, 2026 is Wednesday (getDay() === 3)
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
