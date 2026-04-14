// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = {};

vi.mock('../../../src/formats/config.js', async () => {
  const actual = await vi.importActual('../../../src/formats/config.js');
  return actual;
});

import { getFormat, resetFormatConfig } from '../../../src/formats/config.js';
import { initStdTimePicker, STDTIME_FORMAT_CHANGE_EVENT } from '../../../src/formats/ui/stdtime-picker.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="stdtime-picker-root"></div><div id="beats-container"></div>';

  for (const key of Object.keys(store)) {
    delete store[key];
  }

  window.localStorage = {
    getItem: vi.fn((key) => (key in store ? store[key] : null)),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
  };

  resetFormatConfig();
});

describe('initStdTimePicker', () => {
  it('renders with the saved active stdTime format selected', () => {
    const select = initStdTimePicker();

    expect(select.value).toBe('24h');
    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      '24h',
      'decimal',
      'longitudinal',
    ]);
  });

  it('persists format changes and emits a format-change event', () => {
    const onChange = vi.fn();
    document.addEventListener(STDTIME_FORMAT_CHANGE_EVENT, onChange);

    const select = initStdTimePicker();
    select.value = 'longitudinal';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(getFormat('stdTime')).toBe('longitudinal');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].detail).toEqual({
      componentId: 'stdTime',
      formatId: 'longitudinal',
    });
  });
});
