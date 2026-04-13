import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.js', 'tests/**/*.test.js'],
  },
  css: false,
});
