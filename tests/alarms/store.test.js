import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadAlarms,
  saveAlarms,
  addAlarm,
  updateAlarm,
  deleteAlarm,
  toggleAlarm,
  getEnabledAlarms
} from '../../src/alarms/store.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn(key => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
});

beforeEach(() => {
  localStorageMock.clear();
});

describe('loadAlarms', () => {
  it('returns empty array when no alarms saved', () => {
    expect(loadAlarms()).toEqual([]);
  });

  it('returns parsed alarms array when data exists', () => {
    const alarms = [{ id: 'alm_123', label: 'Test', version: 1 }];
    localStorageMock.setItem('beatclock:alarms', JSON.stringify(alarms));
    expect(loadAlarms()).toEqual(alarms);
  });

  it('returns empty array on parse error', () => {
    localStorageMock.setItem('beatclock:alarms', 'invalid json');
    expect(loadAlarms()).toEqual([]);
  });

  it('filters out alarms with wrong version', () => {
    const alarms = [
      { id: 'alm_1', label: 'V1', version: 1 },
      { id: 'alm_2', label: 'V2', version: 2 }
    ];
    localStorageMock.setItem('beatclock:alarms', JSON.stringify(alarms));
    const result = loadAlarms();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('alm_1');
  });
});

describe('saveAlarms', () => {
  it('saves alarms array to localStorage with key beatclock:alarms', () => {
    const alarms = [{ id: 'alm_123', label: 'Test', version: 1 }];
    saveAlarms(alarms);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'beatclock:alarms',
      JSON.stringify(alarms)
    );
  });
});

describe('addAlarm', () => {
  it('adds alarm with auto-generated ID starting with alm_', () => {
    const result = addAlarm({ label: 'Test Alarm' });
    expect(result.id.startsWith('alm_')).toBe(true);
  });

  it('sets default enabled: true', () => {
    const result = addAlarm({ label: 'Test Alarm' });
    expect(result.enabled).toBe(true);
  });

  it('sets default oneTime: false', () => {
    const result = addAlarm({ label: 'Test Alarm' });
    expect(result.oneTime).toBe(false);
  });

  it('sets default notifications object', () => {
    const result = addAlarm({ label: 'Test Alarm' });
    expect(result.notifications).toEqual({ browser: true, inApp: true, audio: true });
  });

  it('uses custom ID if provided', () => {
    const result = addAlarm({ id: 'alm_custom', label: 'Test' });
    expect(result.id).toBe('alm_custom');
  });

  it('sets createdAt as ISO string', () => {
    const result = addAlarm({ label: 'Test Alarm' });
    expect(typeof result.createdAt).toBe('string');
    expect(new Date(result.createdAt).toISOString()).toBe(result.createdAt);
  });

  it('sets lastFiredAt: null', () => {
    const result = addAlarm({ label: 'Test Alarm' });
    expect(result.lastFiredAt).toBe(null);
  });
});

describe('updateAlarm', () => {
  it('updates alarm fields and returns updated alarm', () => {
    const alarm = addAlarm({ id: 'alm_test', label: 'Original' });
    const updated = updateAlarm('alm_test', { label: 'Updated' });
    expect(updated.label).toBe('Updated');
  });

  it('returns null for non-existent ID', () => {
    expect(updateAlarm('alm_nonexistent', { label: 'Nope' })).toBeNull();
  });
});

describe('deleteAlarm', () => {
  it('removes alarm from list', () => {
    addAlarm({ id: 'alm_del', label: 'Delete me' });
    deleteAlarm('alm_del');
    const alarms = loadAlarms();
    expect(alarms.find(a => a.id === 'alm_del')).toBeUndefined();
  });

  it('no-op for non-existent ID', () => {
    addAlarm({ id: 'alm_keep', label: 'Keep me' });
    deleteAlarm('alm_nonexistent');
    expect(loadAlarms()).toHaveLength(1);
  });
});

describe('toggleAlarm', () => {
  it('flips enabled from true to false', () => {
    const alarm = addAlarm({ id: 'alm_toggle', label: 'Toggle' });
    expect(alarm.enabled).toBe(true);
    const toggled = toggleAlarm('alm_toggle');
    expect(toggled.enabled).toBe(false);
  });

  it('flips enabled from false to true', () => {
    addAlarm({ id: 'alm_toggle2', label: 'Toggle' });
    toggleAlarm('alm_toggle2'); // true -> false
    const toggled = toggleAlarm('alm_toggle2'); // false -> true
    expect(toggled.enabled).toBe(true);
  });

  it('returns null for non-existent ID', () => {
    expect(toggleAlarm('alm_nonexistent')).toBeNull();
  });
});

describe('getEnabledAlarms', () => {
  it('returns only alarms where enabled === true', () => {
    addAlarm({ id: 'alm_1', label: 'Enabled' });
    addAlarm({ id: 'alm_2', label: 'Disabled' });
    toggleAlarm('alm_2');
    const enabled = getEnabledAlarms();
    expect(enabled).toHaveLength(1);
    expect(enabled[0].id).toBe('alm_1');
  });

  it('returns empty array when no alarms exist', () => {
    expect(getEnabledAlarms()).toEqual([]);
  });
});
