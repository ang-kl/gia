import React, { useEffect, useState } from 'react';
import { requestLocation, showAlert, initData } from '../api/tg.js';

// v0.29.0: build-time globals injected by vite.config.js#define.
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

// v0.34.2: cache the place name in module memory keyed by gridded coords
// so re-renders don't re-fetch.
const _placeNameCache = new Map();

async function fetchPlaceName(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (_placeNameCache.has(key)) return _placeNameCache.get(key);
  try {
    const id = initData();
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`, {
      headers: { 'X-Telegram-Init-Data': id }
    });
    if (!res.ok) return null;
    const body = await res.json();
    const name = body?.name || null;
    if (name) _placeNameCache.set(key, name);
    return name;
  } catch {
    return null;
  }
}

export default function Header({ loc, locDenied, onLoc, debugOn, onToggleDebug }) {
  const [busy, setBusy] = useState(false);
  const [placeName, setPlaceName] = useState('');

  // v0.34.2: when location is set, reverse-geocode to a human place name
  // (e.g. "Telok Blangah" instead of "1.2722, 103.8112"). Falls back to
  // coords if the geocode call fails.
  useEffect(() => {
    if (!loc) { setPlaceName(''); return; }
    let cancelled = false;
    fetchPlaceName(loc.lat, loc.lng).then((name) => {
      if (!cancelled && name) setPlaceName(name);
    });
    return () => { cancelled = true; };
  }, [loc?.lat, loc?.lng]);

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
    <div className="px-3 py-2 border-b border-tg-border">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-2">
          {/* v0.34.2: soleat brand mark inline. SVG asset bundled in /app/cuisine/. */}
          <img src="/app/cuisine/soleat-logo.svg" alt="soleat" width="28" height="28" className="flex-shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight leading-tight truncate">soleat — Cuisine and Drinks</h1>
            <p className="text-[10px] text-tg-hint font-mono leading-tight">v{BUILD_VERSION}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onToggleDebug}
            className={
              'text-xs px-2.5 py-1.5 rounded-full border transition ' +
              (debugOn
                ? 'bg-tg-accent text-tg-accent-text border-tg-accent'
                : 'bg-tg-card text-tg-text border-tg-border')
            }
            title="Toggle Diagnostics panel"
          >
            🔧 {debugOn ? 'ON' : 'Debug'}
          </button>
          <button
            onClick={detect}
            disabled={busy}
            className="text-xs px-3 py-1.5 rounded-full bg-tg-accent text-tg-accent-text disabled:opacity-50"
          >
            {busy ? '…' : loc ? '📍 Re-detect' : '📍 Detect'}
          </button>
        </div>
      </div>
      {/* v0.34.2: location strip */}
      {loc && (
        <p className="text-[11px] text-tg-text mt-1 truncate">
          📍 <span className="font-medium">{placeName || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`}</span>
          {placeName && <span className="text-tg-hint font-mono"> · {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}</span>}
        </p>
      )}
      {!loc && locDenied && (
        <div className="mt-2 p-2 rounded-md bg-tg-card border border-red-400/40">
          <p className="text-xs text-tg-text leading-snug">
            <span className="text-red-500 font-semibold">📍 Location required</span> — Gia needs your spot to find nearby food. Tap the button below to enable location, OR use the 📍 Detect button up top.
          </p>
          <button
            onClick={detect}
            disabled={busy}
            className="mt-2 w-full text-sm px-3 py-2 rounded-md bg-tg-accent text-tg-accent-text disabled:opacity-50"
          >
            {busy ? 'Asking…' : '📍 Enable location'}
          </button>
        </div>
      )}
      {!loc && !locDenied && (
        <p className="text-[11px] text-tg-hint mt-1 truncate">📍 (detecting your location…)</p>
      )}
    </div>
  );
}
