// cuisine-stream.js — progressive-result streaming protocol (v0.62.x)
//
// The cuisine search streams its result as NDJSON (one JSON object per line)
// over the existing POST so the TMA can paint verified BASE cards immediately
// and merge the slow enrichment (translated review, walk times, 🔤 readings,
// crowd, …) per-card as it lands. Event kinds:
//
//   { type: 'base',  venues: [...], firstBatch, cumulativeStart, cumulativeEnd,
//                    finalBatch, poolCount, comboInfo, michelinSummary, ... }
//   { type: 'patch', placeId, fields: { ...slow fields... } }
//   { type: 'done',  ... }
//
// This module is PURE (no IO) so it unit-tests cleanly and is shared by the
// server (encode + write) and the client (decode + merge). The client also
// uses parseNdjson / the streaming decoder as a fallback when the WebView /
// proxy buffers the whole body into one chunk — a buffered stream decodes to
// the exact same events, so it degrades to today's "all at once" behaviour.

'use strict';

// Serialise one event as an NDJSON line (trailing newline is the delimiter).
function encodeEvent(obj) {
  return JSON.stringify(obj) + '\n';
}

// Event builders — keep the shapes in one place so server + client agree.
function baseEvent(payload = {}) {
  return { type: 'base', ...payload };
}
function patchEvent(placeId, fields = {}) {
  return { type: 'patch', placeId, fields };
}
function doneEvent(extra = {}) {
  return { type: 'done', ...extra };
}

// Parse a COMPLETE NDJSON blob into events. Ignores blank lines; a trailing
// partial (no newline) line is returned in `rest` so a caller streaming
// chunks can prepend it to the next chunk. Malformed lines are skipped.
function parseNdjson(text) {
  const events = [];
  const str = String(text == null ? '' : text);
  const nl = str.lastIndexOf('\n');
  const complete = nl === -1 ? '' : str.slice(0, nl);
  const rest = nl === -1 ? str : str.slice(nl + 1);
  if (complete) {
    for (const line of complete.split('\n')) {
      const s = line.trim();
      if (!s) continue;
      try { events.push(JSON.parse(s)); } catch { /* skip malformed line */ }
    }
  }
  return { events, rest };
}

// Incremental decoder: feed it chunks (strings) as they arrive; each push
// returns the events that completed in this chunk. Handles lines split across
// chunk boundaries. flush() drains any final newline-less line.
function createNdjsonDecoder() {
  let buf = '';
  return {
    push(chunk) {
      buf += String(chunk == null ? '' : chunk);
      const { events, rest } = parseNdjson(buf);
      buf = rest;
      return events;
    },
    flush() {
      const s = buf.trim();
      buf = '';
      if (!s) return [];
      try { return [JSON.parse(s)]; } catch { return []; }
    },
  };
}

// ── Server-side base/patch split ──────────────────────────────────────────
//
// The route flushes the BASE event right after the fast (pure/local)
// enrichment, then runs the slow (network/LLM) enrichment which MUTATES the
// same venue objects in place. snapshotVenue captures the fast state; once the
// slow phase is done, diffVenue(snapshot, finalVenue) returns ONLY the
// fields the slow phase added or changed (plus any the slow phase deleted,
// surfaced as an explicit null so the client clears them). base ⊕ patches is
// therefore byte-identical to the non-streamed payload's venue.
//
// Shallow by design: every slow field the enrichment writes (recentReview,
// recentReviewAgo, dishes, travelMins, footfall, crowdLevel, nameLocal,
// nameReading, …) is a top-level own property of the venue. A nested-object
// field (e.g. footfall) is replaced wholesale by the slow phase, so a shallow
// reference compare correctly flags it as changed.
function snapshotVenue(v) {
  return v && typeof v === 'object' ? { ...v } : {};
}

function diffVenue(snapshot, finalVenue) {
  const snap = snapshot || {};
  const fin = finalVenue || {};
  const fields = {};
  // Added or changed keys.
  for (const k of Object.keys(fin)) {
    if (snap[k] !== fin[k]) fields[k] = fin[k];
  }
  // Keys the slow phase deleted (e.g. `reviews`, `regularPeriods`,
  // `primaryTypeDisplayName`): tell the client to drop them with null.
  for (const k of Object.keys(snap)) {
    if (!(k in fin)) fields[k] = null;
  }
  return fields;
}

// Client/buffered-fallback reassembly: fold a base event + the patch events
// (in arrival order) into the final venue array, then return the full payload
// the non-streamed route would have produced. `done` carries every non-venue
// payload field. Used by the client reader AND the round-trip tests.
function assembleFinal(baseEv, patchEvs, doneEv) {
  let venues = Array.isArray(baseEv && baseEv.venues) ? baseEv.venues.map((v) => ({ ...v })) : [];
  for (const p of (patchEvs || [])) {
    if (!p || !p.placeId || !p.fields) continue;
    venues = applyPatchFields(venues, p.placeId, p.fields);
  }
  const meta = { ...(doneEv || {}) };
  delete meta.type;
  return { ...meta, venues };
}

// Like mergePatch but honours null = delete (mirrors diffVenue's deletes).
function applyPatchFields(venues, placeId, fields) {
  if (!Array.isArray(venues) || !placeId || !fields) return venues;
  let hit = false;
  const next = venues.map((v) => {
    if (!v || v.placeId !== placeId) return v;
    hit = true;
    const merged = { ...v };
    for (const [k, val] of Object.entries(fields)) {
      if (val === null) delete merged[k];
      else merged[k] = val;
    }
    return merged;
  });
  return hit ? next : venues;
}

// Client-side merge: apply a patch's fields onto the venue with the matching
// placeId, returning a NEW array (new object only for the touched venue) so a
// React setState re-renders just that card. No-op when the placeId is absent.
function mergePatch(venues, placeId, fields) {
  if (!Array.isArray(venues) || !placeId || !fields) return venues;
  let hit = false;
  const next = venues.map((v) => {
    if (v && v.placeId === placeId) { hit = true; return { ...v, ...fields }; }
    return v;
  });
  return hit ? next : venues;
}

module.exports = {
  encodeEvent,
  baseEvent,
  patchEvent,
  doneEvent,
  parseNdjson,
  createNdjsonDecoder,
  mergePatch,
  snapshotVenue,
  diffVenue,
  assembleFinal,
  applyPatchFields,
};
