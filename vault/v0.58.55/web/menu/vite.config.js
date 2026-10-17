import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Mirrors web/cuisine/vite.config.js pattern. Bundle output is
// gitignored and regenerated on every Railway deploy by the root
// package.json build script.
export default defineConfig({
  plugins: [react()],
  base: '/app/menu/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'menu'),
    emptyOutDir: true,
    sourcemap: false
  }
});
