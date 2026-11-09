// vitest.config.js — v0.42.0 unit test config.
//
// Node-only (no JSDOM). TMA tests would need a separate Vitest project
// with environment: 'jsdom' — deferred to v0.43.0+.
//
// Test glob: __tests__/**/*.test.js. Co-located *.test.js next to source
// files would also work, but a single tree is easier to gitignore /
// lint-exclude.

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['__tests__/**/*.test.js'],
    exclude: ['node_modules/**', 'web/**', '__tests__/redis-stub.js'],
    reporters: ['default'],
    coverage: {
      enabled: false,
      reporter: ['text', 'html'],
      include: ['*.js'],
      exclude: ['__tests__/**', 'web/**', 'vitest.config.js']
    }
  }
});
