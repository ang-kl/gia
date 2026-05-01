import React, { useState } from 'react';
import { requestLocation, showAlert } from '../api/tg.js';

// v0.29.0: build-time globals injected by vite.config.js#define.
// `typeof __BUILD_VERSION__` guard keeps lint happy in dev where they're
// undefined (vite supplies them at build time only).
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

export default function Header({ loc, onLoc }) {
  const [busy, setBusy] = useState(false);
  const detect = async () => {
    setBusy(true);
    try {
      const p = await requestLocation();
      onLoc(p);
    } catch (err) {
      showAlert('Could not read your location: ' + err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-tg-border">
      <div>
        <h1 className="text-lg font-semibold tracking-tight leading-tight">Cuisine and Drinks</h1>
        <p className="text-[10px] text-tg-hint font-mono leading-tight">v{BUILD_VERSION}</p>
      </div>
      <button
        onClick={detect}
        disabled={busy}
        className="text-xs px-3 py-1.5 rounded-full bg-tg-accent text-tg-accent-text disabled:opacity-50"
      >
        {busy ? '…' : loc ? '📍 Re-detect' : '📍 Detect'}
      </button>
    </div>
  );
}
