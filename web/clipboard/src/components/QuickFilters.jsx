import React, { useState, useEffect } from 'react';
import { useLocale, t as tr } from '../lib/i18n.js';

// v0.62.516 — VERBATIM port of web/cuisine/src/v2/components/QuickFilters.jsx
// so the Sketchbook "Cuisine & Filter" folio follows the Cuisine TMA EXACTLY
// (operator: "follows meant layout exactly the same as Cuisine, the logic is
// based on the saved cards in Sketchbook"). Two adaptations only:
//   1. clipboard's useLocale() returns a STRING (cuisine's returns [lang,set]) →
//      `const lang = useLocale();`  (not `const [lang] = useLocale();`).
//   2. a `disabledKeys` prop greys + click-blocks chips with no per-saved-card
//      data source (New / Home-based / Recommend are search-query rewrites, not
//      venue booleans — honest to show-but-disable rather than fabricate).
// Everything else is the Cuisine source unchanged.

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
  // v0.62.37 — Recommend (operator: "checkbox 'Recommend' next to
  // vegetarian, uncheck default"; follow-up: NO ⭐ on the chip — the label
  // is the plain word). Wires the search to the dish layer — cuisine
  // special dishes (overlay) + the city's unique dishes.
  { key: 'recommend',   i18n: 'filter.recommend',   icon: '' },
  { key: 'homeBased',   i18n: 'filter.homeBased',   icon: '🏠' }
];
const PRICES = ['$', '$$', '$$$', '$$$$'];

// v0.61.426 — rating pill. The standard preset floor (matches
// venue-filters.RATING_FLOOR + rating-pref.DEFAULT_RATING). The pill is
// "toggled on" at this value out of the box.
const RATING_PRESET = '3.7';
const RATING_MIN = 1.0;
const RATING_MAX = 5.0;

// Parse a custom-field entry. v0.61.438 (code review F10/F11):
//   ''/whitespace → null (Number('') is 0, which silently became '1.0' —
//                   an accidental floor-off; Save now falls back to the
//                   3.7 preset instead)
//   0 / 0.0       → 'any' (the documented /rating convention "0 = any
//                   rating"; the old clamp turned 0 into a ≥1.0 floor —
//                   the OPPOSITE of what the user asked)
//   1.0–5.0       → that value, 1 decimal
//   out-of-range / junk → null (REJECTED, not clamped — typing 9 used to
//                   silently save a ≥5.0 floor; chat /rating rejects it)
function normalizeCustomRating(raw) {
  const str = String(raw == null ? '' : raw).replace(',', '.').trim();
  if (!str) return null;
  const n = Number(str);
  if (!Number.isFinite(n)) return null;
  if (n === 0) return 'any';
  if (n < RATING_MIN || n > RATING_MAX) return null;
  return (Math.round(n * 10) / 10).toFixed(1);
}

// Map a stored rating value to the panel's radio selection. Any numeric
// value that isn't the preset lands on the custom field.
function ratingSelectionFor(value) {
  if (value === 'unrated' || value === 'any' || value === RATING_PRESET) {
    return { sel: value, custom: '' };
  }
  return { sel: 'custom', custom: typeof value === 'string' ? value : '' };
}

// Short pill label for the current saved value.
function ratingPillLabel(value, lang, t) {
  if (value === 'unrated') return t('rating.pillNoRating', lang);
  if (value === 'any') return t('rating.pillAny', lang);
  return `≥${value}`;
}

function Chip({ active, onClick, children, ariaLabel }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} aria-label={ariaLabel}
      className={`px-2 py-1 rounded-full border text-xs whitespace-nowrap transition-colors ${active ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'bg-tg-card text-tg-text border-tg-border'}`}>
      {children}
    </button>
  );
}

// v0.61.426 — radio indicator for the rating panel. Selection is shown
// by SHAPE (filled vs empty dot) + border weight, not colour alone, so a
// red-green colour-blind user can still tell the active option apart.
function RadioDot({ checked }) {
  return (
    <span aria-hidden
      className={`inline-flex shrink-0 items-center justify-center w-4 h-4 rounded-full border-2 ${checked ? 'border-tg-accent' : 'border-tg-border'}`}>
      {checked && <span className="w-2 h-2 rounded-full bg-tg-accent" />}
    </span>
  );
}

// One mutually-exclusive rating choice — a ≥44px tappable cell. Used in a
// 2-up grid (v0.61.428), so a cell WITH a hint top-aligns its dot (the hint
// wraps beneath the label); a hint-less cell (Good+) centres the dot + label
// vertically (v0.62.x operator alignment fix).
function RatingOption({ checked, onSelect, label, hint }) {
  return (
    <button type="button" role="radio" aria-checked={checked} onClick={onSelect}
      className={`flex ${hint ? 'items-start' : 'items-center'} gap-2 w-full min-h-[44px] px-2 py-1.5 rounded-md border text-left transition-colors ${checked ? 'border-tg-accent' : 'border-tg-border'} bg-tg-bg`}>
      <span className={hint ? 'mt-0.5' : ''}><RadioDot checked={checked} /></span>
      <span className="flex flex-col">
        <span className={`text-xs text-tg-text ${checked ? 'font-medium' : ''}`}>{label}</span>
        {hint && <span className="text-[0.6rem] italic leading-snug text-tg-hint">{hint}</span>}
      </span>
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
// v0.62.516 (Sketchbook) — `disabledKeys` greys + blocks chips whose flag
// has no per-saved-card data source (New / Home-based / Recommend).
export default function QuickFilters({ filters, onChange, specialModeActive = false, ratingPref = RATING_PRESET, onRatingSave, ratingDisabled = false, onClose, disabledKeys = [] }) {
  const lang = useLocale();
  const [moreOpen, setFiltersOpen] = useState(false);
  // v0.61.426 — rating pill panel. `ratingOpen` toggles the 4-option
  // panel just below the pill; `ratingSel` / `ratingCustom` hold the
  // in-progress draft (committed only on Save). The panel and the
  // ⚙ Filters overflow are mutually exclusive (opening one closes the
  // other) so two stacked panels never overlap.
  const [ratingOpen, setRatingOpen] = useState(false);
  const initialDraft = ratingSelectionFor(ratingPref);
  const [ratingSel, setRatingSel] = useState(initialDraft.sel);
  const [ratingCustom, setRatingCustom] = useState(initialDraft.custom);
  // v0.61.428 — Save-button state. Red "Save" until tapped, then bright
  // green "✓ Saved" (the label change carries the state without relying on
  // colour — the operator is red-green colour-blind). Auto-closes shortly
  // after so the confirmation is visible first.
  const [ratingSaved, setRatingSaved] = useState(false);

  // v0.61.429 — when the rating control is disabled (Michelin / Bib
  // Gourmand selected), close the panel if it was left open.
  useEffect(() => {
    if (ratingDisabled && ratingOpen) setRatingOpen(false);
  }, [ratingDisabled, ratingOpen]);

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
    // v0.62.516 — greyed chips (no saved-card data) never toggle.
    if (disabledKeys.includes(key)) return;
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

  function openFilters()  { setFiltersOpen((o) => { const n = !o; if (n) setRatingOpen(false); return n; }); }

  // v0.61.426 — open/close the rating panel. On open, re-sync the draft
  // to the current saved value (it may have changed since mount via the
  // chat /rating command) and close the ⚙ Filters overflow.
  function openRating() {
    if (ratingDisabled) return;          // v0.61.429 — N/A for Michelin
    setRatingOpen((o) => {
      const next = !o;
      if (next) {
        const d = ratingSelectionFor(ratingPref);
        setRatingSel(d.sel);
        setRatingCustom(d.custom);
        setRatingSaved(false);          // fresh open → red "Save"
        setFiltersOpen(false);
      }
      return next;
    });
  }
  function chooseRating(sel) {
    setRatingSel(sel);
    setRatingSaved(false);              // changing a choice re-arms the red "Save"
    // Picking a non-custom option clears any stale custom entry.
    if (sel !== 'custom') setRatingCustom('');
  }
  function saveRating() {
    const value = ratingSel === 'custom'
      ? (normalizeCustomRating(ratingCustom) || RATING_PRESET)
      : ratingSel;                                   // 'unrated' | 'any' | '3.7'
    if (typeof onRatingSave === 'function') onRatingSave(value);
    // Show the green "✓ Saved" confirmation, then close the panel.
    setRatingSaved(true);
    setTimeout(() => { setRatingOpen(false); setRatingSaved(false); }, 900);
  }

  const overflowActiveCount = OVERFLOW.filter((f) => !!filters[f.key]).length;
  const selectedPrices = filters.prices || [];
  // v0.60.182 → v0.60.188 — chip labels resolve through i18n.t() per
  // active locale. 'New' as a heading-style label gets a short form;
  // the i18n table's 'filter.newlyOpened' is "Newly opened" /
  // "Récemment ouvert" — too wide for a chip. We special-case "New" /
  // "Nouv." inline here.
  const labelFor = (key, fallbackI18nKey) => {
    if (key === 'newlyOpened') return tr('qf.new', lang);
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
          // v0.62.516 — plus any key in disabledKeys (no saved-card data).
          const chipDisabled = (specialModeActive && f.key === 'halal') || disabledKeys.includes(f.key);
          // v0.61.255 — operator: "For Halal button, use 'حلال' (bold)
          // and remove both the mosque emoji + 'Halal' word, take note
          // of the dark/light mode font". Display the Arabic glyph only;
          // internal `halal` filter key + `filter.halal` i18n value
          // stay unchanged so the search request + aria labels +
          // combo-line render keep the Latin spelling.
          const isHalal = f.key === 'halal';
          const isActive = !!filters[f.key];
          return (
            <span key={f.key} className={chipDisabled ? 'opacity-40 pointer-events-none' : ''}
              aria-disabled={chipDisabled || undefined}>
              <Chip active={isActive} onClick={() => toggle(f.key)}
                ariaLabel={`${labelFor(f.key, f.i18n)} ${isActive ? '(on)' : '(off)'}${chipDisabled ? ' — disabled' : ''}`}>
                {isHalal ? (
                  // v0.61.284 — operator: "the halal background selected,
                  // the text should be contrast." When the chip is inactive
                  // the resting emerald-600 reads well on bg-tg-card; when
                  // ACTIVE the Chip wrapper flips to bg-tg-accent (cyan/
                  // blue in light mode), and emerald-600 on cyan has poor
                  // luminance contrast. Inherit the Chip's active text
                  // colour (tg-accent-text) in that state so the glyph
                  // reads white-on-cyan instead of green-on-cyan.
                  <span lang="ar" dir="rtl"
                    className={`font-bold ${isActive ? 'text-tg-accent-text' : 'text-emerald-600'}`}>حلال</span>
                ) : (
                  <>{f.icon ? <span className="mr-0.5">{f.icon}</span> : null}{labelFor(f.key, f.i18n)}</>
                )}
              </Chip>
            </span>
          );
        })}
        <Chip active={moreOpen || (overflowActiveCount + selectedPrices.length) > 0} onClick={openFilters}
          ariaLabel={moreOpen ? tr('filter.closeMore', lang) : tr('filter.openMore', lang)}>
          <span className="mr-0.5" aria-hidden>⚙</span>{tr('qf.filters', lang)}
          {(overflowActiveCount + selectedPrices.length) > 0 && (
            <span className="ml-1" aria-label={`${overflowActiveCount + selectedPrices.length} more active`}>·{overflowActiveCount + selectedPrices.length}</span>
          )}
        </Chip>
        {/* v0.61.426 — rating pill, AFTER ⚙ Filters. Default "≥3.7"
            (toggled on). Tap opens the 4-option panel below the row. The
            pill shows neutral (not active) only for "Any" — every floor /
            "No rating" choice keeps it highlighted.
            v0.61.429 — greyed + non-interactive when Michelin / Bib Gourmand
            is selected (rating doesn't apply to the curated awards list). */}
        <span className={ratingDisabled ? 'opacity-40 pointer-events-none' : ''}
          aria-disabled={ratingDisabled || undefined}>
          <Chip active={!ratingDisabled && (ratingOpen || ratingPref !== 'any')} onClick={openRating}
            ariaLabel={`${tr('rating.title', lang)}: ${ratingPillLabel(ratingPref, lang, tr)}${ratingDisabled ? ' — n/a for Michelin / Bib Gourmand' : ` — ${ratingOpen ? tr('rating.closePanel', lang) : tr('rating.openPanel', lang)}`}`}>
            <span className="mr-0.5" aria-hidden>⭐</span>{ratingPillLabel(ratingPref, lang, tr)}
          </Chip>
        </span>
        {onClose && (
          <button type="button" onClick={onClose}
            aria-label={tr('chrome.close', lang)}
            className="ml-auto text-tg-hint text-xl leading-none px-1 flex-shrink-0">×</button>
        )}
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
          {OVERFLOW.map((f) => {
            // v0.62.516 — grey + block overflow chips with no saved-card data.
            const chipDisabled = disabledKeys.includes(f.key);
            return (
              <span key={f.key} className={chipDisabled ? 'opacity-40 pointer-events-none' : ''}
                aria-disabled={chipDisabled || undefined}>
                <Chip active={!!filters[f.key]} onClick={() => toggle(f.key)}
                  ariaLabel={`${labelFor(f.key, f.i18n)} ${filters[f.key] ? '(on)' : '(off)'}${chipDisabled ? ' — disabled' : ''}`}>
                  {f.icon ? <span className="mr-0.5">{f.icon}</span> : null}{labelFor(f.key, f.i18n)}
                </Chip>
              </span>
            );
          })}
          {PRICES.map((p) => (
            <Chip key={p} active={selectedPrices.includes(p)} onClick={() => togglePrice(p)}
              ariaLabel={`${tr('filter.price', lang)} ${p}`}>{p}</Chip>
          ))}
        </div>
      )}
      {ratingOpen && (
        // v0.61.426 — rating options panel, just below the pill. Four
        // mutually-exclusive choices (radiogroup) + a custom 1.0–5.0
        // field + Save. Nothing commits until Save (then the pill
        // relabels + the value persists to Redis, shared with /rating).
        // v0.61.428 — operator: pair the choices two-per-row to shorten the
        // panel, explanations wrapped in a smaller font.
        // v0.62.x — operator layout: a "Refine Google Rating" header + two
        // rows of two —  row 1: Unrated | Any rating ;  row 2: Good+ ≥ 3.7 |
        // Set rating [Choose 1.0 to 5.0] field box.
        <div role="radiogroup" aria-label={tr('rating.title', lang)}
          className="flex flex-col gap-1.5 px-2 py-2 rounded-md border border-tg-border bg-tg-card">
          <div className="text-xs font-semibold text-tg-text px-0.5">{tr('rating.refineHeader', lang)}</div>
          <div className="grid grid-cols-2 gap-1.5">
            <RatingOption checked={ratingSel === 'unrated'} onSelect={() => chooseRating('unrated')}
              label={tr('rating.noRating', lang)} hint={tr('rating.noRatingHint', lang)} />
            <RatingOption checked={ratingSel === 'any'} onSelect={() => chooseRating('any')}
              label={tr('rating.anyRating', lang)} hint={tr('rating.anyRatingHint', lang)} />
          </div>
          <div className="grid grid-cols-2 gap-1.5 items-stretch">
            <RatingOption checked={ratingSel === RATING_PRESET} onSelect={() => chooseRating(RATING_PRESET)}
              label={`${tr('rating.goodPlus', lang)}  ≥ ${RATING_PRESET}`} hint={null} />
            {/* Set as — ONE line: radio dot + "Set as" + the 1.0–5.0 field
                (v0.62.x operator: shrink the box; both Good+ and Set as are
                single-line). Tapping the cell OR focusing the field selects it. */}
            <label className={`flex items-center gap-1.5 w-full min-h-[44px] px-2 py-1.5 rounded-md border ${ratingSel === 'custom' ? 'border-tg-accent' : 'border-tg-border'} bg-tg-bg`}>
              <RadioDot checked={ratingSel === 'custom'} />
              <span className={`text-xs text-tg-text whitespace-nowrap ${ratingSel === 'custom' ? 'font-medium' : ''}`}>{tr('rating.setRating', lang)}</span>
              <input type="number" inputMode="decimal" min={RATING_MIN} max={RATING_MAX} step="0.1"
                value={ratingCustom}
                placeholder={tr('rating.customHint', lang)}
                onFocus={() => chooseRating('custom')}
                onChange={(e) => { setRatingCustom(e.target.value); setRatingSel('custom'); setRatingSaved(false); }}
                aria-label={`${tr('rating.setRating', lang)} — ${tr('rating.customHint', lang)}`}
                className="flex-1 min-w-0 px-1.5 py-1 rounded-md border border-tg-border bg-tg-bg text-tg-text text-[16px]" />
            </label>
          </div>
          {/* Save — red "Save" until tapped, then bright green "✓ Saved".
              The label change carries the state without relying on colour
              (operator is red-green colour-blind). Small rounded rectangle. */}
          <div className="flex justify-end pt-1">
            <button type="button" onClick={saveRating} aria-live="polite"
              className={`px-3 py-1 rounded-md text-xs font-semibold text-white transition-colors ${ratingSaved ? 'bg-green-500' : 'bg-red-600'}`}>
              {ratingSaved ? `✓ ${tr('rating.saved', lang)}` : tr('rating.save', lang)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
