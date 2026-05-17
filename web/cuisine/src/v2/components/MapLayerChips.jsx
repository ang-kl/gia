import React from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.61.0 — map overlay layer toggles (parks / tourist attractions /
// taxi stops). A thin chip strip below the map; all layers off by
// default. Toggling drives MapPanel's overlay controller — these are
// map-view toggles only, never part of the search query.
const LAYERS = [
  { key: 'parks',       i18n: 'layer.parks',       icon: '🌳' },
  { key: 'attractions', i18n: 'layer.attractions', icon: '🎡' },
  { key: 'taxis',       i18n: 'layer.taxis',       icon: '🚕' }
];

function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      className={`px-2 py-1 rounded-full border text-xs whitespace-nowrap transition-colors ${active ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
      {children}
    </button>
  );
}

export default function MapLayerChips({ layers, onChange }) {
  const [lang] = useLocale();
  function toggle(key) { onChange({ ...layers, [key]: !layers[key] }); }
  return (
    <div className="flex flex-wrap gap-1 items-center px-0.5">
      {LAYERS.map((l) => (
        <Chip key={l.key} active={!!layers[l.key]} onClick={() => toggle(l.key)}
          ariaLabel={`${tr(l.i18n, lang)} ${layers[l.key] ? '(on)' : '(off)'}`}>
          <span className="mr-0.5">{l.icon}</span>{tr(l.i18n, lang)}
        </Chip>
      ))}
    </div>
  );
}
