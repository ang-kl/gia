import React, { useEffect, useState } from 'react';
import { tg } from '../../api/tg.js';
import { copyOneToChat, fetchSocialProfiles } from '../lib/api.js';
import { useLocale, t as tr, tn } from '../lib/i18n.js';
import { likelyServesText } from '../lib/dish-category.js';
import { restaurantTypeName } from '../lib/cuisine-i18n.js';
import SocialButtons from './SocialButtons.jsx';
import { OTHER_COUNTRIES } from '../lib/countries.js';
import { abbrevAddress } from '../../../../_shared/lib/abbrev-address.js';
import PronounceIcon from '../../../../_shared/components/PronounceIcon.jsx';
import { cachedPronunciation, streetOf } from '../../../../_shared/lib/pronounce-client.js';
import { pickNameGuide } from '../../../../_shared/lib/name-guide.js';
import { pickAddressGuide } from '../../../../_shared/lib/address-guide.js';

const PRICE_LABEL = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// v0.62.151 — operator: long foreign addresses should swap the spelled-out
// country name for its short 2-letter code (e.g. "…, Johor, Malaysia" → "…,
// Johor, MY"). Map built from OTHER_COUNTRIES (+ Singapore).
// v0.62.587 — operator (Brisbane, IMG_0752, "addresses without country name"):
// DROP the trailing country segment entirely rather than shortening it to the
// 2-letter code — the search is already scoped to one country, so the country
// name is redundant on the address ("…, Maroochydore QLD, Australia" → "…,
// Maroochydore QLD"). The address stays in the expanded "details" section
// (v0.62.124 placement is unchanged — operator picked "keep in details, drop
// country"). Only a RECOGNISED trailing country is removed; anything else passes
// through untouched so a genuine last address line is never eaten.
const COUNTRY_CODE = (() => {
  const m = new Map([['singapore', 'SG']]);
  for (const c of OTHER_COUNTRIES || []) if (c?.name && c?.code) m.set(String(c.name).toLowerCase(), c.code);
  return m;
})();
function dropCountry(area) {
  if (!area) return area;
  const parts = String(area).split(',');
  if (parts.length < 2) return area;
  const last = parts[parts.length - 1].trim().replace(/\.+$/, '');
  if (!COUNTRY_CODE.has(last.toLowerCase())) return area;   // not a country → leave as-is
  parts.pop();                                              // drop the country segment
  return parts.join(',').replace(/[\s,]+$/, '');            // + tidy any trailing comma/space
}

export default function ResultCard({ venue, focused, onTap, copyContext = {}, specialMode = null, number = null, defaultExpanded = false, horizontal = false, isShort = false, collapsedHeightPx = null, autoExpandFocus = true, nearbyLabel = null, nearbyAccent = null, nearbyStrips = null, dishHints = null, glass = null }) {
  // v0.62.562 — O-54 Hawker parity: the OPAQUE-vs-glass surface can be driven by
  // card VISIBILITY (Hawker's carousel: the cards fully in the focus band are
  // opaque, the two half-peeking end cards are glass), independent of which card
  // is the tapped/active one (`focused`, which still owns the accent ring). When
  // `glass` is left null the legacy rule holds — the single focused card is
  // opaque, every other card is glass — so phones are unchanged.
  const glassEff = glass == null ? !focused : glass;
  const [lang] = useLocale();

  // v0.62.846 — the guide for the locale being read RIGHT NOW. Operator: "the second
  // line translation as I change the language".
  //
  // `venue.namePronounce` is baked into the search payload, so it is the answer for the
  // locale that was active WHEN THE SEARCH RAN. Toggling the language does not re-run the
  // search, so on its own that field goes stale the moment the operator switches — the
  // reported bug.
  //
  // App batches one `/api/pronounce` call for the whole page (see the note there — a hook
  // per card would be a request per card), which fills this module cache; reading it here
  // is synchronous and costs nothing. Three states matter and are kept distinct:
  //   a string  → the answer for THIS locale, and it wins over the payload
  //   null      → asked, and this locale needs no guide: show nothing, do NOT fall back
  //               to the payload's answer for some other locale
  //   undefined → not asked yet, so the payload's value is the best thing we have
  const said = cachedPronunciation(venue.name, lang);
  const sayNow = said !== undefined ? said : venue.namePronounce;
  // v0.62.850 — the same treatment for the ADDRESS, keyed on its street so venues sharing
  // a road share one answer. Additive on purpose: the English line stays, because that is
  // what a reader shows a driver or types into Maps. A transliteration helps them READ and
  // SAY it; it does not help them get there.
  const addrStreet = streetOf(venue.area || '');
  const streetSay = addrStreet ? cachedPronunciation(addrStreet, lang) : undefined;
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
  // v0.62.827 — Tier 1 of the on-the-fly re-localisation plan. The server now ships
  // the hours line in ALL EIGHT locales (`*ByLang`), so tapping the language toggle
  // re-renders it immediately — no re-search, which would return a different set of
  // eateries. The scalar labels remain as the fallback, so a card served by an older
  // deploy, a cached payload, or any path that has not been taught the map still
  // renders exactly as before. Nothing here changes when the maps are absent.
  const ohOpen = (venue.openClosingByLang && venue.openClosingByLang[lang]) || venue.openClosingLabel;
  const ohClosed = (venue.closedTodayByLang && venue.closedTodayByLang[lang]) || venue.closedTodayLabel;
  let open = venue.openNow === true
    ? (ohOpen || tr('card.open', lang))
    : venue.openNow === false
      ? (ohClosed || tr('card.closed', lang))
      // v0.62.x — openNow UNKNOWN (Google omitted currentOpeningHours.openNow):
      // the 🕛 row rendered blank. Show the schedule-derived label the server now
      // attaches; still no bare "Open"/"Closed" word when there's genuinely no
      // data, and no status corner-tab (that gates on openNow === false).
      : (ohOpen || ohClosed || '');
  // v0.62.472 — the top status strip already states "Closed", so drop the
  // redundant leading "Closed now · " prefix from the clock-row label, keeping
  // just the reopen info ("Opens today 11:30 AM"). Locale-safe: split on the
  // " · " separator (server-built as `<prefix> · <reopen>`) rather than matching
  // the English words. Guarded to the exact case the strip shows the prefix
  // (closed AND reopens today); the bot/copy surfaces keep the full label.
  if (venue.openNow === false
      && typeof venue.reopenMinutes === 'number' && venue.reopenMinutes >= 0
      && open.includes(' · ')) {
    open = open.slice(open.indexOf(' · ') + 3);
  }
  // v0.62.476 — operator (IMG): the pink "Closing in N min" tab already states
  // the close, so the clock row's "· Closes {t}" segment is redundant. Server
  // builds openClosingLabel as "Open · Closes {t}[ · Reopens {t}]", so the closes
  // part is the segment at index 1 — splice it out by position (locale-agnostic),
  // leaving "Open[ · Reopens {t}]". Only when currently open AND closing soon.
  if (venue.openNow === true
      && typeof venue.closingSoonMinutes === 'number' && venue.closingSoonMinutes >= 0
      && open.includes(' · ')) {
    const parts = open.split(' · ');
    if (parts.length >= 2) { parts.splice(1, 1); open = parts.join(' · '); }
  }
  // v0.62.496 — the status tab now renders OUTSIDE the card <button> (folder tab
  // above the top edge), so the in-card top strips (cuisine band + first dish-hint)
  // once again pull flush to the card top unconditionally — the tab no longer sits
  // inside the card, so there is nothing for them to clear. (Supersedes the
  // v0.62.475 `hasStatusTab` top-flush suppression, now removed.)
  // v0.57.31: crowd chip from LTA-carpark availability around the venue.
  // Honest caveat — weak in CBD where lunch crowds are walk-in.
  // v0.58.55: localised crowd chip text.
  const crowdMap = {
    high:   tr('card.crowdHigh', lang),
    medium: tr('card.crowdMedium', lang),
    low:    tr('card.crowdLow', lang),
  };
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
      const verb = Number.isFinite(live) ? tr('card.footfallLive', lang) : tr('card.footfallForecast', lang);
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
    ? `📍 ${distLabel}${tr('card.distAway', lang)}`.replace(/ /g, '\u00A0')
    : '';
  // v0.62.189 — operator (IMG_2514): in the HORIZONTAL strip the ★rating + $price
  // ride the cuisine-type row ("Italian · ★4.5 · $$$"), so the meta line below
  // carries only open-hours + distance. The vertical list keeps the full meta.
  // v0.62.212 — operator (IMG_1069, card style A): the horizontal strip prefixes
  // the open-hours with a 🕙 clock so the line scans at a glance (distMeta already
  // carries 📍); the rendered line is allowed to WRAP to 2 lines (line-clamp-2)
  // instead of hard-truncating to a single "…".
  // v0.62.495 — operator (IMG_2685): on the horizontal card the meta line
  // wraps (line-clamp-2), and the join's " · " between the reopen text and the
  // non-breaking "📍 …away" distance unit stranded a lone "·" at the end of
  // line 1 when the pin wrapped to line 2. Glue the separator to the distance
  // (`· 📍…`) so the whole "· 📍 …away" chunk travels together; the only
  // breakable space is BEFORE the "·", so nothing can end a line on a bare
  // separator. Vertical stays a single truncated line, so it keeps the plain join.
  const clockSeg = open ? `🕙 ${open}` : '';
  const meta = horizontal
    ? (clockSeg && distMeta ? `${clockSeg} ·\u00A0${distMeta}` : (clockSeg || distMeta))
    : [rating, price, open, distMeta].filter(Boolean).join(' · ');

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
  // P1-e — document-unique id for the expandable details region so the ⌄/⌃
  // toggle can point at it via aria-controls. Derived from placeId; the
  // horizontal strip and the vertical list can both be MOUNTED with the same
  // venue at once, so the variant letter keeps the id unique. Whitespace is
  // stripped (an HTML id must not contain spaces; placeIds never do, the
  // name-based fallback might).
  const detailsId = `gia-card-details-${horizontal ? 'h' : 'v'}-${String(venue.placeId || venue.name || 'x').replace(/\s+/g, '-')}`;
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
        namePronounce: venue.namePronounce, // v0.62.840 — how to say it
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
        // v0.62.516 — forward halal / vegetarian so newly-saved Sketchbook
        // cards carry the flags the ported QuickFilters halal / vegetarian
        // chips filter on (older clips lack them → those chips simply won't
        // match them, which is honest — no fabricated data).
        halal: venue.halal,
        vegetarian: venue.vegetarian,
        wheelchairAccessible: venue.wheelchairAccessible,
        signatureDish: venue.signatureDish,
        vibe: venue.vibe,
        recentReview: venue.recentReview,
        recentReviewAgo: venue.recentReviewAgo,   // v0.61.417 — review "X ago" date
        michelinCategory: venue.michelinCategory,
        // v0.62.665 — michelinYear (a single number) replaced with the
        // compact multi-year awardYears array; VenueCard.jsx (Clipboard)
        // still falls back to reading michelinYear on already-saved clips
        // from before this change.
        michelinAwardYears: venue.michelinAwardYears,
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
    <div className="w-full flex flex-col">
      {/* v0.62.496 — operator (reference mock IMG): the status label is a FOLDER TAB
          that sits ABOVE the card and tucks into its top edge. It is rendered OUTSIDE
          the bordered card <button> so the card's rounded border can NEVER slice
          through the tab — the collision seen on exact-match cards that have no top
          band (Odette / Kuan Zhai). `-mb-1` tucks the tab's flat bottom a few px under
          the card top (folder-tab overlap); `z-10` keeps it painted in front; `ml-3`
          offsets it from the left corner. CVD-safe: the WORD carries the state, no
          green counterpart. (Supersedes the v0.62.488 in-card protruding tab.) */}
      {venue.openNow === false ? (
        <div className="ml-3 -mb-1 self-start relative z-10 px-3 py-0.5 rounded-t-lg bg-red-600 text-white text-[10px] font-bold leading-snug">
          {tr('card.closed', lang)}
        </div>
      ) : (typeof venue.closingSoonMinutes === 'number' && venue.closingSoonMinutes >= 0) ? (
        <div className="ml-3 -mb-1 self-start relative z-10 px-3 py-0.5 rounded-t-lg bg-pink-600 text-white text-[10px] font-bold leading-snug">
          {tn('card.closingSoon', lang, { n: venue.closingSoonMinutes })}
        </div>
      ) : null}
    <button type="button" onClick={() => onTap?.(venue.placeId)}
      /* v0.62.591 — data-pid lets the vertical list scroll a tapped-pin's card into
         view (ResultPanel's focus effect), mirroring the ResultDrawer carousel. */
      data-pid={venue.placeId || undefined}
      /* v0.62.285 — operator (BEFORE/AFTER mock): in the horizontal strip the
         IN-VIEW (focused) card is OPAQUE white; the peeking left/right cards are
         neo-liquid glass (translucent + frosted) so they read as "behind". The
         focused card scopes a light palette via CSS vars so it stays literally
         white AND readable in dark mode (text/hint/border go dark). The vertical
         list keeps the solid bg-tg-card surface (unchanged). */
      /* v0.62.684 — operator's carousel-card spec: the COLLAPSED horizontal card
         is a FIXED height so every card in the strip is identical. Two tiers,
         because one global height is impossible: a phone in landscape has only
         375-393px of viewport to spend, an iPad mini portrait has 1133.
           standard (12rem/192px) — phone portrait, all tablet, desktop
           short    (7.5rem/120px) — isShort, i.e. viewport height <= 500px
         EXPANDED stays auto-height (bounded by the wrapper's max-h-[60vh] +
         scroll) — pinning it would clip real content. `overflow-hidden` on the
         collapsed card is what makes the fixed height a hard guarantee rather
         than a suggestion the content can overrun.

         v0.62.691 — operator: "can we reduce line spacing height so we can
         shorten the height of the card". `leading-snug` (1.375) on the
         horizontal card ROOT, plus tightened per-row `mt-*` below. The audit
         found the loose spacing was NOT a design decision: six collapsed rows
         (type / meta / 💵 price / 🍱 set-meal / Michelin / toggle) carried NO
         `leading-*` class at all and so inherited Tailwind preflight's
         `html { line-height: 1.5 }`, while the rows someone had explicitly
         styled ran at 1.25–1.375. One class on the parent fixes all six at once
         and leaves every explicit per-row value winning by specificity.

         Standard tier 13rem → 12rem. That number is not taste: it is the
         LARGEST reduction that leaves every case no worse than before. A typical
         card's content drops 178 → 165px (‑8%), so the visible slack the
         operator reported shrinks from ~30px to ~27px in a 16px-shorter box;
         and a worst-case card (Michelin + three wrapped rows) that ALREADY
         overran 208px by ~44px now overruns 192px by ~41px — still an
         improvement. Going below 12rem starts making that overrun worse than
         today, which is why the further cut needs the row-move instead. */
      /* v0.62.693 — the drawer measures every collapsed card and pins them all to
         the TALLEST (see ResultDrawer). `data-card-root` is what it measures, and
         the inline height it hands back overrides the h-[12rem] class below —
         which stays as the pre-measurement fallback for the first paint and for
         any host that renders a card outside the drawer. */
      data-card-root={horizontal && !expanded ? '' : undefined}
      className={`w-full text-left rounded-lg border flex flex-col ${horizontal ? 'leading-snug gap-0.5 px-2.5 py-1.5' : 'gap-1 p-2.5'} ${horizontal && !expanded ? `${isShort ? 'h-[7.5rem]' : 'h-[12rem]'} overflow-hidden` : ''} ${horizontal ? (glassEff ? 'bg-tg-card/40 liquid-glass' : 'liquid-glass-focus') : 'bg-tg-card'} ${focused ? 'border-tg-accent' : 'border-tg-border'}`}
      style={{
        ...(horizontal && !glassEff
          ? { '--tg-bg': '#ffffff', '--tg-card': '#ffffff', '--tg-text': '#1c1c1f', '--tg-hint': '#6b6b70', '--tg-border': '#e2e2e6' }
          : null),
        ...(horizontal && !expanded && !isShort && Number.isFinite(collapsedHeightPx)
          ? { height: `${collapsedHeightPx}px` }
          : null)
      }}>
      {/* v0.62.289 / v0.62.293 — top strip on a NOT-exact card. SINGLE cuisine:
          "{cuisine} & Nearby Flavours" (nearbyLabel). COMBO (2+): the cuisine the
          venue actually serves (venue.matchedCuisine → nearbyStrips[name]), so
          Korean-only / Japanese-only cards are clearly not the both-cuisine combo.
          Colour is CVD-safe (never red/green); the text carries the meaning. */}
      {/* v0.62.488 — operator: the "{cuisine} & nearby flavours" strip is a FLAT
          full-width band, flush to the card edges (margin-to-margin) — never a
          rounded pill. It sits at the very top of the card under the status
          folder-tab; default warm-brown fill, per-cuisine accent when supplied. */}
      {venue.matchTier === 'alternate' && (() => {
        const s = (venue.matchedCuisine && nearbyStrips && nearbyStrips[venue.matchedCuisine])
          || (nearbyLabel ? { label: nearbyLabel, accent: nearbyAccent } : null);
        if (!s) return null;
        return (
          <div
            className={`${horizontal ? '-mt-1.5' : '-mt-2.5'} -mx-2.5 mb-1 px-4 py-1 rounded-t-lg text-white text-[11px] font-medium leading-snug truncate`}
            style={{ backgroundColor: s.accent || '#854F0B' }}
          >{s.label}</div>
        );
      })()}
      {/* v0.62.x — operator: when the search was by a dish / free-text term, a
          strip "Likely serves {term} {dish|dessert|drink}". If a strip is already
          drawn above (the cuisine "Nearby Flavours" one) these stack below it,
          each ~0.5px smaller. */}
      {Array.isArray(dishHints) && dishHints.filter(Boolean).map((term, i) => {
        const txt = likelyServesText(term, lang);
        if (!txt) return null;
        const firstFlush = i === 0 && venue.matchTier !== 'alternate';
        const size = Math.max((venue.matchTier === 'alternate' ? 9.5 : 10) - 0.5 * i, 8);
        return (
          <div
            key={`dh-${i}`}
            className={`-mx-2.5 mb-1 px-2.5 py-0.5 leading-tight truncate font-medium bg-tg-bg text-tg-accent border-b border-tg-border ${firstFlush ? `${horizontal ? '-mt-1.5' : '-mt-2.5'} rounded-t-lg` : ''}`}
            style={{ fontSize: `${size}px` }}
          >{txt}</div>
        );
      })}
      {/* v0.62.108 — operator: rank reads "1 · <name>" inline; every row below
          is flush-left (no indent — was a 2-col flex that offset the whole body).
          v0.62.176 — operator: REVERTED the v0.62.168 horizontal word-wrap (the
          name-one-row truncate); the name renders normally again. */}
      {/* v0.62.539 — the name row must carry text-tg-text explicitly: in the
          horizontal strip the FOCUSED card is forced bg-white with a LOCAL
          --tg-text override (v0.62.285), but a row with no colour class inherits
          the app-root's already-computed light colour → white-on-white (the name
          vanished on every centred card). text-tg-text re-resolves the var at the
          element so it flips dark on the white card; identical everywhere else. */}
      <div className="font-semibold text-[12px] leading-tight text-tg-text">
        {Number.isFinite(number) && <span className="text-tg-hint font-semibold tabular-nums">{number} · </span>}{venue.name}
      </div>
          {/* v0.62.856 — EXACTLY ONE GUIDE LINE BESIDE THE NAME, and for a foreign-script
              name that line is the PRONUNCIATION.

              v0.62.855 established the "exactly one" rule (operator: "only address,
              restaurant names and transport name can show both languages" — both means two,
              and this block could render four) with a curated-first order copied from the
              hawker card. Codex, PR #1796 P2, found the cost: `nameLocal` and `nameReading`
              are set only for foreign-script venues in JP/KR/CN/TW/HK/MO/TH, so on that
              order a pronunciation could never render for exactly the venues the
              pronunciation line was built for — the operator's own framing when he asked
              for it was "help foreigner to pronoun … learn to pronounce the restaurant
              name". Operator, shown the trade: pronunciation wins for foreign script.

              The precedence now lives in `_shared/lib/name-guide.js` as a pure function.
              That is not tidying: five tests have asserted this chain by scanning the
              source, four of which broke on a refactor while the behaviour held. A function
              can be called, so the rule is now tested by its answers.

              `sayNow` is passed in, not read off the venue, because it resolves from the
              live pronunciation projection first — the reactive behaviour from v0.62.849. */}
          {(() => {
            const nameGuide = pickNameGuide(venue, sayNow);
            if (!nameGuide) return null;
            return (
              <div
                className="text-[12px] text-tg-hint leading-tight truncate flex items-center gap-1"
                data-name-guide={nameGuide.key}
              >
                {nameGuide.icon === 'pronounce' && <PronounceIcon className="shrink-0 opacity-80" />}
                <span className="truncate">{nameGuide.text}</span>
              </div>
            );
          })()}
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
                // v0.62.836 — localise Google's type word. The translation has
                // existed in cuisine-i18n for all 69 slugs; the card never asked.
                venue.restaurantType
                  ? (horizontal ? `🍴 ${restaurantTypeName(venue.restaurantType, lang)}` : restaurantTypeName(venue.restaurantType, lang))
                  : '',
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
          {/* v0.62.684 — operator: "I don't like truncate effect on Dish-hint
              italic". truncate -> line-clamp-2 on the standard tier; hidden
              entirely on the short tier (phone landscape), where it moves
              behind the toggle to buy the vertical room back. */}
          {specialMode === 'durian-pastry' && !isShort
            && !/durian/i.test(venue.name || '') && (
            <div className="text-[11px] italic text-tg-hint line-clamp-2">
              {tr('card.durianPastryInquire', lang)}
            </div>
          )}
          {/* v0.62.176 — operator: REVERTED the v0.62.168 "wrap by field" meta;
              single-line meta (truncate) again, same as the vertical list. */}
          <div className={`text-[12px] text-tg-hint ${horizontal ? (isShort ? 'line-clamp-1' : 'line-clamp-2') : 'truncate'}`}>{meta}</div>
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
          {/* v0.62.691 — the flex parent already supplies gap-0.5 between every
              row; on the horizontal card this mt-0.5 doubled it. Dropped there,
              kept in the vertical list where there is no height budget. */}
          {!isShort && (venue.priceRangeDisplay || venue.wheelchairAccessible === true || venue.allowsDogs === true || livenessChip) && (
            <div className={`text-[12px] text-tg-text/80 ${horizontal ? 'line-clamp-2' : 'mt-0.5 truncate'}`}>
              {[
                // v0.62.212 — card style A: the horizontal card drops the bulky
                // secondary-currency "(≈M$…)" conversion (still on the expanded
                // card + copy) and prefixes 💵 so price scans fast; the row may
                // wrap to 2 lines rather than truncate.
                venue.priceRangeDisplay
                  ? (horizontal ? `💵 ${venue.priceRangeDisplay.replace(/\s*\([^)]*\)\s*$/, '')}` : venue.priceRangeDisplay)
                  : '',
                venue.wheelchairAccessible === true && '♿️',
                venue.allowsDogs === true && tr('card.petAllowed', lang),
                livenessChip
              ].filter(Boolean).join(' · ')}
            </div>
          )}
          {/* v0.62.298 — operator: the horizontal strip dropped the home-currency
              "(≈…)" conversion to stay compact, so ¥/₫/Rp/₩ venues showed only the
              native price. Restore it on a small muted 2nd line (strip only). */}
          {horizontal && venue.priceRangeDisplay && (() => {
            const m = venue.priceRangeDisplay.match(/\(([^)]*)\)\s*$/);
            const conv = m && m[1] ? m[1].replace(/^≈\s*/, '') : '';
            return conv ? (
              <div className="text-[10px] text-tg-hint leading-tight">≈ {conv}</div>
            ) : null;
          })()}
          {/* v0.62.299 / v0.62.301 — "Set Meal (Beta)" annotation. The server
              scraped the venue's OWN website and only attaches a set-meal PRICE
              when CONFIRMED (no fakes); ✅ marks the source. Absent otherwise.
              Signature/popular dishes were removed — they stay on the "Try" line. */}
          {venue.setMeal && venue.setMeal.price && (
            <div className="text-[12px] text-tg-hint mt-0.5">
              🍱 {(venue.setMeal.type === 'set-dinner'
                ? tr('card.setDinner', lang)
                : tr('card.setLunch', lang))} {tr('card.setFrom', lang)} {venue.setMeal.price} <span className="text-tg-accent">✅</span>
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
              <div className={`text-[13px] text-tg-text leading-snug ${horizontal ? 'mt-0.5' : 'mt-1'}`}>
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
          {!isShort && venue.michelinCategory && (
            <div className={`text-[12px] text-tg-text font-semibold ${horizontal ? 'mt-0.5' : 'mt-1'}`}>
              {michelinAnnotation(venue.michelinCategory, venue.michelinAwardYears, venue.michelinGreenStar)}
            </div>
          )}

          {/* v0.62.588 — operator (Brisbane): the street address is now VISIBLE on
              the collapsed card (was revealed only on expand since v0.62.124). Sits
              just above the collapse boundary with the 🍲 Try / Michelin rows.
              Country name already dropped by dropCountry; truncates on the compact
              horizontal strip, wraps in the vertical list. */}
          {/* v0.62.684 — operator: "I don't like truncate effect on ... Address /
              area" + "can abbreviate the country and state to reduce text
              character usage". Country was ALREADY dropped by dropCountry();
              abbrevAddress() adds the two remaining reductions (drop the postal
              code, abbreviate a spelled-out state). The de-truncation is what
              actually fixes the row: line-clamp-2 on the standard tier, and
              line-clamp-1 on the short tier where there is only room for one
              line (a space-forced exception, per the approved spec). */}
          {venue.area && (
            <div className={`text-[12px] text-tg-hint leading-snug ${horizontal ? `mt-0.5 ${isShort ? 'line-clamp-1' : 'line-clamp-2'}` : 'mt-1 break-words'}`}>
              📍 {horizontal ? abbrevAddress(dropCountry(venue.area)) : dropCountry(venue.area)}
            </div>
          )}
          {/* v0.62.850 — how to SAY the street. Operator: "would the foreign address being
              translated help?" — their own examples were transliterations, and that is what
              this is: Телок Бланга Драйв, not Проезд Телок Бланга. The English line above
              STAYS, because that is the one a reader shows a driver or types into Maps;
              this one only helps them read and pronounce it. Rendered only when the guide
              differs from the street itself, so an English reader sees nothing. */}
          {/* v0.62.895 — the address gained a PRECEDENCE, because it gained a second
              candidate. `addressLocal` — the real address in the local script — now
              exists on every foreign-script venue (local-name.js) and has existed on
              1,186 Michelin rows since v0.62.824 without ever being rendered. It
              outranks the pronunciation for everyone: a reader who can read the script
              wants the authoritative form, and a reader who cannot still wants it,
              because it is the line they hold up to a driver. A transliteration helps
              you SAY a street; it is not an address.
              Exactly ONE renders — the operator's "Both means TWO". The English line
              above is never displaced; it stays the Maps query and the share payload. */}
          {(() => {
            const g = pickAddressGuide(venue, streetSay, addrStreet);
            if (!g) return null;
            return (
              <div className="text-[12px] text-tg-hint leading-snug flex items-center gap-1 min-w-0">
                {g.icon === 'pronounce' && <PronounceIcon className="shrink-0 opacity-80" />}
                <span className="truncate">{g.text}</span>
              </div>
            );
          })()}

          {/* v0.62.124 — collapse toggle. Collapsed = identity + meta + price +
              🍲 Try (above); everything below is revealed on expand. A focused/
              selected card auto-expands. The toggle stops propagation so it
              doesn't fire the card's onTap (map focus / future carousel). */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            aria-expanded={expanded}
            aria-controls={detailsId}
            className={`self-start px-1.5 py-0.5 rounded-full border border-tg-accent/30 text-[11px] text-tg-accent/70 font-medium active:scale-95 transition-transform ${horizontal ? 'mt-1' : 'mt-1.5'}`}
          >
            {/* v0.62.684 — operator: use the standard Unicode disclosure
                triangles, ▸ (U+25B8) collapsed / ▾ (U+25BE) expanded, replacing
                the old ⌄ / ⌃ chevrons. The glyph is rendered HERE rather than
                baked into the i18n value (where it lived in all 8 locales, 16
                strings, free to drift apart) — one source, aria-hidden so the
                accessible name stays the words alone. */}
            <span aria-hidden className="mr-0.5">{expanded ? '▾' : '▸'}</span>
            {expanded
              ? tr('card.detailsLess', lang)
              : tr('card.detailsMore', lang)}
          </button>

          {/* P1-e — the revealed region carries the aria-controls target id.
              display:contents keeps the wrapper out of layout entirely (the
              children stay direct flex items of the card, byte-for-byte the
              same rendering as the old bare fragment). */}
          {expanded && (<div id={detailsId} style={{ display: 'contents' }}>
          {/* v0.62.588 — the address row moved OUT of the collapsible section to be
              always visible above the boundary (operator: address on the collapsed
              card). It no longer renders here. */}
          {/* v0.62.37 — ⭐ Recommend tie-in (D792): the venue's own evidence
              mentions one of the anchored city's unique dishes. Tier in WORDS. */}
          {venue.cityDish && venue.cityDish.dish && (
            <div className="text-[13px] text-tg-text mt-1 leading-snug">
              ⭐ <span className="font-medium">{(() => {
                const t2 = venue.cityDish.tier;
                return t2 === 'city-icon' ? tr('card.tierCityIcon', lang) : t2 === 'regional' ? tr('card.tierRegional', lang) : tr('card.tierNational', lang);
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
                  <span className="not-italic"> ( {venue.recentReviewTranslatedFlag} {tr('card.reviewTranslated', lang)})</span>
                )}
              </span>
            </div>
          )}
          {/* v0.62.124 — vibe moved to AFTER the review (operator). */}
          {venue.vibe && <div className="text-[13px] text-tg-text mt-1 leading-snug">{venue.vibe}</div>}
          {/* v0.62.124 — Maps + Copy + socials are now the LAST row (operator). */}
          <div className="flex flex-wrap gap-1.5 mt-1">
            <button type="button" onClick={openMaps}
              className="text-[12px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg text-tg-text">📍 Maps</button>
            <button type="button" onClick={copy} disabled={copying}
              className="text-[12px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg text-tg-text">
              {copying ? '…' : copied ? tr('card.sent', lang) : tr('btn.copyOne', lang)}
            </button>
            <SocialButtons profiles={socialProfiles} bare />
          </div>
          </div>)}
    </button>
    </div>
  );
}

// v0.60.16 — mirror the chat-card formatter (SG-michelin.js
// formatMichelinLine) so the TMA UI shows the same labels.
// v0.62.665 — `year` (a single number) replaced with `awardYears`, a
// compact newest-first array of "'26"-style strings — a venue can now be
// shown as retaining its award across multiple consecutive editions
// ("⭐⭐ · '26, '25") without ever implying it held a DIFFERENT category in
// an earlier year (a promoted/demoted venue only ever gets the years
// matching its CURRENT category — see index.js's retainedAwardYears()).
// v0.62.766 — the Green Star reaches the card. Two shapes, because a Green
// Star is a sustainability distinction and not a rung on the star ladder:
//   holds a tier too  → the tier label, then a 🌱 suffix. The tier never moves
//                       aside; Amber stays "⭐⭐⭐" and gains the leaf.
//   holds only one    → category arrives as 'green-star' and gets its own
//                       label. Without this it fell to the generic
//                       '✳️ Michelin', which reads as an unspecified star.
function michelinAnnotation(category, awardYears, greenStar) {
  const labels = {
    'three-star':   '✳️ Michelin · ⭐⭐⭐',
    'two-star':     '✳️ Michelin · ⭐⭐',
    'one-star':     '✳️ Michelin · ⭐',
    'bib-gourmand': '✳️ Bib Gourmand',
    'green-star':   '🌱 Michelin Green Star'
  };
  const prefix = labels[category] || '✳️ Michelin';
  const years = Array.isArray(awardYears) && awardYears.length ? awardYears : ["'25"];
  const leaf = greenStar === true && category !== 'green-star' ? ' · 🌱' : '';
  return `${prefix}${leaf} · ${years.join(', ')}`;
}
