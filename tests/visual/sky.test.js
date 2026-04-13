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
});
