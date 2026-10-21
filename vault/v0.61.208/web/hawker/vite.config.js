import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import rootPkg from '../../package.json' with { type: 'json' };

// v0.38.0 — third TMA: hawker closures + R&R works scraped from NEA.
// Mirrors web/cuisine/ + web/menu/ pattern. Build output emits to
// public/hawker/ (gitignored, regenerated on each deploy).
// v0.60.215: version sourced from the ROOT package.json (was the stale
// local one — see web/cuisine/vite.config.js).
export default defineConfig({
  plugins: [react()],
  base: '/app/hawker/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'hawker'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(rootPkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
