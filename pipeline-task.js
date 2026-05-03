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
// - surprise returns 5 candidates with tighter gates: rating 4.0-4.3,
//   <50 reviews, launched in last 90 d, day-or-night temporal filter.

const requestStore = require('./request-store');
const promptBuilder = require('./prompt-builder');
const pipeline = require('./pipeline');
const responseCache = require('./response-cache');
const { validateWithPlaces, rankByWalkingTime, mealPeriodSGT } = require('./vibe-suggest');
const vaultIndex = require('./vault-index');
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

// Surprise-specific gates per v0.32.0 prompt syntax.
//
// v0.47.0 relaxation: rating window widened 4.0-4.3 → 3.8-4.6 (the SG
// distribution skews high; the v0.32.0 4.0-4.3 cap excluded most
// venues). The launched-within-90-days HARD gate dropped — Places API
// doesn't expose opening dates and the LLM-asserted verifiedOpeningDate
// is unreliable. Now used only as a soft signal for ranking (not
// implemented yet, future tweak). Hidden-gem signal preserved as the
// <50 reviews gate (Places does expose userRatingCount reliably).
const SURPRISE_RATING_MIN = 3.8;
const SURPRISE_RATING_MAX = 4.6;
const SURPRISE_MAX_REVIEWS = 50;
// SURPRISE_LAUNCH_WINDOW_DAYS retained for backward compat with
// pipeline-task / prompt-builder code that reads it; no longer used as
// a hard filter in applySurpriseGates as of v0.47.0.
const SURPRISE_LAUNCH_WINDOW_DAYS = 90;
const SURPRISE_LAUNCH_RELAXED_DAYS = 180;

function applySurpriseGates(venues, opts = {}) {
  return venues.filter((v) => {
    // Rating window 3.8-4.6 (v0.47.0; was 4.0-4.3).
    if (typeof v.rating === 'number' && (v.rating < SURPRISE_RATING_MIN || v.rating > SURPRISE_RATING_MAX)) return false;
    // <50 reviews — hidden-gem signal. `userRatingCount` from Places (New)
    // or `reviewCount` shim. ALWAYS enforced (this is the actual signal).
    const reviewCount = Number(v.userRatingCount ?? v.reviewCount ?? 0);
    if (reviewCount && reviewCount >= SURPRISE_MAX_REVIEWS) return false;
    // v0.47.0: launch-window HARD gate removed. Was previously:
    //   if (v.verifiedOpeningDate && new Date(v.verifiedOpeningDate) < launchCutoff) return false;
    // Reason: Places API does not expose opening dates; we relied on the
    // LLM asserting verifiedOpeningDate which is rarely accurate. The
    // gate eliminated ~95% of candidates with no real signal. Newly-
    // opened venues still get surfaced — they tend to have <50 reviews
    // by definition, which is what we actually wanted.
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

async function runSurpriseTask(redis, reqId) {
  const row = await requestStore.get(redis, reqId);
  if (!row) throw new Error(`pipeline-task: row not found ${reqId}`);
  const payload = row.payload;
  try {
    const prompt = await ensurePromptForKind(redis, reqId, payload, 'surprise');
    let candidates = await runReasonWithRelaxation(redis, reqId, prompt, 8, true);
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
    // Surprise gates: rating window, review count, launch window, temporal.
    let gated = applySurpriseGates(ranked);
    gated = applyTemporalGate(gated);
    if (gated.length < 5) {
      // Soft fallback: relax launch window 90d → 180d.
      await requestStore.pushDiag(redis, reqId, { code: 'D860', label: 'Surprise relaxed launch window 90d→180d', ok: true });
      gated = applySurpriseGates(ranked, { launchWindowDays: SURPRISE_LAUNCH_RELAXED_DAYS });
      gated = applyTemporalGate(gated);
    }
    const top5 = gated.slice(0, 5);
    const meal = mealPeriodSGT();
    const refined = await refineIfPossible(redis, reqId, top5, payload, meal.label);
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
