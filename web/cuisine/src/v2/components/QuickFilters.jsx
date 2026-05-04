import React, { useState } from 'react';

// v0.58.1: below-map filter strip. Primary row keeps the three highest-
// signal toggles surfaced (Open-now / Halal / [⚙]); the rest of the
// quick filters and price chips live behind the [⚙] overflow so the
// cuisine drawer and Search button stay above the fold. The ⚙ chip
// shows a small `·N` badge when any overflow filter is active.
const PRIMARY = [
  { key: 'openNow', label: 'Open now', icon: '🟢' },
  { key: 'halal',   label: 'Halal',     icon: '🕌' },
];
const OVERFLOW = [
  { key: 'newlyOpened', label: 'New',         icon: '🆕' },
  { key: 'vegetarian',  label: 'Vegetarian',  icon: '🥗' },
  { key: 'homeBased',   label: 'Home-based',  icon: '🏠' }
];
const PRICES = ['$', '$$', '$$$'];

function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      className={`px-2.5 py-1 rounded-full border text-xs whitespace-nowrap transition-colors ${active ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
      {children}
    </button>
  );
}

export default function QuickFilters({ filters, onChange }) {
  const [open, setOpen] = useState(false);

  function toggle(key) { onChange({ ...filters, [key]: !filters[key] }); }
  function togglePrice(p) {
    const has = (filters.prices || []).includes(p);
    onChange({ ...filters, prices: has ? filters.prices.filter((x) => x !== p) : [...(filters.prices || []), p] });
  }

  const overflowActiveCount = OVERFLOW.filter((t) => !!filters[t.key]).length
    + ((filters.prices || []).length);

  return (
    <div className="flex flex-col gap-1.5 px-0.5">
      <div className="flex flex-wrap gap-1.5 items-center">
        {PRIMARY.map((t) => (
          <Chip key={t.key} active={!!filters[t.key]} onClick={() => toggle(t.key)}
            ariaLabel={t.label + (filters[t.key] ? ' (on)' : ' (off)')}>
            <span className="mr-1">{t.icon}</span>{t.label}
          </Chip>
        ))}
        <Chip active={open} onClick={() => setOpen((o) => !o)}
          ariaLabel={open ? 'Close more filters' : 'More filters'}>
          <span className="mr-1" aria-hidden>⚙</span>More
          {overflowActiveCount > 0 && (
            <span className="ml-1" aria-label={`${overflowActiveCount} more active`}>·{overflowActiveCount}</span>
          )}
        </Chip>
      </div>
      {open && (
        <div className="flex flex-col gap-1.5 px-2 py-2 rounded-md border border-tg-border bg-tg-card">
          <div className="flex flex-wrap gap-1.5">
            {OVERFLOW.map((t) => (
              <Chip key={t.key} active={!!filters[t.key]} onClick={() => toggle(t.key)}
                ariaLabel={t.label + (filters[t.key] ? ' (on)' : ' (off)')}>
                <span className="mr-1">{t.icon}</span>{t.label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PRICES.map((p) => (
              <Chip key={p} active={(filters.prices || []).includes(p)} onClick={() => togglePrice(p)}
                ariaLabel={`Price ${p}`}>{p}</Chip>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
