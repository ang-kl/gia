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

export default function InsightStrip({ venues, loading }) {
  const [lang] = useLocale();
  if (loading || !Array.isArray(venues) || venues.length === 0) return null;

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

  return (
    <div
      className="px-2.5 py-1 mb-1 rounded-md bg-tg-card text-tg-text text-[11px] leading-snug border border-tg-border flex items-center gap-1 overflow-x-auto whitespace-nowrap"
      role="status"
      aria-label="search insights"
    >
      <span aria-hidden className="shrink-0">🔍</span>
      <span className="truncate">{parts.join('  ·  ')}</span>
    </div>
  );
}
