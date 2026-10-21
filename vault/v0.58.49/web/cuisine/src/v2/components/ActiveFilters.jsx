import React from 'react';

// v0.58.1: read-only summary of every active selection with a ✕ to
// remove individual chips + a "Reset all" link. Hidden when nothing
// is active. Sits directly below the Search/Clear row so the user
// never has to scroll up to see what filters are applied.

const FILTER_LABEL = {
  newlyOpened: { icon: '🆕', label: 'New' },
  openNow:     { icon: '🟢', label: 'Open now' },
  halal:       { icon: '🕌', label: 'Halal' },
  vegetarian:  { icon: '🥗', label: 'Vegetarian' },
  homeBased:   { icon: '🏠', label: 'Home-based' }
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

export default function ActiveFilters({ cuisines = [], filters = {}, onRemoveCuisine, onRemoveFilter, onResetAll }) {
  const filterChips = Object.keys(FILTER_LABEL).filter((k) => !!filters[k]);
  const priceChips = filters.prices || [];
  const total = filterChips.length + priceChips.length + cuisines.length;
  if (total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-0.5 pt-0.5">
      {cuisines.map((slug) => (
        <ChipReadOnly key={'c-' + slug} onRemove={() => onRemoveCuisine(slug)} removeLabel={`Remove ${slug}`}>
          <span className="capitalize">{slug.replace(/-/g, ' ')}</span>
        </ChipReadOnly>
      ))}
      {filterChips.map((k) => (
        <ChipReadOnly key={'f-' + k} onRemove={() => onRemoveFilter(k)} removeLabel={`Remove ${FILTER_LABEL[k].label}`}>
          <span className="mr-0.5" aria-hidden>{FILTER_LABEL[k].icon}</span>{FILTER_LABEL[k].label}
        </ChipReadOnly>
      ))}
      {priceChips.map((p) => (
        <ChipReadOnly key={'p-' + p} onRemove={() => onRemoveFilter('price:' + p)} removeLabel={`Remove price ${p}`}>
          {p}
        </ChipReadOnly>
      ))}
      <button
        type="button"
        onClick={onResetAll}
        className="text-[11px] text-tg-link underline ml-auto"
      >Reset all</button>
    </div>
  );
}
