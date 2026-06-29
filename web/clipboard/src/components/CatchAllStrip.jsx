// CatchAllStrip — horizontal scroll of catch-all cards on the Root view.

import React from 'react';
import VenueCard from './VenueCard.jsx';
import { t } from '../lib/i18n.js';

export default function CatchAllStrip({ cards, lang, onTapCard, onFileCard, dragHandle, draggingCardId }) {
  // v0.62.432 — item 3: flag cards whose venue appears more than once in the
  // Clipboard (same placeId, else same name).
  const dupKey = (c) => (c.venue && c.venue.placeId) || (c.venue && c.venue.name) || c.name || c.preview || '';
  const dupCounts = {};
  for (const c of cards) { const k = dupKey(c); if (k) dupCounts[k] = (dupCounts[k] || 0) + 1; }
  return (
    <section>
      <div className="flex items-end gap-2 mb-1.5 px-1">
        <h2 className="text-[12px] font-semibold">📥 {t('root.catchAll', lang)}</h2>
        <span className="text-[10px] font-bold bg-tg-accent/20 border border-tg-accent/40 text-tg-accent rounded-full px-2 py-0.5">
          {cards.length}
        </span>
        <span className="ml-auto text-[10px] text-tg-hint">{t('root.catchAllHint', lang)}</span>
      </div>
      {cards.length === 0 ? (
        <div className="text-[11px] text-tg-hint italic bg-tg-card border border-tg-border rounded-xl p-3 text-center">
          {t('root.catchAllEmpty', lang)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cards.map((c, i) => (
            <VenueCard
              key={c.cardId}
              card={c}
              number={i + 1}
              lang={lang}
              isDuplicate={(dupCounts[dupKey(c)] || 0) > 1}
              context="clipboard"
              onTap={() => onTapCard?.(c)}
              onFile={() => onFileCard?.(c)}
              dragProps={dragHandle({ cardId: c.cardId, label: c.name || c.preview || '📋' })}
              dimmed={draggingCardId === c.cardId}
            />
          ))}
        </div>
      )}
    </section>
  );
}
