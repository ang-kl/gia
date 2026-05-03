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

// Single-venue URL preference order (v0.45.1 — corrected from v0.45.0).
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
// In that case, our previous fallback chain went straight to the cid
// URL — defeating the entire iOS Apple-Maps fix.
//
// The fix in v0.45.1: when placeUri is absent, SYNTHESISE the place_id
// deep-link from place.id BEFORE falling through to the cid URL. This
// guarantees an iOS-friendly URL whenever we have a place_id at all.
//
// Order:
//   1. place.googleMapsLinks.placeUri  (explicit deep-link, ideal)
//   2. synthesised https://www.google.com/maps/place/?q=place_id:<id>
//      — works as long as place.placeId or place.id exists. iOS-friendly.
//   3. place.url                        (already-constructed URL from
//                                        upstream code; trusted only if
//                                        it's a real http URL)
//   4. place.googleMapsUri              (cid URL — last resort, may go
//                                        to Apple Maps on iOS)
//   5. place.directionsUri              (directions-mode last resort)
//   6. https://www.google.com/maps/search/?api=1&query=<lat>,<lng>
//      from coords (places without an id at all)
//   7. null
//
// place can come from many shapes — accept any of these field names.
function googleMapsUrl(place) {
  if (!place) return null;
  // 1. Explicit deep-link from Places API (best when present).
  const placeUri = place.googleMapsLinks?.placeUri;
  if (placeUri) return placeUri;
  // 2. Synthesise place_id deep-link — this is the v0.45.1 fix.
  //    Was previously below googleMapsUri in the chain, which meant the
  //    cid URL won every time placeUri was absent. Now we always prefer
  //    the place_id-explicit format whenever we have an id.
  const id = place.placeId || place.id;
  if (id) return `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(id)}`;
  // 3. Already-constructed URL from upstream (only http(s)).
  if (typeof place.url === 'string' && /^https?:\/\//.test(place.url)) return place.url;
  // 4. Cid URL — last resort, may route to Apple Maps on iOS.
  if (typeof place.googleMapsUri === 'string' && place.googleMapsUri.startsWith('http')) return place.googleMapsUri;
  // 5. Directions URL.
  if (typeof place.directionsUri === 'string') return place.directionsUri;
  // 6. Coords-only fallback.
  if (Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
  }
  return null;
}

// Multi-stop directions URL — up to 5 stops (destination + 4 waypoints).
// Walking by default. Returns null if fewer than 1 venue with location.
//
// Opts:
//   travelmode  'walking' (default) | 'driving' | 'transit' | 'bicycling'
//   origin      'lat,lng' string for trip start (optional — if absent,
//               Google Maps uses the user's current location)
function googleMapsContainerUrl(venues, opts = {}) {
  if (!Array.isArray(venues) || !venues.length) return null;
  const normalized = venues
    .map((v) => {
      const id = v.placeId || v.id;
      if (id) return { type: 'place', value: id };
      if (Number.isFinite(v.lat) && Number.isFinite(v.lng)) {
        return { type: 'coord', value: `${v.lat},${v.lng}` };
      }
      return null;
    })
    .filter(Boolean);
  if (normalized.length < 1) return null;
  const [destination, ...rest] = normalized;
  const waypoints = rest.slice(0, 4);
  const params = ['https://www.google.com/maps/dir/?api=1', `travelmode=${encodeURIComponent(opts.travelmode || 'walking')}`];
  if (opts.origin) params.push(`origin=${encodeURIComponent(opts.origin)}`);
  if (destination.type === 'place') params.push(`destination_place_id=${encodeURIComponent(destination.value)}`);
  else params.push(`destination=${encodeURIComponent(destination.value)}`);
  if (waypoints.length) {
    const key = waypoints[0].type === 'place' ? 'waypoint_place_ids' : 'waypoints';
    params.push(`${key}=${encodeURIComponent(waypoints.map((w) => w.value).join('|'))}`);
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
  const slim = venues
    .filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng))
    .map((v) => ({
      placeId: v.placeId || v.id || '',
      name: v.name || '',
      area: v.area || v.formattedAddress || '',
      lat: v.lat,
      lng: v.lng,
      vibe: v.vibe || '',
      url: googleMapsUrl(v) || ''
    }));
  if (!slim.length) return null;
  const json = JSON.stringify(slim);
  const b64 = Buffer.from(json, 'utf8').toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const path = `/app/map#venues=${b64}`;
  if (opts.webhookDomain) return `https://${opts.webhookDomain}${path}`;
  if (path.length > TG_HASH_MAX) return null;
  return path;
}

module.exports = { googleMapsUrl, googleMapsContainerUrl, buildMapHashUrl };
