import React from 'react';
import Tile from './components/Tile.jsx';
import { sendData } from './tg.js';

// Tile inventory mirrors the v0.25.1 menu.html layout exactly:
//   🍴 Cuisine + 🎲 Surprise lead. /eat is hidden from menu (still
//   wired internally) per v0.25.1.
const TILES = [
  { id: 'cuisine',   icon: '🍴', label: 'Cuisine',   sub: 'Sliders, 70 cuisines, queue tolerance', kind: 'navigate', path: '/app/cuisine' },
  { id: 'surprise',  icon: '🎲', label: 'Surprise',  sub: 'One hidden gem 1.5–3 km away',          kind: 'sendData' },
  { id: 'drink',     icon: '🥤', label: 'Drink',     sub: 'Bars, coffee, tea, juice',              kind: 'sendData' },
  { id: 'grocery',   icon: '🛒', label: 'Grocery',   sub: 'Supermarkets & fresh markets',          kind: 'sendData' },
  { id: 'weather',   icon: '☀️', label: 'Weather',   sub: 'Now + 2-hour forecast',                 kind: 'sendData' },
  { id: 'transport', icon: '🚉', label: 'Transport', sub: 'MRT pulse',                             kind: 'sendData' },
  { id: 'carpark',   icon: '🅿️', label: 'Carpark',   sub: 'Nearest 5 with available lots',         kind: 'sendData' },
  { id: 'map',       icon: '📍', label: 'Map',       sub: 'Live sanctuary map',                    kind: 'navigate', path: '/app/map' }
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
    <div className="min-h-screen flex flex-col">
      <div className="px-3 pt-3 pb-2">
        <h1 className="text-base font-semibold">🌿 soleat Menu</h1>
        <p className="text-[11px] text-tg-hint">solo-diner sanctuary in the CBD</p>
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
