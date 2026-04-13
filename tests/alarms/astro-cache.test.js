import { describe, it, expect } from 'vitest';
import {
  isSameDay,
  isFullMoonDay,
  isNewMoonDay,
  isEquinoxDay,
  isSolsticeDay,
  isLunarEventDay,
  invalidateCache,
  getAstroEvents
} from '../../src/alarms/astro-cache.js';

describe('isSameDay', () => {
  it('returns true for same calendar day with different times', () => {
    const d1 = new Date(2026, 3, 15, 0, 0, 0);
    const d2 = new Date(2026, 3, 15, 23, 59, 59);
    expect(isSameDay(d1, d2)).toBe(true);
  });

  it('returns false for different days', () => {
    const d1 = new Date(2026, 3, 15);
    const d2 = new Date(2026, 3, 16);
    expect(isSameDay(d1, d2)).toBe(false);
  });

  it('returns false for different months', () => {
    const d1 = new Date(2026, 3, 15);
    const d2 = new Date(2026, 4, 15);
    expect(isSameDay(d1, d2)).toBe(false);
  });

  it('returns false for different years', () => {
    const d1 = new Date(2026, 3, 15);
    const d2 = new Date(2027, 3, 15);
    expect(isSameDay(d1, d2)).toBe(false);
  });
});

describe('isFullMoonDay', () => {
  it('returns true when fraction >= 0.98', () => {
    expect(isFullMoonDay(0.99)).toBe(true);
  });

  it('returns true at exactly 0.98', () => {
    expect(isFullMoonDay(0.98)).toBe(true);
  });

  it('returns false when fraction < 0.98', () => {
    expect(isFullMoonDay(0.97)).toBe(false);
  });
});

describe('isNewMoonDay', () => {
  it('returns true when fraction <= 0.02', () => {
    expect(isNewMoonDay(0.01)).toBe(true);
  });

  it('returns true at exactly 0.02', () => {
    expect(isNewMoonDay(0.02)).toBe(true);
  });

  it('returns false when fraction > 0.02', () => {
    expect(isNewMoonDay(0.03)).toBe(false);
  });
});

describe('isEquinoxDay', () => {
  it('returns true when date matches march equinox', () => {
    const marchEquinox = new Date(2026, 2, 20, 12, 0, 0);
    const equinoxes = { march: marchEquinox, september: new Date(2026, 8, 22) };
    expect(isEquinoxDay(marchEquinox, equinoxes)).toBe(true);
  });

  it('returns true when date matches september equinox', () => {
    const septemberEquinox = new Date(2026, 8, 22, 12, 0, 0);
    const equinoxes = { march: new Date(2026, 2, 20), september: septemberEquinox };
    expect(isEquinoxDay(septemberEquinox, equinoxes)).toBe(true);
  });

  it('returns false for other dates', () => {
    const otherDate = new Date(2026, 5, 15);
    const equinoxes = { march: new Date(2026, 2, 20), september: new Date(2026, 8, 22) };
    expect(isEquinoxDay(otherDate, equinoxes)).toBe(false);
  });
});

describe('isSolsticeDay', () => {
  it('returns true when date matches june solstice', () => {
    const juneSolstice = new Date(2026, 5, 21, 12, 0, 0);
    const solstices = { june: juneSolstice, december: new Date(2026, 11, 21) };
    expect(isSolsticeDay(juneSolstice, solstices)).toBe(true);
  });

  it('returns true when date matches december solstice', () => {
    const decemberSolstice = new Date(2026, 11, 21, 12, 0, 0);
    const solstices = { june: new Date(2026, 5, 21), december: decemberSolstice };
    expect(isSolsticeDay(decemberSolstice, solstices)).toBe(true);
  });

  it('returns false for other dates', () => {
    const otherDate = new Date(2026, 3, 15);
    const solstices = { june: new Date(2026, 5, 21), december: new Date(2026, 11, 21) };
    expect(isSolsticeDay(otherDate, solstices)).toBe(false);
  });
});

describe('invalidateCache', () => {
  it('clears cache so next getAstroEvents recomputes', () => {
    // Call getAstroEvents to populate cache
    const events1 = getAstroEvents(new Date(), 40.7128, -74.0060);
    expect(events1).toHaveProperty('sun');

    // Invalidate
    invalidateCache();

    // Call again - should still work (recompute)
    const events2 = getAstroEvents(new Date(), 40.7128, -74.0060);
    expect(events2).toHaveProperty('sun');
  });
});

describe('isLunarEventDay', () => {
  it('returns true when date matches a full moon date', () => {
    const fullMoonDate = new Date(2026, 3, 15);
    const lunarEvents = { fullMoons: [fullMoonDate], newMoons: [] };
    const testDate = new Date(2026, 3, 15);
    expect(isLunarEventDay(testDate, lunarEvents, 'full-moon')).toBe(true);
  });

  it('returns false when date does not match', () => {
    const fullMoonDate = new Date(2026, 3, 15);
    const lunarEvents = { fullMoons: [fullMoonDate], newMoons: [] };
    const testDate = new Date(2026, 3, 16);
    expect(isLunarEventDay(testDate, lunarEvents, 'full-moon')).toBe(false);
  });

  it('returns true for new moon match', () => {
    const newMoonDate = new Date(2026, 4, 1);
    const lunarEvents = { fullMoons: [], newMoons: [newMoonDate] };
    const testDate = new Date(2026, 4, 1);
    expect(isLunarEventDay(testDate, lunarEvents, 'new-moon')).toBe(true);
  });

  it('returns false for invalid event type', () => {
    const lunarEvents = { fullMoons: [], newMoons: [] };
    const testDate = new Date(2026, 3, 15);
    expect(isLunarEventDay(testDate, lunarEvents, 'invalid')).toBe(false);
  });
});

describe('getAstroEvents', () => {
  it('returns object with expected keys', () => {
    const events = getAstroEvents(new Date(), 40.7128, -74.0060);
    expect(events).toHaveProperty('sun');
    expect(events).toHaveProperty('moon');
    expect(events).toHaveProperty('equinoxes');
    expect(events).toHaveProperty('solstices');
    expect(events).toHaveProperty('lunarEvents');
  });

  it('sun object has sunrise, sunset, solarNoon', () => {
    const events = getAstroEvents(new Date(), 40.7128, -74.0060);
    expect(events.sun).toHaveProperty('sunrise');
    expect(events.sun).toHaveProperty('sunset');
    expect(events.sun).toHaveProperty('solarNoon');
  });

  it('moon object has fraction and phase', () => {
    const events = getAstroEvents(new Date(), 40.7128, -74.0060);
    expect(events.moon).toHaveProperty('fraction');
    expect(events.moon).toHaveProperty('phase');
  });

  it('lunarEvents has fullMoons and newMoons arrays', () => {
    const events = getAstroEvents(new Date(), 40.7128, -74.0060);
    expect(Array.isArray(events.lunarEvents.fullMoons)).toBe(true);
    expect(Array.isArray(events.lunarEvents.newMoons)).toBe(true);
  });
});
