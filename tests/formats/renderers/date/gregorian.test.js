// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/date/gregorian.js';

describe('gregorian date renderer', () => {
  it('renders M/D from data.now UTC (no zero-padding)', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)) }; // Apr 14
    expect(render(data)).toBe('4/14');
  });

  it('renders 1/1 for Jan 1', () => {
    const data = { now: new Date(Date.UTC(2026, 0, 1)) };
    expect(render(data)).toBe('1/1');
  });

  it('renders 12/31 for Dec 31', () => {
    const data = { now: new Date(Date.UTC(2026, 11, 31)) };
    expect(render(data)).toBe('12/31');
  });

  it('appends + when opts.solarDateDiffsStdDate is ahead', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)) };
    expect(render(data, { solarDateDiffsStdDate: 'ahead' })).toBe('4/14+');
  });

  it('appends - when opts.solarDateDiffsStdDate is behind', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)) };
    expect(render(data, { solarDateDiffsStdDate: 'behind' })).toBe('4/14-');
  });

  it('no suffix when opts.solarDateDiffsStdDate is null', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)) };
    expect(render(data, { solarDateDiffsStdDate: null })).toBe('4/14');
  });

  it('no suffix when opts.solarDateDiffsStdDate is absent', () => {
    const data = { now: new Date(Date.UTC(2026, 3, 14)) };
    expect(render(data, {})).toBe('4/14');
  });

  it('falls back to new Date() when data.now is absent', () => {
    const result = render({});
    expect(result).toMatch(/^\d{1,2}\/\d{1,2}$/);
  });
});
