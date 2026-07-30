// LocationSheet.jsx — v0.62.436 (item 8)
//
// 📍 "All locations": a bottom-sheet listing the user's saved-card eatery
// locations grouped by COUNTRY › CITY (derived from each card's venue area /
// region). "12-nearby"-style: each city is a row with a count + a "+" that
// expands to the eatery names; tapping a city filters the Clipboard to it.
// Auto-closes after 1 minute of inactivity (operator spec).

import React, { useState, useEffect } from 'react';
import { useDialog } from '../../../_shared/lib/use-dialog.js';
import { t } from '../lib/i18n.js';

export default function LocationSheet({ groups, active = null, onPick, onClose, lang = 'en' }) {
  const [expanded, setExpanded] = useState(null); // `${country}::${city}`
  const panelRef = useDialog({ open: true, onClose });

  // Auto-close after 60s.
  useEffect(() => {
    const id = setTimeout(() => onClose?.(), 60000);
    return () => clearTimeout(id);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-labelledby="location-sheet-title">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-h-[70vh] overflow-y-auto bg-tg-card rounded-t-2xl border-t border-tg-border p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 id="location-sheet-title" className="text-sm font-bold text-tg-text">📍 {t('loc.title', lang)}</h2>
          <button type="button" onClick={onClose} className="text-tg-hint text-xs">{t('chrome.close', lang)}</button>
        </div>

        <button
          type="button"
          onClick={() => onPick(null)}
          className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm mb-1 ${active == null ? 'bg-tg-accent text-tg-accent-text' : 'text-tg-text'}`}
        >
          <span>{t('loc.all', lang)}</span>
          {active == null && <span aria-hidden>✓</span>}
        </button>

        {groups.length === 0 && <div className="px-3 py-4 text-center text-xs text-tg-hint">{t('loc.none', lang)}</div>}

        {groups.map((g) => (
          <div key={g.country} className="mt-2">
            <div className="text-[11px] font-bold uppercase tracking-wide text-tg-hint px-1 mb-0.5">{g.country}</div>
            {g.cities.map((c) => {
              const key = `${g.country}::${c.city}`;
              const isOpen = expanded === key;
              return (
                <div key={key} className="border-b border-tg-border last:border-0">
                  <div className="flex items-center gap-2 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onPick(c.city)}
                      className={`flex-1 text-left text-sm ${active === c.city ? 'text-tg-accent font-semibold' : 'text-tg-text'}`}
                    >{c.city}</button>
                    <span className="text-[10px] text-tg-hint">{c.items.length}</span>
                    <button type="button" onClick={() => setExpanded(isOpen ? null : key)} className="text-tg-accent text-sm w-5 text-center" aria-expanded={isOpen} aria-label={t('a11y.expand', lang)}>{isOpen ? '–' : '+'}</button>
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-2 space-y-0.5">
                      {c.items.map((name, i) => <div key={i} className="text-[11px] text-tg-hint truncate">· {name}</div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
