/**
 * City search module using fuse.js for fuzzy matching.
 * 
 * Provides initSearch() to initialize the Fuse index and
 * searchCities() to query against the city database.
 */

import Fuse from 'fuse.js';

let fuseInstance = null;

/**
 * Initialize the Fuse search index with a cities array.
 * Must be called before searchCities().
 * 
 * @param {Array} cities - Array of city objects with name, country, admin_name fields
 */
export function initSearch(cities) {
  if (!cities || !Array.isArray(cities) || cities.length === 0) {
    fuseInstance = null;
    return;
  }

  fuseInstance = new Fuse(cities, {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'admin_name', weight: 0.2 },
      { name: 'country', weight: 0.1 }
    ],
    threshold: 0.3,
    includeScore: true,
    minMatchCharLength: 2,
    useExtendedSearch: true
  });
}

/**
 * Search for cities matching the query string.
 * Returns up to 10 results, sorted by relevance.
 * 
 * @param {string} query - Search query (min 2 characters)
 * @returns {Array} Matching city objects
 */
export function searchCities(query) {
  if (!fuseInstance) {
    throw new Error('Search not initialized. Call initSearch() first.');
  }

  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const results = fuseInstance.search(query.trim());
  return results.slice(0, 10).map(r => r.item);
}
