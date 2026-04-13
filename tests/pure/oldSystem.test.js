// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/oldSystem.js';

describe('oldSystem chronometer', () => {
  it('returns valid object structure for a known date', () => {
    const date = new Date(Date.UTC(2026, 2, 1)); // March 1, 2026
    const result = compute(date);
    expect(result).toHaveProperty('lunation');
    expect(result).toHaveProperty('percent');
    expect(result).toHaveProperty('daysSinceEquinox');
    expect(typeof result.lunation).toBe('number');
    expect(typeof result.percent).toBe('string');
    expect(typeof result.daysSinceEquinox).toBe('number');
  });

  it('returns positive daysSinceEquinox after spring equinox', () => {
    // After March 20, 2026 equinox
    const date = new Date(Date.UTC(2026, 3, 1)); // April 1, 2026
    const result = compute(date);
    expect(result.daysSinceEquinox).toBeGreaterThan(0);
  });

  it('does NOT import marchEquinoxJDE polynomial (uses astronomia/solstice)', () => {
    // Verify by checking the module doesn't contain the polynomial pattern
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(
      path.join(__dirname, '../../src/chronometers/oldSystem.js'),
      'utf8'
    );
    expect(content).not.toContain('marchEquinoxJDE');
    expect(content).toContain('solstice.march');
  });
});
