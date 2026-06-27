// CatchAllStrip — horizontal scroll of catch-all cards on the Root view.

import React from 'react';
import VenueCard from './VenueCard.jsx';
import { t } from '../lib/i18n.js';

export default function CatchAllStrip({ cards, lang, onTapCard, dragHandle, draggingCardId }) {
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
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {cards.map((c) => (
            <div key={c.cardId} className="w-[200px] shrink-0">
              <VenueCard
                card={c}
                onTap={() => onTapCard?.(c)}
                dragProps={dragHandle({ cardId: c.cardId, label: c.name || c.preview || '📋' })}
                dimmed={draggingCardId === c.cardId}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
