import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import rootPkg from '../../package.json' with { type: 'json' };

// v0.29.0: build-time inject the bundle version + epoch so the TMA can
// surface it in the Header. Stops the "are we on the latest bundle?"
// debugging loop dead — user can read the version off-screen at any time.
// v0.60.215: read the version from the ROOT package.json (not the local
// one). The local TMA package.json versions had rotted at 0.60.4, so the
// footer displayed v0.60.4 instead of the deployed app version. Mirrors
// the v0.60.50 fix already applied to web/menu/vite.config.js.
export default defineConfig({
  plugins: [react()],
  base: '/app/cuisine/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'cuisine'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(rootPkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
