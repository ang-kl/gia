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
  return (
    <div className="flex flex-wrap gap-1 items-center px-1">
      {LAYERS.map((l) => (
        <React.Fragment key={l.key}>
          <Chip active={!!layers[l.key]} onClick={() => toggle(l.key)}
            ariaLabel={`${t(l.i18n, lang)} ${layers[l.key] ? '(on)' : '(off)'}`}>
            <span className="mr-0.5">{l.icon}</span>{t(l.i18n, lang)}
          </Chip>
          {l.key === 'attractions' && layers.attractions && onAttractionsModeChange && (
            <Chip active={attractionsMode === 'all'}
              onClick={() => onAttractionsModeChange(attractionsMode === 'all' ? 'nearby' : 'all')}
              ariaLabel={`${t('layer.attractions', lang)} — ${t(attractionsMode === 'all' ? 'layer.all' : 'layer.nearby', lang)}`}>
              {t(attractionsMode === 'all' ? 'layer.all' : 'layer.nearby', lang)} ▾
            </Chip>
          )}
        </React.Fragment>
      ))}
      {showTrain && (
        <Chip active={!!layers.train} onClick={() => toggle('train')}
          ariaLabel={`${t('layer.train', lang)} ${layers.train ? '(on)' : '(off)'}`}>
          <span className="mr-0.5">🚇</span>{t('layer.train', lang)}
        </Chip>
      )}
    </div>
  );
}
