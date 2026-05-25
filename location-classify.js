// location-classify.js — v0.61.156
//
// Orchestrator that ties the v0.61.155 location-mode classifier to
// the v0.61.156 locale persistence. Single entry point a chat
// handler can call when a new location fix arrives:
//
//   classifyAndPersist({ chatId, lat, lng, redis, reverseGeocodeFn })
//      → { record, prev, changed, mode, gated, geocoded }
//
// Semantics (rules §2.4 + §2.6):
//
//   1. classifyLocation(lat, lng) → mode/country/admin/placeName.
//   2. Read the previously-registered locale (if any).
//   3. Build the new record.
//   4. If isSameLocale(prev, new), DO NOT persist and DO NOT prompt
//      (rule §2.6 "no nagging"). Returns { changed: false, record:
//      prev, prev }. The caller can still read `record.mode` for
//      its feature gate.
//   5. Otherwise persist + return { changed: true, record, prev }.
//
// The caller decides how to surface "changed=true" — typically a
// "Set to <placeName>" confirmation message. PR 3 will refine the
// "different locale" branch with the boundary-drift single re-prompt.
//
// `reverseGeocodeFn` contract:
//   async ({ lat, lng }) → { country, adminAreaLevel1, placeName,
//                            formatted? }
//
// The fn is injected so this module has no Google API dependency
// and can be unit-tested without network. The wiring at the chat
// handler call site adapts the existing
// index.js:reverseGeocodeAddress to this shape.

'use strict';

const { classifyLocation } = require('./location-mode');
const { getUserLocale, setUserLocale, isSameLocale } = require('./location-locale');

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
  const candidate = {
    mode: cls.mode,
    placeName: cls.placeName,
    country: cls.country,
    adminAreaLevel1: cls.adminAreaLevel1,
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    boundary: null,                          // populated by PR 3
    registeredAt: Number.isFinite(now) ? now : Date.now()
  };
  const prev = await getUserLocale(redis, chatId);
  if (prev && isSameLocale(prev, candidate)) {
    // Rule §2.6 — silent reuse. We DO NOT bump registeredAt either;
    // the prior anchor remains canonical.
    return {
      record: prev,
      prev,
      changed: false,
      mode: prev.mode,
      gated: cls.gated,
      geocoded: cls.geocoded
    };
  }
  await setUserLocale(redis, chatId, candidate);
  return {
    record: candidate,
    prev,
    changed: true,
    mode: candidate.mode,
    gated: cls.gated,
    geocoded: cls.geocoded
  };
}

module.exports = {
  classifyAndPersist
};
