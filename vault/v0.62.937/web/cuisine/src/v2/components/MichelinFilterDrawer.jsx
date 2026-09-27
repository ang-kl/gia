// MichelinFilterDrawer.jsx — v0.62.700
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
// SEMANTICS (unchanged from v0.62.676, and matching the server in
// michelin-year-filter.js): INDEPENDENT ticks, all default ON, union across
// parallel buckets — not a year × category matrix. A year tick gates STAR
// entries by `awardYears` membership; Bib Gourmand is its own bucket and is
// never cross-filtered by year. v0.62.700 makes the COUNT of year ticks a
// property of the data rather than of this file, so "three" is now "however
// many editions exist" — the semantics did not change, only the arity.
//
// v0.62.696 — a year with no holders in the current country is DISABLED rather
// than offered. Singapore is the live case: its 2026 star selection is
// unannounced (ceremony 04-08 '26), so every SG star carries only "'25" and a
// 2026 tick could never change a single result. Offering it was the larger half
// of the operator's "none of them works".

import React from 'react';
import { useLocale, t as tr, tn } from '../lib/i18n.js';
import { useDialog } from '../../../../_shared/lib/use-dialog.js';
// v0.62.700 (O-124) — the year ticks are DATA-DRIVEN. This file used to hold a
// literal [2026, 2025] pair, so a '27 edition needed a code change here (and in
// four other places) before anyone could filter by it — while the ticks carried
// on looking perfectly functional. The list now comes from the catalogue's
// michelinYearsByCC; the pure part lives in lib/michelin-years.js so it can be
// tested without a React harness (O-93).
import { buildMichelinKeys, tickTokens, soleCheckedKey } from '../lib/michelin-years.js';

export default function MichelinFilterDrawer({ value, onChange, onClose, availableYears = null, allYears = null }) {
  const [lang] = useLocale();
  const dialogRef = useDialog({ onClose });
  // WHICH ticks exist: the union of every country's editions (`allYears`), so
  // a year is offered — greyed, with a reason — even where it has no holders
  // yet. That greying is D-65's "a control that cannot change the result must
  // not be offered", and it only works if the year is in the list to begin
  // with; driving the list from the per-country set alone would make Singapore's
  // unannounced 2026 silently vanish instead of explaining itself.
  const keys = buildMichelinKeys(tickTokens({ allYears, availableYears }));
  // WHETHER a tick is live: the per-country list from /api/cuisine/catalogue
  // (michelinYearsByCC). Null/absent → fail OPEN and offer every tick, the same
  // convention the server uses for a null michelinCuisines allow-list.
  const has = (token) => !Array.isArray(availableYears) || availableYears.includes(token);
  // v0.62.701 (O-131) — the last checked tick cannot be unticked. Unticking it
  // would select nothing, which the server answers by returning everything
  // (fail-open), so the tap would appear to do nothing — D-69. Locking it is
  // the same treatment D-65 gives an unavailable year, for the same reason: a
  // control that cannot produce a meaningful result is not offered as if it can.
  const lockedKey = soleCheckedKey(keys, value, has);

  // Absence means ON, on the wire and in the hash alike, so only an explicit
  // OFF is ever written. That is what lets a new edition arrive without any
  // key being added anywhere — "everything not switched off" already has it.
  const set = (key, next) => onChange({ ...(value || {}), [key]: next });

  return (
    <div
      /* v0.62.702 (O-130) — z-30 → z-40. At z-30 this dialog sat on the SAME
         tier as Cuisine's footer dock (App.jsx:5591), and the footer renders
         LATER in the DOM (5591 > 4592), so at equal z the footer won: it stayed
         visible and tappable over this dialog's scrim while `aria-modal="true"`
         claimed the rest of the app was inert. Measured by hit-test against the
         compiled stylesheet, not inferred — at z-30 a tap on the footer band
         returned the footer; at z-40 it returns this scrim.
         z-40 is Cuisine's OWN modal tier (App.jsx:3653/3730/3842, ArrivalPlate,
         CuisineCategoryDrawer:249), and it is re-derived here rather than
         copied (D-70): above the z-30 chrome tier, below the z-50 loading /
         fun-fact overlays that must cover a dialog. The FAB clusters at
         `relative z-40` live INSIDE the footer's own z-30 stacking context, so
         they cannot escape it — this dialog covers them too. */
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50"
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
            aria-label={tr('loc.close', lang)}
            className="text-tg-hint text-sm leading-none px-1 flex-shrink-0"
          >✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
          <div className="text-[11px] text-tg-hint">{tr('michelin.filterHeader', lang)}</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {keys.map(({ key, year, token }) => {
              const checked = (value ? value[key] : true) !== false;
              const available = token == null ? true : has(token);
              const locked = available && key === lockedKey;
              const label = year == null ? tr('michelin.bibLabel', lang) : String(year);
              const aria = year == null
                ? tr('michelin.bibLabel', lang)
                : tn('michelin.yearAria', lang, { year });
              return (
                <button
                  key={key}
                  type="button"
                  role="checkbox"
                  disabled={!available || locked}
                  aria-checked={available ? checked : false}
                  aria-label={!available
                    ? `${aria} — ${tr('michelin.yearUnavailable', lang)}`
                    : locked
                      ? `${aria} (on) — ${tr('michelin.lastTick', lang)}`
                      : `${aria} ${checked ? '(on)' : '(off)'}`}
                  title={!available
                    ? tr('michelin.yearUnavailable', lang)
                    : locked ? tr('michelin.lastTick', lang) : undefined}
                  onClick={() => available && !locked && set(key, !checked)}
                  className={`gia-hit px-2 py-1 rounded-full border text-[11px] whitespace-nowrap transition-colors ${
                    !available
                      ? 'bg-tg-card text-tg-hint/50 border-tg-border cursor-default line-through'
                      : locked
                        ? 'bg-tg-accent text-tg-accent-text border-tg-accent opacity-70 cursor-default'
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
          {Array.isArray(availableYears) && keys.some(({ token }) => token && !has(token)) && (
            <div className="text-[11px] text-tg-hint leading-snug">
              {tr('michelin.yearUnavailableNote', lang)}
            </div>
          )}
          {/* Says WHY the last tick will not turn off, so it reads as a floor
              rather than as an unresponsive control (O-131). */}
          {lockedKey && (
            <div className="text-[11px] text-tg-hint leading-snug">
              {tr('michelin.lastTickNote', lang)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
