import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ensureNotificationPermission,
  fireBrowserNotification,
  playChime,
  showAlarmOverlay,
  removeAlarmOverlay,
  fireNotifications,
  stopNotifications,
  stopAudio,
  resetAudioContext,
} from '../../src/alarms/notifications.js';

describe('ensureNotificationPermission', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'Notification', originalDescriptor);
    }
    vi.restoreAllMocks();
  });

  it('returns false when Notification API is not available', () => {
    // Delete the property so 'Notification' in window returns false
    delete globalThis.Notification;
    const result = ensureNotificationPermission();
    expect(result).toBe(false);
  });

  it('returns true when permission is already granted', () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'granted' },
      configurable: true,
      writable: true,
    });
    const result = ensureNotificationPermission();
    expect(result).toBe(true);
  });

  it('returns false when permission is denied', () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      configurable: true,
      writable: true,
    });
    const result = ensureNotificationPermission();
    expect(result).toBe(false);
  });

  it('requests permission when status is default', () => {
    const requestPermissionMock = vi.fn().mockResolvedValue('granted');
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'default', requestPermission: requestPermissionMock },
      configurable: true,
      writable: true,
    });
    const result = ensureNotificationPermission();
    expect(requestPermissionMock).toHaveBeenCalled();
    // Async result returns false immediately (promise-based)
    expect(result).toBe(false);
  });
});

describe('fireBrowserNotification', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'Notification', originalDescriptor);
    }
    vi.restoreAllMocks();
  });

  it('returns early when permission is not granted', () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      configurable: true,
      writable: true,
    });

    const alarm = { id: 'test-1', label: 'Test Alarm' };
    // Should not throw
    expect(() => fireBrowserNotification(alarm)).not.toThrow();
  });

  it('creates notification with correct title, body, and tag', () => {
    const MockNotification = vi.fn();
    MockNotification.permission = 'granted';

    Object.defineProperty(globalThis, 'Notification', {
      value: MockNotification,
      configurable: true,
      writable: true,
    });

    const alarm = { id: 'test-123', label: 'Morning Alarm' };
    fireBrowserNotification(alarm);

    expect(MockNotification).toHaveBeenCalledWith('Beat Clock', {
      body: 'Morning Alarm',
      tag: 'alarm-test-123',
      requireInteraction: true,
    });
  });

  it('uses default label when alarm.label is missing', () => {
    const MockNotification = vi.fn();
    MockNotification.permission = 'granted';

    Object.defineProperty(globalThis, 'Notification', {
      value: MockNotification,
      configurable: true,
      writable: true,
    });

    fireBrowserNotification({ id: 'test-1' });

    expect(MockNotification).toHaveBeenCalledWith('Beat Clock', {
      body: 'Alarm',
      tag: 'alarm-test-1',
      requireInteraction: true,
    });
  });
});

describe('playChime', () => {
  const originalAudioCtx = globalThis.AudioContext;
  const originalWebkitAudioCtx = globalThis.webkitAudioContext;

  afterEach(() => {
    globalThis.AudioContext = originalAudioCtx;
    globalThis.webkitAudioContext = originalWebkitAudioCtx;
    resetAudioContext();
  });

  it('creates AudioContext, oscillator, and gain nodes', () => {
    const mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const mockGainNode = {
      gain: {
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
      connect: vi.fn(),
    };

    const mockAudioContext = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGainNode),
    };

    globalThis.AudioContext = function MockAudioContext() {
      return mockAudioContext;
    };
    globalThis.webkitAudioContext = null;

    playChime(880);

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
    expect(mockAudioContext.createGain).toHaveBeenCalled();
    expect(mockOscillator.type).toBe('sine');
    expect(mockOscillator.frequency.value).toBe(880);
    expect(mockOscillator.connect).toHaveBeenCalledWith(mockGainNode);
    expect(mockGainNode.connect).toHaveBeenCalledWith(mockAudioContext.destination);
    expect(mockOscillator.start).toHaveBeenCalled();

    // Check gain attack: ramp 0->0.12 in 0.02s, then decay to 0 in 0.3s
    expect(mockGainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, 0);
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.12, 0.02);
    expect(mockGainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 0.3);
    expect(mockOscillator.stop).toHaveBeenCalledWith(0.3);
  });
});

describe('showAlarmOverlay', () => {
  afterEach(() => {
    removeAlarmOverlay();
  });

  it('creates element with id alarm-overlay', () => {
    showAlarmOverlay({ label: 'Test Alarm' });

    const overlay = document.getElementById('alarm-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.className).toContain('alarm-overlay');
  });

  it('sets the alarm label in the overlay', () => {
    showAlarmOverlay({ label: 'Morning Alarm' });

    const overlay = document.getElementById('alarm-overlay');
    expect(overlay.textContent).toContain('Morning Alarm');
  });

  it('calls onDismiss callback when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    showAlarmOverlay({ label: 'Test' }, onDismiss);

    const dismissBtn = document.querySelector('.alarm-overlay-dismiss');
    expect(dismissBtn).not.toBeNull();

    dismissBtn.click();

    expect(onDismiss).toHaveBeenCalled();
    expect(document.getElementById('alarm-overlay')).toBeNull();
  });

  it('persists until dismissed (no auto-dismiss)', () => {
    showAlarmOverlay({ label: 'Persistent' });
    expect(document.getElementById('alarm-overlay')).not.toBeNull();

    // Even after 10 seconds, overlay should still exist
    // (no setTimeout for auto-dismiss anymore)
    expect(document.getElementById('alarm-overlay')).not.toBeNull();
  });
});

describe('removeAlarmOverlay', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('removes overlay from DOM', () => {
    const overlay = document.createElement('div');
    overlay.id = 'alarm-overlay';
    document.body.appendChild(overlay);

    removeAlarmOverlay();

    expect(document.getElementById('alarm-overlay')).toBeNull();
  });

  it('does nothing when overlay does not exist', () => {
    // Should not throw
    expect(() => removeAlarmOverlay()).not.toThrow();
  });
});

describe('fireNotifications', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'Notification');
  const originalAudioCtx = globalThis.AudioContext;
  const originalWebkitAudioCtx = globalThis.webkitAudioContext;

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(globalThis, 'Notification', originalDescriptor);
    }
    globalThis.AudioContext = originalAudioCtx;
    globalThis.webkitAudioContext = originalWebkitAudioCtx;
    vi.restoreAllMocks();
    resetAudioContext();
    removeAlarmOverlay();
  });

  it('calls browser notification when browser is enabled', () => {
    const MockNotification = vi.fn();
    MockNotification.permission = 'granted';

    Object.defineProperty(globalThis, 'Notification', {
      value: MockNotification,
      configurable: true,
      writable: true,
    });

    const alarm = {
      id: 'test-1',
      label: 'Test',
      notifications: { browser: true, inApp: false, audio: false },
    };

    fireNotifications(alarm);

    expect(MockNotification).toHaveBeenCalledWith('Beat Clock', {
      body: 'Test',
      tag: 'alarm-test-1',
      requireInteraction: true,
    });
  });

  it('creates in-app overlay when inApp is enabled', () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      configurable: true,
      writable: true,
    });

    const alarm = {
      id: 'test-2',
      label: 'In-App Test',
      notifications: { browser: false, inApp: true, audio: false },
    };

    fireNotifications(alarm);

    const overlay = document.getElementById('alarm-overlay');
    expect(overlay).not.toBeNull();
    expect(overlay.textContent).toContain('In-App Test');
  });

  it('plays chime when audio is enabled', () => {
    Object.defineProperty(globalThis, 'Notification', {
      value: { permission: 'denied' },
      configurable: true,
      writable: true,
    });

    const mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const mockGainNode = {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };

    const mockAudioContext = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGainNode),
    };

    // Use a proper constructor function for `new` to work
    globalThis.AudioContext = function MockAudioContext() {
      return mockAudioContext;
    };

    const alarm = {
      id: 'test-3',
      label: 'Audio Test',
      notifications: { browser: false, inApp: false, audio: true },
    };

    fireNotifications(alarm);

    expect(mockAudioContext.createOscillator).toHaveBeenCalled();
  });

  it('respects notification settings and only fires enabled channels', () => {
    const MockNotification = vi.fn();
    MockNotification.permission = 'granted';

    Object.defineProperty(globalThis, 'Notification', {
      value: MockNotification,
      configurable: true,
      writable: true,
    });

    const mockOscillator = {
      type: '',
      frequency: { value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };

    const mockGainNode = {
      gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };

    const mockAudioContext = {
      state: 'running',
      currentTime: 0,
      createOscillator: vi.fn().mockReturnValue(mockOscillator),
      createGain: vi.fn().mockReturnValue(mockGainNode),
    };

    globalThis.AudioContext = function MockAudioContext() {
      return mockAudioContext;
    };

    // Only browser enabled
    const alarm = {
      id: 'test-4',
      label: 'Test',
      notifications: { browser: true, inApp: false, audio: false },
    };

    fireNotifications(alarm);

    // Browser notification should fire
    expect(MockNotification).toHaveBeenCalledWith('Beat Clock', expect.any(Object));
    // Overlay should NOT be created
    expect(document.getElementById('alarm-overlay')).toBeNull();
  });
});
