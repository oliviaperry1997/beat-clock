import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/alarms/store.js', () => ({
  getEnabledAlarms: vi.fn(() => []),
  updateAlarm: vi.fn(),
  deleteAlarm: vi.fn()
}));

vi.mock('../../src/alarms/evaluator.js', () => ({
  evaluateAlarm: vi.fn(() => ({ triggered: false }))
}));

vi.mock('../../src/alarms/notifications.js', () => ({
  fireNotifications: vi.fn(),
  stopNotifications: vi.fn(),
  playChime: vi.fn(),
  stopAudio: vi.fn()
}));

vi.mock('../../src/location/store.js', () => ({
  getActiveLocation: vi.fn(() => null)
}));

import { getEnabledAlarms, updateAlarm, deleteAlarm } from '../../src/alarms/store.js';
import { evaluateAlarm } from '../../src/alarms/evaluator.js';
import { fireNotifications, stopNotifications } from '../../src/alarms/notifications.js';
import { getActiveLocation } from '../../src/location/store.js';

import { initAlarmEngine, handleMissedAlarms, resetActiveAlarms } from '../../src/alarms/engine.js';
import { playChime, stopAudio } from '../../src/alarms/notifications.js';

const mockLocationData = { latitude: 40.7128, longitude: -74.0060 };

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  resetActiveAlarms();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('initAlarmEngine', () => {
  it('returns object with stop and evaluateNow methods', () => {
    const engine = initAlarmEngine(mockLocationData);
    expect(engine).toHaveProperty('stop');
    expect(engine).toHaveProperty('evaluateNow');
    expect(typeof engine.stop).toBe('function');
    expect(typeof engine.evaluateNow).toBe('function');
    engine.stop();
  });

  it('returns no-op functions when no location provided', () => {
    const engine = initAlarmEngine(null);
    expect(engine).toHaveProperty('stop');
    expect(engine).toHaveProperty('evaluateNow');
    // Should not throw
    engine.stop();
    engine.evaluateNow();
  });

  it('stop() clears the interval', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const engine = initAlarmEngine(mockLocationData);
    engine.stop();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('evaluateNow() triggers a tick evaluation', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);
    engine.evaluateNow();

    expect(getEnabledAlarms).toHaveBeenCalled();
    expect(evaluateAlarm).toHaveBeenCalledWith(
      alarms[0], expect.any(Date), mockLocationData.latitude, mockLocationData.longitude
    );
    engine.stop();
  });

  it('fires notifications only when evaluateAlarm transitions from false to true', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    // First tick: triggered=true, but no previous state → should fire (first run is special case)
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);
    engine.evaluateNow();

    expect(fireNotifications).toHaveBeenCalled();
    engine.stop();
  });

  it('does NOT fire notifications when alarm was already triggered on previous tick', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);

    // First tick — fires (transition from false → true)
    engine.evaluateNow();
    expect(fireNotifications).toHaveBeenCalledTimes(1);

    // Second tick — still triggered, but no transition (was already true) → should NOT fire again
    // BUT it should play chime since alarm is still active
    engine.evaluateNow();
    expect(fireNotifications).toHaveBeenCalledTimes(1); // Still 1, not 2
    expect(playChime).toHaveBeenCalled(); // But chime plays
    engine.stop();
  });

  it('plays chime every tick while alarm is active and not dismissed', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);

    // First tick — fires
    engine.evaluateNow();
    expect(fireNotifications).toHaveBeenCalledTimes(1);

    // Subsequent ticks — chime plays each tick
    engine.evaluateNow();
    engine.evaluateNow();
    expect(playChime).toHaveBeenCalledTimes(2); // Once per tick after first
    engine.stop();
  });

  it('stops playing chime after alarm is dismissed', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);

    // First tick — fires
    engine.evaluateNow();
    expect(fireNotifications).toHaveBeenCalledTimes(1);
    const playChimeCountAfterFire = playChime.mock.calls.length;

    // Dismiss the alarm
    engine.dismissAlarm('alm_1');

    // Next tick — should stop notifications, no chime
    engine.evaluateNow();
    expect(stopNotifications).toHaveBeenCalled();
    expect(playChime.mock.calls.length).toBe(playChimeCountAfterFire); // No additional chime
    engine.stop();
  });

  it('deletes one-time alarms after dismissal', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: true, recurrence: 'once', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);

    // First tick — fires, added to activeAlarms
    engine.evaluateNow();
    expect(fireNotifications).toHaveBeenCalled();
    expect(deleteAlarm).not.toHaveBeenCalled(); // Not deleted yet — waiting for dismissal

    // Simulate dismissal
    engine.dismissAlarm('alm_1');

    // Second tick — dismissed, one-time alarm deleted
    engine.evaluateNow();
    expect(deleteAlarm).toHaveBeenCalledWith('alm_1');
    engine.stop();
  });

  it('deletes alarms with recurrence === "once" after dismissal', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'once', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);
    engine.evaluateNow();

    expect(fireNotifications).toHaveBeenCalled();
    expect(deleteAlarm).not.toHaveBeenCalled(); // Not deleted yet

    // Simulate dismissal
    engine.dismissAlarm('alm_1');

    // Second tick — dismissed, deleted
    engine.evaluateNow();
    expect(deleteAlarm).toHaveBeenCalledWith('alm_1');
    engine.stop();
  });

  it('updates recurring alarms with lastFiredAt after firing', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    const engine = initAlarmEngine(mockLocationData);
    engine.evaluateNow();

    expect(updateAlarm).toHaveBeenCalledWith(
      'alm_1',
      expect.objectContaining({ lastFiredAt: expect.any(String) })
    );
    expect(deleteAlarm).not.toHaveBeenCalled();
    engine.stop();
  });

  it('does not fire notifications when evaluateAlarm returns false', () => {
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: false });

    const engine = initAlarmEngine(mockLocationData);
    engine.evaluateNow();

    expect(fireNotifications).not.toHaveBeenCalled();
    engine.stop();
  });
});

describe('handleMissedAlarms', () => {
  it('does nothing when no active location', () => {
    getActiveLocation.mockReturnValue(null);
    handleMissedAlarms();
    expect(getEnabledAlarms).not.toHaveBeenCalled();
  });

  it('evaluates all enabled alarms when location exists', () => {
    getActiveLocation.mockReturnValue(mockLocationData);
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null },
      { id: 'alm_2', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    handleMissedAlarms();

    expect(getEnabledAlarms).toHaveBeenCalled();
    expect(evaluateAlarm).toHaveBeenCalledTimes(2);
    expect(fireNotifications).toHaveBeenCalledTimes(2);
  });

  it('fires and updates matching alarms', () => {
    getActiveLocation.mockReturnValue(mockLocationData);
    const alarms = [
      { id: 'alm_1', enabled: true, oneTime: false, recurrence: 'daily', lastFiredAt: null }
    ];
    getEnabledAlarms.mockReturnValue(alarms);
    evaluateAlarm.mockReturnValue({ triggered: true });

    handleMissedAlarms();

    expect(fireNotifications).toHaveBeenCalled();
    expect(updateAlarm).toHaveBeenCalledWith(
      'alm_1',
      expect.objectContaining({ lastFiredAt: expect.any(String) })
    );
  });
});
