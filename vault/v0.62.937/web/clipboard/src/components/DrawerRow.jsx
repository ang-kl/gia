// DrawerRow — one drawer inside a CabinetView. v0.62.434 (item 9):
// collapsed row = emoji-circle · title · "{timing} · {dayTag} · 📍 loc" subline ·
// count pill · ✏️ Edit · chevron. Tapping ✏️ Edit focuses the title (dayTag) input
// and reveals ⧉ Duplicate / 🗑 Delete / ✓ Save (top-right). Opens by default when
// it holds cards (so filed cards are visible — 9c). Expanded = the cards + reorder.

import React, { useState } from 'react';
import VenueCard from './VenueCard.jsx';
import { SEGMENT_BY_KEY, GROUP_CLASS } from '../lib/segments.js';
import { t } from '../lib/i18n.js';

export default function DrawerRow({ drawer, n, totalDrawers, cabinetId, lang, onTapCard, onDelete, onMove, onDuplicate, onUnplace, onUpdate }) {
  const seg = SEGMENT_BY_KEY[drawer.segment] || SEGMENT_BY_KEY.wholeDay;
  const cards = drawer.cards || [];
  const [open, setOpen] = useState(cards.length > 0);  // 9c — show filed cards
  const [editing, setEditing] = useState(false);
  const [dayTag, setDayTag] = useState(drawer.dayTag || '');
  const [description, setDescription] = useState(drawer.description || '');  // item 12b
  const cls = GROUP_CLASS[seg.group] || '';
  const canMoveUp = n > 0;
  const canMoveDown = totalDrawers != null && n < totalDrawers - 1;
  const loc = drawer.location?.label;
  const sub = [seg.timeEN, drawer.dayTag, loc ? `📍 ${loc}` : ''].filter(Boolean).join(' · ');
  const move = (delta) => { if (onMove && ((delta < 0 && canMoveUp) || (delta > 0 && canMoveDown))) onMove(n, n + delta); };
  const save = () => { onUpdate?.(n, { dayTag: dayTag.trim(), description: description.trim() }); setEditing(false); };

  return (
    <div className={`bg-tg-card border border-tg-border rounded-xl mb-1.5 ${cls}`} data-clipboard-drop={`drawer:${cabinetId}:${n}`}>
      <div className="w-full flex items-center gap-2.5 px-2.5 py-2.5">
        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-sk-head flex items-center justify-center text-base leading-none" aria-hidden>{seg.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-tg-text truncate">{t(`seg.${seg.key}`, lang)}</div>
          {editing ? (
            <>
              <input
                autoFocus value={dayTag} onChange={(e) => setDayTag(e.target.value.slice(0, 24))} maxLength={24}
                placeholder={t('drawer.field.dayTag', lang)}
                aria-label={t('drawer.field.dayTag', lang)}
                className="mt-0.5 w-full text-[16px] bg-tg-bg border border-tg-border rounded px-1.5 py-0.5 text-tg-text"
              />
              {/* item 12b — drawer description (120) */}
              <input
                value={description} onChange={(e) => setDescription(e.target.value.slice(0, 120))} maxLength={120}
                placeholder={t('drawer.field.description', lang)}
                aria-label={t('drawer.field.description', lang)}
                className="mt-1 w-full text-[16px] bg-tg-bg border border-tg-border rounded px-1.5 py-0.5 text-tg-text"
              />
            </>
          ) : (
            <>
              {sub ? <button onClick={() => setOpen((v) => !v)} className="block text-[10px] text-tg-hint truncate text-left">{sub}</button> : null}
              {drawer.description ? <div className="text-[9.5px] text-tg-hint/90 italic truncate">{drawer.description}</div> : null}
            </>
          )}
        </div>
        <span className="flex-shrink-0 text-[10px] font-bold bg-sk-soft text-tg-accent rounded-full px-2 py-0.5">{cards.length}</span>
        {/* item 9/9b — top-right: ✏️ Edit, then ⧉ / 🗑 / ✓ when editing */}
        {editing ? (
          <div className="flex-shrink-0 flex items-center gap-2 text-[12px]">
            {onDuplicate && <button className="gia-hit-y" onClick={() => { onDuplicate(n); setEditing(false); }} aria-label={t('chrome.duplicate', lang)}>⧉</button>}
            <button onClick={() => { setEditing(false); onDelete?.(); }} className="gia-hit-y text-sk-pin" aria-label={t('chrome.delete', lang)}>🗑</button>
            <button onClick={save} className="gia-hit-y text-tg-accent font-semibold" aria-label={t('chrome.save', lang)}>✓</button>
            <button onClick={() => { setDayTag(drawer.dayTag || ''); setEditing(false); }} className="gia-hit-y text-tg-hint" aria-label={t('chrome.cancel', lang)}>✕</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="flex-shrink-0 text-[11px] font-semibold text-tg-accent">{t('chrome.edit', lang)}</button>
        )}
        <button onClick={() => setOpen((v) => !v)} className="flex-shrink-0 text-tg-hint text-xs" aria-expanded={open} aria-label={t('a11y.expand', lang)}>{open ? '⌄' : '›'}</button>
      </div>
      {open && (
        <div className="px-2.5 pb-2.5 space-y-1.5">
          {cards.length === 0 ? (
            <div className="text-[10px] text-tg-hint italic text-center py-2">{t('drawer.empty', lang)}</div>
          ) : (
            cards.map((c) => (
              <VenueCard key={c.cardId} card={c} lang={lang} context="drawer" onTap={() => onTapCard?.(c)} onRemove={() => onUnplace?.(c.cardId, n)} />
            ))
          )}
          {/* reorder only (Duplicate/Delete now live in the Edit header) */}
          <div className="flex items-center gap-3 pt-1 text-[10px] text-tg-hint">
            <button onClick={() => move(-1)} disabled={!canMoveUp} className={canMoveUp ? 'hover:text-tg-text' : 'opacity-30'} aria-label="Move up">↑</button>
            <button onClick={() => move(1)} disabled={!canMoveDown} className={canMoveDown ? 'hover:text-tg-text' : 'opacity-30'} aria-label="Move down">↓</button>
          </div>
        </div>
      )}
    </div>
  );
}
