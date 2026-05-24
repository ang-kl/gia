// cuisine-tellme-anchor.js — v0.61.131
//
// Helper for the /api/cuisine/search "Tell me" free-text place-anchor
// detection (v0.61.129 O-20). Extracted from index.js so the splitter
// regex + the SG-only / short-text guards are unit-testable without
// spinning up express + Google Places.
//
// The helper takes the typed text + a couple of guard signals (isJB,
// anchorCap) and an injected `detectPlaceName` (so tests can supply a
// deterministic stub instead of hitting the real place-detector ladder
// which calls mrt-coords.json, hawker-vault, and Google Places).
//
// Returns:
//   { anchor:{ name, kind, lat, lng, source },
//     queryRemainder,           // post-strip freeText (may be "")
//     searchCenter:{ lat, lng },
//     searchRadius }             // m, anchor-cap-clamped
// or `null` when no anchor was detected / the input failed a guard.

// "<query> in/near/around/at <place>" splitter. Lazy first capture so
// "ramen in tiong bahru near outram" splits at the FIRST connector.
const PLACE_SPLIT_RE = /^(.+?)\s+(?:in|near|around|at)\s+(.+)$/i;

// Place-detector's MRT/hawker/precinct radii are tight (150-600 m).
// For a cuisine-search Tell-me box we want a real neighbourhood pool,
// so widen to NEARBY_RADIUS_M; the caller passes the actual constant
// (re-exported by place-detector.js) so the two stay in sync.
async function detectAnchorFromFreeText({
  text,
  isJB,
  detectPlaceName,
  nearbyRadiusM,
  anchorCap = null
}) {
  if (!text || typeof text !== 'string') return null;
  if (isJB) return null;
  const trimmed = text.trim();
  if (trimmed.length < 3) return null;

  const splitMatch = trimmed.match(PLACE_SPLIT_RE);
  const placeCandidate = splitMatch ? splitMatch[2].trim() : trimmed;
  const queryRemainder = splitMatch ? splitMatch[1].trim() : '';

  const anchor = await detectPlaceName(placeCandidate);
  if (!anchor) return null;
  if (!Number.isFinite(anchor.lat) || !Number.isFinite(anchor.lng)) return null;

  const targetRadius = (Number.isFinite(anchorCap) && anchorCap > 0)
    ? Math.min(nearbyRadiusM, anchorCap)
    : nearbyRadiusM;

  return {
    anchor: {
      name: anchor.name,
      kind: anchor.kind,
      lat: anchor.lat,
      lng: anchor.lng,
      source: anchor.source
    },
    queryRemainder,
    searchCenter: { lat: anchor.lat, lng: anchor.lng },
    searchRadius: targetRadius
  };
}

module.exports = {
  detectAnchorFromFreeText,
  PLACE_SPLIT_RE
};
