import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadLocations,
  saveLocations,
  getActiveLocationId,
  setActiveLocationId,
  getActiveLocation,
  addLocation,
  removeLocation,
  switchActiveLocation
} from '../../src/location/store.js';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; })
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('loadLocations', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns empty array when no locations saved', () => {
    expect(loadLocations()).toEqual([]);
  });

  it('returns parsed locations when data exists', () => {
    const locations = [{ id: 'loc_1', name: 'London', latitude: 51.5, longitude: -0.1 }];
    localStorageMock.setItem('beatclock:locations', JSON.stringify(locations));
    expect(loadLocations()).toEqual(locations);
  });

  it('returns empty array on parse error', () => {
    localStorageMock.setItem('beatclock:locations', 'invalid json');
    expect(loadLocations()).toEqual([]);
  });
});

describe('saveLocations', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('saves locations array to localStorage', () => {
    const locations = [{ id: 'loc_1', name: 'London' }];
    saveLocations(locations);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'beatclock:locations',
      JSON.stringify(locations)
    );
  });
});

describe('getActiveLocationId / setActiveLocationId', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns null when no active ID set', () => {
    expect(getActiveLocationId()).toBeNull();
  });

  it('sets and gets active ID', () => {
    setActiveLocationId('loc_123');
    expect(getActiveLocationId()).toBe('loc_123');
  });

  it('clears active ID when set to null', () => {
    setActiveLocationId('loc_123');
    setActiveLocationId(null);
    expect(getActiveLocationId()).toBeNull();
  });
});

describe('getActiveLocation', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('returns null when no locations saved', () => {
    expect(getActiveLocation()).toBeNull();
  });

  it('returns active location when one exists', () => {
    const locations = [
      { id: 'loc_1', name: 'London', latitude: 51.5, longitude: -0.1 },
      { id: 'loc_2', name: 'Tokyo', latitude: 35.6, longitude: 139.6 }
    ];
    saveLocations(locations);
    setActiveLocationId('loc_2');
    const active = getActiveLocation();
    expect(active).toEqual(locations[1]);
  });

  it('returns null when active ID does not match any location', () => {
    saveLocations([{ id: 'loc_1', name: 'London' }]);
    setActiveLocationId('loc_nonexistent');
    expect(getActiveLocation()).toBeNull();
  });
});

describe('addLocation', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it('adds location and returns object with id', () => {
    const location = {
      name: 'London',
      latitude: 51.5,
      longitude: -0.1,
      country: 'GB',
      source: 'search'
    };
    const result = addLocation(location);
    expect(result).toHaveProperty('id');
    expect(result.name).toBe('London');
    expect(result.latitude).toBe(51.5);
  });

  it('auto-sets first location as active', () => {
    const result = addLocation({ name: 'London', latitude: 51.5, longitude: -0.1 });
    expect(getActiveLocationId()).toBe(result.id);
  });

  it('does not change active ID for subsequent locations', () => {
    addLocation({ name: 'London', latitude: 51.5, longitude: -0.1 });
    const firstActive = getActiveLocationId();
    addLocation({ name: 'Tokyo', latitude: 35.6, longitude: 139.6 });
    expect(getActiveLocationId()).toBe(firstActive);
  });

  it('uses custom id if provided', () => {
    const result = addLocation({
      id: 'custom_id',
      name: 'Paris',
      latitude: 48.8,
      longitude: 2.3
    });
    expect(result.id).toBe('custom_id');
  });
});

describe('removeLocation', () => {
  beforeEach(() => {
    localStorageMock.clear();
    addLocation({ id: 'loc_1', name: 'London', latitude: 51.5, longitude: -0.1 });
    addLocation({ id: 'loc_2', name: 'Tokyo', latitude: 35.6, longitude: 139.6 });
  });

  it('removes location from list', () => {
    removeLocation('loc_1');
    const locations = loadLocations();
    expect(locations.length).toBe(1);
    expect(locations[0].id).toBe('loc_2');
  });

  it('clears active if removed location was active', () => {
    setActiveLocationId('loc_1');
    removeLocation('loc_1');
    expect(getActiveLocationId()).toBe('loc_2'); // Falls back to first remaining
  });

  it('sets active to null when last location is removed', () => {
    removeLocation('loc_1');
    removeLocation('loc_2');
    expect(getActiveLocationId()).toBeNull();
    expect(loadLocations()).toEqual([]);
  });
});

describe('switchActiveLocation', () => {
  beforeEach(() => {
    localStorageMock.clear();
    addLocation({ id: 'loc_1', name: 'London', latitude: 51.5, longitude: -0.1 });
    addLocation({ id: 'loc_2', name: 'Tokyo', latitude: 35.6, longitude: 139.6 });
  });

  it('switches active location and returns it', () => {
    const result = switchActiveLocation('loc_2');
    expect(result).not.toBeNull();
    expect(result.name).toBe('Tokyo');
    expect(getActiveLocationId()).toBe('loc_2');
  });

  it('returns null for non-existent ID', () => {
    const result = switchActiveLocation('loc_nonexistent');
    expect(result).toBeNull();
  });
});
