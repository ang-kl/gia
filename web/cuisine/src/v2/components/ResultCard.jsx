import React, { useEffect, useState } from 'react';
import { tg } from '../../api/tg.js';
import { copyOneToChat, fetchSocialProfiles } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';
import SocialButtons from './SocialButtons.jsx';

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

export default function ResultCard({ venue, focused, onTap, copyContext = {}, specialMode = null, number = null, defaultExpanded = false }) {
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
  // v0.62.122 — operator: the straight-line walk-minutes estimate was confusing
  // next to the distance row, so it's dropped. (`venue.walkMinutes` still rides
  // the payload for the copy/chat template.)
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
  // v0.62.81 — operator: "tell me how far away". The distance moves OUT of this
  // meta line into its own prominent row below (see `distLine`), so far results
  // (e.g. KL durian under the wider 45 km cap) read as obviously far. Keep the
  // walk-minutes here only when the venue is genuinely walkable (<2 km).
  // v0.62.122 — operator: drop the walk-minutes from the meta row and surface
  // the straight-line DISTANCE here instead (replaces the standalone
  // "📍 … away" row that used to sit below). One distance signal, in the meta.
  const distLabel = Number.isFinite(venue.distanceM)
    ? (venue.distanceM >= 1000
        ? `~${(venue.distanceM / 1000).toFixed(1)} km`
        : `${Math.round(venue.distanceM)} m`)
    : '';
  const distMeta = distLabel ? `📍 ${distLabel}${lang === 'fr' ? '' : ' away'}` : '';
  const meta = [rating, price, open, distMeta].filter(Boolean).join(' · ');

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
  // v0.62.124 — operator: result cards collapse to identity + meta + price +
  // 🍲 Try; everything from the address down is hidden until expanded. The
  // FOCUSED/selected card auto-expands (the music-app carousel's centred card
  // reuses this); a manual ⌄/⌃ toggle flips it for any card.
  // v0.62.139 — operator: in the horizontal floating strip every card renders
  // EXPANDED inside a short scroll panel, so the detail is reachable two ways:
  // scroll the card OR tap the ⌄/⌃ toggle. `defaultExpanded` seeds that.
  const [expanded, setExpanded] = useState(!!focused || !!defaultExpanded);
  useEffect(() => { if (focused) setExpanded(true); }, [focused]);
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
        nameLocal: venue.nameLocal,
        nameReading: venue.nameReading, // v0.61.382 — readable foreign-name line
        nameGloss: venue.nameGloss,      // v0.62.x item 7 — meaning of a foreign-lang name
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
        recentReviewAgo: venue.recentReviewAgo,   // v0.61.417 — review "X ago" date
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
      {/* v0.62.108 — operator: rank reads "1 · <name>" inline; every row below
          is flush-left (no indent — was a 2-col flex that offset the whole body). */}
      <div className="font-semibold text-sm leading-tight">
        {Number.isFinite(number) && <span className="text-tg-hint font-semibold tabular-nums">{number} · </span>}{venue.name}
      </div>
          {/* v0.61.359 — native-script name in "( )" below the name (RULE A/B
              applied server-side; absent when redundant with the device lang). */}
          {venue.nameLocal && (
            <div className="text-xs text-tg-hint leading-tight truncate">({venue.nameLocal})</div>
          )}
          {/* v0.61.382 — readable foreign-name line: a device-language
              romanisation + brief gloss (Gemini, server-side) for a name in
              a script the reader can't read. Shown under the native name,
              never replacing it. 🔤 marks "how to read it" (icon, not colour). */}
          {venue.nameReading && (
            <div className="text-[11px] text-tg-hint leading-tight truncate">🔤 {venue.nameReading}</div>
          )}
          {/* v0.62.x item 7 — device-language MEANING of a foreign-language
              (Latin-script) name, e.g. "Tầm vị" → "(seeking flavour)". Gemini,
              server-side, cached. Next row in brackets, never replacing. */}
          {venue.nameGloss && (
            <div className="text-[11px] text-tg-hint leading-tight truncate">({venue.nameGloss})</div>
          )}
          {/* v0.60.45 — restaurant type line. Sourced from
              michelinCuisineLabel (when present) or Places API
              primaryTypeDisplayName, with the trailing "restaurant"
              word stripped server-side. Renders directly under the
              venue name so users see the cuisine descriptor at a
              glance without scanning chips. */}
          {venue.restaurantType && (
            <div className="text-[11px] text-tg-text/80 truncate">{venue.restaurantType}</div>
          )}
          {/* v0.61.255 — operator: "For Durian Pastry, if the
              resturant/eateries is not Durian per se, but a note in
              the ResultCard that small font size below the
              Resturant Type this line 'Inquire for seasonal durian
              pastry' italic, small font size color." Show only when
              specialMode is durian-pastry AND venue name does NOT
              contain "durian" (case-insensitive). Operator-confirmed
              trigger: name-substring check. */}
          {specialMode === 'durian-pastry'
            && !/durian/i.test(venue.name || '') && (
            <div className="text-[10px] italic text-tg-hint truncate">
              {lang === 'fr' ? 'Renseignez-vous pour le pâtisserie durian saisonnier' : 'Inquire for seasonal durian pastry'}
            </div>
          )}
          <div className="text-[11px] text-tg-hint truncate">{meta}</div>
          {/* v0.62.122 — distance moved up into the meta row (distMeta).
              v0.62.124 — the address row moved DOWN into the collapsible
              section (below price/pet), per the operator re-order. */}
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
          {/* v0.59.23 / v0.62.x — primary "What to order" line. v0.62.124: this
              stays VISIBLE even when the card is collapsed (operator: strongest
              "should I tap" cue), so it sits ABOVE the collapse boundary. */}
          {(() => {
            const primaryDish = venue.signatureDish
              || (Array.isArray(venue.dishes) && venue.dishes.length ? venue.dishes[0] : '');
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
            return primaryDish ? (
              <div className="text-[12px] text-tg-text mt-1 leading-snug">
                🍲 <span className="font-medium">{tr('card.whatToOrder', lang)}</span> · {primaryDish}
                {restDishes.length > 0 && (
                  <span className="text-tg-hint">{restDishes.map((d) => ` • ${d}`).join('')}</span>
                )}
              </div>
            ) : null;
          })()}

          {/* v0.62.124 — collapse toggle. Collapsed = identity + meta + price +
              🍲 Try (above); everything below is revealed on expand. A focused/
              selected card auto-expands. The toggle stops propagation so it
              doesn't fire the card's onTap (map focus / future carousel). */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            aria-expanded={expanded}
            className="self-start text-[11px] text-tg-accent mt-1 font-medium"
          >
            {expanded
              ? (lang === 'fr' ? '⌃ moins' : '⌃ less')
              : (lang === 'fr' ? '⌄ détails, avis & liens' : '⌄ details, review & links')}
          </button>

          {expanded && (<>
          {/* v0.62.124 — address moved BELOW the price/pet row, into the
              collapsible section (operator row re-order). */}
          {venue.area && <div className="text-[11px] text-tg-hint truncate">{venue.area}</div>}
          {/* v0.62.37 — ⭐ Recommend tie-in (D792): the venue's own evidence
              mentions one of the anchored city's unique dishes. Tier in WORDS. */}
          {venue.cityDish && venue.cityDish.dish && (
            <div className="text-[12px] text-tg-text mt-1 leading-snug">
              ⭐ <span className="font-medium">{(() => {
                const t2 = venue.cityDish.tier;
                if (lang === 'fr') return t2 === 'city-icon' ? 'Icône de la ville' : t2 === 'regional' ? 'Classique régional' : 'Classique national';
                return t2 === 'city-icon' ? 'City icon' : t2 === 'regional' ? 'Regional classic' : 'National classic';
              })()}</span> · {venue.cityDish.dish}
            </div>
          )}
          {/* v0.60.16 — Michelin / Bib Gourmand annotation row (star-tier + year). */}
          {venue.michelinCategory && (
            <div className="text-[11px] text-tg-text mt-1 font-semibold">
              {michelinAnnotation(venue.michelinCategory, venue.michelinYear || 2025)}
            </div>
          )}
          {/* v0.62.0 — HPB Healthier Choice + inside-building share ONE row. */}
          {(venue.healthierChoice || venue.insideBuilding) && (
            <div className="text-[11px] text-tg-text mt-1">
              {[
                venue.healthierChoice && `🥗 ${tr('card.healthierChoice', lang)}`,
                venue.insideBuilding && `🏢 ${tr('card.insideBuilding', lang)}`
              ].filter(Boolean).join('   ')}
            </div>
          )}
          {/* v0.62.124 — review moved near the end (operator). */}
          {typeof venue.recentReview === 'string' && venue.recentReview.trim() && (
            <div className="flex items-start gap-1 text-[11px] text-tg-hint mt-1 leading-snug italic">
              <span aria-hidden="true">💬</span>
              <span>
                "{venue.recentReview}"
                {typeof venue.recentReviewAgo === 'string' && venue.recentReviewAgo && (
                  <span className="not-italic ml-2 text-tg-hint">{venue.recentReviewAgo}</span>
                )}
                {typeof venue.recentReviewTranslatedFlag === 'string' && venue.recentReviewTranslatedFlag && (
                  <span className="not-italic"> ( {venue.recentReviewTranslatedFlag} translated)</span>
                )}
              </span>
            </div>
          )}
          {/* v0.62.124 — vibe moved to AFTER the review (operator). */}
          {venue.vibe && <div className="text-[12px] text-tg-text mt-1 leading-snug">{venue.vibe}</div>}
          {/* v0.62.124 — Maps + Copy + socials are now the LAST row (operator). */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <button type="button" onClick={openMaps}
              className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">📍 Maps</button>
            <button type="button" onClick={copy} disabled={copying}
              className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">
              {copying ? '…' : copied ? (lang === 'fr' ? '✓ Envoyé' : '✓ Sent') : tr('btn.copyOne', lang)}
            </button>
            <SocialButtons profiles={socialProfiles} bare />
          </div>
          </>)}
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
