import React from 'react';

const TOGGLES = [
  { key: 'newlyOpened', label: 'New',          icon: '🆕' },
  { key: 'openNow',    label: 'Open now',     icon: '🟢' },
  { key: 'walking20',  label: '≤20 min walk', icon: '🚶' },
  { key: 'halal',      label: 'Halal',        icon: '🕌' },
  { key: 'vegetarian', label: 'Vegetarian',   icon: '🥗' }
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
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 px-0.5">
      {TOGGLES.map((t) => (
        <Chip key={t.key} active={!!filters[t.key]} onClick={() => toggle(t.key)}>
          <span className="mr-1">{t.icon}</span>{t.label}
        </Chip>
      ))}
      <span className="border-l border-tg-border mx-1 self-stretch" aria-hidden />
      {PRICES.map((p) => (
        <Chip key={p} active={filters.prices.includes(p)} onClick={() => togglePrice(p)}>{p}</Chip>
      ))}
    </div>
  );
}
