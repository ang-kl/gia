import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Build output is committed-out (.gitignored) but populated at deploy time
// so Express's existing static middleware serves the bundle from
// public/cuisine/. base must match the URL prefix the bot serves the TMA at.
export default defineConfig({
  plugins: [react()],
  base: '/app/cuisine/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'cuisine'),
    emptyOutDir: true,
    sourcemap: false
  }
});
