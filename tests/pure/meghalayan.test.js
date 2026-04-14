// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/meghalayan.js';

describe('meghalayan (Holocene stages) chronometer', () => {
  it('returns Meghalayan for 2026 CE', () => {
    const result = compute(new Date(Date.UTC(2026, 0, 1)));
    expect(result).toEqual({ stage: 'meghalayan', year: 4226, label: 'Mgh 4226' });
  });

  it('returns Meghalayan 1 for 2200 BCE', () => {
    // 2200 BCE = JS year -2199, -2199 + 2200 = 1
    const result = compute(new Date(Date.UTC(-2199, 0, 1)));
    expect(result).toEqual({ stage: 'meghalayan', year: 1, label: 'Mgh 1' });
  });

  it('returns Northgrippian for 3000 BCE', () => {
    // 3000 BCE = JS year -2999, -2999 + 6326 = 3327
    const result = compute(new Date(Date.UTC(-2999, 0, 1)));
    expect(result).toEqual({ stage: 'northgrippian', year: 3327, label: 'Nrg 3327' });
  });

  it('returns Northgrippian 1 for 6326 BCE boundary', () => {
    // 6326 BCE = JS year -6325, -6325 + 6326 = 1
    const result = compute(new Date(Date.UTC(-6325, 0, 1)));
    expect(result).toEqual({ stage: 'northgrippian', year: 1, label: 'Nrg 1' });
  });

  it('returns Greenlandian for 8000 BCE', () => {
    // 8000 BCE = JS year -7999, -7999 + 9700 = 1701
    const result = compute(new Date(Date.UTC(-7999, 0, 1)));
    expect(result).toEqual({ stage: 'greenlandian', year: 1701, label: 'Ghg 1701' });
  });

  it('returns Greenlandian 1 for 9700 BCE boundary', () => {
    // 9700 BCE = JS year -9699, -9699 + 9700 = 1
    const result = compute(new Date(Date.UTC(-9699, 0, 1)));
    expect(result).toEqual({ stage: 'greenlandian', year: 1, label: 'Ghg 1' });
  });

  it('returns pre-holocene for 9701 BCE', () => {
    // 9701 BCE = JS year -9700, which is < -9699
    const result = compute(new Date(Date.UTC(-9700, 0, 1)));
    expect(result).toEqual({ stage: 'pre-holocene', year: null, label: '—' });
  });

  it('returns correct object shape for any date', () => {
    const result = compute(new Date());
    expect(result).toHaveProperty('stage');
    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('label');
  });

  it('ignores opts parameter', () => {
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(compute(date, {})).toEqual(compute(date, { anything: true }));
  });
});
