import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import rootPkg from '../../package.json' with { type: 'json' };

// v0.51.0 — fourth TMA: Hitachi-style MRT system map + per-line cards.
// Mirrors web/cuisine, web/menu, web/hawker pattern. Build output to
// public/transport/ (regenerated on each deploy).
// v0.60.215: version sourced from the ROOT package.json (was the stale
// local one — see web/cuisine/vite.config.js).
export default defineConfig({
  plugins: [react()],
  // v0.62.986 — vite 8 (Rolldown) resolves a bare import from the importing file's own folder upward, and
  // web/_shared/ has no node_modules, so `import … from 'react'` there failed. dedupe resolves react and react-dom
  // from this app's root instead, which is also what keeps one React instance in the bundle.
  resolve: { dedupe: ['react', 'react-dom'] },
  base: '/app/transport/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'transport'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(rootPkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
