// ndjson.js — client mirror of the pure NDJSON helpers in the repo-root
// cuisine-stream.js (progressive-results Stage 2). The web bundle is a
// separate Vite build and can't `require` the CommonJS server module, so the
// decode + merge logic is mirrored here as ESM. Keep the two in sync — both
// are intentionally tiny. Event kinds: base / patch / done.

// Parse a COMPLETE NDJSON blob; return decoded events + the trailing partial
// line (no newline yet) so a streaming caller can prepend it to the next chunk.
export function parseNdjson(text) {
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

// Incremental decoder: push(chunk) → events completed in this chunk;
// flush() drains any final newline-less line (a buffered proxy delivers the
// whole body as one chunk — it still decodes to the identical events).
export function createNdjsonDecoder() {
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

// Apply a patch's fields to the venue with the matching placeId, returning a
// NEW array (new object only for the touched venue) so a React setState
// re-renders just that card. null field value = delete (mirrors the server's
// diffVenue deletes). No-op when the placeId is absent.
export function applyPatchFields(venues, placeId, fields) {
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

// Fold a base event + patch events + done event into the final payload the
// non-streamed route would have returned (used as the buffered-fallback path
// and as the resolved value of a streamed search).
export function assembleFinal(baseEv, patchEvs, doneEv) {
  let venues = Array.isArray(baseEv && baseEv.venues) ? baseEv.venues.map((v) => ({ ...v })) : [];
  for (const p of (patchEvs || [])) {
    if (!p || !p.placeId || !p.fields) continue;
    venues = applyPatchFields(venues, p.placeId, p.fields);
  }
  const meta = { ...(doneEv || {}) };
  delete meta.type;
  return { ...meta, venues };
}
