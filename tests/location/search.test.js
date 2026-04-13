import { describe, it, expect, beforeEach } from 'vitest';
import { initSearch, searchCities } from '../../src/location/search.js';

// Sample test cities
const testCities = [
  { id: 'london_uk', name: 'London', country: 'GB', admin_name: 'England', lat: 51.5074, lng: -0.1278, population: 8982000 },
  { id: 'londonderry', name: 'Londonderry', country: 'GB', admin_name: 'Northern Ireland', lat: 54.9966, lng: -7.3086, population: 85000 },
  { id: 'tokyo', name: 'Tokyo', country: 'JP', admin_name: 'Tokyo', lat: 35.6762, lng: 139.6503, population: 13960000 },
  { id: 'paris', name: 'Paris', country: 'FR', admin_name: 'Île-de-France', lat: 48.8566, lng: 2.3522, population: 2161000 },
  { id: 'new_york', name: 'New York', country: 'US', admin_name: 'New York', lat: 40.7128, lng: -74.0060, population: 8336000 },
];

describe('initSearch', () => {
  it('initializes without error', () => {
    expect(() => initSearch(testCities)).not.toThrow();
  });

  it('handles empty array', () => {
    expect(() => initSearch([])).not.toThrow();
  });

  it('handles null', () => {
    expect(() => initSearch(null)).not.toThrow();
  });
});

describe('searchCities', () => {
  beforeEach(() => {
    initSearch(testCities);
  });

  it('returns results including London for "lon"', () => {
    const results = searchCities('lon');
    const names = results.map(c => c.name);
    expect(names).toContain('London');
  });

  it('returns results including Tokyo for "tok"', () => {
    const results = searchCities('tok');
    const names = results.map(c => c.name);
    expect(names).toContain('Tokyo');
  });

  it('returns empty array for non-matching query', () => {
    const results = searchCities('xyz');
    expect(results).toEqual([]);
  });

  it('limits results to 10 max', () => {
    const results = searchCities('');
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('returns empty array for empty input', () => {
    expect(searchCities('')).toEqual([]);
    expect(searchCities(null)).toEqual([]);
    expect(searchCities(undefined)).toEqual([]);
  });

  it('returns empty array for single character input', () => {
    expect(searchCities('a')).toEqual([]);
    expect(searchCities('L')).toEqual([]);
  });

  it('finds London with typo (fuzzy matching)', () => {
    const results = searchCities('londn');
    const names = results.map(c => c.name);
    expect(names).toContain('London');
  });

  it('returns city objects with expected fields', () => {
    const results = searchCities('tokyo');
    expect(results.length).toBeGreaterThan(0);
    const city = results[0];
    expect(city).toHaveProperty('name');
    expect(city).toHaveProperty('country');
    expect(city).toHaveProperty('lat');
    expect(city).toHaveProperty('lng');
  });
});

describe('searchCities without initialization', () => {
  it('throws error if initSearch not called', () => {
    // Reset by initializing with null
    initSearch(null);
    expect(() => searchCities('test')).toThrow('Search not initialized');
  });
});
