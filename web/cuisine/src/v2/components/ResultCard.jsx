import React, { useEffect, useState } from 'react';
import { tg } from '../../api/tg.js';
import { copyOneToChat, fetchSocialProfiles } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';
import SocialButtons from './SocialButtons.jsx';

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
  // v0.61.246 — when the venue is currently open, prefer the
  // server-attached openClosingLabel ("Open · Closes 3:00 PM ·
  // Reopens 6:00 PM" from open-hours.js currentOpenString) over the
  // bare "Open now" string — the operator wants to see the closing
  // time AND the next reopen at a glance, especially for lunch/
  // dinner-split restaurants.
  const open = venue.openNow === true
    ? (venue.openClosingLabel || tr('card.open', lang))
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
  // v0.60.201 — operator: move Crowd / footfall chip from the top
  // meta row down to the cost-range row. Top row now drops the
  // livenessChip; the priceRange row below picks it up alongside
  // the new ♿️ accessibility marker.
  const meta = [rating, price, open, dist || walk].filter(Boolean).join(' · ');

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
  // v0.61.225 — lazy-load the venue's social-profile URLs once on
  // mount. Server caches results 30d under social:<placeId>, so most
  // browses resolve in milliseconds; cold cache calls Gemini (~1-2s)
  // but the page renders without waiting. AbortController cancels
  // in-flight fetches when the card unmounts (e.g. user navigates).
  const [socialProfiles, setSocialProfiles] = useState(null);
  useEffect(() => {
    if (!venue?.name) return;
    const controller = new AbortController();
    fetchSocialProfiles({
      placeId: venue.placeId,
      name: venue.name,
      address: venue.area,
      websiteUri: venue.websiteUri
    }, { signal: controller.signal }).then((p) => {
      if (!controller.signal.aborted) setSocialProfiles(p);
    });
    return () => controller.abort();
  }, [venue?.placeId, venue?.name]);
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
        openClosingLabel: venue.openClosingLabel,
        crowdLevel: venue.crowdLevel,
        weekdayDescriptions: venue.weekdayDescriptions,
        websiteUri: venue.websiteUri,
        phone: venue.phone,
        dishes: venue.dishes,
        distanceM: venue.distanceM,
        // v0.60.223 — operator: the copy-one card was missing the
        // 🍽️ type, the price/♿️/🐾 row, the 🍲 Try dish, the vibe /
        // review lines and the ✳️ Michelin badge because copy() never
        // forwarded these fields. /api/cuisine/copy-one passes the
        // whole venue body straight to formatVenueBlock, so forwarding
        // them here is all that's needed.
        restaurantType: venue.restaurantType,
        priceRangeDisplay: venue.priceRangeDisplay,
        allowsDogs: venue.allowsDogs,
        wheelchairAccessible: venue.wheelchairAccessible,
        signatureDish: venue.signatureDish,
        vibe: venue.vibe,
        recentReview: venue.recentReview,
        michelinCategory: venue.michelinCategory,
        michelinYear: venue.michelinYear,
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
          {/* v0.60.45 — restaurant type line. Sourced from
              michelinCuisineLabel (when present) or Places API
              primaryTypeDisplayName, with the trailing "restaurant"
              word stripped server-side. Renders directly under the
              venue name so users see the cuisine descriptor at a
              glance without scanning chips. */}
          {venue.restaurantType && (
            <div className="text-[11px] text-tg-text/80 truncate">{venue.restaurantType}</div>
          )}
          <div className="text-[11px] text-tg-hint truncate">{meta}</div>
          {venue.area && <div className="text-[11px] text-tg-hint truncate">{venue.area}</div>}
          {/* v0.60.190 — price-range + 🐾 Pet line on the in-app card.
              Mirrors the v0.60.183 formatPriceAndPetLine in
              venue-templates.js (Copy-All / /s server-side render).
              Operator: "Where are the pet-friendly and cost range in
              the results template in (a) Cuisine TMA results …" — they
              shipped in the response payload but the React card never
              rendered them. priceRangeDisplay is the pre-resolved
              "S$25–40 (US$18.50–29.60)" string; allowsDogs is the
              Places New API boolean attribute. Either-or; line
              suppressed when neither is set. */}
          {/* v0.60.201 — cost-range row now also carries the ♿️
              accessibility marker (when Places confirms accessible
              entrance) and the Crowd / footfall chip (moved here
              from the top meta row). Operator request: "Include
              · ♿️ if eatery included in Google Search. Next to
              cost-range. Move Crowd to same row as cost-range." */}
          {(venue.priceRangeDisplay || venue.wheelchairAccessible === true || venue.allowsDogs === true || livenessChip) && (
            <div className="text-[11px] text-tg-text/80 truncate mt-0.5">
              {[
                venue.priceRangeDisplay,
                venue.wheelchairAccessible === true && '♿️',
                venue.allowsDogs === true && (lang === 'fr' ? '🐾 Animaux autorisés' : '🐾 Pet allowed'),
                livenessChip
              ].filter(Boolean).join(' · ')}
            </div>
          )}
          {/* v0.59.23: primary "What to order" line — LLM-picked
              signature dish if present (rankAndNarrate path), else
              fall back to the first reviewer-extracted dish from
              the dishes array (TMA HTTP /api/cuisine/search path
              that uses pipeline.discover() directly with no LLM
              rank). Mirrors /hidden's signature_dish surface. */}
          {(() => {
            const primaryDish = venue.signatureDish
              || (Array.isArray(venue.dishes) && venue.dishes.length ? venue.dishes[0] : '');
            // v0.60.159 — when `signatureDish` is set, the prior logic
            // (`venue.dishes.slice(0, 3)`) ALSO included `dishes[0]`, which
            // for Michelin/Bib-Gourmand entries equals `signatureDish` after
            // the v0.60.153 force-fill pass. Result: "🍴 Try · X" + "X · Y · Z"
            // — same dish duplicated. Filter out any rest-list entry that
            // matches `primaryDish` (case-insensitive trim) before slicing.
            // Operator screenshot 2026-05-14: Cheok Kee + Hong Kong Yummy Soup.
            // v0.60.163 — exact-match wasn't enough. The substring case
            // also leaks: "Wanton mee" (primary) vs "Char siew wanton mee"
            // (rest) reads as a duplicate. Operator 2026-05-14 screenshot:
            // Chef Kang's Noodle House — `Try · Wanton mee` followed by
            // `Char siew wanton mee · Dumpling noodle`. Tighten the filter
            // to drop any rest entry where the primary is a substring of
            // the rest OR vice versa. Also dedupe within the rest list
            // itself so two LLM-narrated names that normalise the same
            // (e.g. "Pork rib soup" + "Pork rib soup ") only render once.
            const norm = (s) => String(s || '').trim().toLowerCase();
            const primaryNorm = norm(primaryDish);
            const seen = new Set();
            const restDishes = Array.isArray(venue.dishes)
              ? venue.dishes.filter((d) => {
                  const n = norm(d);
                  if (!n) return false;
                  if (seen.has(n)) return false;
                  if (primaryNorm) {
                    if (n === primaryNorm) return false;
                    if (n.includes(primaryNorm) || primaryNorm.includes(n)) return false;
                  }
                  seen.add(n);
                  return true;
                }).slice(0, 3)
              : [];
            return (
              <>
                {primaryDish && (
                  <div className="text-[12px] text-tg-text mt-1 leading-snug">
                    🍲 <span className="font-medium">{tr('card.whatToOrder', lang)}</span> · {primaryDish}
                  </div>
                )}
                {restDishes.length > 0 && (
                  // v0.60.159 — font size bumped 11px → 12px to match the
                  // "🍴 Try" line above, per operator: "font size different".
                  // Color kept as text-tg-hint so the line still reads as
                  // a secondary "more from the menu" annotation.
                  <div className="text-[12px] text-tg-hint mt-0.5 leading-snug">
                    {restDishes.join(' · ')}
                  </div>
                )}
              </>
            );
          })()}
          {venue.vibe && <div className="text-[12px] text-tg-text mt-1 leading-snug">{venue.vibe}</div>}
          {typeof venue.recentReview === 'string' && venue.recentReview.trim() && (
            <div className="flex items-start gap-1 text-[11px] text-tg-hint mt-1 leading-snug italic">
              <span aria-hidden="true">💬</span>
              <span>
                "{venue.recentReview}"
                {/* v0.61.151 — nationality-language review tag. Backend
                    sets recentReviewTranslatedFlag when the surfaced
                    review is in the cuisine nationality's language
                    AND rating > 3.8 (per operator spec). Format:
                    "(  <flag>  translated)" with spaces around the
                    flag for visual separation. */}
                {typeof venue.recentReviewTranslatedFlag === 'string' && venue.recentReviewTranslatedFlag && (
                  <span className="not-italic"> ( {venue.recentReviewTranslatedFlag} translated)</span>
                )}
              </span>
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
      {/* v0.61.225 — social-profile brand buttons (max 3, priority
          IG → TikTok → Facebook → X → YouTube → Threads). Renders
          nothing when the lazy-fetched lookup turns up empty or is
          still in flight, so the card height is stable for venues
          without socials. */}
      <SocialButtons profiles={socialProfiles} />
      {/* v0.60.16 — Michelin / Bib Gourmand annotation row. Rendered
          below the Maps + Copy buttons when /api/cuisine/search
          attached michelinCategory to the venue payload.
          v0.60.45 — cuisine label moved out of this row into the new
          restaurantType line below the venue name. The annotation
          here is now just star-tier + year. */}
      {venue.michelinCategory && (
        <div className="text-[11px] text-tg-text mt-1 font-semibold">
          {michelinAnnotation(venue.michelinCategory, venue.michelinYear || 2025)}
        </div>
      )}
      {/* v0.62.0 — HPB Healthier Choice + inside-building rows, after
          the Michelin row (server attaches the flags to the payload). */}
      {venue.healthierChoice && (
        <div className="text-[11px] text-tg-text mt-1">
          🥗 {tr('card.healthierChoice', lang)}
        </div>
      )}
      {venue.insideBuilding && (
        <div className="text-[11px] text-tg-hint mt-1">
          🏢 {tr('card.insideBuilding', lang)}
        </div>
      )}
    </button>
  );
}

// v0.60.16 — mirror the chat-card formatter (michelin-2025.js
// formatMichelinLine) so the TMA UI shows the same labels.
function michelinAnnotation(category, year) {
  const labels = {
    'three-star':   '✳️ Michelin · ⭐⭐⭐',
    'two-star':     '✳️ Michelin · ⭐⭐',
    'one-star':     '✳️ Michelin · ⭐',
    'bib-gourmand': '✳️ Bib Gourmand'
  };
  const prefix = labels[category] || '✳️ Michelin';
  return `${prefix} · ${year}`;
}
