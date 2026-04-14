// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/date/chinese.js';

describe('chinese date renderer', () => {
  it('renders M{month} D{day} for normal month', () => {
    expect(render({ lunisolar: { month: 6, day: 15, isLeap: false } })).toBe('M6 D15');
  });

  it('renders MX D{day} for intercalary (leap) month — no month number', () => {
    expect(render({ lunisolar: { month: 6, day: 1, isLeap: true } })).toBe('MX D1');
  });

  it('renders M1 D1 for Chinese New Year', () => {
    expect(render({ lunisolar: { month: 1, day: 1, isLeap: false } })).toBe('M1 D1');
  });

  it('appends + when opts.solarDateDiffsStdDate is ahead', () => {
    expect(render({ lunisolar: { month: 6, day: 15, isLeap: false } }, { solarDateDiffsStdDate: 'ahead' })).toBe('M6 D15+');
  });

  it('appends - when opts.solarDateDiffsStdDate is behind with leap month', () => {
    expect(render({ lunisolar: { month: 6, day: 1, isLeap: true } }, { solarDateDiffsStdDate: 'behind' })).toBe('MX D1-');
  });

  it('renders ?? when data.lunisolar is null', () => {
    expect(render({ lunisolar: null })).toBe('??');
  });

  it('renders ?? when data.lunisolar is the error string', () => {
    expect(render({ lunisolar: '??' })).toBe('??');
  });

  it('renders ?? when data.lunisolar is missing month', () => {
    expect(render({ lunisolar: { day: 15, isLeap: false } })).toBe('??');
  });

  it('renders ?? when data.lunisolar is missing day', () => {
    expect(render({ lunisolar: { month: 6, isLeap: false } })).toBe('??');
  });

  it('renders ?? when data is null', () => {
    expect(render(null)).toBe('??');
  });

  it('leap month shows MX not M6X', () => {
    const result = render({ lunisolar: { month: 6, day: 15, isLeap: true } });
    expect(result).toBe('MX D15');
    expect(result).not.toContain('M6X');
  });
});
