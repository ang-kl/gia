// CabinetGrid — list of CabinetCards on the Root view + "+ New cabinet"
// tile when count < cap.
//
// v0.62.331 (PR #4) — sort selector (4 options: name / location / date /
// created). Default = created (newest first). Sort is client-side over
// state.cabinets; the cap is 12 so the sort cost is negligible. The
// active sort is held in component state — not persisted, deliberately,
// because the operator hasn't asked for a per-user pref and the
// short-list size keeps re-sort cheap.

import React, { useMemo, useState } from 'react';
import CabinetCard from './CabinetCard.jsx';
import { t } from '../lib/i18n.js';

const CAP = 12;

const SORTS = [
  { key: 'created',  labelEN: 'newest' },
  { key: 'name',     labelEN: 'A–Z' },
  { key: 'location', labelEN: 'location' },
  { key: 'date',     labelEN: 'trip date' }
];

function sortedBy(cabinets, key) {
  const arr = [...cabinets];
  switch (key) {
    case 'name':
      arr.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      break;
    case 'location':
      arr.sort((a, b) => {
        const A = (a.location || '').toLowerCase();
        const B = (b.location || '').toLowerCase();
        if (A && !B) return -1;
        if (B && !A) return 1;
        return A.localeCompare(B);
      });
      break;
    case 'date':
      // Trip date — use dateStart if present, else dateEnd, else fall back
      // to createdAt so cabinets without dates sort to the bottom.
      arr.sort((a, b) => {
        const A = a.dateStart || a.dateEnd || '';
        const B = b.dateStart || b.dateEnd || '';
        if (A && !B) return -1;
        if (B && !A) return 1;
        if (A && B) return A.localeCompare(B);
        return (b.modifiedAt || 0) - (a.modifiedAt || 0);
      });
      break;
    case 'created':
    default:
      // Newest first (modifiedAt as a proxy for "recent activity").
      arr.sort((a, b) => (b.modifiedAt || 0) - (a.modifiedAt || 0));
  }
  return arr;
}

export default function CabinetGrid({ cabinets, lang, onOpen, onNew, defaultCabinetId = null, activeCabinetId = null }) {
  // v0.62.428 — sample parity: a vertical LIST (was a 2-col grid) with a
  // subtitle, ★DEFAULT/OPEN badges + counts + touched per row. Sort retained.
  const [sortKey, setSortKey] = useState('created');
  const sorted = useMemo(() => sortedBy(cabinets, sortKey), [cabinets, sortKey]);

  return (
    <section className="mt-1">
      <h2 className="text-lg font-extrabold px-1">{t('root.cabinets', lang)}</h2>
      <div className="text-[11px] text-tg-hint px-1 mb-2">{t('root.cabinetsSub', lang)}</div>
      {cabinets.length > 1 && (
        <div className="flex gap-1 mb-2 px-1 overflow-x-auto no-scrollbar">
          {SORTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSortKey(s.key)}
              aria-pressed={sortKey === s.key}
              className={`gia-hit-y shrink-0 text-[10px] px-2 py-1 rounded-full border ${
                sortKey === s.key
                  ? 'bg-tg-accent/15 border-tg-accent text-tg-accent'
                  : 'border-tg-border text-tg-hint'
              }`}
            >
              {s.labelEN}
            </button>
          ))}
        </div>
      )}
      <div>
        {sorted.map((c) => (
          <CabinetCard
            key={c.cabId}
            cabinet={c}
            lang={lang}
            isDefault={c.cabId === defaultCabinetId}
            isOpen={c.cabId === activeCabinetId}
            onOpen={() => onOpen?.(c.cabId)}
          />
        ))}
        {cabinets.length < CAP ? (
          <button
            onClick={onNew}
            className="w-full bg-transparent border border-dashed border-tg-accent/50 text-tg-accent rounded-xl py-3 text-sm font-semibold"
          >
            {t('root.newCabinet', lang)}
          </button>
        ) : (
          <div className="bg-tg-card border border-tg-border text-tg-hint rounded-xl p-3 text-[11px]">
            {t('root.capCabinets', lang, { cap: CAP })}
          </div>
        )}
      </div>
    </section>
  );
}
