// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { compute } from '../../src/chronometers/customEpoch.js';

describe('customEpoch chronometer', () => {
  it('returns CE?? when customEpoch not provided', () => {
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(compute(date, {})).toBe('CE??');
  });

  it('returns CE?? when customEpoch is undefined', () => {
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(compute(date)).toBe('CE??');
  });

  it('returns CE?? when customEpoch is not a Date', () => {
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(compute(date, { customEpoch: '2020-01-01' })).toBe('CE??');
  });

  it('returns CE?? when customEpoch is invalid Date', () => {
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(compute(date, { customEpoch: new Date('invalid') })).toBe('CE??');
  });

  it('returns CE7 when epoch is 2020 and date is 2026', () => {
    const epoch = new Date(Date.UTC(2020, 0, 1));
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(compute(date, { customEpoch: epoch })).toBe('CE7');
  });

  it('returns CE1 when date equals epoch', () => {
    const epoch = new Date(Date.UTC(2020, 0, 1));
    expect(compute(epoch, { customEpoch: epoch })).toBe('CE1');
  });

  it('returns CE0 for year before epoch', () => {
    const epoch = new Date(Date.UTC(2020, 0, 1));
    const date = new Date(Date.UTC(2019, 0, 1));
    expect(compute(date, { customEpoch: epoch })).toBe('CE0');
  });

  it('returns CE?? for pre-Holocene dates', () => {
    const epoch = new Date(Date.UTC(2020, 0, 1));
    const date = new Date(Date.UTC(-9700, 0, 1)); // 9701 BCE
    expect(compute(date, { customEpoch: epoch })).toBe('CE??');
  });

  it('ignores latitude and longitude', () => {
    const date = new Date(Date.UTC(2026, 0, 1));
    expect(compute(date, { latitude: 40.7, longitude: -74.0 })).toBe('CE??');
  });
});
