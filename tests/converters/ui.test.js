// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initConverterPanel } from '../../src/converters/ui.js';

// Mock the picker module
vi.mock('../../src/converters/picker.js', () => ({
  initGregorianToClockPicker: vi.fn((input, onConvert) => {
    // Simulate a flatpickr instance
    return { setDate: vi.fn() };
  }),
}));

// Mock chronometers
vi.mock('../../src/chronometers/index.js', () => ({
  compose: vi.fn((date, opts) => ({
    holocene: 11726,
    beats: '@500.00',
    solar: 'S75',
    lunisolar: { month: 3, day: 15, isLeap: false },
  })),
}));

vi.mock('../../src/chronometers/reverse.js', () => ({
  reverseBeatClock: vi.fn(({ beats, holoceneYear, lunisolarMonth, lunisolarDay }) => {
    if (beats != null && holoceneYear != null && lunisolarMonth != null && lunisolarDay != null) {
      return {
        gregorianDate: new Date(Date.UTC(2026, 2, 17, 11, 0, 0)),
        confidence: 'exact-datetime',
        disclaimer: 'Beat values represent an 86.4-second window. Exact instant may vary +/-43.2 seconds.',
      };
    }
    if (holoceneYear != null) {
      return {
        gregorianDate: null,
        confidence: 'year-range',
        yearRange: { start: new Date(Date.UTC(2026, 1, 17)), end: new Date(Date.UTC(2027, 1, 6)) },
        disclaimer: '',
      };
    }
    return {
      gregorianDate: null,
      confidence: 'time-only',
      bmtTime: { hours: 12, minutes: 0, seconds: 0 },
      disclaimer: 'Beat value provides time only. Add Holocene year and lunisolar date for full datetime. Beat values represent an 86.4-second window. Exact instant may vary +/-43.2 seconds.',
    };
  }),
}));

// Mock location store
vi.mock('../../src/location/store.js', () => ({
  loadLocations: vi.fn(() => []),
}));

describe('initConverterPanel', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="converter-panel"></div>';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns early if converter-panel element does not exist', () => {
    document.body.innerHTML = '';
    // Should not throw
    initConverterPanel();
    expect(document.body.innerHTML).toBe('');
  });

  it('creates converter panel DOM structure', () => {
    initConverterPanel();

    const panel = document.querySelector('.converter-panel');
    expect(panel).not.toBeNull();

    const h2 = panel.querySelector('h2');
    expect(h2.textContent).toBe('Datetime Converters');

    const tabs = panel.querySelectorAll('.converter-tab');
    expect(tabs.length).toBe(3);
  });

  it('has three tab buttons with correct labels', () => {
    initConverterPanel();

    const tabs = document.querySelectorAll('.converter-tab');
    const labels = Array.from(tabs).map((t) => t.textContent.trim());
    expect(labels).toContain('Gregorian → Clock');
    expect(labels).toContain('Clock → Gregorian');
    expect(labels).toContain('Cross-Timezone');
  });

  it('has three panel content divs', () => {
    initConverterPanel();

    expect(document.getElementById('converter-gregorian-to-clock')).not.toBeNull();
    expect(document.getElementById('converter-clock-to-gregorian')).not.toBeNull();
    expect(document.getElementById('converter-cross-timezone')).not.toBeNull();
  });

  it('Gregorian→Clock panel has datetime input and result div', () => {
    initConverterPanel();

    expect(document.getElementById('converter-datetime-input')).not.toBeNull();
    expect(document.getElementById('converter-result')).not.toBeNull();
  });

  it('Clock→Gregorian panel has reverse inputs, button, result, and disclaimer', () => {
    initConverterPanel();

    expect(document.getElementById('reverse-beats-input')).not.toBeNull();
    expect(document.getElementById('reverse-holocene-input')).not.toBeNull();
    expect(document.getElementById('reverse-lunar-month-input')).not.toBeNull();
    expect(document.getElementById('reverse-lunar-day-input')).not.toBeNull();
    expect(document.getElementById('reverse-convert-btn')).not.toBeNull();
    expect(document.getElementById('reverse-result')).not.toBeNull();
    expect(document.getElementById('reverse-disclaimer')).not.toBeNull();
  });

  it('Cross-Timezone panel has datetime input, compare button, and locations div', () => {
    initConverterPanel();

    expect(document.getElementById('cross-timezone-datetime-input')).not.toBeNull();
    expect(document.getElementById('cross-timezone-compare-btn')).not.toBeNull();
    expect(document.getElementById('cross-timezone-locations')).not.toBeNull();
  });

  it('first tab is active by default', () => {
    initConverterPanel();

    const tabs = document.querySelectorAll('.converter-tab');
    expect(tabs[0].classList.contains('active')).toBe(true);
    expect(tabs[1].classList.contains('active')).toBe(false);
    expect(tabs[2].classList.contains('active')).toBe(false);

    const panels = document.querySelectorAll('.converter-panel-content');
    expect(panels[0].classList.contains('hidden')).toBe(false);
    expect(panels[1].classList.contains('hidden')).toBe(true);
    expect(panels[2].classList.contains('hidden')).toBe(true);
  });

  it('switches panels when clicking a tab', () => {
    initConverterPanel();

    const tabs = document.querySelectorAll('.converter-tab');
    const panels = document.querySelectorAll('.converter-panel-content');

    // Click second tab
    tabs[1].click();
    expect(tabs[1].classList.contains('active')).toBe(true);
    expect(panels[0].classList.contains('hidden')).toBe(true);
    expect(panels[1].classList.contains('hidden')).toBe(false);
    expect(panels[2].classList.contains('hidden')).toBe(true);

    // Click third tab
    tabs[2].click();
    expect(tabs[2].classList.contains('active')).toBe(true);
    expect(panels[0].classList.contains('hidden')).toBe(true);
    expect(panels[1].classList.contains('hidden')).toBe(true);
    expect(panels[2].classList.contains('hidden')).toBe(false);
  });
});
