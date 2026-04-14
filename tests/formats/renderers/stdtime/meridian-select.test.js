// @vitest-environment jsdom
// meridian-select.test.js — requires jsdom for DOM APIs
import { describe, it, expect, vi } from 'vitest';
import { createMeridianSelector } from '../../../../src/formats/renderers/stdtime/meridian-select.js';

describe('createMeridianSelector', () => {

  // --- Factory return value ---

  it('returns an object with element, getValue, and setValue', () => {
    const control = createMeridianSelector();
    expect(control).toHaveProperty('element');
    expect(control).toHaveProperty('getValue');
    expect(control).toHaveProperty('setValue');
    expect(typeof control.getValue).toBe('function');
    expect(typeof control.setValue).toBe('function');
  });

  it('returned element is an HTMLDivElement with class meridian-selector', () => {
    const control = createMeridianSelector();
    expect(control.element.tagName).toBe('DIV');
    expect(control.element.classList.contains('meridian-selector')).toBe(true);
  });

  // --- Initial state ---

  it('defaults to 0 degrees when initialDegrees is not provided', () => {
    const control = createMeridianSelector();
    expect(control.getValue()).toBe(0);
  });

  it('uses provided initialDegrees', () => {
    const control = createMeridianSelector({ initialDegrees: 45 });
    expect(control.getValue()).toBe(45);
  });

  it('contains a <select> with aria-label "Meridian offset"', () => {
    const control = createMeridianSelector();
    const select = control.element.querySelector('select.meridian-preset-select');
    expect(select).not.toBeNull();
    expect(select.getAttribute('aria-label')).toBe('Meridian offset');
  });

  it('contains a custom input with type number and correct aria-label', () => {
    const control = createMeridianSelector();
    const input = control.element.querySelector('input.meridian-custom-input');
    expect(input).not.toBeNull();
    expect(input.type).toBe('number');
    expect(input.getAttribute('aria-label')).toBe('Custom meridian offset in degrees');
  });

  it('custom panel is hidden when initial value matches a preset', () => {
    // 0° matches the UTC preset in all formats
    const control = createMeridianSelector({ initialDegrees: 0 });
    const panel = control.element.querySelector('.meridian-custom-panel');
    expect(panel.hidden).toBe(true);
  });

  // --- 24h format presets ---

  it('in 24h mode, selects UTC option for initialDegrees 0', () => {
    const control = createMeridianSelector({ format: 'stdTime:24h', initialDegrees: 0 });
    const select = control.element.querySelector('select');
    expect(select.value).toBe('0');
  });

  it('in 24h mode, has options for UTC+1 (+15°) through UTC+14 (+210°)', () => {
    const control = createMeridianSelector({ format: 'stdTime:24h' });
    const select = control.element.querySelector('select');
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('15');   // UTC+1
    expect(values).toContain('210');  // UTC+14
    expect(values).toContain('-180'); // UTC-12
  });

  it('in 24h mode, has IST preset (+82.5°)', () => {
    const control = createMeridianSelector({ format: 'stdTime:24h' });
    const select = control.element.querySelector('select');
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('82.5');
  });

  it('in 24h mode, has ACST preset (+142.5°)', () => {
    const control = createMeridianSelector({ format: 'stdTime:24h' });
    const select = control.element.querySelector('select');
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('142.5');
  });

  it('in 24h mode, has Custom… option', () => {
    const control = createMeridianSelector({ format: 'stdTime:24h' });
    const select = control.element.querySelector('select');
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('custom');
  });

  // --- Decimal format presets ---

  it('in decimal mode, has 0-beats option (0°)', () => {
    const control = createMeridianSelector({ format: 'stdTime:decimal' });
    const select = control.element.querySelector('select');
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('0');
    expect(values).toContain('36');   // +100 beats
    expect(values).toContain('180');  // +500 beats
    expect(values).toContain('-180'); // -500 beats
  });

  it('in decimal mode, has exactly 12 options (11 presets + Custom…)', () => {
    const control = createMeridianSelector({ format: 'stdTime:decimal' });
    const select = control.element.querySelector('select');
    expect(select.options.length).toBe(12);
  });

  // --- Longitudinal format presets ---

  it('in longitudinal mode, has options at 15° steps', () => {
    const control = createMeridianSelector({ format: 'stdTime:longitudinal' });
    const select = control.element.querySelector('select');
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('0');
    expect(values).toContain('15');
    expect(values).toContain('180');
    expect(values).toContain('-15');
    expect(values).toContain('-180');
  });

  // --- onChange callback ---

  it('calls onChange with the correct degrees when a preset is selected', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:24h', onChange });
    const select = control.element.querySelector('select');

    // Simulate selecting UTC+2 (30°)
    select.value = '30';
    select.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledWith(30);
  });

  it('does not call onChange when Custom… is selected (waiting for input)', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:24h', onChange });
    const select = control.element.querySelector('select');

    onChange.mockClear();
    select.value = 'custom';
    select.dispatchEvent(new Event('change'));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reveals custom panel when Custom… is selected', () => {
    const control = createMeridianSelector({ format: 'stdTime:24h' });
    const select = control.element.querySelector('select');
    const panel = control.element.querySelector('.meridian-custom-panel');

    select.value = 'custom';
    select.dispatchEvent(new Event('change'));

    expect(panel.hidden).toBe(false);
  });

  it('calls onChange with parsed degrees when custom input receives a valid value', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:24h', onChange });
    const select = control.element.querySelector('select');
    const input = control.element.querySelector('.meridian-custom-input');

    // Open custom panel
    select.value = 'custom';
    select.dispatchEvent(new Event('change'));
    onChange.mockClear();

    // Type a valid value
    input.value = '45.5';
    input.dispatchEvent(new Event('input'));

    expect(onChange).toHaveBeenCalledWith(45.5);
    expect(control.getValue()).toBe(45.5);
  });

  it('does not call onChange and shows error when custom input is out of range', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:24h', onChange });
    const select = control.element.querySelector('select');
    const input = control.element.querySelector('.meridian-custom-input');
    const errorSpan = control.element.querySelector('.meridian-custom-error');

    select.value = 'custom';
    select.dispatchEvent(new Event('change'));
    onChange.mockClear();

    input.value = '200'; // out of range
    input.dispatchEvent(new Event('input'));

    expect(onChange).not.toHaveBeenCalled();
    expect(errorSpan.classList.contains('hidden')).toBe(false);
  });

  it('does not call onChange and shows error when custom input is not a number', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:24h', onChange });
    const select = control.element.querySelector('select');
    const input = control.element.querySelector('.meridian-custom-input');

    select.value = 'custom';
    select.dispatchEvent(new Event('change'));
    onChange.mockClear();

    input.value = 'abc';
    input.dispatchEvent(new Event('input'));

    expect(onChange).not.toHaveBeenCalled();
  });

  // --- setValue and snap logic ---

  it('setValue snaps to nearest 15° when format is 24h', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:24h', onChange });

    control.setValue(22, 'stdTime:24h'); // 22 / 15 = 1.467 → Math.round = 1 → 1 * 15 = 15°
    expect(control.getValue()).toBe(15);
    expect(onChange).toHaveBeenCalledWith(15);
  });

  it('setValue snaps to nearest 36° when format is decimal', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:decimal', onChange });

    control.setValue(20, 'stdTime:decimal'); // 20/36=0.56 → round to 1 → 36°
    expect(control.getValue()).toBe(36);
    expect(onChange).toHaveBeenCalledWith(36);
  });

  it('setValue snaps to nearest 1° when format is longitudinal', () => {
    const onChange = vi.fn();
    const control = createMeridianSelector({ format: 'stdTime:longitudinal', onChange });

    control.setValue(45.7, 'stdTime:longitudinal');
    expect(control.getValue()).toBe(46);
    expect(onChange).toHaveBeenCalledWith(46);
  });

  it('setValue rebuilds options when format changes', () => {
    const control = createMeridianSelector({ format: 'stdTime:24h' });
    const select = control.element.querySelector('select');

    // In 24h mode, expect ~33 options
    const count24h = select.options.length;

    // Switch to decimal — should have 12 options
    control.setValue(0, 'stdTime:decimal');
    expect(select.options.length).toBe(12);
    expect(select.options.length).not.toBe(count24h);
  });

  it('setValue with no format argument keeps current format', () => {
    const control = createMeridianSelector({ format: 'stdTime:decimal' });
    const select = control.element.querySelector('select');
    const countBefore = select.options.length;

    control.setValue(0); // no format argument
    expect(select.options.length).toBe(countBefore);
  });

  // --- onChange with no callback ---

  it('does not throw when no onChange callback is provided', () => {
    const control = createMeridianSelector({ initialDegrees: 0 });
    const select = control.element.querySelector('select');
    expect(() => {
      select.value = '15';
      select.dispatchEvent(new Event('change'));
    }).not.toThrow();
  });

});
