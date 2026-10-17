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
export default function CuisineDrawer({ catalogue, selected, onChange, onCategoryClose }) {
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const [lang] = useLocale();

  if (!catalogue) return null;

  function toggle(slug) {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (selected.length < MAX_SELECTED) onChange([...selected, slug]);
  }

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
    return (
      <button
        type="button"
        onClick={() => {
          if (isSingle) {
            toggle(onlySlug);
            // Mirror the drawer-close FAB pulse so the user sees the
            // next-step CTA after a direct toggle too.
            onCategoryClose?.();
          } else {
            setOpenCategoryId(cat.id);
          }
        }}
        title={label}
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-tg-border bg-tg-card text-left hover:border-tg-accent transition-colors"
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
      <div className="grid grid-cols-2 gap-1.5">
        {catalogue.map((cat) => (
          <CategoryCard key={cat.id} cat={cat} />
        ))}
      </div>
      {selected.length > 0 && (
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
