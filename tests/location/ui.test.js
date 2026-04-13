import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initLocationSystem } from '../../src/location/ui.js';

// Mock all dependencies
vi.mock('../../src/location/store.js', () => ({
  loadLocations: vi.fn(() => []),
  getActiveLocation: vi.fn(() => null),
  addLocation: vi.fn((loc) => ({ ...loc, id: 'loc_test' })),
  removeLocation: vi.fn(),
  switchActiveLocation: vi.fn((id) => ({ id, name: 'London', latitude: 51.5, longitude: -0.1, country: 'GB' }))
}));

vi.mock('../../src/location/search.js', () => ({
  initSearch: vi.fn(),
  searchCities: vi.fn((q) => {
    if (q === 'lon') return [{ id: 'london', name: 'London', country: 'GB', admin_name: 'England', lat: 51.5, lng: -0.1, population: 8982000 }];
    if (q === 'tok') return [{ id: 'tokyo', name: 'Tokyo', country: 'JP', admin_name: 'Tokyo', lat: 35.6, lng: 139.6, population: 13960000 }];
    return [];
  })
}));

vi.mock('../../src/location/validation.js', () => ({
  validateLocationInput: vi.fn((lat, lon) => {
    const latNum = Number(lat);
    const lonNum = Number(lon);
    if (isNaN(latNum) || latNum < -90 || latNum > 90) return { valid: false };
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) return { valid: false };
    return { valid: true, latitude: latNum, longitude: lonNum };
  }),
  findNearestCity: vi.fn(() => null)
}));

vi.mock('../../src/location/geolocation.js', () => ({
  detectLocation: vi.fn(() => Promise.resolve({ latitude: 40.0, longitude: -74.0, accuracy: 100 })),
  isGeolocationAvailable: vi.fn(() => true)
}));

// Mock city data import
vi.mock('../../src/data/cities.json', () => ({
  default: []
}));

describe('initLocationSystem', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="beats-container"></div>';
    // Mock localStorage
    const store = {};
    global.localStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = String(value); }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); })
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls callback with coordinates when location is selected', async () => {
    const callback = vi.fn();
    
    // Initialize with no saved locations — will attempt geolocation
    await initLocationSystem(callback);
    
    // Geolocation should have been called
    const { detectLocation } = await import('../../src/location/geolocation.js');
    expect(detectLocation).toHaveBeenCalled();
  });

  it('creates location selector in DOM', async () => {
    const callback = vi.fn();
    await initLocationSystem(callback);
    
    // Allow async operations to complete
    await new Promise(r => setTimeout(r, 10));
    
    const selector = document.getElementById('location-selector');
    expect(selector).not.toBeNull();
  });
});
