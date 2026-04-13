import { describe, it, expect } from 'vitest';
import {
  validateLatitude,
  validateLongitude,
  validateLocationInput,
  findNearestCity
} from '../../src/location/validation.js';

describe('validateLatitude', () => {
  it('returns valid for normal latitude', () => {
    const result = validateLatitude('51.5');
    expect(result.valid).toBe(true);
    expect(result.value).toBe(51.5);
  });

  it('returns valid for numeric input', () => {
    const result = validateLatitude(45.0);
    expect(result.valid).toBe(true);
    expect(result.value).toBe(45.0);
  });

  it('returns invalid for values > 90', () => {
    const result = validateLatitude('91');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between -90 and 90');
  });

  it('returns invalid for values < -90', () => {
    const result = validateLatitude('-91');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('between -90 and 90');
  });

  it('returns invalid for non-numeric values', () => {
    const result = validateLatitude('abc');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be a number');
  });

  it('accepts boundary values', () => {
    expect(validateLatitude('90').valid).toBe(true);
    expect(validateLatitude('-90').valid).toBe(true);
    expect(validateLatitude('0').valid).toBe(true);
  });
});

describe('validateLongitude', () => {
  it('returns valid for normal longitude', () => {
    const result = validateLongitude('-0.1');
    expect(result.valid).toBe(true);
    expect(result.value).toBe(-0.1);
  });

  it('returns valid for 180', () => {
    const result = validateLongitude('180');
    expect(result.valid).toBe(true);
    expect(result.value).toBe(180);
  });

  it('returns valid for -180', () => {
    const result = validateLongitude('-180');
    expect(result.valid).toBe(true);
    expect(result.value).toBe(-180);
  });

  it('returns invalid for values > 180', () => {
    const result = validateLongitude('181');
    expect(result.valid).toBe(false);
  });

  it('returns invalid for values < -180', () => {
    const result = validateLongitude('-181');
    expect(result.valid).toBe(false);
  });

  it('returns invalid for non-numeric values', () => {
    const result = validateLongitude('xyz');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be a number');
  });
});

describe('validateLocationInput', () => {
  it('returns valid for correct lat/lon', () => {
    const result = validateLocationInput('51.5', '-0.1');
    expect(result.valid).toBe(true);
    expect(result.latitude).toBe(51.5);
    expect(result.longitude).toBe(-0.1);
  });

  it('returns invalid when latitude is bad', () => {
    const result = validateLocationInput('95', '-0.1');
    expect(result.valid).toBe(false);
  });

  it('returns invalid when longitude is bad', () => {
    const result = validateLocationInput('51.5', '200');
    expect(result.valid).toBe(false);
  });

  it('returns invalid when both are bad', () => {
    const result = validateLocationInput('abc', 'xyz');
    expect(result.valid).toBe(false);
  });
});

describe('findNearestCity', () => {
  const testCities = [
    { id: 'london', name: 'London', country: 'GB', lat: 51.5074, lng: -0.1278, population: 8982000 },
    { id: 'paris', name: 'Paris', country: 'FR', lat: 48.8566, lng: 2.3522, population: 2161000 },
    { id: 'brussels', name: 'Brussels', country: 'BE', lat: 50.8503, lng: 4.3517, population: 1200000 },
  ];

  it('returns nearest city within range', () => {
    const result = findNearestCity(51.5, -0.1, testCities);
    expect(result).not.toBeNull();
    expect(result.name).toBe('London');
    expect(result.distance).toBeDefined();
  });

  it('returns null when no city within range', () => {
    const result = findNearestCity(0, 0, testCities, 10);
    expect(result).toBeNull();
  });

  it('returns null for empty cities array', () => {
    const result = findNearestCity(51.5, -0.1, []);
    expect(result).toBeNull();
  });

  it('returns null for null cities', () => {
    const result = findNearestCity(51.5, -0.1, null);
    expect(result).toBeNull();
  });

  it('includes distance in result', () => {
    const result = findNearestCity(51.5, -0.1, testCities);
    expect(result.distance).toBeGreaterThan(0);
    expect(result.distance).toBeLessThan(100); // Should be very close to London
  });
});
