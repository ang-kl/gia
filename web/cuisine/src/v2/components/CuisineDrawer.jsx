import React, { useState } from 'react';
import CuisineCategoryDrawer from './CuisineCategoryDrawer.jsx';
import { useLocale, t as tr } from '../lib/i18n.js';
// v0.61.141 — special-mode mutex logic extracted to a pure module so
// it's unit-testable. Fruits / Durian / Durian Pastry are now
// regular catalogue chips inside the "Dessert, Fruits" category;
// applyChipToggle enforces the symmetric mutex against Dessert + all
// other cuisines, replacing the v0.61.126 amber-pill row that lived
// above the catalogue grid.
import { applyChipToggle } from '../lib/cuisine-selection.js';

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
// v0.61.141 — operator: Fruits + Durian + Durian Pastry moved into the
// "Dessert, Fruits" catalogue group as regular chips. specialMode /
// onSpecialModeChange props retired; the active special slug is now
// derived from `selected` at the App.jsx request-build site. The
// applyChipToggle helper enforces the mutex (special ↔ everything else
// including Dessert).
export default function CuisineDrawer({ catalogue, selected, onChange, onCategoryClose, region, countryPref }) {
  const [openCategoryId, setOpenCategoryId] = useState(null);
  // v0.61.346 — current country for per-country chip gating (e.g. the
  // Michelin chip enables wherever its `michelinCountries` list covers).
  // SG pill → SG; MY-PUT (Putrajaya) → MY; JB stays its own (Michelin
  // disabled there); OTHER → the picked country code.
  const currentMichCountry = region === 'SG' ? 'SG'
    : region === 'MY-PUT' ? 'MY'
    : region === 'JB' ? 'JB'
    : String(countryPref || '').toUpperCase();
  // v0.61.411 — effective ISO-2 country for the durian-belt gate. Unlike the
  // Michelin map above, JB is Malaysia for belt purposes (Johor IS in the belt),
  // and so is MY-PUT; OTHER uses the picked countryPref; SG → SG.
  const beltCountry = region === 'SG' ? 'SG'
    : (region === 'JB' || region === 'MY-PUT') ? 'MY'
    : String(countryPref || '').toUpperCase();
  const [lang] = useLocale();

  if (!catalogue) return null;

  function toggle(slug) {
    onChange(applyChipToggle({ slug, selected, maxSelected: MAX_SELECTED }));
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
    // v0.60.199 — region-scoped chips. The synthetic ✳️ 🇸🇬 Michelin
    // List category ships with regionScope:'SG' (the curated dataset
    // is Singapore-only). When the user toggles to JB the chip greys
    // out and ignores taps. App.jsx also strips 'michelin' from
    // state.cuisines on JB toggle so a previously-selected chip
    // doesn't linger.
    // v0.61.346 — chips with a `michelinCountries` list (the Michelin
    // chip) enable when the current country is in that list; otherwise
    // fall back to the legacy single-region `regionScope` gate.
    const michChipCountries = Array.isArray(cat.michelinCountries)
      ? cat.michelinCountries.map((c) => String(c).toUpperCase())
      : null;
    const regionDisabled = michChipCountries
      ? !michChipCountries.includes(currentMichCountry)
      : (cat.regionScope && region && cat.regionScope.toUpperCase() !== String(region).toUpperCase());
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
          ? `${label} — ${lang === 'fr' ? 'pas de liste Michelin ici' : 'no Michelin list here'}`
          : label}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-left transition-colors ${regionDisabled ? 'opacity-50 cursor-not-allowed bg-tg-card border-tg-border' : (selectedInCat > 0 || (isSingle && isOnlySelected) ? 'bg-[#DCEBFF] border-tg-accent text-[#0c2540]' : 'bg-tg-card border-tg-border hover:border-tg-accent')}`}
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
      {/* v0.61.141 — the v0.61.126 Fruits / Durian amber-pill row above
          the catalogue grid is retired. Fruits + Durian + the new
          Durian Pastry are now regular chips inside the "Dessert,
          Fruits" category card. The mutex (special ↔ Dessert + all
          other cuisines) is enforced by applyChipToggle. */}
      <div className="grid grid-cols-2 gap-1.5">
        {catalogue.map((cat) => (
          <CategoryCard key={cat.id} cat={cat} />
        ))}
      </div>
      {/* v0.61.280 — Register O-31: sparse notice when region !== 'SG'.
          The Michelin chip is greyed (regionScope:'SG') and the v0.61.280
          App.jsx strip clears any sticky selection on SG-leave. The
          caption explains why so users don't misread the grey as a bug. */}
      {(() => {
        // v0.61.346 — the Michelin chip now works in any country with a
        // curated list. Show the "no list here" caption only when the
        // current country is NOT covered by its michelinCountries set.
        const m = catalogue.find((c) => c.id === 'michelin' && Array.isArray(c.michelinCountries));
        if (!m) return null;
        const list = m.michelinCountries.map((c) => String(c).toUpperCase());
        if (list.includes(currentMichCountry)) return null;
        return (
          <div className="text-[11px] text-tg-hint px-1 pt-0.5">
            {tr('drawer.michelinSgOnly', lang)}
          </div>
        );
      })()}
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
          /* v0.61.193 — region prop so the drawer can lock SG-only
             chips (fruits / durian / durian-pastry) when region != SG. */
          region={region}
          /* v0.61.411 — effective country for the durian-belt gate: durian +
             durian-pastry chips disable outside SG/MY/ID/TH/PH/BN/VN. */
          beltCountry={beltCountry}
        />
      )}
    </div>
  );
}
