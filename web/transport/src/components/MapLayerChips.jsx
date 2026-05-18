import React from 'react';
import { t, useLocale } from '../i18n.js';

// v0.61.0–v0.64.0 — map overlay layer toggles. A thin chip strip above
// the map; all layers off by default except Train (Cuisine/Hawker).
const LAYERS = [
  { key: 'parks',       i18n: 'layer.parks',       icon: '🌳' },
  { key: 'attractions', i18n: 'layer.attractions', icon: '🎡' },
  { key: 'taxis',       i18n: 'layer.taxis',       icon: '🚕' },
  { key: 'carpark',     i18n: 'layer.carpark',     icon: '🅿' },
  { key: 'exits',       i18n: 'layer.exits',       icon: '🚆' }
];

function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      className={`px-2 py-1 rounded-full border text-xs whitespace-nowrap transition-colors ${active ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
      {children}
    </button>
  );
}

export default function MapLayerChips({ layers, onChange, attractionsMode = 'nearby', onAttractionsModeChange, showTrain = false }) {
  const lang = useLocale();
  function toggle(key) { onChange({ ...layers, [key]: !layers[key] }); }
  // v0.61.23 — overlay-radius mode: 'nearby' (550 m) | 'details' (7 km).
  const details = attractionsMode === 'details';
  return (
    <div className="px-1">
      <div className="flex flex-wrap gap-1 items-center">
        {LAYERS.map((l) => (
          <Chip key={l.key} active={!!layers[l.key]} onClick={() => toggle(l.key)}
            ariaLabel={`${t(l.i18n, lang)} ${layers[l.key] ? '(on)' : '(off)'}`}>
            <span className="mr-0.5">{l.icon}</span>{t(l.i18n, lang)}
          </Chip>
        ))}
        {showTrain && (
          <Chip active={!!layers.train} onClick={() => toggle('train')}
            ariaLabel={`${t('layer.train', lang)} ${layers.train ? '(on)' : '(off)'}`}>
            <span className="mr-0.5">🚇</span>{t('layer.train', lang)}
          </Chip>
        )}
      </div>
      {/* v0.61.23 — Nearby↔Details slider: widens every chip overlay
          layer's radius (550 m ↔ 7 km). Replaces the Nearby/All chip. */}
      {onAttractionsModeChange && (
        <div className="flex items-center gap-2 mt-1.5 px-0.5 text-xs">
          <span className={details ? 'text-tg-hint' : 'text-tg-text font-semibold'}>
            {t('layer.nearby', lang)}
          </span>
          <input type="range" min="0" max="1" step="1" value={details ? 1 : 0}
            onChange={(e) => onAttractionsModeChange(e.target.value === '1' ? 'details' : 'nearby')}
            aria-label={`${t('layer.nearby', lang)} / ${t('layer.details', lang)}`}
            className="flex-1 max-w-[140px] accent-tg-accent cursor-pointer" />
          <span className={details ? 'text-tg-text font-semibold' : 'text-tg-hint'}>
            {t('layer.details', lang)}
          </span>
        </div>
      )}
    </div>
  );
}
