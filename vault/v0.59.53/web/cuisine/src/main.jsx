import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { applyTelegramTheme } from './api/tg.js';

applyTelegramTheme();

// v0.53.0: dual-render — `?v=2` (default) loads the new map-first
// flip-card TMA; `?v=1` falls back to the legacy chip-grid TMA. Once
// v2 is validated in production, drop v1 and the query-param gate.
const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const requestedVersion = params.get('v') || '2';

async function boot() {
  let App;
  if (requestedVersion === '1') {
    App = (await import('./App.jsx')).default;
    console.log('[Cuisine-TMA] D040 bundle loaded version=v1 (legacy)');
  } else {
    App = (await import('./v2/App.jsx')).default;
    console.log('[Cuisine-TMA] D040 bundle loaded version=v2');
  }
  createRoot(document.getElementById('root')).render(<App />);
}

boot();
