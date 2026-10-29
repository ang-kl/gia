import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import rootPkg from '../../package.json' with { type: 'json' };

// Soleat Clipboard TMA — the second Mini App under the gia4lunch_bot.
// Mirrors web/cuisine/vite.config.js conventions: read the rotted-proof
// version from the ROOT package.json so the footer always shows the
// deployed app version (not the local TMA version), and build to
// public/clipboard so the bot serves at /app/clipboard/.
export default defineConfig({
  plugins: [react()],
  base: '/app/clipboard/',
  build: {
    outDir: path.resolve(__dirname, '..', '..', 'public', 'clipboard'),
    emptyOutDir: true,
    sourcemap: false
  },
  define: {
    __BUILD_VERSION__: JSON.stringify(rootPkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
});
