import React, { useEffect, useState } from 'react';

const MAX_SELECTED = 5;

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

  return (
    <div className="flex flex-col gap-1">
      {catalogue.map((cat) => {
        const isOpen = !!open[cat.id];
        const selectedInCat = cat.cuisines.filter((c) => selected.includes(c.slug)).length;
        return (
          <div key={cat.id} className="rounded-md border border-tg-border bg-tg-card overflow-hidden">
            <button type="button" onClick={() => toggleCat(cat.id)} aria-expanded={isOpen}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs">
              <span>{cat.emoji}</span>
              <span className="font-semibold">{cat.label}</span>
              <span className="text-tg-hint">({cat.cuisines.length})</span>
              {selectedInCat > 0 && <span className="ml-1 text-tg-accent font-semibold">· {selectedInCat} selected</span>}
              <span className="ml-auto text-tg-hint">{isOpen ? '▾' : '▸'}</span>
            </button>
            {isOpen && (
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-0.5">
                {cat.cuisines.map((cu) => {
                  const sel = selected.includes(cu.slug);
                  const dim = !sel && selected.length >= MAX_SELECTED;
                  return (
                    <button key={cu.slug} type="button" onClick={() => toggle(cu.slug)} aria-pressed={sel}
                      className={`px-2 py-0.5 rounded-full border text-[11px] whitespace-nowrap transition-colors ${sel ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : `bg-tg-bg text-tg-text border-tg-border ${dim ? 'opacity-40' : ''}`}`}>
                      {sel ? '✓ ' : ''}{cu.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
      {selected.length > 0 && (
        <div className="flex justify-between items-center text-[11px] text-tg-hint px-1 pt-0.5">
          <span>{selected.length} cuisine{selected.length === 1 ? '' : 's'} selected{selected.length === MAX_SELECTED ? ' (max)' : ''}</span>
          <button onClick={() => onChange([])} className="underline">Clear all</button>
        </div>
      )}
    </div>
  );
}
