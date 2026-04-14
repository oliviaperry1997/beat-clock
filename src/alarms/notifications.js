/**
 * Three-channel notification system: Browser Notification API, in-app overlay,
 * and Web Audio API chime.
 *
 * Supports persistent ringing until explicitly dismissed.
 */

let audioCtx = null;
let activeOscillator = null;
let activeGain = null;

/**
 * Ensures Notification permission is granted.
 * Must be called from a user gesture (click handler).
 * @returns {boolean} True if permission granted, false otherwise.
 */
export function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  Notification.requestPermission().then((result) => {
    return result === 'granted';
  });
  return false;
}

/**
 * Fires a browser notification for the given alarm.
 * @param {Object} alarm - Alarm object with id and label.
 */
export function fireBrowserNotification(alarm) {
  if (Notification.permission !== 'granted') return;

  const notification = new Notification('Beat Clock', {
    body: alarm.label || 'Alarm',
    tag: 'alarm-' + alarm.id,
    requireInteraction: true,
  });

  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

/**
 * Initializes the AudioContext, resuming if suspended, and plays
 * a silent 10ms tone to satisfy the autoplay policy.
 */
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // Play a silent 10ms tone to satisfy autoplay policy
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.01);
}

/**
 * Starts a continuous audio tone for alarm ringing.
 * @param {number} frequency - Frequency in Hz (default 880).
 */
export function playChime(frequency = 880) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // Stop any existing tone first
  stopAudio();

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02); // Attack

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start(now);
  activeOscillator = oscillator;
  activeGain = gainNode;
}

/**
 * Stops the active audio tone.
 */
export function stopAudio() {
  if (activeGain) {
    const now = audioCtx.currentTime;
    activeGain.gain.linearRampToValueAtTime(0, now + 0.05);
  }
  if (activeOscillator) {
    activeOscillator.stop(audioCtx.currentTime + 0.06);
    activeOscillator = null;
    activeGain = null;
  }
}

/**
 * Shows a glassmorphism in-app overlay for the alarm.
 * Persists until dismissed.
 * @param {Object} alarm - Alarm object with label.
 * @param {function} onDismiss - Callback when user dismisses.
 */
export function showAlarmOverlay(alarm, onDismiss) {
  // Remove any existing overlay first
  removeAlarmOverlay();

  const overlay = document.createElement('div');
  overlay.id = 'alarm-overlay';
  overlay.className = 'alarm-overlay';

  overlay.innerHTML = `
    <div class="alarm-overlay-content">
      <div class="alarm-overlay-title">${alarm.label || 'Alarm'}</div>
      <button class="alarm-overlay-dismiss" aria-label="Dismiss">Dismiss</button>
    </div>
  `;

  // Dismiss button handler
  const dismissBtn = overlay.querySelector('.alarm-overlay-dismiss');
  dismissBtn.addEventListener('click', () => {
    removeAlarmOverlay();
    if (onDismiss) onDismiss();
  });

  document.body.appendChild(overlay);
}

/**
 * Removes the alarm overlay from the DOM.
 */
export function removeAlarmOverlay() {
  const overlay = document.getElementById('alarm-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Fires all notification channels for an alarm based on its settings.
 * @param {Object} alarm - Alarm object with notifications settings and label/id.
 * @param {function} onDismiss - Callback when user dismisses.
 */
export function fireNotifications(alarm, onDismiss) {
  const notif = alarm.notifications || { browser: true, inApp: true, audio: true };

  if (notif.browser && 'Notification' in window) {
    fireBrowserNotification(alarm);
  }

  if (notif.inApp) {
    showAlarmOverlay(alarm, onDismiss);
  }

  if (notif.audio) {
    playChime();
  }
}

/**
 * Stops all notification channels for an alarm.
 * @param {Object} alarm - Alarm object.
 */
export function stopNotifications(alarm) {
  const notif = alarm.notifications || { browser: true, inApp: true, audio: true };

  if (notif.audio) {
    stopAudio();
  }

  if (notif.inApp) {
    removeAlarmOverlay();
  }
}

/**
 * Resets the audio context (for testing).
 */
export function resetAudioContext() {
  audioCtx = null;
  activeOscillator = null;
  activeGain = null;
}

// Expose initAudio for external warm-up calls
export { initAudio };
