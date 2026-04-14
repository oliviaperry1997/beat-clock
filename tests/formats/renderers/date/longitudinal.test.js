// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { render } from '../../../../src/formats/renderers/date/longitudinal.js';

describe('longitudinal date renderer', () => {
  it('renders ☉ {SL}° ☽ {LP}° with prefix stripped', () => {
    expect(render({ solarLongitude: 'SL024', lunarPhase: 'LP180' })).toBe('☉ 024° ☽ 180°');
  });

  it('renders ☉ 000° ☽ 000° for zero angles', () => {
    expect(render({ solarLongitude: 'SL000', lunarPhase: 'LP000' })).toBe('☉ 000° ☽ 000°');
  });

  it('renders ☉ 360° ☽ 360° for maximum angles', () => {
    expect(render({ solarLongitude: 'SL360', lunarPhase: 'LP360' })).toBe('☉ 360° ☽ 360°');
  });

  it('renders ☉ ???° ☽ ???° when solarLongitude is SL??', () => {
    expect(render({ solarLongitude: 'SL??', lunarPhase: 'LP180' })).toBe('☉ ???° ☽ 180°');
  });

  it('renders ☉ 024° ☽ ???° when lunarPhase is LP??', () => {
    expect(render({ solarLongitude: 'SL024', lunarPhase: 'LP??' })).toBe('☉ 024° ☽ ???°');
  });

  it('renders full error ☉ ???° ☽ ???° when both are error values', () => {
    expect(render({ solarLongitude: 'SL??', lunarPhase: 'LP??' })).toBe('☉ ???° ☽ ???°');
  });

  it('renders full error when data is null', () => {
    expect(render(null)).toBe('☉ ???° ☽ ???°');
  });

  it('renders full error when data is empty', () => {
    expect(render({})).toBe('☉ ???° ☽ ???°');
  });

  it('does not append +/- even when opts.solarDateDiffsStdDate is set', () => {
    const result = render({ solarLongitude: 'SL024', lunarPhase: 'LP180' }, { solarDateDiffsStdDate: 'ahead' });
    expect(result).toBe('☉ 024° ☽ 180°');
    expect(result).not.toContain('+');
  });

  it('does not include raw SL or LP prefix in output', () => {
    const result = render({ solarLongitude: 'SL024', lunarPhase: 'LP180' });
    expect(result).not.toContain('SL');
    expect(result).not.toContain('LP');
  });
});
