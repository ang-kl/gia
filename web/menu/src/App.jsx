import React from 'react';
import Tile from './components/Tile.jsx';
import { sendData } from './tg.js';

// v0.60.48 — Menu TMA promoted to the chat menu button. Tile order
// fixed by Human Lead 2026-05-09: Set Location first (every other
// feature is anchor-dependent), then the picker TMAs, transport
// trio, recognised list, weather. Two tiles navigate inside the
// webview (/app/cuisine, /app/hawker); the rest dispatch via
// sendData → routeMenuCommand on the server.
const TILES = [
  { id: 'location',   icon: '📍', label: 'Set Location',                  sub: 'Anchor your searches',          kind: 'sendData' },
  { id: 'cuisine',    icon: '🍛', label: 'Cuisine Picker',                sub: 'Find places to eat',            kind: 'navigate', path: '/app/cuisine' },
  { id: 'hawker',     icon: '🥢', label: 'Hawker Centre Directory',       sub: 'Browse by region',              kind: 'navigate', path: '/app/hawker' },
  { id: 'incidents',  icon: '🚧', label: "Today's Traffic Incidents",     sub: 'Live LTA road status',          kind: 'sendData' },
  { id: 'train',      icon: '🚆', label: 'Train Status',                  sub: 'MRT pulse & nearest stations',  kind: 'sendData' },
  { id: 'drive',      icon: '🚦', label: 'Drive Route & Nearby Car Park', sub: 'Route + carpark availability',  kind: 'sendData' },
  { id: 'recognised', icon: '✳️', label: 'Recognised List',               sub: 'Curated venues',                kind: 'sendData' },
  { id: 'weather',    icon: '🌇', label: 'Weather',                       sub: 'Now + 2-hour forecast',         kind: 'sendData' }
];

export default function App() {
  const handle = (tile) => {
    if (tile.kind === 'navigate') {
      window.location.href = tile.path + (window.location.search || '');
      return;
    }
    sendData({ cmd: tile.id });
  };

  return (
    <div
      className="flex flex-col"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        {/* v0.37.0: soleat brand mark inline. Copied from web/cuisine/public/. */}
        <img src="/app/menu/soleat-icon.png" alt="soleat" width="28" height="28" className="rounded-full flex-shrink-0" />
        <div className="min-w-0">
          <h1 className="text-base font-semibold">Gia Menu</h1>
          <p className="text-[11px] text-tg-hint">Pick a feature</p>
        </div>
      </div>
      <div className="flex-1 px-3 pb-4 grid grid-cols-2 gap-2 content-start">
        {TILES.map((t) => (
          <Tile key={t.id} icon={t.icon} label={t.label} sub={t.sub} onClick={() => handle(t)} />
        ))}
      </div>
      <div className="text-center text-[10px] text-tg-hint pb-3">
        soleat · powered by Gia
      </div>
    </div>
  );
}
