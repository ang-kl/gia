import React, { useEffect, useState } from 'react';
import { tg } from '../../api/tg.js';
import { copyOneToChat, fetchSocialProfiles } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';
import SocialButtons from './SocialButtons.jsx';
import { OTHER_COUNTRIES } from '../lib/countries.js';

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// v0.62.151 — operator: long foreign addresses should swap the spelled-out
// country name for its short 2-letter code (e.g. "…, Johor, Malaysia" → "…,
// Johor, MY"). Map built from OTHER_COUNTRIES (+ Singapore).
const COUNTRY_CODE = (() => {
  const m = new Map([['singapore', 'SG']]);
  for (const c of OTHER_COUNTRIES || []) if (c?.name && c?.code) m.set(String(c.name).toLowerCase(), c.code);
  return m;
})();
function shortenCountry(area) {
  if (!area) return area;
  const parts = String(area).split(',');
  if (parts.length < 2) return area;
  const last = parts[parts.length - 1].trim().replace(/\.+$/, '');
  const code = COUNTRY_CODE.get(last.toLowerCase());
  if (!code) return area;
  parts[parts.length - 1] = ` ${code}`;
  return parts.join(',');
}

export default function ResultCard({ venue, focused, onTap, copyContext = {}, specialMode = null, number = null, defaultExpanded = false, horizontal = false, autoExpandFocus = true, nearbyLabel = null, nearbyAccent = null, nearbyStrips = null }) {
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
  // v0.62.216 — operator (IMG_2533): keep 📍 glued to the distance so when the meta
  // line wraps, "📍 ~12.2 km away" moves to the next line as ONE unit (it was
  // breaking right after 📍, stranding the pin on the line above). Non-breaking
  // spaces inside the token; the surrounding " · " joins stay breakable.
  const distMeta = distLabel
    ? `📍 ${distLabel}${lang === 'fr' ? '' : ' away'}`.replace(/ /g, '\u00A0')
    : '';
  // v0.62.189 — operator (IMG_2514): in the HORIZONTAL strip the ★rating + $price
  // ride the cuisine-type row ("Italian · ★4.5 · $$$"), so the meta line below
  // carries only open-hours + distance. The vertical list keeps the full meta.
  // v0.62.212 — operator (IMG_1069, card style A): the horizontal strip prefixes
  // the open-hours with a 🕙 clock so the line scans at a glance (distMeta already
  // carries 📍); the rendered line is allowed to WRAP to 2 lines (line-clamp-2)
  // instead of hard-truncating to a single "…".
  const meta = (horizontal
    ? [open ? `🕙 ${open}` : '', distMeta]
    : [rating, price, open, distMeta])
    .filter(Boolean).join(' · ');

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
  // v0.62.168 — operator: in the HORIZONTAL strip cards collapse by DEFAULT
  // (autoExpandFocus=false + no defaultExpanded), so a focused/centred card no
  // longer auto-opens; the user taps "⌄ details" per card. Vertical list keeps
  // the focus-auto-expand.
  const [expanded, setExpanded] = useState((autoExpandFocus && !!focused) || !!defaultExpanded);
  useEffect(() => { if (focused && autoExpandFocus) setExpanded(true); }, [focused, autoExpandFocus]);
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
      /* v0.62.285 — operator (BEFORE/AFTER mock): in the horizontal strip the
         IN-VIEW (focused) card is OPAQUE white; the peeking left/right cards are
         neo-liquid glass (translucent + frosted) so they read as "behind". The
         focused card scopes a light palette via CSS vars so it stays literally
         white AND readable in dark mode (text/hint/border go dark). The vertical
         list keeps the solid bg-tg-card surface (unchanged). */
      className={`w-full text-left rounded-lg border flex flex-col ${horizontal ? 'gap-0.5 px-2.5 py-1.5' : 'gap-1 p-2.5'} ${horizontal ? (focused ? 'bg-white' : 'bg-tg-card/70 liquid-glass') : 'bg-tg-card'} ${focused ? 'border-tg-accent' : 'border-tg-border'}`}
      style={horizontal && focused ? { '--tg-bg': '#ffffff', '--tg-card': '#ffffff', '--tg-text': '#1c1c1f', '--tg-hint': '#6b6b70', '--tg-border': '#e2e2e6' } : undefined}>
      {/* v0.62.289 / v0.62.293 — top strip on a NOT-exact card. SINGLE cuisine:
          "{cuisine} & Nearby Flavours" (nearbyLabel). COMBO (2+): the cuisine the
          venue actually serves (venue.matchedCuisine → nearbyStrips[name]), so
          Korean-only / Japanese-only cards are clearly not the both-cuisine combo.
          Colour is CVD-safe (never red/green); the text carries the meaning. */}
      {venue.matchTier === 'alternate' && (() => {
        const s = (venue.matchedCuisine && nearbyStrips && nearbyStrips[venue.matchedCuisine])
          || (nearbyLabel ? { label: nearbyLabel, accent: nearbyAccent } : null);
        if (!s) return null;
        return (
          <div
            className={`${horizontal ? '-mt-1.5' : '-mt-2.5'} -mx-2.5 mb-1 px-2.5 py-0.5 rounded-t-lg text-white text-[10px] font-semibold leading-tight truncate`}
            style={{ backgroundColor: s.accent || '#b45309' }}
          >{s.label}</div>
        );
      })()}
      {/* v0.62.108 — operator: rank reads "1 · <name>" inline; every row below
          is flush-left (no indent — was a 2-col flex that offset the whole body).
          v0.62.176 — operator: REVERTED the v0.62.168 horizontal word-wrap (the
          name-one-row truncate); the name renders normally again. */}
      <div className="font-semibold text-[12px] leading-tight">
        {Number.isFinite(number) && <span className="text-tg-hint font-semibold tabular-nums">{number} · </span>}{venue.name}
      </div>
          {/* v0.61.359 — native-script name in "( )" below the name (RULE A/B
              applied server-side; absent when redundant with the device lang). */}
          {venue.nameLocal && (
            <div className="text-[13px] text-tg-hint leading-tight truncate">({venue.nameLocal})</div>
          )}
          {/* v0.61.382 — readable foreign-name line: a device-language
              romanisation + brief gloss (Gemini, server-side) for a name in
              a script the reader can't read. Shown under the native name,
              never replacing it. 🔤 marks "how to read it" (icon, not colour). */}
          {venue.nameReading && (
            <div className="text-[12px] text-tg-hint leading-tight truncate">🔤 {venue.nameReading}</div>
          )}
          {/* v0.62.x item 7 — device-language MEANING of a foreign-language
              (Latin-script) name, e.g. "Tầm vị" → "(seeking flavour)". Gemini,
              server-side, cached. Next row in brackets, never replacing. */}
          {venue.nameGloss && (
            <div className="text-[12px] text-tg-hint leading-tight truncate">({venue.nameGloss})</div>
          )}
          {/* v0.60.45 — restaurant type line. Sourced from
              michelinCuisineLabel (when present) or Places API
              primaryTypeDisplayName, with the trailing "restaurant"
              word stripped server-side. Renders directly under the
              venue name so users see the cuisine descriptor at a
              glance without scanning chips. */}
          {/* v0.62.189 — operator (IMG_2514): horizontal cards put ★rating + $price
              on this cuisine-type row (e.g. "Italian · ★4.5 · $$$"); when there's
              no type they read "★4.5 · $$$". Vertical keeps the bare type line. */}
          {(venue.restaurantType || (horizontal && (rating || price))) && (
            <div className="text-[12px] text-tg-text/80 truncate">
              {[
                // v0.62.212 — card style A: 🍴 prefixes the cuisine type on the
                // horizontal card so the type/rating/price row reads at a glance.
                venue.restaurantType ? (horizontal ? `🍴 ${venue.restaurantType}` : venue.restaurantType) : '',
                horizontal && rating,
                horizontal && price
              ].filter(Boolean).join(' · ')}
            </div>
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
            <div className="text-[11px] italic text-tg-hint truncate">
              {lang === 'fr' ? 'Renseignez-vous pour le pâtisserie durian saisonnier' : 'Inquire for seasonal durian pastry'}
            </div>
          )}
          {/* v0.62.176 — operator: REVERTED the v0.62.168 "wrap by field" meta;
              single-line meta (truncate) again, same as the vertical list. */}
          <div className={`text-[12px] text-tg-hint ${horizontal ? 'line-clamp-2' : 'truncate'}`}>{meta}</div>
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
            <div className={`text-[12px] text-tg-text/80 mt-0.5 ${horizontal ? 'line-clamp-2' : 'truncate'}`}>
              {[
                // v0.62.212 — card style A: the horizontal card drops the bulky
                // secondary-currency "(≈M$…)" conversion (still on the expanded
                // card + copy) and prefixes 💵 so price scans fast; the row may
                // wrap to 2 lines rather than truncate.
                venue.priceRangeDisplay
                  ? (horizontal ? `💵 ${venue.priceRangeDisplay.replace(/\s*\([^)]*\)\s*$/, '')}` : venue.priceRangeDisplay)
                  : '',
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
              <div className="text-[13px] text-tg-text mt-1 leading-snug">
                🍲 <span className="font-medium">{tr('card.whatToOrder', lang)}:</span> {primaryDish}
                {restDishes.length > 0 && (
                  <span className="text-tg-hint">{restDishes.map((d) => ` • ${d}`).join('')}</span>
                )}
              </div>
            ) : null;
          })()}

          {/* v0.62.168 — operator: Michelin / Bib row is ROW #5, VISIBLE before
              expanding (moved OUT of the collapsible section below). Tier + year
              in WORDS (✳️ / ⭐), never colour. */}
          {venue.michelinCategory && (
            <div className="text-[12px] text-tg-text mt-1 font-semibold">
              {michelinAnnotation(venue.michelinCategory, venue.michelinYear || 2025)}
            </div>
          )}

          {/* v0.62.124 — collapse toggle. Collapsed = identity + meta + price +
              🍲 Try (above); everything below is revealed on expand. A focused/
              selected card auto-expands. The toggle stops propagation so it
              doesn't fire the card's onTap (map focus / future carousel). */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            aria-expanded={expanded}
            className="self-start mt-1.5 px-2.5 py-0.5 rounded-full border border-tg-accent/50 text-[11px] text-tg-accent font-medium active:scale-95 transition-transform"
          >
            {expanded
              ? (lang === 'fr' ? '⌃ moins' : '⌃ less')
              : (lang === 'fr' ? '⌄ détails, avis & liens' : '⌄ details, review & links')}
          </button>

          {expanded && (<>
          {/* v0.62.124 — address moved BELOW the price/pet row, into the
              collapsible section (operator row re-order). */}
          {venue.area && <div className="text-[12px] text-tg-hint break-words leading-snug">{shortenCountry(venue.area)}</div>}
          {/* v0.62.37 — ⭐ Recommend tie-in (D792): the venue's own evidence
              mentions one of the anchored city's unique dishes. Tier in WORDS. */}
          {venue.cityDish && venue.cityDish.dish && (
            <div className="text-[13px] text-tg-text mt-1 leading-snug">
              ⭐ <span className="font-medium">{(() => {
                const t2 = venue.cityDish.tier;
                if (lang === 'fr') return t2 === 'city-icon' ? 'Icône de la ville' : t2 === 'regional' ? 'Classique régional' : 'Classique national';
                return t2 === 'city-icon' ? 'City icon' : t2 === 'regional' ? 'Regional classic' : 'National classic';
              })()}</span> · {venue.cityDish.dish}
            </div>
          )}
          {/* v0.62.168 — the Michelin / Bib row moved UP to row #5 (always visible,
              before the expand toggle). */}
          {/* v0.62.0 — HPB Healthier Choice + inside-building share ONE row. */}
          {(venue.healthierChoice || venue.insideBuilding) && (
            <div className="text-[12px] text-tg-text mt-1">
              {[
                venue.healthierChoice && `🥗 ${tr('card.healthierChoice', lang)}`,
                venue.insideBuilding && `🏢 ${tr('card.insideBuilding', lang)}`
              ].filter(Boolean).join('   ')}
            </div>
          )}
          {/* v0.62.124 — review moved near the end (operator). */}
          {typeof venue.recentReview === 'string' && venue.recentReview.trim() && (
            <div className="flex items-start gap-1 text-[12px] text-tg-hint mt-1 leading-snug italic">
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
          {venue.vibe && <div className="text-[13px] text-tg-text mt-1 leading-snug">{venue.vibe}</div>}
          {/* v0.62.124 — Maps + Copy + socials are now the LAST row (operator). */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <button type="button" onClick={openMaps}
              className="text-[12px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">📍 Maps</button>
            <button type="button" onClick={copy} disabled={copying}
              className="text-[12px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">
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
