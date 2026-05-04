import React, { useEffect, useState } from 'react';

const MAX_SELECTED = 5;

// v0.58.11: 2-column layout (was 8 stacked rows). Dropped the total
// cuisine count per category. When at least one cuisine is selected,
// show a compact `[N]` accent next to the category name.
// v0.58.12: switched the outer layout from CSS-grid to two
// independent flex columns. With the previous `grid grid-cols-2`,
// opening the left cell stretched the row track and the right
// (closed) cell appeared to "also expand" into the empty space
// below its header. Two flex columns give each column its own
// auto-height, so opening a drawer no longer drags its sibling.
// The trade-off: columns are masonry-style — once one column gets
// taller, "Row 1 = Common Here + Southeast Asian" alignment is no
// longer strict. Worth it for the cleaner expand behaviour.
export default function CuisineDrawer({ catalogue, selected, onChange }) {
  const [open, setOpen] = useState(() => {
    const init = {};
    for (const c of catalogue || []) init[c.id] = !!c.defaultOpen;
    return init;
  });

  useEffect(() => {
    if (!catalogue) return;
    const next = { ...open };
    let changed = false;
    for (const cat of catalogue) {
      if (!next[cat.id] && cat.cuisines.some((cu) => selected.includes(cu.slug))) {
        next[cat.id] = true; changed = true;
      }
    }
    if (changed) setOpen(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  if (!catalogue) return null;

  function toggle(slug) {
    if (selected.includes(slug)) onChange(selected.filter((s) => s !== slug));
    else if (selected.length < MAX_SELECTED) onChange([...selected, slug]);
  }
  function toggleCat(id) { setOpen({ ...open, [id]: !open[id] }); }

  function renderCategory(cat) {
    const isOpen = !!open[cat.id];
    const selectedInCat = cat.cuisines.filter((c) => selected.includes(c.slug)).length;
    return (
      <div key={cat.id} className="rounded-md border border-tg-border bg-tg-card overflow-hidden">
        <button type="button" onClick={() => toggleCat(cat.id)} aria-expanded={isOpen}
          title={cat.label}
          className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs">
          <span aria-hidden>{cat.emoji}</span>
          <span className="font-semibold truncate">{cat.label}</span>
          {selectedInCat > 0 && (
            <span className="text-tg-accent font-semibold flex-shrink-0">[{selectedInCat}]</span>
          )}
          <span className="ml-auto text-tg-hint flex-shrink-0">{isOpen ? '▾' : '▸'}</span>
        </button>
        {isOpen && (
          <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-0.5">
            {cat.cuisines.map((cu) => {
              const sel = selected.includes(cu.slug);
              const dim = !sel && selected.length >= MAX_SELECTED;
              return (
                <button key={cu.slug} type="button" onClick={() => toggle(cu.slug)} aria-pressed={sel}
                  className={`px-1.5 py-0.5 rounded-full border text-[10px] leading-tight whitespace-nowrap transition-colors ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : `bg-tg-bg text-tg-text border-tg-border ${dim ? 'opacity-40' : ''}`}`}>
                  {sel ? '✓ ' : ''}{cu.name}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Even-index categories go to the left column, odd-index to the
  // right. Preserves the brief's "Row 1 = Common + Southeast Asian"
  // pairing at first paint (before any drawer is opened).
  const leftCol = catalogue.filter((_, i) => i % 2 === 0);
  const rightCol = catalogue.filter((_, i) => i % 2 === 1);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5 items-start">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {leftCol.map(renderCategory)}
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {rightCol.map(renderCategory)}
        </div>
      </div>
      {selected.length > 0 && (
        <div className="flex justify-between items-center text-[11px] text-tg-hint px-1 pt-0.5">
          <span>{selected.length} cuisine{selected.length === 1 ? '' : 's'} selected{selected.length === MAX_SELECTED ? ' (max)' : ''}</span>
          <button onClick={() => onChange([])} className="underline">Clear all</button>
        </div>
      )}
    </div>
  );
}
