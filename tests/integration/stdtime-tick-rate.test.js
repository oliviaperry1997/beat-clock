// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const composeMock = vi.fn(() => ({
  holocene: 12026,
  beats: '@500.00',
  solar: '☉ 180.00°',
  lunisolar: { month: 4, day: 14, isLeap: false, moonAge: 8 },
}));

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

describe('stdTime live wiring', () => {
  const store = {};

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    for (const key of Object.keys(store)) {
      delete store[key];
    }

    document.body.innerHTML = [
      '<div id="location-selector"></div>',
      '<div id="stdtime-picker-root"></div>',
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

  it('starts the live loop at the cadence for the saved format and renders that format', async () => {
    store['beatclock:formats'] = JSON.stringify({
      version: 1,
      components: {
        year: 'holocene',
        date: 'gregorian',
        stdTime: 'longitudinal',
        solarTime: 'descriptive',
      },
    });

    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    initLocationSystemMock.mockImplementation((callback) => {
      callback({ latitude: 40.7, longitude: -74.0 });
    });

    await import('../../src/index.js');

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 800);
    expect(initAlarmEngineMock).toHaveBeenCalledWith({ latitude: 40.7, longitude: -74.0 }, 800);
    expect(document.getElementById('beats-container').textContent).toContain('⏲');
  });

  it('restarts the display and alarm loops when the stdTime picker changes format', async () => {
    initLocationSystemMock.mockImplementation((callback) => {
      callback({ latitude: 51.5, longitude: -0.1 });
    });

    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    await import('../../src/index.js');

    const select = document.getElementById('stdtime-picker');
    expect(select.value).toBe('24h');
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);
    expect(initAlarmEngineMock).toHaveBeenLastCalledWith({ latitude: 51.5, longitude: -0.1 }, 1000);

    select.value = 'decimal';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 864);
    expect(initAlarmEngineMock).toHaveBeenLastCalledWith({ latitude: 51.5, longitude: -0.1 }, 864);
    expect(document.getElementById('beats-container').textContent).toContain('@');

    select.value = 'longitudinal';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 800);
    expect(initAlarmEngineMock).toHaveBeenLastCalledWith({ latitude: 51.5, longitude: -0.1 }, 800);
    expect(document.getElementById('beats-container').textContent).toContain('⏲');
  });
});
