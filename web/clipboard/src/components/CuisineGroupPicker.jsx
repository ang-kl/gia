import React, { useState } from 'react';
import { useDialog } from '../../../_shared/lib/use-dialog.js';
import { t } from '../lib/i18n.js';
import { cuisineName } from '../lib/cuisine-i18n.js';

// v0.62.x — the server catalogue ships English category labels only. The
// Cuisine TMA localises them client-side (CuisineDrawer); mirror that here so
// the Sketchbook picker follows the set language instead of stranding the
// category tiles + sub-cuisine names in English. id → i18n-key map, same as
// the Cuisine TMA's CATEGORY_LABEL_KEY.
const CATEGORY_LABEL_KEY = {
  'common-here':     'cat.commonHere',
  'southeast-asian': 'cat.southeastAsian',
  'east-asian':      'cat.eastAsian',
  'south-asian':     'cat.southAsian',
  'middle-eastern':  'cat.middleEastern',
  'european':        'cat.european',
  'americas':        'cat.americas',
  'dessert':         'cat.sweetsFusion',
  'michelin':        'cat.michelinBib',
  'set-meal':        'cat.setMeal',
};

// Localised category label — falls back to the raw English catalogue label
// for any id not in the key map.
function catLabel(cat, lang) {
  const key = CATEGORY_LABEL_KEY[cat.id];
  return key ? t(key, lang) : cat.label;
}

// v0.62.451 — Sketchbook "Cuisine & filters" grouped picker, ported from the
// Cuisine TMA (CuisineDrawer + CuisineCategoryDrawer) so the two TMAs look
// identical. Differences from the Cuisine TMA original:
//   • self-contained (no cuisine-selection / cuisine-i18n deps); `lang` is a prop
//   • labels come from the server catalogue (cat.label / cu.name) — clipboard is en/fr
//   • it FILTERS saved cards, so items whose cuisine is NOT present in the saved
//     cards are greyed + non-tappable (availableSlugs), matching the operator's
//     "grey out those not in the eatery cards" rule.
const MAX_SELECTED = 5;

function isAvail(slug, availableSlugs) {
  return !availableSlugs || availableSlugs.has(slug);
}

// Drill-in modal for one category (2-col grid of cuisines). Mirrors
// CuisineCategoryDrawer incl. the subtle top-right ✕.
function CategoryModal({ category, selected, onToggle, onClose, lang, availableSlugs }) {
  const panelRef = useDialog({ open: true, onClose });
  if (!category) return null;
  const selectedInCat = category.cuisines.filter((c) => selected.includes(c.slug)).length;
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true"
      aria-label={`${catLabel(category, lang)} cuisines`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div ref={panelRef} className="flex flex-col w-full max-w-[480px] max-h-[80vh] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-tg-border bg-tg-card">
          <span aria-hidden>{category.emoji}</span>
          <h2 className="text-sm font-semibold flex-1 truncate">{catLabel(category, lang)}</h2>
          {selectedInCat > 0 && <span className="text-tg-accent text-xs font-semibold">[{selectedInCat}]</span>}
          <button type="button" onClick={onClose} aria-label={t('chrome.close', lang)}
            className="text-tg-hint text-sm leading-none px-1 flex-shrink-0">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <div className="grid grid-cols-2 gap-1.5">
            {category.cuisines.map((cu) => {
              const sel = selected.includes(cu.slug);
              const avail = isAvail(cu.slug, availableSlugs);
              const dim = !sel && selected.length >= MAX_SELECTED;
              const disabled = !avail || (dim && !sel);
              return (
                <React.Fragment key={cu.slug}>
                  {cu.dividerBefore && <div className="col-span-2 h-px bg-tg-border/40 my-1.5" aria-hidden />}
                  <button type="button" onClick={() => { if (!disabled) onToggle(cu.slug); }}
                    aria-pressed={sel} aria-disabled={disabled || undefined} disabled={disabled}
                    title={!avail ? (t('cgp.notSaved', lang)) : undefined}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs leading-tight whitespace-normal text-left transition-colors ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : `bg-tg-card text-tg-text border-tg-border ${disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-tg-accent'}`}`}>
                    <span aria-hidden className="flex-shrink-0 text-base leading-none">{cu.flag || '🍽️'}</span>
                    <span className="flex-1 break-words">{cuisineName(cu.slug, cu.name, lang)}</span>
                    {sel && <span aria-hidden className="text-tg-accent-text flex-shrink-0">✓</span>}
                  </button>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CuisineGroupPicker({ catalogue, selected = [], onChange, lang, availableSlugs = null }) {
  const [openCategoryId, setOpenCategoryId] = useState(null);
  if (!catalogue || catalogue.length === 0) {
    return <div className="px-3 py-4 text-center text-xs text-tg-hint">{t('filter.none', lang)}</div>;
  }
  const toggle = (slug) => {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (selected.length < MAX_SELECTED) onChange([...selected, slug]);
  };
  const openCategory = openCategoryId ? catalogue.find((c) => c.id === openCategoryId) : null;

  function CategoryCard({ cat }) {
    const selectedInCat = cat.cuisines.filter((c) => selected.includes(c.slug)).length;
    const isSingle = cat.cuisines.length === 1;
    const onlySlug = isSingle ? cat.cuisines[0].slug : null;
    const isOnlySelected = isSingle && selected.includes(onlySlug);
    // grey the whole group when NONE of its cuisines are in the saved cards
    const catAvail = cat.cuisines.some((c) => isAvail(c.slug, availableSlugs));
    const disabled = !catAvail;
    return (
      <button type="button" disabled={disabled} aria-disabled={disabled || undefined}
        aria-haspopup={isSingle ? undefined : 'dialog'}
        aria-expanded={isSingle ? undefined : openCategoryId === cat.id}
        onClick={() => {
          if (disabled) return;
          if (isSingle) toggle(onlySlug); else setOpenCategoryId(cat.id);
        }}
        title={disabled ? (t('cgp.notSaved', lang)) : undefined}
        className={`flex items-center gap-2 px-3 py-2 rounded-2xl border text-left transition-colors ${disabled ? 'opacity-50 cursor-not-allowed bg-tg-card border-tg-border' : (selectedInCat > 0 || (isSingle && isOnlySelected) ? 'bg-[#DCEBFF] border-tg-accent text-[#0c2540]' : 'bg-tg-card border-tg-border hover:border-tg-accent')}`}>
        <span aria-hidden className="flex-shrink-0">{cat.emoji}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-xs font-semibold whitespace-normal break-words leading-tight line-clamp-2">{catLabel(cat, lang)}</span>
        </span>
        {!isSingle && selectedInCat > 0 && <span className="text-tg-accent text-[10px] font-semibold flex-shrink-0">[{selectedInCat}]</span>}
        <span aria-hidden className={`flex-shrink-0 ${isSingle && isOnlySelected ? 'text-tg-accent font-semibold' : 'text-tg-hint'}`}>
          {isSingle ? (isOnlySelected ? '✓' : '+') : '▸'}
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {catalogue.map((cat) => <CategoryCard key={cat.id} cat={cat} />)}
      </div>
      {selected.length > 0 && (
        <div className="flex justify-between items-center text-[11px] text-tg-hint px-1">
          <span>{selected.length} cuisine{selected.length === 1 ? '' : 's'}{selected.length === MAX_SELECTED ? ' (max)' : ''}</span>
          <button onClick={() => onChange([])} className="underline">{t('filter.all', lang)}</button>
        </div>
      )}
      {openCategory && (
        <CategoryModal category={openCategory} selected={selected} onToggle={toggle}
          onClose={() => setOpenCategoryId(null)} lang={lang} availableSlugs={availableSlugs} />
      )}
    </div>
  );
}
