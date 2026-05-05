import React, { useState } from 'react';
import CuisineCategoryDrawer from './CuisineCategoryDrawer.jsx';

const MAX_SELECTED = 5;

// v0.59.0: cuisine drawer rebuilt as a 2-column grid of category
// cards with preview chips. Tapping a card opens a full-overlay
// drill-down (CuisineCategoryDrawer).
// v0.59.1: cards switched to single-line compact layout (was a
// multi-line block with preview chips, ate too much vertical real
// estate per Human Lead). Top card is the merged "Common here,
// Southeast Asia, Oceanic" — full-width, spans both columns,
// combines common-here + southeast-asian source categories. Other
// 6 categories continue in the 2-col grid below.
export default function CuisineDrawer({ catalogue, selected, onChange }) {
  const [openCategoryId, setOpenCategoryId] = useState(null);

  if (!catalogue) return null;

  function toggle(slug) {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (selected.length < MAX_SELECTED) onChange([...selected, slug]);
  }

  // v0.59.1: merge common-here + southeast-asian into one full-width
  // card per Human Lead. Combined category surface name is "Common
  // here, Southeast Asia, Oceanic". Source slugs preserved untouched
  // (Tell Gia, copy-syntax, search pipeline still see the original
  // per-cuisine flag/category metadata).
  const mergedCategories = (() => {
    const common = catalogue.find((c) => c.id === 'common-here');
    const sea = catalogue.find((c) => c.id === 'southeast-asian');
    const others = catalogue.filter((c) => c.id !== 'common-here' && c.id !== 'southeast-asian');
    if (!common && !sea) return others;
    const mergedFirst = {
      id: 'common-here-merged',
      label: 'Common here, Southeast Asia, Oceanic',
      emoji: '🌟',
      cuisines: [...(common?.cuisines || []), ...(sea?.cuisines || [])]
    };
    return [mergedFirst, ...others];
  })();

  const openCategory = openCategoryId
    ? mergedCategories.find((c) => c.id === openCategoryId)
    : null;

  function CategoryCard({ cat, fullWidth }) {
    const selectedInCat = cat.cuisines.filter((c) => selected.includes(c.slug)).length;
    return (
      <button
        type="button"
        onClick={() => setOpenCategoryId(cat.id)}
        title={cat.label}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-tg-border bg-tg-card text-left hover:border-tg-accent transition-colors ${fullWidth ? 'col-span-2' : ''}`}
      >
        <span aria-hidden className="flex-shrink-0">{cat.emoji}</span>
        <span className="text-xs font-semibold whitespace-normal break-words leading-tight line-clamp-2 flex-1">{cat.label}</span>
        {selectedInCat > 0 && (
          <span className="text-tg-accent text-[10px] font-semibold flex-shrink-0">[{selectedInCat}]</span>
        )}
        <span aria-hidden className="text-tg-hint flex-shrink-0">▸</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        {mergedCategories.map((cat, i) => (
          <CategoryCard key={cat.id} cat={cat} fullWidth={i === 0} />
        ))}
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
