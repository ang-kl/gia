// CatchAllStrip — the Clipboard catch-all list. v0.62.433: a header row (count ·
// sort · ✍️ Edit → Clear-all / Restore) sits under the chips (items 7, 11, +
// archive); cards sort by title / country / city / cuisine / date-of-copy.

import React, { useState, useMemo } from 'react';
import VenueCard from './VenueCard.jsx';
import { t } from '../lib/i18n.js';

const SORTS = ['title', 'country', 'city', 'cuisine', 'date'];

function cityOf(c) {
  // Best-effort: 2nd-last comma segment of the address (no structured city).
  const area = (c.venue && c.venue.area) || '';
  const parts = area.split(',').map((s) => s.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : '';
}
function countryOf(c) { return (c.region === 'JB' ? 'Malaysia' : 'Singapore'); }
function titleOf(c) { return (c.name || (c.venue && c.venue.name) || c.preview || '').toLowerCase(); }
function cuisineOf(c) { return (Array.isArray(c.cuisines) && c.cuisines[0]) || ''; }

export default function CatchAllStrip({
  cards, lang, onTapCard, onFileCard, dragHandle, draggingCardId,
  archivedCount = 0, onArchiveAll, onRestore,
}) {
  const [sortKey, setSortKey] = useState('date');
  const [asc, setAsc] = useState(false);
  const [editing, setEditing] = useState(false);

  // item 3 — duplicate flagging
  const dupKey = (c) => (c.venue && c.venue.placeId) || (c.venue && c.venue.name) || c.name || c.preview || '';
  const dupCounts = {};
  for (const c of cards) { const k = dupKey(c); if (k) dupCounts[k] = (dupCounts[k] || 0) + 1; }

  const sorted = useMemo(() => {
    const arr = [...cards];
    const cmp = {
      title:   (a, b) => titleOf(a).localeCompare(titleOf(b)),
      country: (a, b) => countryOf(a).localeCompare(countryOf(b)),
      city:    (a, b) => cityOf(a).localeCompare(cityOf(b)),
      cuisine: (a, b) => cuisineOf(a).localeCompare(cuisineOf(b)),
      date:    (a, b) => (a.ts || 0) - (b.ts || 0),
    }[sortKey] || (() => 0);
    arr.sort(cmp);
    if (!asc) arr.reverse();
    return arr;
  }, [cards, sortKey, asc]);

  return (
    <section>
      {/* header row — count · sort · ✍️ Edit (under the chips) */}
      <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
        <h2 className="text-[13px] font-extrabold">{t('root.catchAll', lang)}</h2>
        <span className="text-[10px] font-bold bg-sk-soft text-tg-accent rounded-full px-2 py-0.5">{cards.length}</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[9px] text-tg-hint">{t('sort.by', lang)}</span>
          <button onClick={() => setAsc((v) => !v)} className="text-[11px] text-tg-accent" aria-label="direction">{asc ? '⇧' : '⇩'}</button>
          {SORTS.map((s) => (
            <button key={s} onClick={() => setSortKey(s)}
              className={`text-[9px] px-1.5 py-0.5 rounded-full border ${sortKey === s ? 'bg-tg-accent/15 border-tg-accent text-tg-accent' : 'border-tg-border text-tg-hint'}`}>
              {t('sort.' + s, lang)}
            </button>
          ))}
          <button onClick={() => setEditing((v) => !v)} className="text-[12px] text-tg-accent ml-1" aria-label="edit">✍️</button>
        </div>
      </div>

      {/* edit mode — Clear all (archive 30d) + Restore */}
      {editing && (
        <div className="flex items-center gap-3 mb-2 px-1 text-[11px]">
          {cards.length > 0 && (
            <button
              className="text-sk-pin font-semibold"
              onClick={() => { if (window.confirm(t('catchAll.archiveConfirm', lang, { n: cards.length }))) { onArchiveAll?.(); setEditing(false); } }}
            >{t('catchAll.clearAll', lang)}</button>
          )}
          {archivedCount > 0 && (
            <button className="text-tg-accent font-semibold ml-auto" onClick={() => { onRestore?.(); setEditing(false); }}>
              {t('catchAll.restore', lang, { n: archivedCount })}
            </button>
          )}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="text-[11px] text-tg-hint italic bg-tg-card border border-tg-border rounded-xl p-3 text-center">
          {archivedCount > 0 ? t('catchAll.restore', lang, { n: archivedCount }) : t('root.catchAllEmpty', lang)}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((c, i) => (
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
