// MichelinFilterDrawer.jsx — v0.62.696
//
// The Michelin year / Bib Gourmand ticks, as a POPUP.
//
// Operator: "Select 'Michelin · Bib Gourmand' it should pop-up same window
// '2026', '2025', 'Bib Gourmand' like how 'Sweets & Fusion' takes effect when
// selected. Remove current showing of '2026', '2025', 'Bib Gourmand' on the
// same screen of 'Cuisine & Filters'."
//
// v0.62.676 shipped these as an inline row inside CuisineDrawer, which put a
// third kind of control on a screen that is otherwise category chips — and it
// stayed on screen for as long as Michelin was selected. This is the same modal
// shape CuisineCategoryDrawer uses (scrim + centred card + ✕), so selecting
// Michelin behaves like selecting any other category.
//
// SEMANTICS (unchanged from v0.62.676, and matching the server at index.js
// ~9709): three INDEPENDENT ticks, all default ON, union across three parallel
// buckets — not a year × category matrix. A year tick gates STAR entries by
// `awardYears` membership; Bib Gourmand is its own bucket and is never
// cross-filtered by year.
//
// v0.62.696 — a year with no holders in the current country is DISABLED rather
// than offered. Singapore is the live case: its 2026 star selection is
// unannounced (ceremony 04-08 '26), so every SG star carries only "'25" and a
// 2026 tick could never change a single result. Offering it was the larger half
// of the operator's "none of them works".

import React from 'react';
import { useLocale, t as tr, tn } from '../lib/i18n.js';
import { useDialog } from '../../../../_shared/lib/use-dialog.js';

const KEYS = [
  { key: 'year2026', year: 2026, token: "'26" },
  { key: 'year2025', year: 2025, token: "'25" },
  { key: 'bib', year: null, token: null }
];

export default function MichelinFilterDrawer({ value, onChange, onClose, availableYears = null }) {
  const [lang] = useLocale();
  const dialogRef = useDialog({ onClose });
  // `availableYears` is the per-country list from /api/cuisine/catalogue
  // (michelinYearsByCC). Null/absent → fail OPEN and offer every tick, the same
  // convention the server uses for a null michelinCuisines allow-list.
  const has = (token) => !Array.isArray(availableYears) || availableYears.includes(token);

  const set = (key, next) => onChange({
    year2026: true, year2025: true, bib: true, ...(value || {}), [key]: next
  });

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label={tr('michelin.filterHeader', lang)}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={dialogRef}
        className="flex flex-col w-full max-w-[480px] max-h-[80vh] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-2 px-3 py-3 border-b border-tg-border bg-tg-card">
          <span aria-hidden>⭐</span>
          <h2 className="text-sm font-semibold flex-1 truncate">{tr('cat.michelinBib', lang)}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={lang === 'fr' ? 'Fermer' : 'Close'}
            className="text-tg-hint text-sm leading-none px-1 flex-shrink-0"
          >✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          <div className="text-[11px] text-tg-hint">{tr('michelin.filterHeader', lang)}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {KEYS.map(({ key, year, token }) => {
              const checked = (value ? value[key] : true) !== false;
              const available = token == null ? true : has(token);
              const label = year == null ? tr('michelin.bibLabel', lang) : String(year);
              const aria = year == null
                ? tr('michelin.bibLabel', lang)
                : tn('michelin.yearAria', lang, { year });
              return (
                <button
                  key={key}
                  type="button"
                  role="checkbox"
                  disabled={!available}
                  aria-checked={available ? checked : false}
                  aria-label={available
                    ? `${aria} ${checked ? '(on)' : '(off)'}`
                    : `${aria} — ${tr('michelin.yearUnavailable', lang)}`}
                  title={available ? undefined : tr('michelin.yearUnavailable', lang)}
                  onClick={() => available && set(key, !checked)}
                  className={`gia-hit px-2 py-1 rounded-full border text-[11px] whitespace-nowrap transition-colors ${
                    !available
                      ? 'bg-tg-card text-tg-hint/50 border-tg-border cursor-default line-through'
                      : checked
                        ? 'bg-tg-accent text-tg-accent-text border-tg-accent'
                        : 'bg-tg-card text-tg-text border-tg-border'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {/* Says WHY a year is greyed, so it reads as "not published yet"
              rather than as a broken control. */}
          {Array.isArray(availableYears) && KEYS.some(({ token }) => token && !has(token)) && (
            <div className="text-[11px] text-tg-hint leading-snug">
              {tr('michelin.yearUnavailableNote', lang)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
