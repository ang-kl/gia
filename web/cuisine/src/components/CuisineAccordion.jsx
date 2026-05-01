import React, { useState } from 'react';
import { CUISINE_CATEGORIES, MAX_CUISINE_SELECTIONS } from '../state/cuisines.js';
import { localizedCuisine, localizedCategory, SUPPORTED_LANGS } from '../state/cuisine-i18n.js';
import { getLanguage } from '../api/tg.js';

export default function CuisineAccordion({ selected, onToggle }) {
  // v0.27.2: localise labels but preserve canonical English in state.
  const tgLang = getLanguage();
  const lang = SUPPORTED_LANGS.includes(tgLang) ? tgLang : 'en';
  const initialOpen = Object.fromEntries(
    CUISINE_CATEGORIES.map((c) => [c.id, !!c.defaultOpen])
  );
  const [open, setOpen] = useState(initialOpen);
  const atCap = selected.length >= MAX_CUISINE_SELECTIONS;

  return (
    <div className="flex flex-col gap-1">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 pb-1">
          {selected.map((c) => (
            <span
              key={c}
              className="text-[11px] px-2 py-0.5 rounded-full bg-tg-accent text-tg-accent-text"
            >
              {localizedCuisine(c, lang)} <button onClick={() => onToggle(c)} className="ml-1 opacity-80">✕</button>
            </span>
          ))}
          <span className="text-[11px] text-tg-hint self-center ml-1">
            {selected.length}/{MAX_CUISINE_SELECTIONS}
          </span>
        </div>
      )}
      {CUISINE_CATEGORIES.map((cat) => {
        const isOpen = open[cat.id];
        return (
          <div key={cat.id} className="border border-tg-border rounded-md overflow-hidden">
            <button
              onClick={() => setOpen((o) => ({ ...o, [cat.id]: !o[cat.id] }))}
              className="w-full flex items-center justify-between px-2.5 py-1.5 bg-tg-card text-xs"
            >
              <span className="font-medium">{localizedCategory(cat.id, lang)}</span>
              <span className="text-tg-hint">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="flex flex-wrap gap-1 p-2 bg-tg-bg">
                {cat.items.map((item) => {
                  const on = selected.includes(item);
                  const disabled = !on && atCap;
                  return (
                    <button
                      key={item}
                      onClick={() => onToggle(item)}
                      disabled={disabled}
                      className={
                        'text-[11px] px-2 py-0.5 rounded-full border transition ' +
                        (on
                          ? 'bg-tg-accent text-tg-accent-text border-tg-accent'
                          : disabled
                            ? 'opacity-40 border-tg-border'
                            : 'bg-tg-card text-tg-text border-tg-border')
                      }
                    >
                      {localizedCuisine(item, lang)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {atCap && (
        <div className="text-[10px] text-tg-hint italic px-1">
          Max {MAX_CUISINE_SELECTIONS} cuisines selected. Remove one to add another.
        </div>
      )}
    </div>
  );
}
