import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import pkg from './package.json' with { type: 'json' };

// v0.60.142 — fifth TMA: the hidden `/oversight` operator stats
// dashboard. Mirrors web/cuisine, web/menu, web/hawker, web/transport.
// Build output to public/oversight/ (regenerated on each deploy).
// Not linked from the Menu hub; reached via the hidden /oversight chat
// command. The bundle is public but useless without the owner-gated
// /api/oversight/stats endpoint.
export default defineConfig({
  plugins: [react()],
  base: '/app/oversight/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'oversight'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
