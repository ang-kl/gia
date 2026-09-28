import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import rootPkg from '../../package.json' with { type: 'json' };

// v0.62.103 — the project showcase page (served at /about). Built like the
// TMAs (Vite + React + Tailwind) but standalone: no Telegram SDK, its own
// design system. base '/about/' so hashed assets resolve under the route;
// outDir public/about so Express serves the build (index.js /about route).
// Version is injected from the ROOT package.json so the footer never rots.
export default defineConfig({
  plugins: [react()],
  base: '/about/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'about'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(rootPkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
