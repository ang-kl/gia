import React, { useState } from 'react';
import { t } from '../lib/i18n.js';

// v0.62.452 — Sketchbook "Pick local classic" panel, mirroring the Cuisine TMA
// ArrivalPlate (geo mode): a 📍{city} header, a 2-col grid of local dishes
// (English name + native local script), and a "More {city} classics ({N})"
// expander. The city is derived from the user's saved cards (App.jsx); dishes
// NOT present in the saved cards are greyed + non-tappable. Tapping a saved dish
// sets the Sketchbook dish filter.
function titleCase(s) {
  return String(s || '').replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function LocalClassicPicker({ plate, savedDishSet, lang, dishSel = null, onPick }) {
  const [showMore, setShowMore] = useState(false);
  if (!plate || !Array.isArray(plate.dishes)) return null;
  const isSaved = (name) => savedDishSet && savedDishSet.has(String(name || '').toLowerCase());

  const DishBtn = ({ name, local }) => {
    const saved = isSaved(name);
    const active = dishSel && String(dishSel).toLowerCase() === String(name).toLowerCase();
    return (
      <button type="button" disabled={!saved} aria-disabled={!saved || undefined}
        onClick={() => { if (saved) onPick?.(String(name).toLowerCase()); }}
        title={!saved ? (lang === 'fr' ? 'Aucune carte enregistrée' : 'Not in your saved cards') : undefined}
        className={`flex flex-col items-start text-left py-2 px-1 min-h-[44px] border-b border-tg-border/30 ${active ? 'text-tg-accent-text bg-tg-accent rounded-lg px-2' : saved ? 'text-tg-text' : 'opacity-40 cursor-not-allowed text-tg-hint'}`}>
        <span className="text-[12px] font-medium leading-tight">{titleCase(name)}</span>
        {local && local !== name && <span className="text-[11px] text-tg-hint leading-tight">{local}</span>}
      </button>
    );
  };

  const classics = Array.isArray(plate.classics) ? plate.classics : [];
  return (
    <div>
      <div className="text-[11px] text-tg-text mb-1 px-0.5">
        📍 <b>{plate.city}</b> · {t('classic.tapHint', lang)}
      </div>
      <div className="grid grid-cols-2 gap-x-3 border-t border-tg-border/40">
        {plate.dishes.map((d) => (
          <DishBtn key={d.dish} name={d.dish} local={d.local} />
        ))}
      </div>

      {classics.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowMore((v) => !v)}
            className="text-[11px] text-tg-accent-text font-medium px-0.5">
            {showMore ? '▴' : '▸'} {t('classic.more', lang, { city: plate.city, n: classics.length })}
          </button>
          {showMore && (
            <div className="grid grid-cols-2 gap-x-3 mt-1">
              {classics.map((name, i) => (
                <DishBtn key={`${name}-${i}`} name={name} local={null} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
