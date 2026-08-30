// cuisine-enrich.js — the /api/cuisine/search enrichment chain, split into
// FAST (pure/local — enough for a useful base card) and SLOW (network / LLM)
// phases. Extracted verbatim from index.js (v0.62.x, progressive-results
// Stage 1) so the route can later stream the base page after enrichFast and
// patch the slow fields per-card as enrichSlow resolves. Stage 1 is a pure
// refactor: the route awaits enrichFast(top, ctx) then enrichSlow(top, ctx)
// and the response payload is byte-identical to the pre-refactor handler.
//
// Phase boundaries are dependency-driven, not arbitrary:
//   • the regex dish/snippet pass runs in FAST (no IO);
//   • the review-dependent finalise (recentReview fallback, the "ago" label,
//     and the `delete v.reviews` cleanup) stays at the END of SLOW because
//     the translate + Redis-fallback + Gemini steps before it still need
//     `v.reviews`, and the "ago" label must match the FINAL recentReview;
//   • hours/type labels, price-range display, and distance are independent
//     of every slow field, so hoisting them into FAST changes nothing.
//
// All index.js-local helpers (humaniseRestaurantType, enrichPriceRangeDisplay,
// enrichSanctuaryRead) are injected via ctx so this module stays require-light
// and unit-testable.

'use strict';

const { isDishName, filterDishNames } = require('./dish-name');

const FOUR_MONTHS_MS = 120 * 24 * 60 * 60 * 1000;

// v0.60.156 — Places v1 wraps each review's text in a nested object
// `{ text, languageCode }`. Bare-string access String-coerced the object to
// "[object Object]" which then surfaced on the TMA card as the visible
// review.
const reviewText = (r) => (r && typeof r.text === 'object' && r.text)
  ? (typeof r.text.text === 'string' ? r.text.text : '')
  : (typeof r?.text === 'string' ? r.text : '');

// v0.57.10 — reviewer-recommended dishes from a venue's reviews. Regex —
// free, no LLM call. v0.61.390 — prefer recent (≤4 mo) reviews but fall back
// to the best available so the 💬 quote shows whenever Google has ANY review.
function extractDishes(reviews, venueName, now = Date.now()) {
  const withText = (reviews || []).filter((r) => reviewText(r));
  const recent = withText.filter((r) => {
    if (!r.publishTime) return true; // keep undated
    const t = new Date(r.publishTime).getTime();
    return Number.isFinite(t) ? (now - t) <= FOUR_MONTHS_MS : true;
  });
  const pool = (recent.length ? recent : withText).slice(0, 3);
  if (!pool.length) return { dishes: [], snippet: null };
  const allText = pool.map((r) => reviewText(r)).join(' . ');
  const patterns = [
    /(?:ordered|tried|had|got|loved?|recommend)\s+(?:the\s+)?([A-Z][\w'-]+(?:\s+[\w'-]+){0,3})/g,
    /(?:their|the)\s+([A-Z][\w'-]+(?:\s+[\w'-]+){0,3})\s+(?:is|was|were)\s+(?:amazing|delicious|great|excellent|fantastic|good|tasty)/gi
  ];
  // v0.60.225 — dish-quality gate is the shared dish-name.js isDishName();
  // plus the venue-name guard (a capture containing the venue's own name is a
  // leaked sentence fragment, not a dish).
  const venueLc = String(venueName || '').trim().toLowerCase();
  const dishes = new Set();
  for (const re of patterns) {
    let m;
    while ((m = re.exec(allText)) !== null && dishes.size < 5) {
      const candidate = (m[1] || '').trim();
      if (!isDishName(candidate)) continue;
      if (venueLc) {
        const dn = candidate.toLowerCase();
        if (dn.includes(venueLc) || venueLc.includes(dn)) continue;
      }
      // Require at least one capitalised internal token (proper-noun-ish)
      // OR the whole candidate to be a single recognisable word ≥4 chars.
      const tokens = candidate.split(/\s+/);
      const hasCapitalised = tokens.some((t) => /^[A-Z][a-z]+/.test(t));
      if (!hasCapitalised && tokens.length > 1) continue;
      dishes.add(candidate);
    }
  }
  return { dishes: [...dishes].slice(0, 3), snippet: reviewText(pool[0]).slice(0, 200).trim() };
}

// ── FAST phase — pure/local; everything a useful base card needs ──────────
//
// ctx: { cuisineQueries, csChatId, deviceRegion,
//        humaniseRestaurantType, enrichPriceRangeDisplay }
async function enrichFast(top, ctx) {
  const pipelineMod = require('./pipeline');
  // v0.59.24 — drinks filter for "🍴 Try ·" (skip for Dessert/Fusion).
  const dropDrinks = pipelineMod.shouldFilterDrinks(ctx.cuisineQueries);
  // Regex dish + review-snippet pass (inline Places reviews).
  for (const v of top) {
    if (Array.isArray(v.reviews) && v.reviews.length) {
      const { dishes, snippet } = extractDishes(v.reviews, v.name);
      const filtered = dropDrinks ? pipelineMod.filterOutDrinks(dishes) : dishes;
      if (filtered.length) v.dishes = filtered;
      if (snippet) v.recentReview = snippet;
    }
  }
  // v0.57.20 / v0.61.246 — open-hours labels; v0.60.140 — restaurantType.
  // (The review-dependent finalise — recentReview fallback, "ago", deletes —
  // runs at the END of enrichSlow; see the module header.)
  const { closedTodayString, currentOpenString, minutesUntilClose, reopenTodayInfo, closedTodayByLang, currentOpenByLang } = require('./open-hours');
  // v0.62.305 — localise the open-hours label to the user's locale (id/fr/en).
  const ohLang = ctx.csLang || 'en';
  for (const v of top) {
    // v0.62.291 — prefer the holiday-aware currentOpeningHours.periods; fall back
    // to the regular weekly schedule. Compute in the venue's own timezone via
    // utcOffsetMinutes (SGT default when absent).
    // v0.62.486 — [] is truthy, so `current || regular` wrongly kept an EMPTY
    // currentOpeningHours.periods and starved the helpers (bare "Open"/"Closed").
    // Fall back to the weekly schedule when the current list is empty.
    const periods = (Array.isArray(v.currentPeriods) && v.currentPeriods.length)
      ? v.currentPeriods
      : v.regularPeriods;
    const offset = Number.isFinite(v.utcOffsetMinutes) ? v.utcOffsetMinutes : undefined;
    // v0.62.827 — Tier 1: every locale, so the Mini App's language toggle can
    // re-render the hours line WITHOUT a re-search (which would return a different
    // set of eateries — the operator's objection, and a correct one). The scalar
    // label stays: the chat card and every non-TMA consumer still read it.
    const now = new Date();
    if (v.openNow === false) {
      v.closedTodayByLang = closedTodayByLang(periods, now, offset);
      v.closedTodayLabel = closedTodayString(periods, new Date(), offset, ohLang);
      // v0.62.467 — closed-now-but-reopens-today: minutes-until-open + open~close range.
      const ri = reopenTodayInfo(periods, new Date(), offset, ohLang);
      if (ri) { v.reopenMinutes = ri.minutesUntilOpen; v.reopenStart = ri.openStart; v.reopenEnd = ri.openEnd; }
    } else if (v.openNow === true) {
      v.openClosingByLang = currentOpenByLang(periods, now, offset);
      v.openClosingLabel = currentOpenString(periods, new Date(), offset, ohLang);
      // v0.62.466 — operator: flag "Closing in ## minutes" on the result card
      // when a currently-open venue closes within the hour.
      const mins = minutesUntilClose(periods, new Date(), offset);
      if (Number.isFinite(mins) && mins >= 0 && mins <= 60) v.closingSoonMinutes = mins;
    } else {
      // v0.62.x — openNow UNKNOWN (Google omitted currentOpeningHours.openNow):
      // both branches above are skipped, so the 🕛 row renders blank (operator:
      // "the clock is not there"). We still have the weekly schedule in `periods`,
      // so derive the label from it — WITHOUT setting v.openNow (the Closed
      // corner-tab + open-now filters gate on openNow === false, so leaving it
      // null keeps them untouched; this only fills the informational label).
      const openLbl = currentOpenString(periods, new Date(), offset, ohLang);
      if (openLbl) {
        v.openClosingLabel = openLbl;
        v.openClosingByLang = currentOpenByLang(periods, now, offset);
      } else {
        const closedLbl = closedTodayString(periods, new Date(), offset, ohLang);
        if (closedLbl) {
          v.closedTodayLabel = closedLbl;
          v.closedTodayByLang = closedTodayByLang(periods, now, offset);
        }
      }
    }
    if (!v.restaurantType) {
      v.restaurantType = ctx.humaniseRestaurantType(v.primaryTypeDisplayName, v.primaryType) || '';
    }
  }
  // v0.60.183 — venue-card price-range pre-resolution.
  try { await ctx.enrichPriceRangeDisplay(ctx.csChatId, top, ctx.deviceRegion); } catch (err) {
    console.warn('[Cuisine-Search] enrichPriceRangeDisplay failed:', err.message);
  }
  return { dropDrinks };
}

// ── SLOW phase — network / LLM, in the pre-refactor relative order ────────
//
// ctx: { redis, csLang, cuisines, cuisineQueries, searchCenter,
//        enrichSanctuaryRead } (+ the fast ctx fields)
async function enrichSlow(top, ctx) {
  const pipelineMod = require('./pipeline');
  const dropDrinks = pipelineMod.shouldFilterDrinks(ctx.cuisineQueries);
  const redis = ctx.redis;
  // v0.62.x — per-phase timing instrumentation (operator: "Load failed" =
  // enrichSlow blew the 20s D706 deadline). One summary line at the end pins
  // the dominant cost. `_last` deltas measure each sequential phase in turn.
  const _t = {}; let _last = Date.now(); const _t0all = _last;
  // v0.57.31 — LTA-carpark crowd signal (one fetch per 500 m grid cell).
  try {
    const { attachCrowdSignals } = require('./crowd-signal');
    await attachCrowdSignals(top);
  } catch (err) {
    console.warn('[Cuisine-Search] crowd-signal attach failed:', err.message);
  }
  _t.crowd = Date.now() - _last; _last = Date.now();
  // v0.61.152/154 — translate the nationality-preferred review into the
  // user's device language.
  try {
    const { enrichVenuesWithTranslatedReview } = require('./cuisine-review-language');
    await enrichVenuesWithTranslatedReview({
      venues: top,
      cuisineSlugs: ctx.cuisines || [],
      targetLang: ctx.csLang,
      redis
    });
  } catch (err) {
    console.warn('[Cuisine-Search] translate-enrich failed:', err.message);
  }
  _t.translate = Date.now() - _last; _last = Date.now();
  // Redis place-reviews cache fallback for venues without inline reviews.
  try {
    if (redis.isOpen) {
      await Promise.all(top.map(async (v) => {
        if (!v.placeId || (Array.isArray(v.dishes) && v.dishes.length)) return;
        try {
          const raw = await redis.get(`place-reviews:${v.placeId}`);
          if (!raw) return;
          const reviews = JSON.parse(raw);
          const { dishes, snippet } = extractDishes(reviews, v.name);
          // v0.59.24 (Codex #229 P2) — same drinks filter as the inline path.
          const filtered = dropDrinks ? pipelineMod.filterOutDrinks(dishes) : dishes;
          if (filtered.length) v.dishes = filtered;
          if (snippet && !v.recentReview) v.recentReview = snippet;
        } catch { /* per-venue best-effort */ }
      }));
    }
  } catch (err) {
    console.warn('[Cuisine-Search] cache-fallback failed:', err.message);
  }
  _t.reviewCache = Date.now() - _last; _last = Date.now();
  // v0.60.226 — regex-first dish sourcing with a cached Gemini fallback for
  // the venues regex left empty (per-venue Redis cache incl. negatives).
  try {
    const DISH_CACHE_PREFIX = 'cuisine-dishes:v1:';
    const DISH_CACHE_TTL_HIT_S = 7 * 24 * 60 * 60;
    const DISH_CACHE_TTL_MISS_S = 24 * 60 * 60;
    // Cache stores RAW Gemini output; cleaning re-applied on read.
    const cleanDishes = (raw, venueName) => {
      const venueLc = String(venueName || '').trim().toLowerCase();
      const cleaned = filterDishNames(Array.isArray(raw) ? raw : []).filter((d) => {
        if (!venueLc) return true;
        const dn = d.toLowerCase();
        return !(dn.includes(venueLc) || venueLc.includes(dn));
      });
      return dropDrinks ? pipelineMod.filterOutDrinks(cleaned) : cleaned;
    };
    const gapVenues = top.filter((v) =>
      v.placeId &&
      !(Array.isArray(v.dishes) && v.dishes.length) &&
      Array.isArray(v.reviews) && v.reviews.length
    );
    const needGemini = [];
    if (gapVenues.length) {
      await Promise.all(gapVenues.map(async (v) => {
        let cached = null;
        if (redis.isOpen) {
          try {
            const raw = await redis.get(DISH_CACHE_PREFIX + v.placeId);
            if (raw) cached = JSON.parse(raw);
          } catch { /* treat as uncached */ }
        }
        if (cached && Array.isArray(cached.dishes)) {
          const filtered = cleanDishes(cached.dishes, v.name);
          if (filtered.length) v.dishes = filtered;
          return; // cache hit — skip Gemini for this venue
        }
        needGemini.push(v);
      }));
    }
    // v0.62.715 — Phase C: skip the paid LLM dish pass when the day's spend
    // is over the hard cap. The regex pass above already ran and the cached
    // hits above were already applied, so the card keeps whatever dishes it
    // could get for free.
    const dishesAllowed = await require('./spend-guard').allows(redis, 'dishes');
    if (!dishesAllowed && needGemini.length) {
      console.warn(`[Cuisine-Search] dish extraction skipped for ${needGemini.length} venue(s) — spend guard at hard cap`);
    }
    if (needGemini.length && dishesAllowed) {
      const geminiMod = require('./gemini-client');
      const venuesForLlm = needGemini.map((v) => ({
        id: v.placeId,
        name: v.name,
        reviews: v.reviews
          .filter((r) => (Number(r && r.rating) || 0) >= 4)
          .map((r) => ({ rating: Number(r.rating) || 0, text: reviewText(r) }))
          .filter((r) => r.text)
      })).filter((v) => v.reviews.length);
      if (venuesForLlm.length) {
        const llmDishes = await geminiMod.extractDishesFromReviews({ venues: venuesForLlm, redis });
        const batchIds = new Set(venuesForLlm.map((v) => v.id));
        for (const v of needGemini) {
          if (!batchIds.has(v.placeId)) continue;
          const picked = llmDishes.get(v.placeId);
          const rawDishes = Array.isArray(picked) ? picked : [];
          if (rawDishes.length) {
            const filtered = cleanDishes(rawDishes, v.name);
            if (filtered.length) v.dishes = filtered;
          }
          // Cache RAW Gemini result; empty array = negative cache (short TTL).
          if (redis.isOpen) {
            const ttl = rawDishes.length ? DISH_CACHE_TTL_HIT_S : DISH_CACHE_TTL_MISS_S;
            redis.setEx(
              DISH_CACHE_PREFIX + v.placeId,
              ttl,
              JSON.stringify({ dishes: rawDishes, at: Date.now() })
            ).catch(() => { /* best-effort */ });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Cuisine-Search] Gemini dish extraction failed:', err.message);
  }
  _t.dishes = Date.now() - _last; _last = Date.now();
  // v0.62.854 — the dish list in the reader's language, REPLACING the English rather than
  // sitting beside it. Operator: *"i am concerns about having both english and japanese
  // (translated) for dishes, can we show dishes in translated rather than both to save line
  // spacing"* — on a card whose dish line had wrapped to three.
  //
  // Replacing is safe here in a way it is NOT for the name or the address. Those keep their
  // English because something downstream depends on it: matching the real venue, showing a
  // driver, typing into Maps. A dish list is descriptive prose that nothing depends on, so
  // the second line would cost height and buy nothing.
  //
  // Runs AFTER all four `v.dishes = filtered` assignments above, so it localises the list
  // that is actually shown. Iconic names ("laksa", "char kway teow") never reach the model,
  // the cache is keyed per DISH so venues sharing one share the answer, and an English
  // reader short-circuits before any of it.
  try {
    const { localiseVenueDishes } = require('./translate-dishes');
    await localiseVenueDishes(top, ctx.csLang, { redis: redis && redis.isOpen ? redis : null });
  } catch (err) {
    console.warn('[Cuisine-Search] dish localisation failed:', err.message);
  }
  _t.dishLocalise = Date.now() - _last; _last = Date.now();
  // Review finalise — MUST run after translate/fallback/Gemini (they read
  // v.reviews; the "ago" label must match the FINAL recentReview).
  for (const v of top) {
    if (!v.recentReview && Array.isArray(v.reviews) && v.reviews[0]) {
      const txt = reviewText(v.reviews[0]);
      if (txt) v.recentReview = txt.replace(/\s+/g, ' ').trim().slice(0, 160);
    }
    // v0.61.417 — the review's relative date ("X ago"), matched to the review
    // whose text became recentReview, else the most-recent review. Must run
    // BEFORE `delete v.reviews`.
    if (!v.recentReviewAgo && v.recentReview && Array.isArray(v.reviews)) {
      const rr = String(v.recentReview);
      const m = v.reviews.find((r) => {
        const t = reviewText(r);
        return t && rr.includes(t.replace(/\s+/g, ' ').trim().slice(0, 40));
      }) || v.reviews[0];
      if (m && m.relative) v.recentReviewAgo = m.relative;
    }
    delete v.primaryTypeDisplayName;
    delete v.regularPeriods;
    delete v.currentPeriods;
    delete v.utcOffsetMinutes;
    // v0.62.71x — `delete v.reviews` moved OUT of this loop (see below).
    // enrichSanctuaryRead (a few lines down) still needs v.reviews to avoid
    // a redundant Places Details re-fetch for the exact same field.
  }
  // v0.62.852 — THE QUOTED REVIEW IN THE READER'S LANGUAGE.
  //
  // Operator, on a Japanese card: *"card's review text isn't taken from japanese version -
  // still show english"*.
  //
  // The path already called `enrichVenuesWithTranslatedReview` above, and I first read that
  // as "reviews are handled". They are not, and the gate is the reason: that helper returns
  // immediately unless the SEARCH carries a nationality cuisine slug, and even then it
  // looks for a review written in that NATIONALITY's language — an Indonesian review on an
  // Indonesian venue — so it can show "( 🇮🇩 translated)". It is a different feature.
  // Everything falling through to the plain `reviews[0]` above kept whatever language
  // Google returned, which for Singapore is almost always English.
  //
  // COST, because this is the least dedupable thing in the arc: one call per
  // (venue review, locale), 30-day Redis cached by `translate-review.js` on
  // placeId+index+source+target. Venue names and streets collapse across venues; a review
  // does not. It sits inside the operator's stated envelope — "minimum token Gemini model
  // call per venue per locale" — and nowhere beyond it.
  //
  // THE RULE, IN THE OPERATOR'S WORDS: *"translation only applies if the device language
  // isn't the same"*. That is one condition — source language ≠ reader's language — and
  // v0.62.852 shipped it with a second one bolted on: `ctx.csLang !== 'en'`, added as a
  // cost optimisation on the assumption that reviews are English and only non-English
  // readers need anything.
  //
  // That assumption fails in exactly one direction, and the operator's sentence is what
  // exposed it: a JAPANESE review shown to an ENGLISH reader was left in Japanese, because
  // the reader's own locale short-circuited the whole block. Reviews are written by
  // visitors, so a foreign-language review on a Singapore venue is ordinary, not exotic.
  //
  // So the gate is now the rule and nothing else. The common case still costs nothing —
  // an English review for an English reader is caught by the same-language skip below,
  // one line further in, using the review's own Places `languageCode`.
  if (ctx.csLang) {
    try {
      const { reviewLanguagePrimary } = require('./cuisine-review-language');
      const { translateReview } = require('./translate-review');
      await Promise.all(top.map(async (v) => {
        if (!v || !v.recentReview || v.recentReviewTranslatedFlag) return;   // already done above
        const rr = String(v.recentReview);
        const src = Array.isArray(v.reviews)
          ? v.reviews.find((r) => {
            const t = reviewText(r);
            return t && rr.includes(t.replace(/\s+/g, ' ').trim().slice(0, 40));
          })
          : null;
        const srcLang = reviewLanguagePrimary(src || (v.reviews || [])[0]) || 'en';
        if (srcLang === ctx.csLang) return;
        try {
          const out = await translateReview({
            text: rr,
            sourceLang: srcLang,
            targetLang: ctx.csLang,
            placeId: v.placeId || null,
            reviewIdx: 0,
            redis: redis && redis.isOpen ? redis : null,
          });
          if (typeof out === 'string' && out.trim() && out.trim() !== rr) {
            v.recentReview = out.trim().slice(0, 200);
            v.recentReviewSourceLang = srcLang;
          }
        } catch { /* per-venue best effort — the original text still shows */ }
      }));
    } catch (err) {
      console.warn('[Cuisine-Search] review localisation failed:', err.message);
    }
  }
  _t.reviewLocalise = Date.now() - _last; _last = Date.now();
  _t.finalise = Date.now() - _last; _last = Date.now();
  // v0.58.52 — TRANSIT + DRIVE minutes (Routes API). Best-effort.
  try {
    const { enrichTravelTimes } = require('./travel-times');
    await enrichTravelTimes(ctx.searchCenter.lat, ctx.searchCenter.lng, top, redis);
  } catch (err) { console.warn('[Cuisine-Search] travel-times failed:', err.message); }
  _t.travel = Date.now() - _last; _last = Date.now();
  // v0.62.715 — Phase C: the sanctuary read is an Anthropic Haiku call per
  // uncached venue. Sheddable at the hard cap; the card just omits the 🌿 block.
  if (!(await require('./spend-guard').allows(redis, 'sanctuary'))) {
    console.warn('[Cuisine-Search] sanctuary read skipped — spend guard at hard cap');
  } else {
    try { await ctx.enrichSanctuaryRead(top, ctx.csLang); } catch (err) {
      console.warn('[Cuisine-Search] enrichSanctuaryRead failed:', err.message);
    }
  }
  _t.sanctuary = Date.now() - _last; _last = Date.now();
  // v0.59.0 — footfall (BestTime). Dormant without key.
  // v0.62.77 — O-46: BestTime resolves venues by SG name+address and has poor
  // non-SG coverage (`resolved=0/N` on MY/etc.), so it spends latency for zero
  // result. Skip it entirely for non-SG searches. `isSG === false` is the only
  // skip trigger; absent/undefined ctx keeps the prior (SG-assumed) behaviour.
  // v0.62.715 — Phase C adds a second skip trigger: the hard spend cap.
  if (ctx.isSG === false) {
    console.log('[Cuisine-Search] footfall skipped (non-SG region — BestTime has no coverage)');
  } else if (!(await require('./spend-guard').allows(redis, 'footfall'))) {
    console.warn('[Cuisine-Search] footfall skipped — spend guard at hard cap');
  } else {
    try {
      const { attachFootfallSignals } = require('./footfall-signal');
      await attachFootfallSignals(redis, top);
    } catch (err) { console.warn('[Cuisine-Search] footfall failed:', err.message); }
  }
  _t.footfall = Date.now() - _last;
  // v0.62.71x — `delete v.reviews` deferred here (was inside the finalise loop
  // above, before enrichSanctuaryRead existed downstream of it). Nothing past
  // this point reads v.reviews; the response payload must not carry it.
  for (const v of top) delete v.reviews;
  // v0.62.x — one-line phase breakdown so the next "Load failed" log pinpoints
  // the dominant cost (Gemini dishes vs Claude sanctuary vs BestTime vs Routes).
  console.log(`[Cuisine-Enrich] D707 enrichSlow timings (${Array.isArray(top) ? top.length : 0}v): `
    + Object.entries(_t).map(([k, v]) => `${k}=${v}ms`).join(' ')
    + ` total=${Date.now() - _t0all}ms`);
}

module.exports = { reviewText, extractDishes, enrichFast, enrichSlow, FOUR_MONTHS_MS };
