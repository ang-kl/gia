import React, { useState } from 'react';

// v0.58.1: below-map filter strip. Primary row keeps the highest-
// signal toggles surfaced (Open-now / Halal); the rest of the quick
// filters live behind the [⚙ More] overflow.
// v0.58.6: price chips ($/$$/$$$) promoted from the [⚙ More] panel
// into a Price-▾ dropdown on the primary row. The Price popover and
// the More popover are mutually exclusive so opening one closes the
// other.
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
  const [priceOpen, setPriceOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  function toggle(key) { onChange({ ...filters, [key]: !filters[key] }); }
  function togglePrice(p) {
    const has = (filters.prices || []).includes(p);
    onChange({ ...filters, prices: has ? filters.prices.filter((x) => x !== p) : [...(filters.prices || []), p] });
  }

  // Mutual-exclusion: opening one popover closes the other.
  function openPrice() { setPriceOpen((o) => !o); setMoreOpen(false); }
  function openMore()  { setMoreOpen((o) => !o);  setPriceOpen(false); }

  const overflowActiveCount = OVERFLOW.filter((t) => !!filters[t.key]).length;
  const selectedPrices = filters.prices || [];
  // Show the active selection ("$$") in the chip label so the user
  // doesn't have to open the popover to read their state. Empty
  // selection falls back to the neutral "Price" word.
  const priceLabel = selectedPrices.length ? selectedPrices.join(' ') : 'Price';

  return (
    <div className="flex flex-col gap-1.5 px-0.5">
      <div className="flex flex-wrap gap-1.5 items-center">
        {PRIMARY.map((t) => (
          <Chip key={t.key} active={!!filters[t.key]} onClick={() => toggle(t.key)}
            ariaLabel={t.label + (filters[t.key] ? ' (on)' : ' (off)')}>
            <span className="mr-1">{t.icon}</span>{t.label}
          </Chip>
        ))}
        <Chip active={selectedPrices.length > 0 || priceOpen} onClick={openPrice}
          ariaLabel={priceOpen ? 'Close price selector' : 'Open price selector'}>
          <span className="mr-1" aria-hidden>💲</span>{priceLabel}
          <span className="ml-1" aria-hidden>{priceOpen ? '▴' : '▾'}</span>
        </Chip>
        <Chip active={moreOpen} onClick={openMore}
          ariaLabel={moreOpen ? 'Close more filters' : 'More filters'}>
          <span className="mr-1" aria-hidden>⚙</span>More
          {overflowActiveCount > 0 && (
            <span className="ml-1" aria-label={`${overflowActiveCount} more active`}>·{overflowActiveCount}</span>
          )}
        </Chip>
      </div>
      {priceOpen && (
        <div className="flex flex-wrap gap-1.5 px-2 py-2 rounded-md border border-tg-border bg-tg-card">
          {PRICES.map((p) => (
            <Chip key={p} active={selectedPrices.includes(p)} onClick={() => togglePrice(p)}
              ariaLabel={`Price ${p}`}>{p}</Chip>
          ))}
        </div>
      )}
      {moreOpen && (
        <div className="flex flex-wrap gap-1.5 px-2 py-2 rounded-md border border-tg-border bg-tg-card">
          {OVERFLOW.map((t) => (
            <Chip key={t.key} active={!!filters[t.key]} onClick={() => toggle(t.key)}
              ariaLabel={t.label + (filters[t.key] ? ' (on)' : ' (off)')}>
              <span className="mr-1">{t.icon}</span>{t.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
