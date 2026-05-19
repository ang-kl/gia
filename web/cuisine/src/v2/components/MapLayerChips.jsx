import React from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.61.0–v0.64.0 — map overlay layer toggles. A thin chip strip above
// the map; all layers off by default except Train (Cuisine/Hawker).
// Toggling drives MapPanel's overlay controller — map-view toggles only,
// never part of the search query.
// v0.61.26 — Taxis sits beside Exits; the Nearby↔Details slider was
// removed (the chip layers share one fixed radius).
const LAYERS = [
  { key: 'parks',       i18n: 'layer.parks',       icon: '🌳' },
  { key: 'attractions', i18n: 'layer.attractions', icon: '🎡' },
  { key: 'carpark',     i18n: 'layer.carpark',     icon: '🅿' },
  { key: 'exits',       i18n: 'layer.exits',       icon: '🚆' },
  { key: 'taxis',       i18n: 'layer.taxis',       icon: '🚕' },
  { key: 'clinics',     i18n: 'layer.clinics',     icon: '✚' },
  { key: 'police',      i18n: 'layer.police',      icon: '👮' }
];

function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      className={`px-2 py-1 rounded-full border text-xs whitespace-nowrap transition-colors ${active ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
      {children}
    </button>
  );
}

export default function MapLayerChips({ layers, onChange, showTrain = false }) {
  const [lang] = useLocale();
  function toggle(key) { onChange({ ...layers, [key]: !layers[key] }); }
  return (
    <div className="px-0.5">
      <div className="flex flex-wrap gap-1 items-center">
        {LAYERS.map((l) => (
          <Chip key={l.key} active={!!layers[l.key]} onClick={() => toggle(l.key)}
            ariaLabel={`${tr(l.i18n, lang)} ${layers[l.key] ? '(on)' : '(off)'}`}>
            <span className="mr-0.5">{l.icon}</span>{tr(l.i18n, lang)}
          </Chip>
        ))}
        {showTrain && (
          <Chip active={!!layers.train} onClick={() => toggle('train')}
            ariaLabel={`${tr('layer.train', lang)} ${layers.train ? '(on)' : '(off)'}`}>
            <span className="mr-0.5">🚇</span>{tr('layer.train', lang)}
          </Chip>
        )}
      </div>
    </div>
  );
}
