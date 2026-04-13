#!/usr/bin/env node
/**
 * filter-cities.js
 * 
 * Build script that filters the worldcities dataset to major cities
 * and outputs a filtered JSON file for bundling.
 * 
 * Usage: node scripts/filter-cities.js
 * Output: src/data/cities.json
 */

const fs = require('fs');
const path = require('path');

const POPULATION_THRESHOLD = 50000;
const TARGET_CITIES = 10000; // Aim for ~10K major cities
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

// Read raw cities data from worldcities package
const worldcitiesPath = path.resolve(__dirname, '..', 'node_modules', 'worldcities', 'data', 'cities.json');
const outputPath = path.resolve(__dirname, '..', 'src', 'data', 'cities.json');

console.log('Reading worldcities dataset from:', worldcitiesPath);

const raw = fs.readFileSync(worldcitiesPath, 'utf8');
const allCities = JSON.parse(raw);
console.log('Total cities in dataset:', allCities.length);

/**
 * Raw format: [lat, lng, name, countryCode, population, timezone]
 * Output format: { id, name, country, admin_name, lat, lng, population }
 */
const filtered = allCities
  .filter(city => city[4] > POPULATION_THRESHOLD)
  .map((city, index) => ({
    id: `city_${index}`,
    name: city[2],
    country: city[3],
    admin_name: '',  // Not available in worldcities dataset
    lat: city[0],
    lng: city[1],
    population: city[4]
  }));

console.log('Cities after filtering (pop >', POPULATION_THRESHOLD, '):', filtered.length);

// Sort by population descending for better UX (major cities first)
filtered.sort((a, b) => b.population - a.population);

const output = JSON.stringify(filtered, null, 2);
const bufferSize = Buffer.byteLength(output, 'utf8');

if (bufferSize > MAX_FILE_SIZE) {
  console.warn('WARNING: Output file size', (bufferSize / 1024 / 1024).toFixed(2), 'MB exceeds 2 MB target');
}

fs.writeFileSync(outputPath, output, 'utf8');

const stats = fs.statSync(outputPath);
console.log('Output written to:', outputPath);
console.log('File size:', (stats.size / 1024).toFixed(1), 'KB');
console.log('Done.');
