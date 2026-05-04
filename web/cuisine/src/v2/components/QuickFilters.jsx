import React from 'react';

const TOGGLES = [
  { key: 'newlyOpened', label: 'New',          icon: '🆕' },
  { key: 'openNow',    label: 'Open now',     icon: '🟢' },
  { key: 'walking20',  label: '≤20 min walk', icon: '🚶' },
  { key: 'halal',      label: 'Halal',        icon: '🕌' },
  { key: 'vegetarian', label: 'Vegetarian',   icon: '🥗' },
  { key: 'homeBased',  label: 'Home-based',   icon: '🏠' }
];
const PRICES = ['$', '$$', '$$$'];

function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active}
      className={`px-2.5 py-1 rounded-full border text-xs whitespace-nowrap transition-colors ${active ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
      {children}
    </button>
  );
}

export default function QuickFilters({ filters, onChange }) {
  function toggle(key) { onChange({ ...filters, [key]: !filters[key] }); }
  function togglePrice(p) {
    const has = filters.prices.includes(p);
    onChange({ ...filters, prices: has ? filters.prices.filter((x) => x !== p) : [...filters.prices, p] });
  }
  // v0.57.24: split toggles + prices into two visual rows so the
  // chip block has predictable height (one row of toggles wrapping
  // as needed, one row of prices below).
  return (
    <div className="flex flex-col gap-1.5 px-0.5">
      <div className="flex flex-wrap gap-1.5">
        {TOGGLES.map((t) => (
          <Chip key={t.key} active={!!filters[t.key]} onClick={() => toggle(t.key)}>
            <span className="mr-1">{t.icon}</span>{t.label}
          </Chip>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PRICES.map((p) => (
          <Chip key={p} active={filters.prices.includes(p)} onClick={() => togglePrice(p)}>{p}</Chip>
        ))}
      </div>
    </div>
  );
}
