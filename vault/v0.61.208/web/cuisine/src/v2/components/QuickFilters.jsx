import React, { useState, useEffect } from 'react';
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
// v0.60.182 — operator: swap 💲 Price out of the primary row, replace
// with 🐾 Pet (shortened from "Pet allowed"). Price chip + its $/$$/$$$
// tier picker move into the [⚙ Filters] overflow popover.
const PRIMARY = [
  { key: 'newlyOpened', i18n: 'filter.newlyOpened', icon: '🆕' },
  { key: 'halal',       i18n: 'filter.halal',       icon: '🕌' },
  { key: 'petFriendly', i18n: 'filter.petFriendly', icon: '🐾' }
];
const OVERFLOW = [
  { key: 'openNow',     i18n: 'filter.openNow',     icon: '🟢' },
  { key: 'vegetarian',  i18n: 'filter.vegetarian',  icon: '🥗' },
  { key: 'homeBased',   i18n: 'filter.homeBased',   icon: '🏠' }
];
const PRICES = ['$', '$$', '$$$'];

function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      className={`px-2 py-1 rounded-full border text-xs whitespace-nowrap transition-colors ${active ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
      {children}
    </button>
  );
}

// v0.61.126 — `specialModeActive` (boolean) prop. When a special mode
// (Fruits / Durian / Durian Pastry) is on, the original behaviour
// blanket-greyed the entire QuickFilters row.
// v0.61.149 — operator refinement: $ / 🆕 New / 🟢 Open / 🥗 Veg /
// 🏠 Home / 🐾 Pet remain togglable in special mode. ONLY 🕌 Halal
// is forced off + click-blocked (durians + fruits are mostly NOT
// halal-certified in SG; the operator wants the chip auto-off so
// users don't see an empty result list from a no-op intersection).
// The auto-off useEffect below also clears any pre-existing
// filters.halal when special mode activates so the request body
// doesn't carry a stale modifier.
export default function QuickFilters({ filters, onChange, specialModeActive = false }) {
  const [lang] = useLocale();
  const [moreOpen, setFiltersOpen] = useState(false);

  // v0.61.149 — auto-clear halal when special mode flips on. Runs once
  // per specialModeActive transition; the !filters.halal short-circuit
  // skips the call when there's nothing to clear.
  useEffect(() => {
    if (specialModeActive && filters && filters.halal) {
      onChange({ ...filters, halal: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialModeActive]);

  function toggle(key) {
    // v0.61.149 — only halal is locked in special mode; other toggles
    // (newlyOpened / petFriendly / openNow / vegetarian / homeBased)
    // still work so users can refine their special-mode search.
    if (specialModeActive && key === 'halal') return;
    onChange({ ...filters, [key]: !filters[key] });
  }
  function togglePrice(p) {
    // Price chips ($ / $$ / $$$) remain togglable in special mode.
    const has = (filters.prices || []).includes(p);
    onChange({ ...filters, prices: has ? filters.prices.filter((x) => x !== p) : [...(filters.prices || []), p] });
  }

  function openFilters()  { setFiltersOpen((o) => !o); }

  const overflowActiveCount = OVERFLOW.filter((f) => !!filters[f.key]).length;
  const selectedPrices = filters.prices || [];
  // v0.60.182 → v0.60.188 — chip labels resolve through i18n.t() per
  // active locale. 'New' as a heading-style label gets a short form;
  // the i18n table's 'filter.newlyOpened' is "Newly opened" /
  // "Récemment ouvert" — too wide for a chip. We special-case "New" /
  // "Nouv." inline here.
  const labelFor = (key, fallbackI18nKey) => {
    if (key === 'newlyOpened') return lang === 'fr' ? 'Nouv.' : 'New';
    return tr(fallbackI18nKey, lang);
  };

  return (
    <div
      className="flex flex-col gap-1.5 px-0.5"
    >
      <div className="flex flex-wrap gap-1 items-center">
        {PRIMARY.map((f) => {
          // v0.61.149 — only halal gets the special-mode grey-out;
          // every other chip stays full-opacity + togglable.
          const chipDisabled = specialModeActive && f.key === 'halal';
          return (
            <span key={f.key} className={chipDisabled ? 'opacity-40 pointer-events-none' : ''}
              aria-disabled={chipDisabled || undefined}>
              <Chip active={!!filters[f.key]} onClick={() => toggle(f.key)}
                ariaLabel={`${labelFor(f.key, f.i18n)} ${filters[f.key] ? '(on)' : '(off)'}${chipDisabled ? ' — disabled in special mode' : ''}`}>
                <span className="mr-0.5">{f.icon}</span>{labelFor(f.key, f.i18n)}
              </Chip>
            </span>
          );
        })}
        <Chip active={moreOpen} onClick={openFilters}
          ariaLabel={moreOpen ? tr('filter.closeMore', lang) : tr('filter.openMore', lang)}>
          <span className="mr-0.5" aria-hidden>⚙</span>{lang === 'fr' ? 'Filtres' : 'Filters'}
          {(overflowActiveCount + selectedPrices.length) > 0 && (
            <span className="ml-1" aria-label={`${overflowActiveCount + selectedPrices.length} more active`}>·{overflowActiveCount + selectedPrices.length}</span>
          )}
        </Chip>
      </div>
      {moreOpen && (
        // v0.60.188 — operator: the previous "💲 Price ▾" dropdown
        // (v0.60.182) was unclickable inside the overflow popover
        // because `openPrice()` invoked `setFiltersOpen(false)`, which
        // closed the parent container that held the chip. Replaced
        // with three direct `$`, `$$`, `$$$` toggle chips inline with
        // the other overflow filters — no popover-in-popover, each
        // tier toggles immediately on tap.
        <div className="flex flex-wrap gap-1.5 items-center px-2 py-2 rounded-md border border-tg-border bg-tg-card">
          {OVERFLOW.map((f) => (
            <Chip key={f.key} active={!!filters[f.key]} onClick={() => toggle(f.key)}
              ariaLabel={`${labelFor(f.key, f.i18n)} ${filters[f.key] ? '(on)' : '(off)'}`}>
              <span className="mr-0.5">{f.icon}</span>{labelFor(f.key, f.i18n)}
            </Chip>
          ))}
          {PRICES.map((p) => (
            <Chip key={p} active={selectedPrices.includes(p)} onClick={() => togglePrice(p)}
              ariaLabel={`${tr('filter.price', lang)} ${p}`}>{p}</Chip>
          ))}
        </div>
      )}
    </div>
  );
}
