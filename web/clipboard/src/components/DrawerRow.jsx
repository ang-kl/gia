// DrawerRow — one drawer inside a CabinetView. Collapsible. Acts as a
// drop target for cards dragged from elsewhere.
//
// v0.62.331 (PR #4) — added explicit ▲ ▼ reorder arrows that fire
// onMove(±1). Long-press drag of the whole drawer is deferred — arrows
// cover the common "move up one slot" intent and don't fight the
// existing card-drag long-press recogniser inside the drawer body.

import React, { useState } from 'react';
import VenueCard from './VenueCard.jsx';
import { SEGMENT_BY_KEY, GROUP_CLASS } from '../lib/segments.js';
import { t } from '../lib/i18n.js';

export default function DrawerRow({ drawer, n, totalDrawers, cabinetId, lang, onTapCard, onDelete, onMove, onDuplicate, onUnplace }) {
  const seg = SEGMENT_BY_KEY[drawer.segment] || SEGMENT_BY_KEY.wholeDay;
  const [open, setOpen] = useState(true);
  const cls = GROUP_CLASS[seg.group] || '';
  const canMoveUp = n > 0;
  const canMoveDown = totalDrawers != null && n < totalDrawers - 1;

  function handleArrow(delta, e) {
    e.stopPropagation();
    if (!onMove) return;
    if (delta < 0 && !canMoveUp) return;
    if (delta > 0 && !canMoveDown) return;
    onMove(n, n + delta);
  }

  return (
    <div
      className={`bg-tg-card border border-tg-border rounded-xl mb-1.5 ${cls}`}
      data-clipboard-drop={`drawer:${cabinetId}:${n}`}
    >
      <div className="w-full flex items-center gap-2 px-2.5 py-2">
        {/* Reorder arrows — explicit, accessible. Stacked compact to the left of the segment emoji. */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            onClick={(e) => handleArrow(-1, e)}
            disabled={!canMoveUp}
            className={`text-[9px] leading-none w-5 h-3 flex items-center justify-center rounded ${canMoveUp ? 'text-tg-hint hover:text-tg-text' : 'text-tg-border'}`}
            aria-label="Move up"
          >▲</button>
          <button
            type="button"
            onClick={(e) => handleArrow(+1, e)}
            disabled={!canMoveDown}
            className={`text-[9px] leading-none w-5 h-3 flex items-center justify-center rounded ${canMoveDown ? 'text-tg-hint hover:text-tg-text' : 'text-tg-border'}`}
            aria-label="Move down"
          >▼</button>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
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
      </div>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {(drawer.cards || []).length === 0 ? (
            <div className="text-[10px] text-tg-hint italic text-center py-2">
              {t('drawer.empty', lang)}
            </div>
          ) : (
            (drawer.cards || []).map((c) => (
              <VenueCard
                key={c.cardId}
                card={c}
                context="drawer"
                onTap={() => onTapCard?.(c)}
                onRemove={() => onUnplace?.(c.cardId, n)}
              />
            ))
          )}
          {/* v0.62.421 — drawer edit pills: Duplicate · Delete */}
          <div className="flex items-center justify-end gap-3 pt-1">
            {onDuplicate && (
              <button onClick={() => onDuplicate(n)} className="text-[10px] text-tg-hint hover:text-tg-text py-1">{t('chrome.duplicate', lang)}</button>
            )}
            <button onClick={onDelete} className="text-[10px] text-tg-hint hover:text-tg-text py-1">🗑 {t('chrome.delete', lang)}</button>
          </div>
        </div>
      )}
    </div>
  );
}
