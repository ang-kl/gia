// DrawerRow — one drawer inside a CabinetView. Collapsible. Acts as a
// drop target for cards dragged from elsewhere.

import React, { useState } from 'react';
import VenueCard from './VenueCard.jsx';
import { SEGMENT_BY_KEY, GROUP_CLASS } from '../lib/segments.js';
import { t } from '../lib/i18n.js';

export default function DrawerRow({ drawer, n, cabinetId, lang, onTapCard, onDelete }) {
  const seg = SEGMENT_BY_KEY[drawer.segment] || SEGMENT_BY_KEY.wholeDay;
  const [open, setOpen] = useState(true);
  const cls = GROUP_CLASS[seg.group] || '';
  return (
    <div
      className={`bg-tg-card border border-tg-border rounded-xl mb-1.5 ${cls}`}
      data-clipboard-drop={`drawer:${cabinetId}:${n}`}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 text-left"
      >
        <span className="text-base leading-none">{seg.emoji}</span>
        <span className="text-[12px] font-semibold">{t(`seg.${seg.key}`, lang)}</span>
        {drawer.dayTag && (
          <span className="text-[10px] text-tg-hint">· {drawer.dayTag}</span>
        )}
        <span className="text-[10px] text-tg-hint">· {seg.timeEN}</span>
        {drawer.location?.label && (
          <span className="text-[10px] text-tg-hint truncate">· 📍 {drawer.location.label}</span>
        )}
        <span className="ml-auto text-[10px] font-bold bg-white/5 border border-tg-border rounded-full px-2 py-0.5">
          {(drawer.cards || []).length}
        </span>
        <span className="text-tg-hint text-xs">{open ? '⌄' : '›'}</span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {(drawer.cards || []).length === 0 ? (
            <div className="text-[10px] text-tg-hint italic text-center py-2">
              {t('drawer.empty', lang)}
            </div>
          ) : (
            (drawer.cards || []).map((c) => (
              <VenueCard key={c.cardId} card={c} onTap={() => onTapCard?.(c)} />
            ))
          )}
          <button
            onClick={onDelete}
            className="w-full text-[10px] text-tg-hint hover:text-tg-text py-1"
          >
            🗑 {t('chrome.delete', lang)} drawer
          </button>
        </div>
      )}
    </div>
  );
}
