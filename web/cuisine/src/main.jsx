import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { applyTelegramTheme } from './api/tg.js';

applyTelegramTheme();

// v0.53.0: dual-render `?v=1|2` shipped the map-first v2 alongside the legacy
// chip-grid v1 behind a query-param gate. v2 has been the validated default
// since; v0.62.509 drops v1 and the gate (the legacy app is git-recoverable).

// v0.62.x — stale-deploy self-heal. After a redeploy the code-split chunk
// hashes change; a webview holding the old page then 404s the app chunk and
// white-screens. Reload ONCE (guarded against a loop) to fetch the fresh page.
function reloadOnceForStaleChunk(reason) {
  try {
    if (sessionStorage.getItem('gia.chunkReload')) return;
    sessionStorage.setItem('gia.chunkReload', '1');
  } catch { /* private mode — still worth one reload */ }
  console.warn('[Cuisine-TMA] stale-chunk self-heal reload:', reason);
  window.location.reload();
}
window.addEventListener('vite:preloadError', () => reloadOnceForStaleChunk('vite:preloadError'));

async function boot() {
  try {
    const App = (await import('./v2/App.jsx')).default;
    console.log('[Cuisine-TMA] D040 bundle loaded version=v2');
    createRoot(document.getElementById('root')).render(<App />);
  } catch (err) {
    reloadOnceForStaleChunk(err && err.message);
  }
}

boot();
