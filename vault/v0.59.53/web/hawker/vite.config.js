import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json' with { type: 'json' };

// v0.38.0 — third TMA: hawker closures + R&R works scraped from NEA.
// Mirrors web/cuisine/ + web/menu/ pattern. Build output emits to
// public/hawker/ (gitignored, regenerated on each deploy).
export default defineConfig({
  plugins: [react()],
  base: '/app/hawker/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'hawker'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
