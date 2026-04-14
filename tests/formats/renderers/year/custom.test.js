// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/year/custom.js';

describe('custom epoch year renderer', () => {
  it('renders Y{year} from data.customEpoch string CE7', () => {
    expect(render({ customEpoch: 'CE7' })).toBe('Y7');
  });

  it('renders Y1 from data.customEpoch string CE1', () => {
    expect(render({ customEpoch: 'CE1' })).toBe('Y1');
  });

  it('renders Y?? when data.customEpoch is CE??', () => {
    expect(render({ customEpoch: 'CE??' })).toBe('Y??');
  });

  it('renders Y?? when no data', () => {
    expect(render({})).toBe('Y??');
  });

  it('renders Y?? when data is null', () => {
    expect(render(null)).toBe('Y??');
  });

  it('computes year from effectiveYear and opts.customEpoch Date', () => {
    const opts = { customEpoch: new Date(Date.UTC(2020, 0, 1)) };
    expect(render({ effectiveYear: 2026 }, opts)).toBe('Y7');
  });

  it('uses opts.customLabel as prefix when set', () => {
    expect(render({ customEpoch: 'CE7' }, { customLabel: 'Era' })).toBe('Era7');
  });

  it('uses opts.customLabel as suffix when opts.customLabelPosition is suffix', () => {
    expect(render({ customEpoch: 'CE7' }, { customLabel: 'Era', customLabelPosition: 'suffix' })).toBe('7Era');
  });

  it('renders {customLabel}?? when customLabel set but no data', () => {
    expect(render({}, { customLabel: 'Era' })).toBe('Era??');
  });
});
