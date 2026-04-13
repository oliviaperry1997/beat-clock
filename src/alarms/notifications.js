/**
 * Three-channel notification system: Browser Notification API, in-app overlay,
 * and Web Audio API chime. Addresses D-02.
 */

let audioCtx = null;

/**
 * Ensures Notification permission is granted.
 * Must be called from a user gesture (click handler).
 * @returns {boolean} True if permission granted, false otherwise.
 */
export function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  // Must be called from a user gesture
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
    requireInteraction: false,
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
 * Plays an audio chime using Web Audio API oscillator.
 * @param {number} frequency - Frequency in Hz (default 880).
 * @param {number} duration - Duration in seconds (default 0.3).
 */
export function playChime(frequency = 880, duration = 0.3) {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;

  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.02); // Attack
  gainNode.gain.linearRampToValueAtTime(0.15, now + duration - 0.05); // Sustain
  gainNode.gain.linearRampToValueAtTime(0, now + duration); // Release

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Shows a glassmorphism in-app overlay for the alarm.
 * Auto-dismisses after 10 seconds.
 * @param {Object} alarm - Alarm object with label.
 */
export function showAlarmOverlay(alarm) {
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
  dismissBtn.addEventListener('click', removeAlarmOverlay);

  document.body.appendChild(overlay);

  // Auto-dismiss after 10 seconds
  setTimeout(removeAlarmOverlay, 10000);
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
 */
export function fireNotifications(alarm) {
  const notif = alarm.notifications || { browser: true, inApp: true, audio: true };

  if (notif.browser && 'Notification' in window) {
    fireBrowserNotification(alarm);
  }

  if (notif.inApp) {
    showAlarmOverlay(alarm);
  }

  if (notif.audio) {
    playChime();
  }
}

/**
 * Resets the audio context (for testing).
 */
export function resetAudioContext() {
  audioCtx = null;
}

// Expose initAudio for external warm-up calls
export { initAudio };
