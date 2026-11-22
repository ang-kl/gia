// CabinetCard — v0.62.428 (sample parity): a full-width list row.
// 🗄️ tile · name + ★DEFAULT / OPEN badges · "N drawers · M eateries" ·
// "touched … · 1-year TTL" · chevron. Doubles as a drop target (a dragged
// catch-all card lands in the cabinet's FIRST drawer).

import React from 'react';
import { t } from '../lib/i18n.js';

function touchedAgo(modifiedAt, lang) {
  if (!modifiedAt) return '';
  const days = Math.floor((Date.now() - Number(modifiedAt)) / 86400000);
  if (days <= 0) return t('cab.touchedNow', lang);
  if (days < 7) return t('cab.touchedDays', lang, { n: days });
  return t('cab.touchedWeeks', lang, { n: Math.floor(days / 7) });
}

export default function CabinetCard({ cabinet, onOpen, lang = 'en', isDefault = false, isOpen = false }) {
  return (
    <button
      onClick={onOpen}
      data-clipboard-drop={`cabinet:${cabinet.cabId}`}
      className="flex items-center gap-3 w-full text-left bg-tg-card border border-tg-border rounded-xl p-3 mb-2 active:scale-[0.99]"
    >
      <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-sk-head flex items-center justify-center text-xl" aria-hidden>{cabinet.emoji || '🗄️'}</span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[14px] font-bold text-tg-text truncate">{cabinet.name}</span>
          {isDefault && <span className="text-[9px] font-bold text-sk-star bg-sk-star/15 rounded px-1.5 py-0.5">★ {t('cab.default', lang)}</span>}
          {isOpen && <span className="text-[9px] font-bold text-sk-open bg-sk-open/15 rounded px-1.5 py-0.5">{t('cab.open', lang)}</span>}
        </span>
        <span className="block text-[11px] text-tg-hint mt-0.5">
          {t('cab.counts', lang, { d: cabinet.drawerCount ?? 0, e: cabinet.eateryCount ?? 0 })}
        </span>
        <span className="block text-[10px] text-tg-hint">
          {[touchedAgo(cabinet.modifiedAt, lang), t('cab.ttl', lang)].filter(Boolean).join(' · ')}
        </span>
      </span>
      <span className="flex-shrink-0 text-tg-hint" aria-hidden>›</span>
    </button>
  );
}
