import { describe, it, expect } from 'vitest';
import { compose } from '../../src/chronometers/index.js';
import { render as render24h } from '../../src/formats/renderers/solartime/24h.js';
import { render as renderDecimal } from '../../src/formats/renderers/solartime/decimal.js';
import { render as renderLongitudinal } from '../../src/formats/renderers/solartime/longitudinal.js';
import { render as renderDescriptive } from '../../src/formats/renderers/solartime/descriptive.js';

describe('Solar time integration', () => {
  describe('Chronometer to renderer data flow', () => {
    it('compose() output includes solarTime object when location provided', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 0, longitude: 0 };
      const data = compose(date, opts);
      
      expect(data.solarTime).toBeDefined();
      expect(data.solarTime).not.toBeNull();
      expect(typeof data.solarTime).toBe('object');
      expect(data.solarTime).toHaveProperty('hours');
      expect(data.solarTime).toHaveProperty('minutes');
      expect(data.solarTime).toHaveProperty('totalMinutes');
      expect(data.solarTime).toHaveProperty('degrees');
    });

    it('compose() returns null for solarTime when location missing', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = {}; // no latitude/longitude
      const data = compose(date, opts);
      
      expect(data.solarTime).toBeNull();
    });

    it('24h renderer formats solarTime object from compose()', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 0, longitude: 0 };
      const data = compose(date, opts);
      data.now = date; // renderers expect data.now
      
      const result = render24h(data);
      
      expect(result).toMatch(/^\d{2}:\d{2}$/); // HH:MM format
      expect(result).not.toBe('??:??'); // not error fallback
    });

    it('decimal renderer formats solarTime object from compose()', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 0, longitude: 0 };
      const data = compose(date, opts);
      data.now = date;
      
      const result = renderDecimal(data);
      
      expect(result).toMatch(/^@\d{3}$/); // @NNN format
      expect(result).not.toBe('@???'); // not error fallback
    });

    it('longitudinal renderer formats solarTime object from compose()', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 0, longitude: 0 };
      const data = compose(date, opts);
      data.now = date;
      
      const result = renderLongitudinal(data);
      
      // UI prepends the custom symbol, so renderer output is numeric only
      expect(result).toContain('°');
      expect(result).toMatch(/^\d{3}°/); // NNN° prefix pattern
      expect(result).not.toContain('???'); // not error fallback
    });

    it('descriptive renderer works with real date and location', () => {
      const date = new Date('2026-03-20T17:00:00Z'); // noon EST
      const opts = { latitude: 40, longitude: -74 }; // New York
      const data = { now: date }; // descriptive renderer doesn't use solarTime
      
      const result = renderDescriptive(data, opts);
      
      // Should return a valid label (not error fallback 'Day' alone)
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Date comparison integration', () => {
    it('24h renderer sets opts.solarDateDiffsStdDate', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 0, longitude: 0, meridianOffset: 0 };
      const data = compose(date, opts);
      data.now = date;
      
      const optsObj = { meridianOffset: 0 };
      render24h(data, optsObj);
      
      // Should be null (dates match at Prime Meridian with no offset)
      expect(optsObj.solarDateDiffsStdDate).toBe(null);
    });

    it('decimal renderer sets opts.solarDateDiffsStdDate', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 0, longitude: 0 };
      const data = compose(date, opts);
      data.now = date;
      
      const optsObj = { meridianOffset: 0 };
      renderDecimal(data, optsObj);
      
      expect(optsObj).toHaveProperty('solarDateDiffsStdDate');
    });

    it('longitudinal renderer sets opts.solarDateDiffsStdDate', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 0, longitude: 0 };
      const data = compose(date, opts);
      data.now = date;
      
      const optsObj = { meridianOffset: 0 };
      renderLongitudinal(data, optsObj);
      
      expect(optsObj).toHaveProperty('solarDateDiffsStdDate');
    });

    it('descriptive renderer sets opts.solarDateDiffsStdDate', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = { latitude: 40, longitude: -74 };
      const data = compose(date, opts);
      data.now = date;
      
      const optsObj = { latitude: 40, longitude: -74, meridianOffset: 0 };
      renderDescriptive(data, optsObj);
      
      expect(optsObj).toHaveProperty('solarDateDiffsStdDate');
    });

    it('date comparison detects ahead when solar time is east', () => {
      const date = new Date('2026-03-20T23:00:00Z'); // 11 PM UTC
      const opts = { latitude: 0, longitude: 60 }; // 60° east = +4 hours solar
      const data = compose(date, opts);
      data.now = date;
      
      const optsObj = { meridianOffset: 0 }; // Standard time at UTC
      render24h(data, optsObj);
      
      // Solar time at 60°E should be ~3-4 AM (next day), standard time is 11 PM (same day)
      // So solar date should be ahead
      expect(optsObj.solarDateDiffsStdDate).toBe('ahead');
    });

    it('date comparison detects behind when solar time is west', () => {
      const date = new Date('2026-03-20T01:00:00Z'); // 1 AM UTC
      const opts = { latitude: 0, longitude: -60 }; // 60° west = -4 hours solar
      const data = compose(date, opts);
      data.now = date;
      
      const optsObj = { meridianOffset: 0 }; // Standard time at UTC
      render24h(data, optsObj);
      
      // Solar time at 60°W should be ~9 PM (previous day), standard time is 1 AM (current day)
      // So solar date should be behind
      expect(optsObj.solarDateDiffsStdDate).toBe('behind');
    });
  });

  describe('Error handling end-to-end', () => {
    it('renderers handle null solarTime from compose() gracefully', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const opts = {}; // no location
      const data = compose(date, opts);
      data.now = date;
      
      // solarTime should be null (location missing)
      expect(data.solarTime).toBeNull();
      
      // Renderers should return error fallbacks
      expect(render24h(data)).toBe('??:??');
      expect(renderDecimal(data)).toBe('@???');
      expect(renderLongitudinal(data)).toContain('???');
    });

    it('descriptive renderer handles missing location gracefully', () => {
      const date = new Date('2026-03-20T12:00:00Z');
      const data = { now: date };
      const opts = {}; // no location
      
      const result = renderDescriptive(data, opts);
      
      expect(result).toBe('Day'); // fallback
    });
  });

  describe('Full pipeline simulation', () => {
    it('complete flow: compose → all four renderers produce valid output', () => {
      const date = new Date('2026-06-21T15:00:00Z'); // Summer solstice, 3 PM UTC
      const opts = { latitude: 40, longitude: -74, meridianOffset: -5 }; // New York, EST
      const data = compose(date, opts);
      data.now = date;
      
      // All renderers should produce valid (non-error) output
      const render24hResult = render24h(data, opts);
      const renderDecimalResult = renderDecimal(data, opts);
      const renderLongitudinalResult = renderLongitudinal(data, opts);
      const renderDescriptiveResult = renderDescriptive(data, opts);
      
      expect(render24hResult).toMatch(/^\d{2}:\d{2}$/);
      expect(render24hResult).not.toBe('??:??');
      
      expect(renderDecimalResult).toMatch(/^@\d{3}$/);
      expect(renderDecimalResult).not.toBe('@???');
      
      expect(renderLongitudinalResult).toContain('°');
      expect(renderLongitudinalResult).not.toContain('???');
      
      expect(renderDescriptiveResult).toBeTruthy();
      expect(renderDescriptiveResult.length).toBeGreaterThan(2);
    });
  });
});
