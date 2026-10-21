import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import rootPkg from '../../package.json' with { type: 'json' };

// Mirrors web/cuisine/vite.config.js pattern. Bundle output is
// gitignored and regenerated on every Railway deploy by the root
// package.json build script.
//
// v0.60.50 — read version from the ROOT package.json (not the local
// one) so the footer always reflects the actual deployed app
// version. Local package.json versions across the monorepo were
// stale (0.60.4) and the local-import approach silently rotted.
export default defineConfig({
  plugins: [react()],
  base: '/app/menu/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'menu'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(rootPkg.version)
  }
});
