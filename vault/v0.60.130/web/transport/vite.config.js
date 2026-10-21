import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json' with { type: 'json' };

// v0.51.0 — fourth TMA: Hitachi-style MRT system map + per-line cards.
// Mirrors web/cuisine, web/menu, web/hawker pattern. Build output to
// public/transport/ (regenerated on each deploy).
export default defineConfig({
  plugins: [react()],
  base: '/app/transport/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'transport'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
