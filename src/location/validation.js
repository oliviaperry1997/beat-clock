/**
 * Location validation module
 * 
 * Validates latitude/longitude inputs and finds nearest city from database.
 */

/**
 * Validate a latitude value
 * @param {string|number} value
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
export function validateLatitude(value) {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'Latitude must be a number' };
  }
  if (num < -90 || num > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  return { valid: true, value: num };
}

/**
 * Validate a longitude value
 * @param {string|number} value
 * @returns {{ valid: boolean, value?: number, error?: string }}
 */
export function validateLongitude(value) {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, error: 'Longitude must be a number' };
  }
  if (num < -180 || num > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  return { valid: true, value: num };
}

/**
 * Validate latitude and longitude together
 * @param {string|number} lat
 * @param {string|number} lon
 * @returns {{ valid: boolean, latitude?: number, longitude?: number, error?: string }}
 */
export function validateLocationInput(lat, lon) {
  const latResult = validateLatitude(lat);
  if (!latResult.valid) return latResult;

  const lonResult = validateLongitude(lon);
  if (!lonResult.valid) return lonResult;

  return {
    valid: true,
    latitude: latResult.value,
    longitude: lonResult.value
  };
}

/**
 * Find the nearest city to given coordinates using Haversine distance.
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @param {Array} cities - Array of city objects with lat/lng properties
 * @param {number} maxDistanceKm - Maximum search radius in km (default 25)
 * @returns {object|null} Nearest city object with added distance field, or null
 */
export function findNearestCity(lat, lon, cities, maxDistanceKm = 25) {
  if (!cities || !Array.isArray(cities)) return null;

  let nearest = null;
  let minDist = maxDistanceKm;

  for (const city of cities) {
    const dist = haversineDistance(lat, lon, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = { ...city, distance: dist };
    }
  }

  return nearest;
}

/**
 * Calculate Haversine distance between two coordinates.
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in km
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
