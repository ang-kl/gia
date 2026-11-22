import React from 'react';
import { useLocale, tn } from '../lib/i18n.js';
import { deriveInsights } from '../lib/insights.js';

// Search Insights strip (PR2) — a slim, SOLID (no glass) one-liner above the
// results giving an objective read of THIS search: count · median price ·
// best value · hidden gems. Computed live from the venues already on screen
// (deriveInsights, PR1); stores nothing. CVD-safe (★ + words, no red/green).
// Renders nothing while loading or when there are no results.

// The TMA formats prices server-side (venue.priceRangeDisplay, e.g. "S$25–40").
// Derive the same currency symbol by reading the leading non-digit run off the
// first venue that has a display string, so the strip's prices match the cards.
function currencySymbol(venues) {
  for (const v of venues) {
    const d = v && v.priceRangeDisplay;
    if (d) {
      const m = String(d).match(/^[^\d]+/);
      if (m) return m[0].trim();
    }
  }
  return '';
}

// Shared builder — the insight segments for a result set, localised. Used by
// the strip (below) AND the copy-to-chat line (PR3) so they never drift.
export function insightParts(venues, lang) {
  if (!Array.isArray(venues) || venues.length === 0) return [];
  const { count, medianPrice, bestValue, gemCount } = deriveInsights(venues);
  const sym = currencySymbol(venues);
  const money = (n) => `${sym}${Math.round(n)}`;
  const parts = [tn('insights.count', lang, { n: count })];
  if (medianPrice) parts.push(tn('insights.median', lang, { price: money(medianPrice.value) }));
  if (bestValue) {
    parts.push(`★ ${tn('insights.best', lang, {
      name: bestValue.name,
      rating: bestValue.rating.toFixed(1),
      price: money(bestValue.price),
    })}`);
  }
  if (gemCount > 0) parts.push(tn('insights.gems', lang, { n: gemCount }));
  return parts;
}

// Plain one-line text for copy-to-chat (no leading 🔍 emoji).
export function insightLineText(venues, lang) {
  return insightParts(venues, lang).join(' · ');
}

// Small UI words, localised inline.
//
// v0.62.836 — THESE STOPPED AT FIVE LOCALES WHILE THE APP WENT TO EIGHT. Operator,
// from a Japanese session: "some components are still not translated" — the strip
// read "1 gems" under Japanese chrome because zh, ja and es were never added when
// they shipped in the v0.62.49x arc, and `word()`'s `|| WORD[k].en` fallback turned
// that omission into plausible-looking English rather than anything that failed.
// A fallback that cannot be distinguished from a translation is how this hid.
const WORD = {
  spots: { en: 'spots', fr: 'lieux', id: 'tempat', ru: 'мест', de: 'Orte', zh: '家', ja: '件', es: 'sitios', ko: '곳' },
  med: { en: 'med.', fr: 'méd.', id: 'med.', ru: 'медиана', de: 'Median', zh: '中位', ja: '中央値', es: 'med.', ko: '중앙값' },
  pp: { en: 'pp', fr: 'pp', id: 'pp', ru: '/чел', de: 'pP', zh: '/人', ja: '/人', es: 'pp', ko: '/인' },
  gems: { en: 'gems', fr: 'pépites', id: 'permata', ru: 'находок', de: 'Geheimtipps', zh: '宝藏', ja: '穴場', es: 'joyas', ko: '숨은 맛집' },
};
const word = (k, lang) => (WORD[k][lang] || WORD[k].en);

// v0.62.x — operator-designed "insight banner": full-bleed, squared, left accent
// bar. Compact (panel-header size). Stats are non-interactive; the hero pick IS
// tappable (onSelectVenue focuses that venue's result card). Light/dark via the
// existing data-theme.
export default function InsightStrip({ venues, loading, onSelectVenue, className, inline = false }) {
  const [lang] = useLocale();
  if (loading || !Array.isArray(venues) || venues.length === 0) return null;

  const { priceRange, bestValue, gemCount } = deriveInsights(venues);
  const sym = currencySymbol(venues);
  const money = (n) => `${sym}${Math.round(n)}`;
  const rangeText = priceRange
    ? (Math.round(priceRange.min) === Math.round(priceRange.max)
      ? money(priceRange.min)
      : `${money(priceRange.min)} ~ ${Math.round(priceRange.max)}`)
    : null;

  // Accessible summary built from whatever sub-insights are present.
  const ariaBits = [];
  if (rangeText) ariaBits.push(rangeText.replace('~', 'to'));
  if (gemCount > 0) ariaBits.push(`${gemCount} ${word('gems', lang)}`);
  if (bestValue) ariaBits.push(`${bestValue.name} ${bestValue.rating.toFixed(1)} ~${money(bestValue.price)} ${word('pp', lang)}`);
  if (!rangeText && !gemCount && !bestValue) return null;

  // v0.62.x — INLINE variant: a slim CENTRE pill that lives BETWEEN the 💬 and 🔍
  // FABs in the bottom dock. Neo-glassmorphism, 75% opaque (bg-tg-card/75 +
  // liquid-glass), so the map reads faintly through it. flex-1 + min-w-0 to claim
  // the gap and truncate the venue name; pointer-events-none wrapper (only the
  // hero pick re-enables clicks) so it never blocks the result cards above.
  if (inline) {
    return (
      // self-end + -mb-1.5 pulls the pill down to sit FLUSH on the footer (cancels
      // the dock's gap-1.5), while the 💬/🔍 FABs keep their original centred place.
      // max-w + overflow-x-auto (no-scrollbar) → a short, tiny-rounded glass pill
      // that scrolls left/right when the content (full venue name) is wider; no
      // truncation. pointer-events-auto so it can be scrolled / the hero tapped.
      <div
        className="insight-glass pointer-events-auto self-end -mb-2 flex-1 min-w-0 mx-0.5 overflow-x-auto no-scrollbar rounded-sm bg-tg-card/75 backdrop-blur-md shadow-md px-2.5 py-1 text-[11px] leading-none text-tg-hint"
        role="note"
        aria-label={ariaBits.join(', ')}
      >
        <div className="flex items-center gap-1.5 w-max">
          {rangeText && <span className="font-semibold text-tg-text whitespace-nowrap">{rangeText}</span>}
          {gemCount > 0 && (
            <>
              {rangeText && <span aria-hidden="true">·</span>}
              <span className="whitespace-nowrap"><b className="text-tg-text">{gemCount}</b>&nbsp;{word('gems', lang)}</span>
            </>
          )}
          {bestValue && (
            <>
              <span aria-hidden="true" className="opacity-40 px-0.5">|</span>
              <button
                type="button"
                className="flex items-center gap-0.5 active:scale-95 whitespace-nowrap"
                onClick={() => { if (bestValue.id) onSelectVenue?.(bestValue.id); }}
                aria-label={`${bestValue.name} — ${bestValue.rating.toFixed(1)}, ~${money(bestValue.price)} ${word('pp', lang)}`}
              >
                <span aria-hidden="true" className="text-tg-link">★</span>
                <span className="font-semibold text-tg-text whitespace-nowrap">{bestValue.name}</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`insight-banner ${className ?? '-mx-3 md:-mx-6 lg:-mx-8'}`} role="note" aria-label={ariaBits.join(', ')}>
      {/* magnifier mark */}
      <svg className="insight-banner__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span className="insight-banner__stats">
        {rangeText && <span className="insight-banner__range">{rangeText}</span>}
        {gemCount > 0 && (
          <>
            {rangeText && <span className="insight-banner__dot" aria-hidden="true">·</span>}
            <span><b>{gemCount}</b>&nbsp;{word('gems', lang)}</span>
          </>
        )}
      </span>
      {bestValue && (
        <>
          <span className="insight-banner__rule" aria-hidden="true" />
          <button
            type="button"
            className="insight-banner__hero"
            onClick={() => { if (bestValue.id) onSelectVenue?.(bestValue.id); }}
            aria-label={`${bestValue.name} — ${bestValue.rating.toFixed(1)}, ~${money(bestValue.price)} ${word('pp', lang)}`}
          >
            <svg className="insight-banner__star" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2l2.9 6.26 6.6.55-5 4.32 1.5 6.6L12 17.3 6 19.6l1.5-6.6-5-4.32 6.6-.55z" />
            </svg>
            <span className="insight-banner__name">{bestValue.name}</span>
            <span className="insight-banner__meta">{bestValue.rating.toFixed(1)}&nbsp;·&nbsp;~{money(bestValue.price)}&nbsp;{word('pp', lang)}</span>
          </button>
        </>
      )}
    </div>
  );
}
