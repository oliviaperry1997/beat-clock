// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

function createComposeResult(overrides = {}) {
  return {
    holocene: 11726,
    beats: '@500.00',
    solar: 'S12',
    lunisolar: { month: 4, day: 14, isLeap: false, moonAge: 8 },
    solarLongitude: 'SL180',
    lunarPhase: 'LP090',
    solarTime: { hours: 12, minutes: 30, totalMinutes: 750, degrees: 187.5, azimuthDeg: 187.5, altitudeDeg: 42 },
    meghalayan: { stage: 'meghalayan', year: 4226, label: 'Meghalayan' },
    customEpoch: 'CE7',
    ...overrides,
  };
}

const composeMock = vi.fn(() => createComposeResult());
const initLocationSystemMock = vi.fn();
const initAlarmEngineMock = vi.fn(() => ({
  stop: vi.fn(),
  dismissAlarm: vi.fn(),
}));
const setDismissCallbackMock = vi.fn();
const handleMissedAlarmsMock = vi.fn();
const initAlarmSystemMock = vi.fn();
const invalidateCacheMock = vi.fn();
const initConverterPanelMock = vi.fn();
const getSkyGradientColorsMock = vi.fn(() => ({ topColor: '#111', bottomColor: '#222' }));

vi.mock('../../src/chronometers/index.js', () => ({
  compose: composeMock,
}));

vi.mock('../../src/location/ui.js', () => ({
  initLocationSystem: initLocationSystemMock,
}));

vi.mock('../../src/converters/ui.js', () => ({
  initConverterPanel: initConverterPanelMock,
}));

vi.mock('../../src/sky.js', () => ({
  getSkyGradientColors: getSkyGradientColorsMock,
}));

vi.mock('../../src/alarms/engine.js', () => ({
  initAlarmEngine: initAlarmEngineMock,
  setDismissCallback: setDismissCallbackMock,
  handleMissedAlarms: handleMissedAlarmsMock,
}));

vi.mock('../../src/alarms/ui.js', () => ({
  initAlarmSystem: initAlarmSystemMock,
}));

vi.mock('../../src/alarms/astro-cache.js', () => ({
  invalidateCache: invalidateCacheMock,
}));

describe('format selector UI integration', () => {
  const store = {};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 3, 15, 12, 30, 45)));
    vi.resetModules();
    vi.clearAllMocks();

    composeMock.mockReset();
    composeMock.mockImplementation(() => createComposeResult());

    initLocationSystemMock.mockReset();
    initLocationSystemMock.mockImplementation((callback) => {
      callback({ latitude: 40.7, longitude: -74.0 });
    });

    initAlarmEngineMock.mockReset();
    initAlarmEngineMock.mockImplementation(() => ({
      stop: vi.fn(),
      dismissAlarm: vi.fn(),
    }));

    for (const key of Object.keys(store)) {
      delete store[key];
    }

    document.body.innerHTML = [
      '<div id="location-selector"></div>',
      '<div id="beats-container"></div>',
      '<div id="converter-panel"></div>',
      '<svg id="moon-indicator"><path id="moon-lit"></path></svg>',
    ].join('');

    window.localStorage = {
      getItem: vi.fn((key) => (key in store ? store[key] : null)),
      setItem: vi.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: vi.fn((key) => {
        delete store[key];
      }),
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders four interactive clock segments on load', async () => {
    await import('../../src/index.js');

    for (const componentId of ['year', 'date', 'stdTime', 'solarTime']) {
      const element = document.querySelector(`[data-component="${componentId}"]`);
      expect(element).not.toBeNull();
      expect(element.getAttribute('role')).toBe('button');
      expect(element.getAttribute('tabindex')).toBe('0');
    }

    expect(document.querySelector('[data-component="year"]').textContent).toBe('H11726');
  });

  it('marks the current format on each segment for UI-specific rendering', async () => {
    store['beatclock:formats'] = JSON.stringify({
      version: 1,
      components: {
        year: 'gregorian',
        date: 'gregorian',
        stdTime: '24h',
        solarTime: 'longitudinal',
      },
    });

    await import('../../src/index.js');

    expect(document.querySelector('[data-component="solarTime"]').dataset.formatId).toBe('longitudinal');
    expect(document.querySelector('[data-component="solarTime"]').innerHTML).toMatch(/^187°/);
  });

  it('does not render the legacy stdtime picker', async () => {
    await import('../../src/index.js');
    expect(document.getElementById('stdtime-picker')).toBeNull();
  });

  it('opens a single dropdown for the clicked component', async () => {
    await import('../../src/index.js');

    document.querySelector('[data-component="year"]').click();
    expect(document.querySelectorAll('.format-selector-dropdown')).toHaveLength(1);
    const yearOptions = Array.from(document.querySelectorAll('.format-selector-option')).map((button) => button.textContent.replace('✓', '').trim());
    expect(yearOptions).toEqual(expect.arrayContaining(['Holocene', 'Gregorian', 'Meghalayan', 'Custom']));

    document.querySelector('[data-component="date"]').click();
    expect(document.querySelectorAll('.format-selector-dropdown')).toHaveLength(1);
    const dateOptions = Array.from(document.querySelectorAll('.format-selector-option')).map((button) => button.textContent.replace('✓', '').trim());
    expect(dateOptions).toEqual(expect.arrayContaining(['Gregorian', 'Chinese', 'Longitudinal']));
  });

  it('selecting a new format persists and rerenders immediately', async () => {
    store['beatclock:formats'] = JSON.stringify({
      version: 1,
      components: {
        year: 'holocene',
        date: 'gregorian',
        stdTime: '24h',
        solarTime: 'descriptive',
      },
    });

    await import('../../src/index.js');

    const yearSegment = document.querySelector('[data-component="year"]');
    const initialText = yearSegment.textContent;

    yearSegment.click();
    Array.from(document.querySelectorAll('.format-selector-option'))
      .find((button) => button.textContent.includes('Gregorian'))
      .click();

    const savedConfig = JSON.parse(store['beatclock:formats']);
    expect(savedConfig.components.year).toBe('gregorian');
    expect(yearSegment.textContent).not.toBe(initialText);
    expect(yearSegment.textContent).toBe('2026AD');
  });

  it('dropdown closes on outside click and Escape', async () => {
    await import('../../src/index.js');

    const dateSegment = document.querySelector('[data-component="date"]');
    dateSegment.click();
    expect(document.querySelector('.format-selector-dropdown').hidden).toBe(false);

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.querySelector('.format-selector-dropdown').hidden).toBe(true);

    dateSegment.click();
    expect(document.querySelector('.format-selector-dropdown').hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('.format-selector-dropdown').hidden).toBe(true);
    expect(document.activeElement).toBe(dateSegment);
  });

  it('renderer failure stays component-scoped', async () => {
    store['beatclock:formats'] = JSON.stringify({
      version: 1,
      components: {
        year: 'holocene',
        date: 'longitudinal',
        stdTime: '24h',
        solarTime: 'descriptive',
      },
    });

    composeMock.mockImplementation(() => createComposeResult({
      solarLongitude: {
        slice() {
          throw new Error('boom');
        },
      },
    }));

    await import('../../src/index.js');

    expect(document.querySelector('[data-component="date"]').textContent).toBe('??');
    expect(document.querySelector('[data-component="year"]').textContent).not.toBe('');
    expect(document.querySelector('[data-component="stdTime"]').textContent).not.toBe('');
    expect(document.querySelector('[data-component="solarTime"]').textContent).not.toBe('');
  });
});
