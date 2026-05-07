import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json' with { type: 'json' };

// v0.29.0: build-time inject the bundle version + epoch so the TMA can
// surface it in the Header. Stops the "are we on the latest bundle?"
// debugging loop dead — user can read the version off-screen at any time.
export default defineConfig({
  plugins: [react()],
  base: '/app/cuisine/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'cuisine'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
