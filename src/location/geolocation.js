/**
 * Browser geolocation wrapper with robust timeout handling.
 * 
 * Wraps navigator.geolocation.getCurrentPosition with proper
 * Promise-based API and Chrome timeout bug workaround.
 */

/**
 * Detect the user's current location via browser geolocation API.
 * Returns a Promise that resolves to { latitude, longitude, accuracy }.
 * 
 * @param {object} options
 * @param {number} options.timeout - Timeout in ms (default 8000)
 * @param {boolean} options.enableHighAccuracy - Use GPS (default false)
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number}>}
 */
export function detectLocation(options = {}) {
  const {
    timeout = 8000,
    enableHighAccuracy = false
  } = options;

  return new Promise((resolve, reject) => {
    if (!navigator || !navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    // Own timeout wrapper (Chrome bug workaround)
    const timer = setTimeout(() => {
      reject(new Error('Geolocation request timed out'));
    }, timeout);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        clearTimeout(timer);
        const messages = {
          1: 'Location permission denied',
          2: 'Location unavailable',
          3: 'Location request timed out'
        };
        reject(new Error(messages[error.code] || 'Unknown geolocation error'));
      },
      {
        enableHighAccuracy,
        timeout: timeout + 2000, // Give browser slightly more time than our wrapper
        maximumAge: 300000 // Accept cached position up to 5 minutes old
      }
    );
  });
}

/**
 * Check if the browser supports geolocation API.
 * @returns {boolean}
 */
export function isGeolocationAvailable() {
  return !!(navigator && navigator.geolocation);
}
