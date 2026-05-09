// maps-url.js — v0.45.0 centralised Google Maps URL construction.
//
// Why: prior to v0.45.0 each venue-card codepath built its Google Maps
// URL inline. Six files (vibe-suggest, surprise, pipeline, consultant,
// prompt-query, vibe, vault) had subtly-different fallback chains.
// Result: the v0.44.2 fix for the iOS Apple-Maps redirect issue (using
// the explicit place_id deep-link) only landed in /p m. Other cards
// continued to route to Apple Maps on iPhone.
//
// This module is the single source of truth. Every venue-card codepath
// imports `googleMapsUrl(place)` and trusts it.
//
// Three exports:
//   googleMapsUrl(place)       single venue → place_id-explicit deep-link
//   googleMapsContainerUrl(places, opts)  multi-stop directions (up to 5)
//   buildMapHashUrl(venues, opts)  TMA hash URL for multi-marker view
//
// All three prefer the place_id-explicit format that iOS Universal
// Links resolve to the Google Maps app.

const TG_HASH_MAX = 4096; // Telegram URL practical limit; very generous

// Single-venue URL preference order (v0.48.2 — corrected from v0.45.1).
//
// Why this order matters: Google Places API returns TWO URL fields per
// place:
//   • googleMapsLinks.placeUri  — explicit place_id deep-link (e.g.
//     https://maps.app.goo.gl/...). iOS Universal Links resolve this
//     directly to the Google Maps app.
//   • googleMapsUri             — cid-based URL (e.g.
//     https://maps.google.com/?cid=12345). iOS sometimes routes this
//     to Apple Maps depending on installed apps + iOS settings.
//
// Critically, googleMapsLinks IS NOT ALWAYS POPULATED by the API.
// Some places (especially newly-added ones) only have googleMapsUri.
//
// v0.45.1 attempted to synthesise the deep-link as
// `https://www.google.com/maps/place/?q=place_id:<id>` but the Maps app
// treats `place_id:CHIJ...` in the q= param as a literal search string
// — the user sees the raw "place_id:ChIJ..." text in the search field
// instead of a place pin.
//
// v0.48.2 fix: use the documented Google Maps URLs API
// (https://developers.google.com/maps/documentation/urls/get-started):
//   https://www.google.com/maps/search/?api=1&query=<NAME>&query_place_id=<PLACE_ID>
// The query_place_id parameter pins the place; query supplies the
// search-field text so the user sees the venue name (not the raw id).
//
// Order:
//   1. place.googleMapsLinks.placeUri  (explicit deep-link, ideal)
//   2. ?api=1&query=<name>&query_place_id=<id>  — when both available
//   3. ?api=1&query=<name>          — name-only (no id)
//   4. place.url                    (already-constructed URL from
//                                    upstream code; trusted only if
//                                    it's a real http URL)
//   5. place.googleMapsUri          (cid URL — last resort, may go
//                                    to Apple Maps on iOS)
//   6. place.directionsUri          (directions-mode last resort)
//   7. https://www.google.com/maps/search/?api=1&query=<lat>,<lng>
//      from coords (places without an id at all)
//   8. null
//
// place can come from many shapes — accept any of these field names.
function googleMapsUrl(place) {
  if (!place) return null;
  // 1. Explicit deep-link from Places API (best when present).
  const placeUri = place.googleMapsLinks?.placeUri;
  if (placeUri) return placeUri;
  // 2. Documented URL form: query (name) + query_place_id (id).
  const id = place.placeId || place.id;
  const name = place.name || place.displayName?.text || '';
  if (id && name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${encodeURIComponent(id)}`;
  }
  // 3. Name-only — the place_id-as-query trick is unreliable; skip.
  if (name) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
  }
  // 4. Already-constructed URL from upstream (only http(s)).
  if (typeof place.url === 'string' && /^https?:\/\//.test(place.url)) return place.url;
  // 5. Cid URL — last resort, may route to Apple Maps on iOS.
  if (typeof place.googleMapsUri === 'string' && place.googleMapsUri.startsWith('http')) return place.googleMapsUri;
  // 6. Directions URL.
  if (typeof place.directionsUri === 'string') return place.directionsUri;
  // 7. Coords-only fallback.
  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  }
  return null;
}

// Multi-stop directions URL. Walking by default. Returns null if
// fewer than 1 venue with location. Opens in Google Maps and shows
// every stop as a pin (the route line is incidental — useful when
// the goal is "show all selected places on one map").
//
// Opts:
//   travelmode    'walking' (default) | 'driving' | 'transit' | 'bicycling'
//   origin        'lat,lng' string for trip start (optional — if absent,
//                 Google Maps uses the user's current location)
//   maxWaypoints  cap on intermediate stops (default 4, max 9 — Google
//                 consumer Maps supports up to 9 waypoints + 1 dest =
//                 10 places in one URL).
function googleMapsContainerUrl(venues, opts = {}) {
  if (!Array.isArray(venues) || !venues.length) return null;
  const maxWaypoints = Math.min(9, Math.max(0, Number.isFinite(opts.maxWaypoints) ? opts.maxWaypoints : 4));
  // v0.59.13 (Codex review #217): Google Maps directions URLs require
  // `destination` (and `waypoints`) as the human-readable companion
  // ALONGSIDE `destination_place_id` (and `waypoint_place_ids`). Emitting
  // the place-id params alone yields an unpinned/invalid route. Each
  // venue here is normalized into { display, placeId } where display is
  // the lat/lng string if available, else the venue name. Place-id is
  // optional and pins the result to the exact place when known.
  const normalized = venues
    .map((v) => {
      const placeId = v.placeId || v.id || null;
      const coord = (Number.isFinite(v.lat) && Number.isFinite(v.lng)) ? `${v.lat},${v.lng}` : null;
      const name = v.name || '';
      const display = coord || name;
      if (!display) return null;
      return { display, placeId };
    })
    .filter(Boolean);
  if (!normalized.length) return null;
  const [destination, ...rest] = normalized;
  const waypoints = rest.slice(0, maxWaypoints);
  const params = ['https://www.google.com/maps/dir/?api=1', `travelmode=${encodeURIComponent(opts.travelmode || 'walking')}`];
  if (opts.origin) params.push(`origin=${encodeURIComponent(opts.origin)}`);
  params.push(`destination=${encodeURIComponent(destination.display)}`);
  if (destination.placeId) params.push(`destination_place_id=${encodeURIComponent(destination.placeId)}`);
  if (waypoints.length) {
    params.push(`waypoints=${encodeURIComponent(waypoints.map((w) => w.display).join('|'))}`);
    // Only pair waypoint_place_ids when EVERY waypoint has a place-id —
    // index alignment matters; mixing place-id and coord-only waypoints
    // in the same param confuses Google's parser.
    if (waypoints.every((w) => w.placeId)) {
      params.push(`waypoint_place_ids=${encodeURIComponent(waypoints.map((w) => w.placeId).join('|'))}`);
    }
  }
  return params.join('&');
}

// TMA hash URL for the multi-marker map view served at /app/map.
// Mirrors the format produced by web/cuisine/src/components/ResultsGrid.jsx
// so any chat-side codepath can produce the same shareable URL.
//
// Opts:
//   webhookDomain  e.g. 'gia4lunch-production.up.railway.app'
//                  if omitted, returns a relative URL (fine inside TMA;
//                  not shareable from chat)
function buildMapHashUrl(venues, opts = {}) {
  if (!Array.isArray(venues) || !venues.length) return null;
  // v0.59.26 — Telegram inline-button URLs cap at ~4 KB practical
  // (TG_HASH_MAX). After v0.59.23 raised the cuisine cap from 12 to
  // 16, the base64-encoded venue payload grew past the limit and
  // bot.sendMessage rejected the inline keyboard, surfacing as
  // "Couldn't send to chat — try again" in the TMA. Fix:
  //   1. Build the encoded payload with the full set first.
  //   2. If the resulting URL exceeds TG_HASH_MAX, drop the lowest-
  //      priority venues (last ones — the slice() callers feed in
  //      rating- or distance-sorted order) until it fits.
  //   3. Re-apply the relative-vs-absolute branching at the end so
  //      the length check is enforced for BOTH branches (previously
  //      the webhookDomain branch was unguarded).
  const buildSlim = (vs) => vs
    .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng))
    .map((v) => ({
      placeId: v.placeId || v.id || '',
      name: v.name || '',
      area: v.area || v.formattedAddress || '',
      lat: v.lat,
      lng: v.lng,
      vibe: v.vibe || '',
      // v0.59.3+: prefer caller-supplied url. Lets coordinate-only markers
      // (traffic incidents, bus stops without a placeId) skip the
      // name-only Google search fallback in googleMapsUrl, which would
      // otherwise text-search "Accident" / "Roadwork" / a stop description
      // instead of opening the actual coordinate pin.
      url: v.url || googleMapsUrl(v) || ''
    }));
  const encode = (slim) => Buffer.from(JSON.stringify(slim), 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  let working = venues.slice();
  let slim = buildSlim(working);
  if (!slim.length) return null;
  const prefix = opts.webhookDomain ? `https://${opts.webhookDomain}` : '';
  const buildPath = (s) => `/app/map#venues=${encode(s)}`;
  let path = buildPath(slim);
  // Trim from the tail until the resulting URL fits the Telegram
  // inline-button URL budget. Keep at least 1 venue (caller chose
  // multi-marker; a 1-pin map is still useful).
  while (slim.length > 1 && (prefix + path).length > TG_HASH_MAX) {
    slim = slim.slice(0, slim.length - 1);
    path = buildPath(slim);
  }
  if ((prefix + path).length > TG_HASH_MAX) return null;
  return prefix ? `${prefix}${path}` : path;
}

// v0.60.56 — multi-stop Google Maps URL with a higher waypoint cap.
// googleMapsContainerUrl above hard-caps at 9 (the documented Maps
// URLs API limit). For the hawker TMA we want to surface ALL centres
// in a region (up to ~22) on Google Maps. Consumer Maps tolerates
// more waypoints than the documented API ceiling, so we accept an
// explicit override and trust the caller's request size limit.
//
// Usage: googleMapsTourUrl(places, { travelmode, maxStops })
//   places: array of { lat, lng, name?, placeId? }
//   travelmode: 'walking' | 'driving' | 'transit' | 'bicycling'
//   maxStops:   total stops including destination + waypoints (cap 25)
//
// Returns null if there are fewer than 2 plottable places.
function googleMapsTourUrl(places, opts = {}) {
  if (!Array.isArray(places) || !places.length) return null;
  const cap = Math.min(25, Math.max(2, Number.isFinite(opts.maxStops) ? opts.maxStops : 25));
  const travelmode = encodeURIComponent(opts.travelmode || 'walking');
  const points = places
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .slice(0, cap)
    .map((p) => `${p.lat},${p.lng}`);
  if (points.length < 2) return null;
  const destination = points[points.length - 1];
  const origin = opts.origin || points[0];
  const waypoints = points.slice(1, -1);
  const params = [
    'https://www.google.com/maps/dir/?api=1',
    `travelmode=${travelmode}`,
    `origin=${encodeURIComponent(origin)}`,
    `destination=${encodeURIComponent(destination)}`
  ];
  if (waypoints.length) {
    params.push(`waypoints=${encodeURIComponent(waypoints.join('|'))}`);
  }
  return params.join('&');
}

module.exports = { googleMapsUrl, googleMapsContainerUrl, googleMapsTourUrl, buildMapHashUrl };
