// FilterSheet.jsx — v0.62.418
//
// Bottom-sheet for the header filter chips. Filters the user's OWN saved eatery
// cards — it does NOT search for new eateries.
//   • list mode  (cuisine): pick from the cuisines present on the cards.
//   • text mode  (dish):    type a keyword matched against each card's text.
// Picking "All" / clearing the box removes the filter.

import React, { useState } from 'react';
import { t } from '../lib/i18n.js';

export default function FilterSheet({
  title, mode = 'list', options = [], active = null, onPick, onClose, lang = 'en',
}) {
  const [text, setText] = useState(active || '');

  return (
    <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-h-[70vh] overflow-y-auto bg-tg-card rounded-t-2xl border-t border-tg-border p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-tg-text">{title}</h2>
          <button type="button" onClick={onClose} className="text-tg-hint text-xs">{t('chrome.close', lang)}</button>
        </div>

        {mode === 'text' ? (
          <form onSubmit={(e) => { e.preventDefault(); onPick(text.trim() || null); }}>
            <input
              type="text" autoFocus value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('filter.dishPlaceholder', lang)}
              className="w-full bg-tg-bg border border-tg-border rounded-xl px-3 py-2 text-sm text-tg-text"
            />
            <div className="flex gap-2 mt-2">
              <button type="button" onClick={() => onPick(null)} className="flex-1 px-3 py-2 rounded-xl text-sm text-tg-text border border-tg-border">{t('filter.all', lang)}</button>
              <button type="submit" className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-tg-accent text-tg-accent-text">{t('chrome.save', lang)}</button>
            </div>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onPick(null)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm ${active == null ? 'bg-tg-accent text-tg-accent-text' : 'text-tg-text'}`}
            >
              <span>{t('filter.all', lang)}</span>
              {active == null && <span aria-hidden>✓</span>}
            </button>
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => onPick(o.value)}
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-sm ${active === o.value ? 'bg-tg-accent text-tg-accent-text' : 'text-tg-text'}`}
              >
                <span className="truncate capitalize">{o.label}</span>
                <span className="flex-shrink-0 ml-2 text-tg-hint text-xs">{o.count}</span>
              </button>
            ))}
            {options.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-tg-hint">{t('filter.none', lang)}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
