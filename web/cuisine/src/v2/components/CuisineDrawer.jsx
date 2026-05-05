import React, { useState } from 'react';
import CuisineCategoryDrawer from './CuisineCategoryDrawer.jsx';

const MAX_SELECTED = 5;

// v0.59.0: cuisine drawer rebuilt as a 2-column grid of category
// cards with preview chips. Tapping a card opens a full-overlay
// drill-down (CuisineCategoryDrawer) where the user picks individual
// cuisines from a 2-column flag-prefixed pill grid. Inline expansion
// has been retired — solves both the "twin drawer" co-expand bug
// (v0.58.12) and the ragged chip-wrap inside narrow cells (v0.58.13).
export default function CuisineDrawer({ catalogue, selected, onChange }) {
  const [openCategoryId, setOpenCategoryId] = useState(null);

  if (!catalogue) return null;

  function toggle(slug) {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (selected.length < MAX_SELECTED) onChange([...selected, slug]);
  }

  // Up to 3 preview slugs per category card. Prefer slugs the user
  // has already selected so the card "shows what's active" at a
  // glance. Otherwise pick the first 3 in source order.
  function previewCuisines(cat) {
    const sel = cat.cuisines.filter((c) => selected.includes(c.slug));
    const others = cat.cuisines.filter((c) => !selected.includes(c.slug));
    return [...sel, ...others].slice(0, 3);
  }

  const openCategory = openCategoryId
    ? catalogue.find((c) => c.id === openCategoryId)
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {catalogue.map((cat) => {
          const selectedInCat = cat.cuisines.filter((c) => selected.includes(c.slug)).length;
          const previews = previewCuisines(cat);
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setOpenCategoryId(cat.id)}
              title={cat.label}
              className="flex flex-col gap-1.5 px-2.5 py-2 rounded-2xl border border-tg-border bg-tg-card text-left hover:border-tg-accent transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span aria-hidden className="flex-shrink-0">{cat.emoji}</span>
                <span className="text-xs font-semibold whitespace-normal break-words leading-tight line-clamp-2 flex-1">{cat.label}</span>
                {selectedInCat > 0 && (
                  <span className="text-tg-accent text-[10px] font-semibold flex-shrink-0">[{selectedInCat}]</span>
                )}
                <span aria-hidden className="text-tg-hint flex-shrink-0">▸</span>
              </div>
              <div className="flex flex-wrap gap-1 px-0.5">
                {previews.map((cu) => {
                  const sel = selected.includes(cu.slug);
                  return (
                    <span
                      key={cu.slug}
                      className={`text-[10px] leading-tight px-1.5 py-0.5 rounded-full border ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-bg text-tg-hint border-tg-border'}`}
                    >
                      {cu.flag ? `${cu.flag} ` : ''}{cu.name}
                    </span>
                  );
                })}
                {cat.cuisines.length > previews.length && (
                  <span className="text-[10px] leading-tight px-1.5 py-0.5 text-tg-hint">
                    +{cat.cuisines.length - previews.length}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div className="flex justify-between items-center text-[11px] text-tg-hint px-1">
          <span>{selected.length} cuisine{selected.length === 1 ? '' : 's'} selected{selected.length === MAX_SELECTED ? ' (max)' : ''}</span>
          <button onClick={() => onChange([])} className="underline">Clear all</button>
        </div>
      )}

      {openCategory && (
        <CuisineCategoryDrawer
          category={openCategory}
          selected={selected}
          onToggle={toggle}
          onClose={() => setOpenCategoryId(null)}
          maxSelected={MAX_SELECTED}
        />
      )}
    </div>
  );
}
