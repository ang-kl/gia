import React, { useState } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.58.1: below-map filter strip. Primary row keeps the highest-
// signal toggles surfaced (Open-now / Halal); the rest of the quick
// filters live behind the [⚙ Filters] overflow.
// v0.58.6: price chips ($/$$/$$$) promoted from the [⚙ Filters] panel
// into a Price-▾ dropdown on the primary row. The Price popover and
// the Filters popover are mutually exclusive so opening one closes the
// other.
// v0.58.14: per Human Lead — swapped 🆕 New ↔ 🟢 Open now between
// PRIMARY and OVERFLOW. New is now on the primary row beside Halal;
// Open now moved into the [⚙ Filters] panel.
// v0.58.55: chip labels resolve through i18n.t() per active locale.
const PRIMARY = [
  { key: 'newlyOpened', i18n: 'filter.newlyOpened', icon: '🆕' },
  { key: 'halal',       i18n: 'filter.halal',       icon: '🕌' }
];
const OVERFLOW = [
  { key: 'openNow',    i18n: 'filter.openNow',    icon: '🟢' },
  { key: 'vegetarian', i18n: 'filter.vegetarian', icon: '🥗' },
  { key: 'homeBased',  i18n: 'filter.homeBased',  icon: '🏠' }
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
  const [lang] = useLocale();
  const [priceOpen, setPriceOpen] = useState(false);
  const [moreOpen, setFiltersOpen] = useState(false);

  function toggle(key) { onChange({ ...filters, [key]: !filters[key] }); }
  function togglePrice(p) {
    const has = (filters.prices || []).includes(p);
    onChange({ ...filters, prices: has ? filters.prices.filter((x) => x !== p) : [...(filters.prices || []), p] });
  }

  function openPrice() { setPriceOpen((o) => !o); setFiltersOpen(false); }
  function openFilters()  { setFiltersOpen((o) => !o);  setPriceOpen(false); }

  const overflowActiveCount = OVERFLOW.filter((f) => !!filters[f.key]).length;
  const selectedPrices = filters.prices || [];
  const priceLabel = selectedPrices.length ? selectedPrices.join(' ') : tr('filter.price', lang);
  // 'New' as a heading-style label gets a short form; the i18n table's
  // 'filter.newlyOpened' is "Newly opened" / "Récemment ouvert" — too
  // wide for a chip. We special-case "New" / "Nouv." inline here.
  const labelFor = (key, fallbackI18nKey) => {
    if (key === 'newlyOpened') return lang === 'fr' ? 'Nouv.' : 'New';
    return tr(fallbackI18nKey, lang);
  };

  return (
    <div className="flex flex-col gap-1.5 px-0.5">
      <div className="flex flex-wrap gap-1.5 items-center">
        {PRIMARY.map((f) => (
          <Chip key={f.key} active={!!filters[f.key]} onClick={() => toggle(f.key)}
            ariaLabel={`${labelFor(f.key, f.i18n)} ${filters[f.key] ? '(on)' : '(off)'}`}>
            <span className="mr-1">{f.icon}</span>{labelFor(f.key, f.i18n)}
          </Chip>
        ))}
        <Chip active={selectedPrices.length > 0 || priceOpen} onClick={openPrice}
          ariaLabel={priceOpen ? tr('filter.closePrice', lang) : tr('filter.openPrice', lang)}>
          <span className="mr-1" aria-hidden>💲</span>{priceLabel}
          <span className="ml-1" aria-hidden>{priceOpen ? '▴' : '▾'}</span>
        </Chip>
        <Chip active={moreOpen} onClick={openFilters}
          ariaLabel={moreOpen ? tr('filter.closeMore', lang) : tr('filter.openMore', lang)}>
          <span className="mr-1" aria-hidden>⚙</span>{lang === 'fr' ? 'Filtres' : 'Filters'}
          {overflowActiveCount > 0 && (
            <span className="ml-1" aria-label={`${overflowActiveCount} more active`}>·{overflowActiveCount}</span>
          )}
        </Chip>
      </div>
      {priceOpen && (
        <div className="flex flex-wrap gap-1.5 px-2 py-2 rounded-md border border-tg-border bg-tg-card">
          {PRICES.map((p) => (
            <Chip key={p} active={selectedPrices.includes(p)} onClick={() => togglePrice(p)}
              ariaLabel={`${tr('filter.price', lang)} ${p}`}>{p}</Chip>
          ))}
        </div>
      )}
      {moreOpen && (
        <div className="flex flex-wrap gap-1.5 px-2 py-2 rounded-md border border-tg-border bg-tg-card">
          {OVERFLOW.map((f) => (
            <Chip key={f.key} active={!!filters[f.key]} onClick={() => toggle(f.key)}
              ariaLabel={`${labelFor(f.key, f.i18n)} ${filters[f.key] ? '(on)' : '(off)'}`}>
              <span className="mr-1">{f.icon}</span>{labelFor(f.key, f.i18n)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
