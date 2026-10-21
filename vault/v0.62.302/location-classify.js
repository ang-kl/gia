// location-classify.js — v0.61.157
//
// Orchestrator that ties the v0.61.155 location-mode classifier to
// the v0.61.156 locale persistence + the v0.61.157 boundary drift
// detection. Single entry point a chat handler can call when a new
// location fix arrives:
//
//   classifyAndPersist({ chatId, lat, lng, redis, reverseGeocodeFn })
//      → { record, prev, candidate, changed, drift, mode, gated, geocoded }
//
// `drift` values:
//   'none'        — first registration (no prev). Persisted; the
//                   caller may show a "Location set to <placeName>"
//                   confirmation. changed = true.
//   'inside'      — prev exists AND new fix is inside its boundary.
//                   Silent reuse — DO NOT persist. changed = false.
//   'outside'     — prev exists AND new fix is outside its boundary.
//                   The caller should send the §2.7 prompt. DO NOT
//                   persist (the user hasn't accepted yet). The
//                   `candidate` field carries the would-be record;
//                   the accept-callback handler in index.js writes
//                   it via setUserLocale. changed = false.
//   'suppressed'  — prev exists AND new fix is outside boundary
//                   BUT the candidate matchKey is already in the
//                   drift-suppress set (the user declined this
//                   destination in the last 24 h). Silent. DO NOT
//                   persist. changed = false.
//
// Rules covered: §2.4 (set_location with placeName — first
// registration), §2.6 (no-nag), §2.7 (boundary drift + single
// re-prompt).

'use strict';

const { classifyLocation } = require('./location-mode');
const {
  getUserLocale,
  setUserLocale,
  isDriftSuppressed
} = require('./location-locale');
const {
  computeBoundary,
  isInsideBoundary,
  deriveMatchKey
} = require('./location-boundary');

async function classifyAndPersist({
  chatId,
  lat,
  lng,
  redis,
  reverseGeocodeFn,
  now = null,
  radiusM
} = {}) {
  const cls = await classifyLocation({ lat, lng, reverseGeocodeFn, radiusM });
  const candidateBase = {
    mode: cls.mode,
    placeName: cls.placeName,
    country: cls.country,
    adminAreaLevel1: cls.adminAreaLevel1,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    registeredAt: Number.isFinite(now) ? now : Date.now()
  };
  const candidate = {
    ...candidateBase,
    boundary: computeBoundary({
      mode: candidateBase.mode,
      adminAreaLevel1: candidateBase.adminAreaLevel1,
      lat: candidateBase.lat,
      lng: candidateBase.lng
    })
  };

  const prev = await getUserLocale(redis, chatId);
  // First registration — no prior locale. Persist + confirm.
  if (!prev) {
    await setUserLocale(redis, chatId, candidate);
    return {
      record: candidate,
      prev: null,
      candidate,
      changed: true,
      drift: 'none',
      mode: candidate.mode,
      gated: cls.gated,
      geocoded: cls.geocoded
    };
  }
  // Inside prior boundary — silent reuse (rule §2.6 + matchKey
  // collapse for SG sub-regions). Defensive: when the prior
  // record predates v0.61.157 it may have boundary === null;
  // synthesize one from its mode + admin + lat/lng so the check
  // still works.
  const prevBoundary = (prev.boundary && typeof prev.boundary === 'object')
    ? prev.boundary
    : computeBoundary({
        mode: prev.mode,
        adminAreaLevel1: prev.adminAreaLevel1,
        lat: prev.lat,
        lng: prev.lng
      });
  if (isInsideBoundary(
    { mode: candidate.mode, adminAreaLevel1: candidate.adminAreaLevel1, lat: candidate.lat, lng: candidate.lng },
    prevBoundary
  )) {
    return {
      record: prev,
      prev,
      candidate,
      changed: false,
      drift: 'inside',
      mode: prev.mode,
      gated: cls.gated,
      geocoded: cls.geocoded
    };
  }
  // Outside boundary — check suppression for THIS candidate's
  // destination matchKey. If suppressed, stay silent.
  const candidateKey = deriveMatchKey({
    mode: candidate.mode,
    adminAreaLevel1: candidate.adminAreaLevel1
  });
  const suppressed = await isDriftSuppressed(redis, chatId, candidateKey);
  if (suppressed) {
    return {
      record: prev,
      prev,
      candidate,
      changed: false,
      drift: 'suppressed',
      mode: prev.mode,
      gated: cls.gated,
      geocoded: cls.geocoded
    };
  }
  // Drift detected, not suppressed — surface the §2.7 prompt. Do
  // NOT persist; the accept-callback writes the candidate when /
  // if the user accepts.
  return {
    record: prev,
    prev,
    candidate,
    changed: false,
    drift: 'outside',
    mode: prev.mode,            // current locale stays canonical
    gated: cls.gated,
    geocoded: cls.geocoded
  };
}

module.exports = {
  classifyAndPersist
};
