// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/year/gregorian.js';

describe('gregorian year renderer', () => {
  it('renders UTC year from data.now', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)) };
    expect(render(data)).toBe('2026');
  });

  it('renders data.effectiveYear as string when present', () => {
    expect(render({ effectiveYear: 2025 })).toBe('2025');
  });

  it('renders data.effectiveYear 2026 as string', () => {
    expect(render({ effectiveYear: 2026 })).toBe('2026');
  });

  it('effectiveYear takes precedence over data.now', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)), effectiveYear: 2025 };
    expect(render(data)).toBe('2025');
  });

  it('falls back to new Date() UTC year when no data.now and no effectiveYear', () => {
    const result = render({});
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}$/);
  });

  it('renders current UTC year when data is null', () => {
    const result = render(null);
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}$/);
  });

  it('uses getUTCFullYear not getFullYear (UTC consistency)', () => {
    // A date at UTC midnight Jan 1 — UTC year is always unambiguous here
    const data = { now: new Date(Date.UTC(2026, 0, 1, 0, 0, 0)) };
    expect(render(data)).toBe('2026');
  });
});
