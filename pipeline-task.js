// pipeline-task.js — v0.32.0 background runner.
//
// Drives a request row through:  Stage A (prompt-builder) → Stage B
// (reasonExecute) → place validate → rank → refine → final venues.
//
// Decoupled from any HTTP timeout: the TMA polls the request row for
// status updates while this runs.
//
// kind: 'cuisine' or 'surprise'.
// - cuisine returns up to 15 candidates → 5 surfaced + Show next 10.
// - surprise returns 5 candidates with these gates (v0.47.1):
//     rating ≥ 4.0, opened ≤100 days ago, open now.
//   The previous "hidden gem" framing (rating 4.0-4.3, <50 reviews)
//   was retired because the SG distribution skews to 4.4+ and the
//   review-count cap eliminated viable venues. Current spec is
//   "fresh openings that are currently open with a decent rating."

const requestStore = require('./request-store');
const promptBuilder = require('./prompt-builder');
const pipeline = require('./pipeline');
const responseCache = require('./response-cache');
const { validateWithPlaces, rankByWalkingTime, mealPeriodSGT } = require('./vibe-suggest');
const vaultIndex = require('./vault-index');
const rarityScore = require('./rarity-score');
const holidays = require('./holidays');
const { logger, forRequest } = require('./logger');
const { captureWithReqId } = require('./sentry');

// v0.41.0: rollback flag. When 'false' the legacy
// Reason → Validate path runs (v0.40.1 behaviour). Default ON.
function inversionEnabled() {
  return process.env.PIPELINE_INVERSION_ENABLED !== 'false';
}

const NEAR_DAYS_DEFAULT = 90;
const QUEUE_MAX_DEFAULT = 15;

// Surprise-specific gates per Human Lead spec.
//
// v0.47.1 (final-for-this-session): rating ≥ 4.0 (no upper cap),
// opened within 100 days (hard gate), open now. Reverses the
// v0.47.0 attempt to widen+drop the launch gate — Human Lead
// preference is "I want fresh openings, currently open, decent
// rating" rather than "hidden gem with low review count". The
// <50 reviews gate is REMOVED accordingly (popular venues now OK).
const SURPRISE_RATING_MIN = 4.0;
const SURPRISE_LAUNCH_WINDOW_DAYS = 100;
const SURPRISE_LAUNCH_RELAXED_DAYS = 200; // soft fallback if 0 venues meet 100d

function applySurpriseGates(venues, opts = {}) {
  const launchWindowDays = opts.launchWindowDays || SURPRISE_LAUNCH_WINDOW_DAYS;
  const launchCutoff = new Date(Date.now() - launchWindowDays * 86400 * 1000);
  return venues.filter((v) => {
    // 1. Rating ≥ 4.0 (no upper cap).
    if (typeof v.rating === 'number' && v.rating < SURPRISE_RATING_MIN) return false;
    // 2. Opened within 100 days — only enforced when verifiedOpeningDate
    //    is present. Places API doesn't expose opening dates so this
    //    relies on the LLM (rankAndNarrate) to assert verifiedOpeningDate.
    //    When absent, venue passes — soft enforcement.
    if (v.verifiedOpeningDate) {
      const opened = new Date(v.verifiedOpeningDate);
      if (!isNaN(opened) && opened < launchCutoff) return false;
    }
    // 3. openNow check is in applyTemporalGate (called separately
    //    by runSurpriseTask after applySurpriseGates).
    return true;
  });
}

// Day/night temporal gate. Day window = 06:00-22:00 SGT.
// Day: openNow AND remains open ≥2 hours.
// Night: openNow AND open until ≥02:00, OR opens by 08:00 next day.
function applyTemporalGate(venues) {
  const now = new Date();
  const sgtHour = (now.getUTCHours() + 8) % 24;
  const isDay = sgtHour >= 6 && sgtHour < 22;
  return venues.filter((v) => {
    if (!v.openNow) {
      // Night-only allowance: opens by 08:00 next day.
      if (!isDay && typeof v.opensWithinHours === 'number' && v.opensWithinHours <= 12) return true;
      return false;
    }
    // openNow=true paths.
    if (typeof v.closesInHours === 'number') {
      if (isDay) return v.closesInHours >= 2;
      return v.closesInHours >= 4; // ≥02:00 from 22:00 baseline → 4h
    }
    // No closing-time data — allow rather than dead-end.
    return true;
  });
}

async function ensurePromptForKind(redis, reqId, payload, kind) {
  // Stage A.
  await requestStore.setStage(redis, reqId, 'building_prompt');
  await requestStore.pushDiag(redis, reqId, { code: 'D810', label: 'StageA start', ok: true });
  const meal = mealPeriodSGT();
  const phToday = holidays.isPublicHoliday();
  const phNext = holidays.nextPublicHoliday();
  const builderInput = {
    kind,
    lat: payload.lat,
    lng: payload.lng,
    cuisines: payload.cuisines || [],
    radius: payload.radius || 1000,
    recencyDays: payload.recencyDays || NEAR_DAYS_DEFAULT,
    queueMaxMin: payload.queueMaxMin || QUEUE_MAX_DEFAULT,
    mode: payload.mode || 'walk',
    when: payload.when || 'now',
    preset: payload.preset,
    specialRequest: payload.specialRequest,
    lang: payload.lang || 'en',
    mealPeriod: meal.label,
    holidayContext: { isToday: !!phToday, name: phToday?.name || null, next: phNext }
  };
  const { prompt, meta } = await promptBuilder.buildPrompt(builderInput);
  await requestStore.setPromptConstructed(redis, reqId, prompt, meta);
  await requestStore.pushDiag(redis, reqId, { code: 'D811', label: 'StageA done', ok: meta.ok, detail: { ms: meta.ms, model: meta.model } });
  return prompt;
}

async function runReasonWithRelaxation(redis, reqId, prompt, count, isSurprise) {
  const diag = (code, label, ok, detail) => requestStore.pushDiag(redis, reqId, { code, label, ok, detail });
  await requestStore.setStage(redis, reqId, 'reasoning');
  let exec = await pipeline.reasonExecute({ prompt, count, isSurprise, diag });
  if (exec.candidates.length === 0 && Array.isArray(prompt.relaxations) && prompt.relaxations.length) {
    const rule = prompt.relaxations.find((r) => r.trigger === '0_candidates') || prompt.relaxations[0];
    if (rule) {
      await requestStore.pushDiag(redis, reqId, { code: 'D820', label: 'StageB relaxation retry', ok: true, detail: rule });
      const relaxed = {
        ...prompt,
        user: prompt.user + `\n\n[RELAXATION APPLIED — ${rule.note || 'retry'}] Drop these constraints: ${(rule.drop || []).join(', ')}.`
      };
      exec = await pipeline.reasonExecute({ prompt: relaxed, count, isSurprise, diag });
      await requestStore.pushDiag(redis, reqId, { code: 'D821', label: 'StageB relaxed yield', ok: true, detail: { n: exec.candidates.length } });
    }
  }
  await requestStore.setCandidates(redis, reqId, exec.candidates, exec.meta);
  return exec.candidates;
}

async function validateAndRank(redis, reqId, candidates, payload) {
  await requestStore.setStage(redis, reqId, 'validating');
  await requestStore.pushDiag(redis, reqId, { code: 'D830', label: 'Validate start', ok: true, detail: { n: candidates.length } });
  const radius = payload.radius || 1000;
  const settled = await Promise.allSettled(
    candidates.slice(0, 15).map((c) => validateWithPlaces(c, { lat: payload.lat, lng: payload.lng }, radius))
  );
  const validated = [];
  settled.forEach((s, i) => {
    if (s.status !== 'fulfilled' || !s.value) return;
    const v = s.value;
    const c = candidates[i];
    v.signatureDish = c.signatureDish || '';
    v.queueMinEstimate = c.queueMinEstimate != null ? c.queueMinEstimate : null;
    v.bookingRequired = !!c.bookingRequired;
    v.dishes = Array.isArray(c.dishes) ? c.dishes : (c.signatureDish ? [c.signatureDish] : []);
    v.costEstimateSgd = c.costEstimateSgd || null;
    v.verifiedOpeningDate = c.verifiedOpeningDate || null;
    v.verifiedGoogleMapsUrl = c.verifiedGoogleMapsUrl || null;
    validated.push(v);
  });
  await requestStore.pushDiag(redis, reqId, { code: 'D831', label: 'Validate done', ok: true, detail: { n: validated.length } });
  if (!validated.length) return [];
  await requestStore.setStage(redis, reqId, 'ranking');
  const ranked = await rankByWalkingTime(payload.lat, payload.lng, validated);
  await requestStore.pushDiag(redis, reqId, { code: 'D840', label: 'Ranked', ok: true, detail: { n: ranked.length } });
  return ranked;
}

async function refineIfPossible(redis, reqId, ranked, payload, mealLabel) {
  if (!process.env.PIPELINE_ENABLED || process.env.PIPELINE_ENABLED === 'false') return ranked;
  try {
    await requestStore.setStage(redis, reqId, 'refining');
    const diag = (code, label, ok, detail) => requestStore.pushDiag(redis, reqId, { code, label, ok, detail });
    const context = await pipeline.fetchContext(ranked, diag);
    // v0.37.0: footfall A/B telemetry. Increment Redis counters per
    // crowdSignal level so we can answer "how often does the signal
    // actually fire, and how is it distributed?" without subjective
    // recall. Counter only bumps when FOOTFALL_PROXY_ENABLED=on so
    // turning the flag off cleanly stops measurement too.
    if (process.env.FOOTFALL_PROXY_ENABLED === 'on' && context?.clusters?.length) {
      const counts = { high: 0, medium: 0, low: 0, null: 0 };
      for (const c of context.clusters) {
        const level = c.crowdSignal?.level || 'null';
        counts[level] = (counts[level] || 0) + 1;
      }
      // Fire-and-forget — never block refine on telemetry.
      Promise.all([
        counts.high ? redis.incrBy('footfall:signal-fired:high', counts.high) : null,
        counts.medium ? redis.incrBy('footfall:signal-fired:medium', counts.medium) : null,
        counts.low ? redis.incrBy('footfall:signal-fired:low', counts.low) : null,
        counts.null ? redis.incrBy('footfall:signal-fired:null', counts.null) : null,
        redis.incrBy('footfall:fetch-context-runs', 1)
      ].filter(Boolean)).catch((err) => console.warn('[Footfall-Telemetry] incr failed:', err.message));
    }
    return await pipeline.refine({ draft: ranked, context, query: { label: mealLabel }, diag });
  } catch (err) {
    await requestStore.pushDiag(redis, reqId, { code: 'D850', label: 'Refine failed (using ranked)', ok: false, detail: err.message?.slice(0, 200) });
    return ranked;
  }
}

// v0.41.0: inverted /cuisine pipeline.
//   tier-0  cache lookup (cross-user response cache)
//   tier-1  Places-first discover → Claude rank+narrate → rank-by-walk → refine
//   legacy  (PIPELINE_INVERSION_ENABLED=false) Reason→Validate path
async function runCuisineTaskInverted(redis, reqId) {
  const row = await requestStore.get(redis, reqId);
  if (!row) throw new Error(`pipeline-task: row not found ${reqId}`);
  const payload = row.payload;
  const meal = mealPeriodSGT();
  const diagPush = (code, label, ok, detail) => requestStore.pushDiag(redis, reqId, { code, label, ok, detail });
  try {
    // Tier 0 — cross-user cache lookup.
    const cacheParams = {
      lat: payload.lat,
      lng: payload.lng,
      cuisines: payload.cuisines || [],
      mealPeriod: meal.label
    };
    await requestStore.setStage(redis, reqId, 'cache_lookup');
    const cacheRead = await responseCache.get(redis, cacheParams);
    if (cacheRead?.hit) {
      await diagPush('D700', 'Cache HIT', true, { key: cacheRead.key, n: cacheRead.venues.length, ageMs: Date.now() - (cacheRead.cachedAt || 0) });
      responseCache.incrHit(redis);
      // Refine still runs against the cached candidates so weather /
      // traffic copy is fresh per request.
      const refined = await refineIfPossible(redis, reqId, cacheRead.venues, payload, meal.label);
      await requestStore.setVenues(redis, reqId, refined);
      await requestStore.setStatus(redis, reqId, refined.length ? 'done' : 'empty');
      return;
    }
    await diagPush('D701', 'Cache MISS', true, { key: cacheRead?.key });
    responseCache.incrMiss(redis);

    // Tier 1 — Places-first discovery.
    await requestStore.setStage(redis, reqId, 'discovering');
    const candidates = await pipeline.discover({
      lat: payload.lat,
      lng: payload.lng,
      cuisines: payload.cuisines || [],
      radius: payload.radius || 1000,
      mealPeriod: meal.label,
      maxResults: 20,
      diag: diagPush
    });
    if (!candidates.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }

    // Vault snapshot for narrative grounding.
    const snapshot = await vaultIndex.snapshotForLocation(redis, { lat: payload.lat, lng: payload.lng }, payload.radius || 1500);

    // Claude ranks + narrates (or deterministic fallback).
    await requestStore.setStage(redis, reqId, 'narrating');
    const narrated = await pipeline.rankAndNarrate({
      candidates,
      query: {
        cuisines: payload.cuisines || [],
        label: meal.label,
        detail: meal.hint,
        specialRequest: payload.specialRequest
      },
      snapshot,
      count: 5,
      diag: diagPush
    });
    if (!narrated.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }

    // Walking-time enrichment + sort.
    await requestStore.setStage(redis, reqId, 'ranking');
    const ranked = await rankByWalkingTime(payload.lat, payload.lng, narrated);
    await diagPush('D840', 'Ranked', true, { n: ranked.length });

    // Cache write BEFORE refine — refine adds per-request context, not
    // cross-user-shareable content.
    const writeKey = await responseCache.set(redis, cacheParams, ranked);
    if (writeKey) {
      await diagPush('D702', 'Cache WRITE', true, { key: writeKey, n: ranked.length });
      responseCache.incrWrite(redis);
    }

    // Refine pass (weather/traffic/carpark) — per request, not cached.
    const refined = await refineIfPossible(redis, reqId, ranked, payload, meal.label);
    await requestStore.setVenues(redis, reqId, refined);
    await requestStore.setStatus(redis, reqId, refined.length ? 'done' : 'empty');
  } catch (err) {
    forRequest(reqId, { kind: 'cuisine', path: 'inverted' }).error({ err: { message: err.message, stack: err.stack } }, 'cuisine task failed');
    captureWithReqId(err, reqId, { kind: 'cuisine', path: 'inverted' });
    await requestStore.setError(redis, reqId, err);
  }
}

// Legacy path — preserved verbatim for the PIPELINE_INVERSION_ENABLED=false
// rollback. Identical to v0.40.1 behaviour.
async function runCuisineTaskLegacy(redis, reqId) {
  const row = await requestStore.get(redis, reqId);
  if (!row) throw new Error(`pipeline-task: row not found ${reqId}`);
  const payload = row.payload;
  try {
    const prompt = await ensurePromptForKind(redis, reqId, payload, 'cuisine');
    const candidates = await runReasonWithRelaxation(redis, reqId, prompt, 15, false);
    if (!candidates.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }
    const ranked = await validateAndRank(redis, reqId, candidates, payload);
    if (!ranked.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }
    const meal = mealPeriodSGT();
    const refined = await refineIfPossible(redis, reqId, ranked, payload, meal.label);
    await requestStore.setVenues(redis, reqId, refined);
    await requestStore.setStatus(redis, reqId, refined.length ? 'done' : 'empty');
  } catch (err) {
    forRequest(reqId, { kind: 'cuisine', path: 'legacy' }).error({ err: { message: err.message, stack: err.stack } }, 'cuisine task failed');
    captureWithReqId(err, reqId, { kind: 'cuisine', path: 'legacy' });
    await requestStore.setError(redis, reqId, err);
  }
}

async function runCuisineTask(redis, reqId) {
  return inversionEnabled()
    ? runCuisineTaskInverted(redis, reqId)
    : runCuisineTaskLegacy(redis, reqId);
}

// v0.48.0: /surprise rewritten per Human Lead spec.
// - Places-first inversion (matches /cuisine, /eat — eliminates the
//   hallucinate-then-validate failure class that returned empty).
// - 12 results (was 5).
// - Annulus 1.5–3 km from centre — Places API takes a circle, we filter
//   the inner radius client-side.
// - Multi-signal recency (any of):
//     · verifiedOpeningDate ≤ 100 days
//     · userRatingCount ≤ 150
//     · most recent review ≤ 45 days
//     · primaryType includes "new" / "opening" tag
// - Quality: rating ≥ 4.0
// - Type diversity bias: prefer ≥1 each of hawker, café, restaurant,
//   unconventional (pop-up / bakery / food_truck / dessert_shop /
//   ice_cream_shop / etc.). Bias is in the rankAndNarrate prompt.
// - Excludes major commercialised chains (already in pipeline.discover).
const SURPRISE_INNER_M = 1500;
const SURPRISE_OUTER_M = 3000;
const SURPRISE_RECENCY_REVIEW_CAP = 150;
const SURPRISE_RECENCY_REVIEW_AGE_DAYS = 45;
const SURPRISE_TARGET_COUNT = 5;

function haversineM(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function passesRecencySignal(v) {
  // Opening date — strict ≤100d if known.
  if (v.verifiedOpeningDate) {
    const opened = new Date(v.verifiedOpeningDate);
    if (!isNaN(opened) && (Date.now() - opened.getTime()) <= 100 * 86400 * 1000) return true;
  }
  // Low review count proxy.
  const reviewCount = Number(v.userRatingCount ?? v.reviewCount ?? 0);
  if (reviewCount > 0 && reviewCount <= SURPRISE_RECENCY_REVIEW_CAP) return true;
  // Recent review proxy — would need full review fetch; skip unless we
  // already have it cached. Empirically rare; falls through.
  if (Array.isArray(v.recentReviews) && v.recentReviews.length) {
    const cutoff = Date.now() - SURPRISE_RECENCY_REVIEW_AGE_DAYS * 86400 * 1000;
    if (v.recentReviews.some((r) => Date.parse(r.publishTime || r.relativeTime || '') >= cutoff)) return true;
  }
  // "New" / "opening" tag in primaryType (rare in Places API).
  const type = String(v.primaryType || '').toLowerCase();
  if (/\b(new|opening|grand_opening)\b/.test(type)) return true;
  return false;
}

async function runSurpriseTask(redis, reqId) {
  const row = await requestStore.get(redis, reqId);
  if (!row) throw new Error(`pipeline-task: row not found ${reqId}`);
  const payload = row.payload;
  const meal = mealPeriodSGT();
  const diagPush = (code, label, ok, detail) => requestStore.pushDiag(redis, reqId, { code, label, ok, detail });
  try {
    // Places-first discover at OUTER radius.
    await requestStore.setStage(redis, reqId, 'discovering');
    const candidates = await pipeline.discover({
      lat: payload.lat,
      lng: payload.lng,
      cuisines: [], // open discovery — surprise is cuisine-agnostic
      radius: SURPRISE_OUTER_M,
      mealPeriod: meal.label,
      maxResults: 20,
      diag: diagPush
    });
    if (!candidates.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }

    // Annulus filter — exclude inner SURPRISE_INNER_M circle.
    const centre = { lat: payload.lat, lng: payload.lng };
    let workingCandidates = candidates;
    let innerM = SURPRISE_INNER_M;
    let outerM = SURPRISE_OUTER_M;
    let minRating = 4.0;
    let iter = 0;

    function applyAnnulus(pool) {
      return pool.map((c) => ({
        ...c,
        distanceM: Math.round(haversineM(centre, { lat: c.lat, lng: c.lng }))
      })).filter((c) => c.distanceM >= innerM && c.distanceM <= outerM);
    }
    function applyQuality(pool) {
      return pool.filter((c) => typeof c.rating !== 'number' || c.rating >= minRating);
    }

    let inAnnulus = applyAnnulus(workingCandidates);
    diagPush('D870', 'Annulus filter', true, { in: candidates.length, out: inAnnulus.length, innerM, outerM });
    if (!inAnnulus.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }

    // Quality gate — rating ≥ minRating.
    let qualified = applyQuality(inAnnulus);
    diagPush('D871', 'Quality gate', true, { in: inAnnulus.length, out: qualified.length, minRating });

    // v0.57.17: adaptive threshold relaxation. When the post-quality
    // pool has fewer than the target count, relax up to two steps:
    //   step 1 — drop minRating from 4.0 → 3.8 (re-filter in memory).
    //   step 2 — expand annulus to 1.0–4.0 km (re-discover at wider radius).
    // Cap at 2 relaxations. Better honest 3 picks than padded 5.
    if (qualified.length < SURPRISE_TARGET_COUNT) {
      iter = 1;
      minRating = 3.8;
      qualified = applyQuality(inAnnulus);
      diagPush('D875', 'Rarity threshold relaxed (rating)', true, { iter, minRating, qualified: qualified.length });
    }
    if (qualified.length < SURPRISE_TARGET_COUNT) {
      iter = 2;
      innerM = 1000;
      outerM = 4000;
      try {
        const expanded = await pipeline.discover({
          lat: payload.lat,
          lng: payload.lng,
          cuisines: [],
          radius: outerM,
          mealPeriod: meal.label,
          maxResults: 30,
          diag: diagPush
        });
        if (expanded.length) {
          workingCandidates = expanded;
          inAnnulus = applyAnnulus(workingCandidates);
          qualified = applyQuality(inAnnulus);
          diagPush('D875', 'Rarity threshold relaxed (annulus)', true, { iter, innerM, outerM, qualified: qualified.length });
        }
      } catch (err) {
        diagPush('D875', 'Annulus expansion failed', false, { err: err.message?.slice(0, 200) });
      }
    }

    // v0.57.17: rarity-score ranking — neighbourhood-relative percentile
    // on rating × low-volume × recency. Uses passesRecencySignal as
    // hasRecentReviews input so legacy multi-signal (opened ≤100d /
    // recent review ≤45d / "new" type) still feeds the recency axis.
    const enriched = qualified.map((c) => ({
      ...c,
      hasRecentReviews: passesRecencySignal(c)
    }));
    let recent = rarityScore.applyRarityRanking(enriched, 12);
    diagPush('D876', 'Rarity ranked', true, {
      in: qualified.length,
      out: recent.length,
      iter,
      topScore: recent[0]?.rarityScore?.toFixed?.(3) ?? null
    });
    if (!recent.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }

    // Vault snapshot for narrative grounding.
    const snapshot = await vaultIndex.snapshotForLocation(redis, centre, SURPRISE_OUTER_M);

    // Claude ranks + narrates with type-diversity bias.
    await requestStore.setStage(redis, reqId, 'narrating');
    const narrated = await pipeline.rankAndNarrate({
      candidates: recent.slice(0, 25), // headroom for ranker selection
      query: {
        cuisines: [],
        label: meal.label,
        detail: meal.hint,
        specialRequest: 'HIDDEN_GEM_DISCOVERY · diversity-bias: prefer at least 1 hawker (food_court / market_food_stall), 1 café, 1 restaurant, 1 unconventional (pop-up / bakery / dessert_shop / ice_cream_shop / food_truck / cafe-with-a-twist) across the top 12. Provide a 1-line "why it\'s a hidden gem" reason for each.'
      },
      snapshot,
      count: SURPRISE_TARGET_COUNT,
      diag: diagPush
    });
    if (!narrated.length) {
      await requestStore.setVenues(redis, reqId, []);
      await requestStore.setStatus(redis, reqId, 'empty');
      return;
    }

    // Walking-time enrichment.
    await requestStore.setStage(redis, reqId, 'ranking');
    const ranked = await rankByWalkingTime(payload.lat, payload.lng, narrated);
    diagPush('D874', 'Surprise ranked', true, { n: ranked.length });

    // Refine pass (weather/traffic/carpark).
    const refined = await refineIfPossible(redis, reqId, ranked, payload, meal.label);
    await requestStore.setVenues(redis, reqId, refined);
    await requestStore.setStatus(redis, reqId, refined.length ? 'done' : 'empty');
  } catch (err) {
    forRequest(reqId, { kind: 'surprise' }).error({ err: { message: err.message, stack: err.stack } }, 'surprise task failed');
    captureWithReqId(err, reqId, { kind: 'surprise' });
    await requestStore.setError(redis, reqId, err);
  }
}

async function runTask(redis, reqId) {
  const row = await requestStore.get(redis, reqId);
  if (!row) throw new Error(`pipeline-task: row not found ${reqId}`);
  if (row.kind === 'surprise') return runSurpriseTask(redis, reqId);
  return runCuisineTask(redis, reqId);
}

module.exports = { runTask, runCuisineTask, runSurpriseTask, applySurpriseGates, applyTemporalGate };
