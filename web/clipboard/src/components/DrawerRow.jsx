// DrawerRow — one drawer inside a CabinetView. v0.62.427 (sample parity):
// collapsed row = emoji-circle · label · "{dayTag} · 📍 {location}" subline ·
// count pill · Edit · chevron (no time-range, no inline arrows). Expanded =
// the drawer's cards + an edit footer (reorder ↑↓ · Duplicate · Delete).

import React, { useState } from 'react';
import VenueCard from './VenueCard.jsx';
import { SEGMENT_BY_KEY, GROUP_CLASS } from '../lib/segments.js';
import { t } from '../lib/i18n.js';

export default function DrawerRow({ drawer, n, totalDrawers, cabinetId, lang, onTapCard, onDelete, onMove, onDuplicate, onUnplace }) {
  const seg = SEGMENT_BY_KEY[drawer.segment] || SEGMENT_BY_KEY.wholeDay;
  const [open, setOpen] = useState(false);
  const cls = GROUP_CLASS[seg.group] || '';
  const canMoveUp = n > 0;
  const canMoveDown = totalDrawers != null && n < totalDrawers - 1;
  const loc = drawer.location?.label;
  // v0.62.431 — operator: the drawer description carries its segment TIMING.
  const sub = [seg.timeEN, drawer.dayTag, loc ? `📍 ${loc}` : ''].filter(Boolean).join(' · ');
  const move = (delta) => { if (onMove && ((delta < 0 && canMoveUp) || (delta > 0 && canMoveDown))) onMove(n, n + delta); };

  return (
    <div className={`bg-tg-card border border-tg-border rounded-xl mb-1.5 ${cls}`} data-clipboard-drop={`drawer:${cabinetId}:${n}`}>
      <div className="w-full flex items-center gap-2.5 px-2.5 py-2.5">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sk-head flex items-center justify-center text-base leading-none" aria-hidden>{seg.emoji}</span>
        <button onClick={() => setOpen((v) => !v)} className="flex-1 min-w-0 text-left">
          <div className="text-[12.5px] font-semibold text-tg-text truncate">{t(`seg.${seg.key}`, lang)}</div>
          {sub && <div className="text-[10px] text-tg-hint truncate">{sub}</div>}
        </button>
        <span className="flex-shrink-0 text-[10px] font-bold bg-sk-soft text-tg-accent rounded-full px-2 py-0.5">{(drawer.cards || []).length}</span>
        <button onClick={() => setOpen((v) => !v)} className="flex-shrink-0 text-[11px] font-semibold text-tg-accent">{t('chrome.edit', lang).replace('✎ ', '')}</button>
        <span className="flex-shrink-0 text-tg-hint text-xs">{open ? '⌄' : '›'}</span>
      </div>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {(drawer.cards || []).length === 0 ? (
            <div className="text-[10px] text-tg-hint italic text-center py-2">{t('drawer.empty', lang)}</div>
          ) : (
            (drawer.cards || []).map((c) => (
              <VenueCard key={c.cardId} card={c} lang={lang} context="drawer" onTap={() => onTapCard?.(c)} onRemove={() => onUnplace?.(c.cardId, n)} />
            ))
          )}
          {/* edit footer: reorder · Duplicate · Delete */}
          <div className="flex items-center gap-3 pt-1 text-[10px] text-tg-hint">
            <button onClick={() => move(-1)} disabled={!canMoveUp} className={canMoveUp ? 'hover:text-tg-text' : 'opacity-30'} aria-label="Move up">↑</button>
            <button onClick={() => move(1)} disabled={!canMoveDown} className={canMoveDown ? 'hover:text-tg-text' : 'opacity-30'} aria-label="Move down">↓</button>
            <span className="ml-auto" />
            {onDuplicate && <button onClick={() => onDuplicate(n)} className="hover:text-tg-text">{t('chrome.duplicate', lang)}</button>}
            <button onClick={onDelete} className="hover:text-tg-text">🗑 {t('chrome.delete', lang)}</button>
          </div>
        </div>
      )}
    </div>
  );
}
