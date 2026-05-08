import React, { useState } from 'react';
import { tg } from '../../api/tg.js';
import { copyOneToChat } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

export default function ResultCard({ venue, focused, onTap, copyContext = {} }) {
  const [lang] = useLocale();
  if (!venue) return null;
  const rating = venue.rating ? `★${venue.rating.toFixed(1)}` : '';
  const price = PRICE_LABEL[venue.priceLevel] || '';
  // v0.59.6: standardised distance template — `350m` for <1km, `1.24km`
  // otherwise. Mirrors server-side format.formatDistance helper.
  const dist = Number.isFinite(venue.distanceM)
    ? (venue.distanceM >= 1000
        ? `${(venue.distanceM / 1000).toFixed(2)}km`
        : `${Math.round(venue.distanceM)}m`)
    : '';
  const walk = Number.isFinite(venue.walkMinutes)
    ? (lang === 'fr' ? `${venue.walkMinutes} min à pied` : `${venue.walkMinutes} min walk`)
    : '';
  // v0.58.55: localise Open / Closed.
  const open = venue.openNow === true
    ? tr('card.open', lang)
    : venue.openNow === false
      ? (venue.closedTodayLabel || tr('card.closed', lang))
      : '';
  // v0.57.31: crowd chip from LTA-carpark availability around the venue.
  // Honest caveat — weak in CBD where lunch crowds are walk-in.
  // v0.58.55: localised crowd chip text.
  const crowdMap = lang === 'fr'
    ? { high: '🔴 chargé', medium: '🟡 modéré', low: '🟢 calme' }
    : { high: '🔴 busy',  medium: '🟡 moderate', low: '🟢 quiet' };
  const crowd = crowdMap[venue.crowdLevel] || '';
  // v0.59.0: real per-venue footfall chip (BestTime). Prefers live
  // busyness; falls back to forecast. Replaces the carpark crowd chip
  // when both are present — BestTime is venue-resolved, carpark proxy
  // is at-best area-resolved.
  let footfallChip = '';
  if (venue.footfall) {
    const live = venue.footfall.liveBusyness;
    const fc   = venue.footfall.forecastNext;
    const value = Number.isFinite(live) ? live : (Number.isFinite(fc) ? fc : null);
    if (value != null) {
      const verb = lang === 'fr'
        ? (Number.isFinite(live) ? 'occupé' : 'prévu')
        : (Number.isFinite(live) ? 'busy' : 'forecast');
      footfallChip = `🚦 ${value}% ${verb}`;
    }
  }
  const livenessChip = footfallChip || crowd;
  const meta = [rating, price, open, livenessChip, dist || walk].filter(Boolean).join(' · ');

  // v0.57.13: open Google Maps via Telegram.WebApp.openLink. Inside
  // the TMA WebView, plain <a target="_blank"> often does nothing —
  // tg.openLink delegates to the system browser, which auto-routes
  // to the Google Maps app via the Universal Link.
  function openMaps(e) {
    e.preventDefault();
    e.stopPropagation();
    const name = venue.name || '';
    const placeId = venue.placeId || '';
    const url = placeId
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(placeId)}`
      : (venue.url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`);
    const w = tg();
    if (w && typeof w.openLink === 'function') {
      w.openLink(url, { try_instant_view: false });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  // v0.58.50: per-card Copy now POSTs to /api/cuisine/copy-one which
  // bot.sendMessages a T1 detail-with-sanctuary block to the user's
  // chat. The previous clipboard-only flow lost the address/hours/
  // sanctuary-read context — bot delivery gives the recipient (or
  // user pasting forward) the full standardised template.
  const [copying, setCopying] = useState(false);
  const [copied, setCopied] = useState(false);
  async function copy(e) {
    e.stopPropagation();
    if (copying) return;
    setCopying(true);
    setCopied(false);
    try {
      await copyOneToChat({
        placeId: venue.placeId,
        name: venue.name,
        area: venue.area,
        lat: venue.lat,
        lng: venue.lng,
        rating: venue.rating,
        userRatingCount: venue.userRatingCount,
        priceLevel: venue.priceLevel,
        openNow: venue.openNow,
        closedTodayLabel: venue.closedTodayLabel,
        crowdLevel: venue.crowdLevel,
        weekdayDescriptions: venue.weekdayDescriptions,
        websiteUri: venue.websiteUri,
        phone: venue.phone,
        dishes: venue.dishes,
        distanceM: venue.distanceM,
        // v0.58.53: include the v0.58.52 travel-time fields so the
        // per-card 📋 Copy clip carries the 🚊/🚘 row.
        transitMinutes: venue.transitMinutes,
        driveMinutes: venue.driveMinutes,
        url: venue.url,
        primaryType: venue.primaryType,
        lang  // v0.58.55: server localises static labels accordingly
      }, {
        // v0.59.44: forward TMA selection so /clip can group + filter
        // per-card copies by cuisine.
        cuisines: copyContext?.cuisines || [],
        filters: copyContext?.filters || {},
        region: copyContext?.region || 'SG'
      });
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.warn('[Copy-One] failed:', err.message);
      const w = tg();
      if (w && typeof w.showAlert === 'function') {
        w.showAlert(tr('err.copyFailed', lang));
      }
    } finally { setCopying(false); }
  }

  return (
    <button type="button" onClick={() => onTap?.(venue.placeId)}
      className={`w-full text-left rounded-lg border bg-tg-card p-2.5 flex flex-col gap-1 ${focused ? 'border-tg-accent' : 'border-tg-border'}`}>
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm leading-tight truncate">{venue.name}</div>
          <div className="text-[11px] text-tg-hint truncate">{meta}</div>
          {venue.area && <div className="text-[11px] text-tg-hint truncate">{venue.area}</div>}
          {/* v0.59.23: primary "What to order" line — LLM-picked
              signature dish if present (rankAndNarrate path), else
              fall back to the first reviewer-extracted dish from
              the dishes array (TMA HTTP /api/cuisine/search path
              that uses pipeline.discover() directly with no LLM
              rank). Mirrors /hidden's signature_dish surface. */}
          {(() => {
            const primaryDish = venue.signatureDish
              || (Array.isArray(venue.dishes) && venue.dishes.length ? venue.dishes[0] : '');
            const restDishes = Array.isArray(venue.dishes)
              ? (venue.signatureDish ? venue.dishes.slice(0, 3) : venue.dishes.slice(1, 4))
              : [];
            return (
              <>
                {primaryDish && (
                  <div className="text-[12px] text-tg-text mt-1 leading-snug">
                    🍴 <span className="font-medium">{tr('card.whatToOrder', lang)}</span> · {primaryDish}
                  </div>
                )}
                {restDishes.length > 0 && (
                  <div className="text-[11px] text-tg-hint mt-0.5 leading-snug">
                    {restDishes.join(' · ')}
                  </div>
                )}
              </>
            );
          })()}
          {venue.vibe && <div className="text-[12px] text-tg-text mt-1 leading-snug">{venue.vibe}</div>}
          {venue.recentReview && (
            <div className="text-[11px] text-tg-hint mt-1 leading-snug italic">
              💬 "{venue.recentReview}"
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-1.5 mt-1">
        <button type="button" onClick={openMaps}
          className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">📍 Maps</button>
        <button type="button" onClick={copy} disabled={copying}
          className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">
          {copying ? '…' : copied ? (lang === 'fr' ? '✓ Envoyé' : '✓ Sent') : tr('btn.copyOne', lang)}
        </button>
      </div>
      {/* v0.60.16 — Michelin / Bib Gourmand annotation row. Rendered
          below the Maps + Copy buttons when /api/cuisine/search
          attached michelinCategory to the venue payload. */}
      {venue.michelinCategory && (
        <div className="text-[11px] text-tg-text mt-1 font-semibold">
          {michelinAnnotation(venue.michelinCategory, venue.michelinYear || 2025, venue.michelinCuisineLabel)}
        </div>
      )}
    </button>
  );
}

// v0.60.16 — mirror the chat-card formatter (michelin-2025.js
// formatMichelinLine) so the TMA UI shows the same labels.
// v0.60.43 — append Michelin Guide's own descriptive cuisine label
// when the venue carries one (e.g. "Chilean", "Modern Indian",
// "Sushi · Authentic Japanese"). Optional — entries without it
// render unchanged.
function michelinAnnotation(category, year, cuisineLabel) {
  const labels = {
    'three-star':   '✳️ Michelin · ⭐⭐⭐',
    'two-star':     '✳️ Michelin · ⭐⭐',
    'one-star':     '✳️ Michelin · ⭐',
    'bib-gourmand': '✳️ Bib Gourmand'
  };
  const prefix = labels[category] || '✳️ Michelin';
  const label = cuisineLabel ? ` · ${cuisineLabel}` : '';
  return `${prefix} · ${year}${label}`;
}
