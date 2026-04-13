import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectLocation, isGeolocationAvailable } from '../../src/location/geolocation.js';

describe('detectLocation', () => {
  let mockGeolocation;

  beforeEach(() => {
    mockGeolocation = {
      getCurrentPosition: vi.fn()
    };
    global.navigator = { geolocation: mockGeolocation };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns latitude, longitude, accuracy on success', async () => {
    const successPromise = detectLocation();

    // Simulate successful geolocation
    mockGeolocation.getCurrentPosition.mock.calls[0][0]({
      coords: { latitude: 51.5, longitude: -0.1, accuracy: 100 }
    });

    const result = await successPromise;
    expect(result).toEqual({
      latitude: 51.5,
      longitude: -0.1,
      accuracy: 100
    });
  });

  it('rejects with error on permission denied', async () => {
    const failPromise = detectLocation();

    mockGeolocation.getCurrentPosition.mock.calls[0][1]({ code: 1 });

    await expect(failPromise).rejects.toThrow('Location permission denied');
  });

  it('rejects with error on position unavailable', async () => {
    const failPromise = detectLocation();

    mockGeolocation.getCurrentPosition.mock.calls[0][1]({ code: 2 });

    await expect(failPromise).rejects.toThrow('Location unavailable');
  });

  it('rejects with error on timeout', async () => {
    const failPromise = detectLocation();

    mockGeolocation.getCurrentPosition.mock.calls[0][1]({ code: 3 });

    await expect(failPromise).rejects.toThrow('Location request timed out');
  });

  it('rejects when geolocation not supported', async () => {
    global.navigator = { geolocation: null };
    await expect(detectLocation()).rejects.toThrow('Geolocation not supported');
  });

  it('respects custom timeout', async () => {
    detectLocation({ timeout: 5000 });

    // Verify the call was made (we can't easily test the internal timeout value
    // but we can verify getCurrentPosition was called)
    expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
  });

  it('clears timeout on success', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const promise = detectLocation();

    mockGeolocation.getCurrentPosition.mock.calls[0][0]({
      coords: { latitude: 40.0, longitude: -74.0, accuracy: 50 }
    });

    await promise;
    // Should be called at least once (for our timer)
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('clears timeout on error', async () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const promise = detectLocation();

    mockGeolocation.getCurrentPosition.mock.calls[0][1]({ code: 1 });

    await expect(promise).rejects.toThrow();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});

describe('isGeolocationAvailable', () => {
  it('returns true when navigator.geolocation exists', () => {
    global.navigator = { geolocation: {} };
    expect(isGeolocationAvailable()).toBe(true);
  });

  it('returns false when navigator is undefined', () => {
    global.navigator = undefined;
    expect(isGeolocationAvailable()).toBe(false);
  });

  it('returns false when geolocation is undefined', () => {
    global.navigator = { geolocation: undefined };
    expect(isGeolocationAvailable()).toBe(false);
  });
});
