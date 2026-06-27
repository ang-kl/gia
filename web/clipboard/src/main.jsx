import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { applyTelegramTheme, hasInitData } from './lib/tg.js';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

// v0.62.388 — tell the index.html diagnostic watchdog the bundle actually ran
// (and which build), so a black screen can be told apart: flag SET = bundle ran
// but UI failed to mount; flag UNSET after 6s = bundle never executed (stale
// cache / 404). Must be the first executable line of the module body.
try { window.__CLIPBOARD_BOOTED__ = __BUILD_VERSION__; } catch { /* noop */ }

applyTelegramTheme();

function Boot() {
  // If the user opens the Clipboard URL outside Telegram (deep link
  // pasted into a desktop browser, or a stale tab after sign-out) the
  // backend will 401 every fetch and the UI will look broken. Show a
  // small reopen-from-Telegram screen instead. Mirrors the cuisine
  // TMA's hasInitData() guard.
  if (typeof window !== 'undefined' && !hasInitData() && !window.location.search.includes('SKIP_INIT_DATA_AUTH')) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <div className="text-3xl mb-3">📋</div>
          <div className="text-lg font-semibold mb-1">Soleat Clipboard</div>
          <div className="text-sm text-tg-hint">Reopen this from inside Telegram to continue.</div>
        </div>
      </div>
    );
  }
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <Boot />
  </ErrorBoundary>
);

console.log(`[Clipboard-TMA] bundle loaded v${__BUILD_VERSION__} built=${__BUILD_TIME__}`);
