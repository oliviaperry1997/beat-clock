import { describe, it, expect } from 'vitest';
import {
  getRenderer,
  getAvailableFormats,
  getAllComponents,
  hasFormat,
} from '../../src/formats/registry.js';

describe('getRenderer', () => {
  it('returns renderer function for valid component+format', () => {
    const renderer = getRenderer('year', 'holocene');
    expect(typeof renderer).toBe('function');
  });

  it('returns renderer for all registered combinations', () => {
    // Year
    expect(typeof getRenderer('year', 'holocene')).toBe('function');
    expect(typeof getRenderer('year', 'gregorian')).toBe('function');
    expect(typeof getRenderer('year', 'meghalayan')).toBe('function');
    expect(typeof getRenderer('year', 'custom')).toBe('function');

    // Date
    expect(typeof getRenderer('date', 'gregorian')).toBe('function');
    expect(typeof getRenderer('date', 'chinese')).toBe('function');
    expect(typeof getRenderer('date', 'longitudinal')).toBe('function');

    // Standard Time
    expect(typeof getRenderer('stdTime', '24h')).toBe('function');
    expect(typeof getRenderer('stdTime', 'decimal')).toBe('function');
    expect(typeof getRenderer('stdTime', 'longitudinal')).toBe('function');

    // Solar Time
    expect(typeof getRenderer('solarTime', '24h')).toBe('function');
    expect(typeof getRenderer('solarTime', 'decimal')).toBe('function');
    expect(typeof getRenderer('solarTime', 'longitudinal')).toBe('function');
    expect(typeof getRenderer('solarTime', 'descriptive')).toBe('function');
  });

  it('returns null for unknown component', () => {
    expect(getRenderer('nonexistent', 'format')).toBe(null);
  });

  it('returns null for unknown format within valid component', () => {
    expect(getRenderer('year', 'nonexistent')).toBe(null);
  });

  it('renderers return string when called', () => {
    const yearRenderer = getRenderer('year', 'holocene');
    const result = yearRenderer({ holocene: 12026 });
    expect(typeof result).toBe('string');
  });
});

describe('getAvailableFormats', () => {
  it('returns format IDs for year component', () => {
    const formats = getAvailableFormats('year');
    expect(formats).toContain('holocene');
    expect(formats).toContain('gregorian');
    expect(formats).toContain('meghalayan');
    expect(formats).toContain('custom');
    expect(formats).toHaveLength(4);
  });

  it('returns format IDs for date component', () => {
    const formats = getAvailableFormats('date');
    expect(formats).toContain('gregorian');
    expect(formats).toContain('chinese');
    expect(formats).toContain('longitudinal');
    expect(formats).toHaveLength(3);
  });

  it('returns format IDs for stdTime component', () => {
    const formats = getAvailableFormats('stdTime');
    expect(formats).toContain('24h');
    expect(formats).toContain('decimal');
    expect(formats).toContain('longitudinal');
    expect(formats).toHaveLength(3);
  });

  it('returns format IDs for solarTime component', () => {
    const formats = getAvailableFormats('solarTime');
    expect(formats).toContain('24h');
    expect(formats).toContain('decimal');
    expect(formats).toContain('longitudinal');
    expect(formats).toContain('descriptive');
    expect(formats).toHaveLength(4);
  });

  it('returns empty array for unknown component', () => {
    expect(getAvailableFormats('nonexistent')).toEqual([]);
  });
});

describe('getAllComponents', () => {
  it('returns all component IDs', () => {
    const components = getAllComponents();
    expect(components).toContain('year');
    expect(components).toContain('date');
    expect(components).toContain('stdTime');
    expect(components).toContain('solarTime');
    expect(components).toHaveLength(4);
  });
});

describe('hasFormat', () => {
  it('returns true for valid combinations', () => {
    expect(hasFormat('year', 'holocene')).toBe(true);
    expect(hasFormat('date', 'chinese')).toBe(true);
    expect(hasFormat('stdTime', '24h')).toBe(true);
    expect(hasFormat('solarTime', 'descriptive')).toBe(true);
  });

  it('returns false for invalid combinations', () => {
    expect(hasFormat('nonexistent', 'format')).toBe(false);
    expect(hasFormat('year', 'nonexistent')).toBe(false);
  });
});
