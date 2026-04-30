import React, { useState } from 'react';
import { requestLocation, showAlert } from '../api/tg.js';

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
      <h1 className="text-lg font-semibold tracking-tight">Cuisine and Drinks</h1>
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
