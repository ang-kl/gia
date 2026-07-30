// CatchAllStrip — the Clipboard catch-all list. v0.62.433: a header row (count ·
// sort · ✍️ Edit → Clear-all / Restore) sits under the chips (items 7, 11, +
// archive); cards sort by title / country / city / cuisine / date-of-copy.

import React, { useState, useMemo } from 'react';
import VenueCard from './VenueCard.jsx';
import LocationSheet from './LocationSheet.jsx';
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
  archivedCount = 0, onArchiveAll, onRestore, onNewCard,
}) {
  const [sortKey, setSortKey] = useState('date');
  const [asc, setAsc] = useState(false);
  const [editing, setEditing] = useState(false);
  const [locFilter, setLocFilter] = useState(null);   // item 8 — city filter
  const [locOpen, setLocOpen] = useState(false);

  // item 8 — group saved-card locations by country › city.
  const locGroups = useMemo(() => {
    const map = {};
    for (const c of cards) {
      const country = countryOf(c); const city = cityOf(c) || '—';
      (map[country] = map[country] || {});
      (map[country][city] = map[country][city] || []).push(c.name || (c.venue && c.venue.name) || c.preview || 'Untitled');
    }
    return Object.entries(map).map(([country, cities]) => ({
      country,
      cities: Object.entries(cities).map(([city, items]) => ({ city, items })).sort((a, b) => a.city.localeCompare(b.city)),
    }));
  }, [cards]);
  const locFiltered = locFilter ? cards.filter((c) => (cityOf(c) || '—') === locFilter) : cards;

  // item 3 — duplicate flagging
  const dupKey = (c) => (c.venue && c.venue.placeId) || (c.venue && c.venue.name) || c.name || c.preview || '';
  const dupCounts = {};
  for (const c of cards) { const k = dupKey(c); if (k) dupCounts[k] = (dupCounts[k] || 0) + 1; }

  const sorted = useMemo(() => {
    const arr = [...locFiltered];
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
  }, [locFiltered, sortKey, asc]);

  return (
    <section>
      {/* item 8 — location line: 📍 {city | All locations}; tap 📍 → list */}
      <div className="flex items-center gap-1 mb-1.5 px-1 text-[12px]">
        <button onClick={() => setLocOpen(true)} className="flex items-center gap-1 text-tg-text">
          <span className="text-sk-pin">📍</span>
          <span className="font-semibold">{locFilter || t('loc.all', lang)}</span>
        </button>
        {locFilter && <button onClick={() => setLocFilter(null)} aria-label={t('facet.clear', lang)} className="text-tg-hint text-[11px]">✕</button>}
      </div>
      {/* header row — count · sort · ✍️ Edit (under the chips) */}
      <div className="flex items-center gap-2 mb-2 px-1 flex-wrap">
        <h2 className="text-[13px] font-extrabold">{t('root.catchAll', lang)}</h2>
        <span className="text-[10px] font-bold bg-sk-soft text-tg-accent rounded-full px-2 py-0.5">{cards.length}</span>
        {onNewCard && <button onClick={onNewCard} className="text-[10px] font-semibold text-tg-accent-text bg-tg-accent rounded-full px-2 py-0.5">{t('catchAll.newCard', lang)}</button>}
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[9px] text-tg-hint">{t('sort.by', lang)}</span>
          <button onClick={() => setAsc((v) => !v)} className="text-[11px] text-tg-accent" aria-label={asc ? t('sort.asc', lang) : t('sort.desc', lang)}>{asc ? '⇧' : '⇩'}</button>
          {SORTS.map((s) => (
            <button key={s} onClick={() => setSortKey(s)} aria-pressed={sortKey === s}
              className={`text-[9px] px-1.5 py-0.5 rounded-full border ${sortKey === s ? 'bg-tg-accent/15 border-tg-accent text-tg-accent' : 'border-tg-border text-tg-hint'}`}>
              {t('sort.' + s, lang)}
            </button>
          ))}
          <button onClick={() => setEditing((v) => !v)} className="text-[12px] text-tg-accent ml-1" aria-pressed={editing} aria-label={t('chrome.edit', lang)}>✍️</button>
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
        <div className="bg-tg-card border border-tg-border rounded-xl p-4 text-center">
          <div className="text-[11px] text-tg-hint italic mb-2">{archivedCount > 0 ? t('catchAll.restore', lang, { n: archivedCount }) : t('root.catchAllEmpty', lang)}</div>
          {onNewCard && <button onClick={onNewCard} className="text-[12px] font-semibold text-tg-accent-text bg-tg-accent rounded-full px-3 py-1.5">{t('catchAll.newCard', lang)}</button>}
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

      {locOpen && (
        <LocationSheet
          lang={lang}
          groups={locGroups}
          active={locFilter}
          onPick={(city) => { setLocFilter(city); setLocOpen(false); }}
          onClose={() => setLocOpen(false)}
        />
      )}
    </section>
  );
}
