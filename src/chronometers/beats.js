/**
 * Beats chronometer — computes Swatch Internet Time (.beats).
 * @param {Date} date - The date to calculate
 * @param {object} [opts] - Optional configuration
 * @returns {string} Beats string formatted as @XXX.XX
 */
export function compute(date, opts) {
  const msOfDay = date.getUTCHours() * 3600000 +
    date.getUTCMinutes() * 60000 +
    date.getUTCSeconds() * 1000 +
    date.getUTCMilliseconds();
  const bmtOffset = 3600000; // UTC+1 = 1 hour in ms
  const totalMs = (msOfDay + bmtOffset) % 86400000;
  const beats = totalMs / 86400; // 86400ms per beat
  return `@${beats.toFixed(2).padStart(6, '0')}`;
}
