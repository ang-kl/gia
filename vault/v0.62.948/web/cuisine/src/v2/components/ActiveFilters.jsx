import React from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.58.1: read-only summary of every active selection with a ✕ to
// remove individual chips + a "Reset all" link. Hidden when nothing
// is active. Sits directly below the Search/Clear row so the user
// never has to scroll up to see what filters are applied.
// v0.58.55: chip labels resolve via i18n.t() per active locale.

const FILTER_KEYS = {
  newlyOpened: { icon: '🆕', i18n: 'filter.newlyOpened' },
  openNow:     { icon: '🟢', i18n: 'filter.openNow' },
  halal:       { icon: '🕌', i18n: 'filter.halal' },
  vegetarian:  { icon: '🥗', i18n: 'filter.vegetarian' },
  homeBased:   { icon: '🏠', i18n: 'filter.homeBased' },
  petFriendly: { icon: '🐾', i18n: 'filter.petFriendly' }   // v0.60.165
};

function ChipReadOnly({ children, onRemove, removeLabel }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-tg-border bg-tg-card text-[11px] text-tg-text">
      {children}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="text-tg-hint hover:text-tg-text leading-none px-0.5 -mr-0.5"
      >×</button>
    </span>
  );
}

export default function ActiveFilters({ cuisines = [], filters = {}, onRemoveCuisine, onRemoveFilter, onResetAll, nameForCuisine = null }) {
  const [lang] = useLocale();
  const filterChips = Object.keys(FILTER_KEYS).filter((k) => !!filters[k]);
  const priceChips = filters.prices || [];
  const total = filterChips.length + priceChips.length + cuisines.length;
  if (total === 0) return null;
  const removePrefix = tr('af.remove', lang);
  const resetLabel = tr('af.resetAll', lang);

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-0.5 pt-0.5">
      {/* v0.62.155 — operator: "Reset all" sits FIRST (left), then the selected
          cuisine / quick-filter chips follow. */}
      <button
        type="button"
        onClick={onResetAll}
        className="text-[11px] text-tg-link underline mr-0.5"
      >{resetLabel}</button>
      {cuisines.map((slug) => {
        // v0.62.19 — resolve the catalogue display name (e.g. 'durian' →
        // "Durian Fruits", matching the drawer + result-header) instead of the
        // raw slug. Fall back to the de-slugged form when no resolver/name.
        const resolved = (typeof nameForCuisine === 'function' && nameForCuisine(slug)) || null;
        return (
          <ChipReadOnly key={'c-' + slug} onRemove={() => onRemoveCuisine(slug)} removeLabel={`${removePrefix} ${resolved || slug}`}>
            {resolved
              ? <span>{resolved}</span>
              : <span className="capitalize">{slug.replace(/-/g, ' ')}</span>}
          </ChipReadOnly>
        );
      })}
      {filterChips.map((k) => {
        const label = tr(FILTER_KEYS[k].i18n, lang);
        // v0.61.255 — operator: display Halal as Arabic 'حلال' (bold,
        // emerald-600) in chip surfaces; keep the underlying filter
        // key + i18n + removeLabel aria-text as 'Halal' so search
        // behaviour and screen readers are unchanged.
        const isHalal = k === 'halal';
        return (
          <ChipReadOnly key={'f-' + k} onRemove={() => onRemoveFilter(k)} removeLabel={`${removePrefix} ${label}`}>
            {isHalal ? (
              <span lang="ar" dir="rtl" className="font-bold text-emerald-600">حلال</span>
            ) : (
              <><span className="mr-0.5" aria-hidden>{FILTER_KEYS[k].icon}</span>{label}</>
            )}
          </ChipReadOnly>
        );
      })}
      {priceChips.map((p) => (
        <ChipReadOnly key={'p-' + p} onRemove={() => onRemoveFilter('price:' + p)} removeLabel={`${removePrefix} ${tr('filter.price', lang).toLowerCase()} ${p}`}>
          {p}
        </ChipReadOnly>
      ))}
    </div>
  );
}
