import React, { useState } from 'react';
import CuisineCategoryDrawer from './CuisineCategoryDrawer.jsx';
import { useLocale, t as tr } from '../lib/i18n.js';

const MAX_SELECTED = 5;

// v0.59.6: server returns canonical EN category labels; the TMA
// localises via this id → i18n-key map so drawer cards render in
// the active locale.
const CATEGORY_LABEL_KEY = {
  'common-here':     'cat.commonHere',
  'southeast-asian': 'cat.southeastAsian',
  'east-asian':      'cat.eastAsian',
  'china-regional':  'cat.chinaRegional',
  'south-asian':     'cat.southAsian',
  'middle-eastern':  'cat.middleEastern',
  'european':        'cat.european',
  'americas':        'cat.americas',
  'australasia':     'cat.australasia',
  'african':         'cat.african'
};

// v0.59.0: cuisine drawer rebuilt as a 2-column grid of category
// cards with preview chips. Tapping a card opens a full-overlay
// drill-down (CuisineCategoryDrawer).
// v0.59.1: cards switched to single-line compact layout. Top card
// was the merged "Common here, Southeast Asia, Oceanic" via a
// frontend col-span hack.
// v0.59.2: dropped the v0.59.1 frontend merge — cuisines-vault now
// regroups at data level into 10 world-region buckets (Common in
// Singapore / Southeast Asian / East Asian / China-regional /
// South Asian / Middle Eastern / European / Americas / Australasia /
// African). All cards same width in the 2-col grid.
// v0.59.21: onCategoryClose fires when the drilled-down category
// drawer closes. App.jsx uses it to nudge a 3 s pulse on the 🔍
// Search FAB so the user sees the next-step CTA right after picking
// a cuisine.
export default function CuisineDrawer({ catalogue, selected, onChange, onCategoryClose, region, specialMode = null, onSpecialModeChange }) {
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [lang] = useLocale();

  if (!catalogue) return null;

  function toggle(slug) {
    if (specialMode) return;  // v0.61.126 — cuisines locked while special mode is active
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (selected.length < MAX_SELECTED) onChange([...selected, slug]);
  }

  // v0.61.126 — Fruits / Durian exclusive toggle. Tapping the active
  // button clears it; tapping the inactive one switches modes (per
  // spec: "If 'Fruits' is toggled ON, automatically clear 'Durian'"
  // and vice versa). Clears the selected cuisines on activation so
  // the chip badge / criteria summary doesn't show ghosts of the
  // prior normal-cuisine state.
  function setSpecial(next) {
    if (specialMode === next) {
      onSpecialModeChange?.(null);
    } else {
      onSpecialModeChange?.(next);
      if (selected.length > 0) onChange([]);   // wipe normal cuisines on mode activation
    }
  }
  const SPECIAL = [
    { id: 'fruits', label: tr('special.fruits.label', lang), emoji: '🍉' },
    { id: 'durian', label: tr('special.durian.label', lang), emoji: '🥥' }
  ];

  function labelFor(cat) {
    const key = CATEGORY_LABEL_KEY[cat.id];
    return key ? tr(key, lang) : cat.label;
  }

  const openCategory = openCategoryId
    ? catalogue.find((c) => c.id === openCategoryId)
    : null;

  function CategoryCard({ cat }) {
    const selectedInCat = cat.cuisines.filter((c) => selected.includes(c.slug)).length;
    const label = labelFor(cat);
    // v0.59.23: single-item categories (Dessert, Fusion) skip the
    // drill-down sub-drawer — tapping the card toggles the only
    // entry directly. Per Human Lead 2026-05-07: "if i click fusion
    // or dessert drawers, can it be selection than drawer since
    // there aren't further options".
    const isSingle = cat.cuisines.length === 1;
    const onlySlug = isSingle ? cat.cuisines[0].slug : null;
    const isOnlySelected = isSingle && selected.includes(onlySlug);
    // v0.60.199 — region-scoped chips. The synthetic ✳️ 🇸🇬 Michelin
    // List category ships with regionScope:'SG' (the curated dataset
    // is Singapore-only). When the user toggles to JB the chip greys
    // out and ignores taps. App.jsx also strips 'michelin' from
    // state.cuisines on JB toggle so a previously-selected chip
    // doesn't linger.
    const regionDisabled =
      cat.regionScope && region && cat.regionScope.toUpperCase() !== String(region).toUpperCase();
    return (
      <button
        type="button"
        disabled={regionDisabled}
        aria-disabled={regionDisabled || undefined}
        onClick={() => {
          if (regionDisabled) return;
          if (isSingle) {
            toggle(onlySlug);
            // Mirror the drawer-close FAB pulse so the user sees the
            // next-step CTA after a direct toggle too.
            onCategoryClose?.();
          } else {
            setOpenCategoryId(cat.id);
          }
        }}
        title={regionDisabled
          ? `${label} — ${lang === 'fr' ? 'Singapour uniquement' : 'Singapore only'}`
          : label}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-tg-border bg-tg-card text-left transition-colors ${regionDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-tg-accent'}`}
      >
        <span aria-hidden className="flex-shrink-0">{cat.emoji}</span>
        <span className="text-xs font-semibold whitespace-normal break-words leading-tight line-clamp-2 flex-1">{label}</span>
        {!isSingle && selectedInCat > 0 && (
          <span className="text-tg-accent text-[10px] font-semibold flex-shrink-0">[{selectedInCat}]</span>
        )}
        <span aria-hidden className={`flex-shrink-0 ${isSingle && isOnlySelected ? 'text-tg-accent font-semibold' : 'text-tg-hint'}`}>
          {isSingle ? (isOnlySelected ? '✓' : '+') : '▸'}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {/* v0.61.126: Fruits / Durian exclusive special-mode pills —
          two amber-bordered buttons visually distinct from the white
          catalogue cards. Active mode is bg-tg-accent + ✓; inactive
          is amber-bordered + +. Toggle behaviour: tap active to clear,
          tap other to switch (mutually exclusive). When ON, the
          catalogue grid + QuickFilters go opacity-40 + pointer-
          events-none.
          v0.61.129: moved BELOW the catalogue grid per operator —
          "move the Fruits and Durians after the Michelin List row".
          Michelin is the last catalogue card; placing Fruits + Durian
          immediately after the grid puts them right under it. */}
      <div
        className={`grid grid-cols-2 gap-1.5${specialMode ? ' opacity-40 pointer-events-none' : ''}`}
        aria-disabled={specialMode ? true : undefined}
      >
        {catalogue.map((cat) => (
          <CategoryCard key={cat.id} cat={cat} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {SPECIAL.map((s) => {
          const active = specialMode === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSpecial(s.id)}
              aria-pressed={active}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-left transition-colors ${
                active
                  ? 'bg-tg-accent text-tg-accent-text border-tg-accent font-semibold'
                  : 'bg-tg-card text-tg-text border-amber-500/60 hover:border-amber-500'
              }`}
            >
              <span aria-hidden className="flex-shrink-0">{s.emoji}</span>
              <span className="text-xs font-semibold flex-1">{s.label}</span>
              <span aria-hidden className="flex-shrink-0">{active ? '✓' : '+'}</span>
            </button>
          );
        })}
      </div>
      {specialMode && (
        <div className="text-[11px] text-tg-hint px-1 italic">
          {tr('special.activeNote', lang).replace('{mode}', tr(`special.${specialMode}.label`, lang))}
        </div>
      )}
      {selected.length > 0 && !specialMode && (
        <div className="flex justify-between items-center text-[11px] text-tg-hint px-1">
          <span>{selected.length} cuisine{selected.length === 1 ? '' : 's'} selected{selected.length === MAX_SELECTED ? ' (max)' : ''}</span>
          <button onClick={() => onChange([])} className="underline">{tr('btn.clearCuisines', lang)}</button>
        </div>
      )}

      {openCategory && (
        <CuisineCategoryDrawer
          category={openCategory}
          selected={selected}
          onToggle={toggle}
          onClose={() => { setOpenCategoryId(null); onCategoryClose?.(); }}
          maxSelected={MAX_SELECTED}
        />
      )}
    </div>
  );
}
