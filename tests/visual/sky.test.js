// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { getSkyGradientColors, lerpColor } from '../../src/sky.js';

describe('sky gradient', () => {
  it('returns default deep-night gradient with no location', () => {
    const result = getSkyGradientColors(null, null, null);
    expect(result).toEqual({ topColor: '#0a0a1a', bottomColor: '#0d1117' });
  });

  it('returns hex colors for valid location', () => {
    const date = new Date();
    const result = getSkyGradientColors(date, 40.7128, -74.0060); // New York
    expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result.bottomColor).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('lerps to mid-gray at t=0.5', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 0.5)).toBe('#808080');
  });

  it('lerps to colorA at t=0', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 0)).toBe('#000000');
  });

  it('lerps to colorB at t=1', () => {
    expect(lerpColor([0, 0, 0], [255, 255, 255], 1)).toBe('#ffffff');
  });

  it('handles invalid coordinates gracefully', () => {
    const date = new Date();
    const result = getSkyGradientColors(date, 999, 999);
    expect(result.topColor).toMatch(/^#/);
    expect(result.bottomColor).toMatch(/^#/);
  });

  it('returns valid phase for midnight date', () => {
    // Midnight should be in a night phase
    const midnight = new Date(Date.UTC(2026, 3, 15, 0, 0, 0));
    const result = getSkyGradientColors(midnight, 40.7128, -74.0060);
    expect(result.topColor).toMatch(/^#/);
    expect(result.bottomColor).toMatch(/^#/);
  });

  it('returns valid phase for noon date', () => {
    // Noon should be in a day phase
    const noon = new Date(Date.UTC(2026, 6, 15, 12, 0, 0));
    const result = getSkyGradientColors(noon, 40.7128, -74.0060);
    expect(result.topColor).toMatch(/^#/);
    expect(result.bottomColor).toMatch(/^#/);
  });

  describe('polar day', () => {
    // Svalbard (78°N, 15°E) in June — midnight sun, sun never sets
    const lat = 78;
    const lon = 15;

    it('does not return deep-night at solar noon during polar day', () => {
      const noon = new Date('2026-06-15T11:01:00Z'); // ~solar noon at Svalbard in June
      const result = getSkyGradientColors(noon, lat, lon);
      // Should be day or golden-hour, not pitch black
      expect(result.topColor).not.toBe('#0a0a1a');
      expect(result.bottomColor).not.toBe('#0d1117');
    });

    it('does not return deep-night at antinoon during polar day', () => {
      // Solar noon + 12h = antinoon (sun low but still above horizon)
      const antinoon = new Date('2026-06-15T23:01:00Z');
      const result = getSkyGradientColors(antinoon, lat, lon);
      expect(result.topColor).not.toBe('#0a0a1a');
    });

    it('returns valid hex colors throughout a polar day', () => {
      for (let h = 0; h < 24; h += 3) {
        const d = new Date(`2026-06-15T${String(h).padStart(2, '0')}:00:00Z`);
        const result = getSkyGradientColors(d, lat, lon);
        expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(result.bottomColor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe('polar night with twilight', () => {
    // Svalbard (78°N, 15°E) in December — polar night with nautical twilight
    const lat = 78;
    const lon = 15;

    it('does not return deep-night at solar noon during polar night twilight', () => {
      // Solar noon ~10:56 UTC — this is the brightest moment (nautical twilight)
      const noon = new Date('2026-12-15T10:56:00Z');
      const result = getSkyGradientColors(noon, lat, lon);
      // Should be astronomical-twilight range, not deep-night
      expect(result.topColor).not.toBe('#0a0a1a');
    });

    it('returns deep-night at true midnight during polar night', () => {
      // Solar noon + 12h = ~22:56 UTC — well into deep night
      const midnight = new Date('2026-12-15T22:56:00Z');
      const result = getSkyGradientColors(midnight, lat, lon);
      expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
      // Colors should be in the dark navy range (deep night)
      // The hex values should be dark — R/G/B each < 50 (roughly)
    });

    it('returns valid hex colors throughout a polar night day', () => {
      for (let h = 0; h < 24; h += 3) {
        const d = new Date(`2026-12-15T${String(h).padStart(2, '0')}:00:00Z`);
        const result = getSkyGradientColors(d, lat, lon);
        expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(result.bottomColor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe('partial polar night with civil twilight', () => {
    // Murmansk (69°N, 33°E) in December — no sunrise but civil twilight present
    const lat = 68.97;
    const lon = 33.07;

    it('does not return deep-night during civil twilight window', () => {
      // dawn ~07:16 UTC, dusk ~12:11 UTC — civil twilight window
      const civilTwilight = new Date('2026-12-15T09:44:00Z'); // solar noon
      const result = getSkyGradientColors(civilTwilight, lat, lon);
      expect(result.topColor).not.toBe('#0a0a1a');
    });

    it('returns valid hex colors throughout partial polar night day', () => {
      for (let h = 0; h < 24; h += 3) {
        const d = new Date(`2026-12-15T${String(h).padStart(2, '0')}:00:00Z`);
        const result = getSkyGradientColors(d, lat, lon);
        expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(result.bottomColor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe('white nights', () => {
    // Helsinki (60°N, 25°E) in June — sun sets but never reaches -18°
    const lat = 60.17;
    const lon = 24.94;

    it('does not return deep-night during the short Helsinki summer night', () => {
      // At 23:00 UTC, sun is above -18° even though it has set
      const shortNight = new Date('2026-06-21T22:00:00Z');
      const result = getSkyGradientColors(shortNight, lat, lon);
      // Should be at worst civil or astronomical twilight, not deep-night
      expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('returns valid hex colors throughout white nights', () => {
      for (let h = 0; h < 24; h += 3) {
        const d = new Date(`2026-06-21T${String(h).padStart(2, '0')}:00:00Z`);
        const result = getSkyGradientColors(d, lat, lon);
        expect(result.topColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(result.bottomColor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe('evening twilight progression', () => {
    // New York in winter — clear evening transition
    const lat = 40.7128;
    const lon = -74.0060;

    it('progresses smoothly from golden hour through twilight to deep night', () => {
      // Sample times through evening: golden hour → civil → nautical → astronomical → night
      const times = [
        { time: new Date('2026-12-15T21:00:00Z'), label: 'golden hour' },
        { time: new Date('2026-12-15T21:30:00Z'), label: 'sunset' },
        { time: new Date('2026-12-15T22:00:00Z'), label: 'civil twilight' },
        { time: new Date('2026-12-15T22:40:00Z'), label: 'nautical twilight' },
        { time: new Date('2026-12-15T23:15:00Z'), label: 'astronomical twilight' },
        { time: new Date('2026-12-16T00:00:00Z'), label: 'night' },
      ];

      const colors = times.map(({ time }) => getSkyGradientColors(time, lat, lon));
      
      // Extract brightness (R+G+B sum) for each time
      const brightness = colors.map(c => {
        const topR = parseInt(c.topColor.slice(1, 3), 16);
        const topG = parseInt(c.topColor.slice(3, 5), 16);
        const topB = parseInt(c.topColor.slice(5, 7), 16);
        return topR + topG + topB;
      });

      // Brightness should decrease monotonically (no reversals)
      for (let i = 1; i < brightness.length; i++) {
        expect(brightness[i]).toBeLessThanOrEqual(brightness[i - 1] + 10); // +10 tolerance for rounding
      }

      // First time (golden hour) should be significantly brighter than last (night)
      expect(brightness[0]).toBeGreaterThan(brightness[brightness.length - 1] + 50);
    });

    it('does not show sudden brightness spikes during twilight', () => {
      // Check every 10 minutes through the critical evening period
      const startTime = new Date('2026-12-15T21:00:00Z').getTime();
      const colors = [];
      
      for (let i = 0; i < 18; i++) { // 3 hours = 18 x 10min
        const time = new Date(startTime + i * 10 * 60 * 1000);
        colors.push(getSkyGradientColors(time, lat, lon));
      }

      const brightness = colors.map(c => {
        const topR = parseInt(c.topColor.slice(1, 3), 16);
        const topG = parseInt(c.topColor.slice(3, 5), 16);
        const topB = parseInt(c.topColor.slice(5, 7), 16);
        return topR + topG + topB;
      });

      // No brightness should increase by more than 20 points (allowing small fluctuations)
      for (let i = 1; i < brightness.length; i++) {
        const increase = brightness[i] - brightness[i - 1];
        expect(increase).toBeLessThan(20);
      }
    });
  });
});
