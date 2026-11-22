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
  // v0.62.986 — vitest 5 runs on vite 8, whose Oxc transform compiles JSX with the AUTOMATIC runtime, importing
  // `react/jsx-dev-runtime`. The root has no React (each Mini App installs its own), and CI's test job installs only
  // the root, so a test importing a component failed to load there (#1928, dish-display-name.test.js). vitest 2 used
  // the CLASSIC runtime (React.createElement, with the React each component already imports), which needs nothing
  // from node_modules. Restored here for tests only; the Mini App builds are untouched.
  oxc: { jsx: { runtime: 'classic' } },
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
