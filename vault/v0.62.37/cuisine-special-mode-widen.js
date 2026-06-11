// cuisine-special-mode-widen.js — v0.61.131
//
// Helper for /api/cuisine/search: progressive radius widening for the
// Fruits / Durian special modes (v0.61.129 O-23). Extracted from
// index.js so the cap-clamping, target-hit early exit, dedup, and
// mode-filter merge are unit-testable without spinning up Google
// Places + the real venue-filters module.
//
// All IO is injected:
//   discoverFn         — replaces pipeline.discover
//   passesVenueFilter  — replaces venue-filters.passesVenueFilter
//   filterByMode       — replaces special-mode.filterByMode
//
// Per scripts/Create_2_buttons.MD "Fallback behaviour":
//   - widen the radius progressively when fewer than the target are found
//   - do NOT weaken the semantic intent (no extra cuisines, no filter
//     relaxation)
// We try 2x then 3x the start radius, capped at anchorCap (when set)
// or DEFAULT_HARD_CAP_M (30 km) so SG searches don't drift into JB /
// Malaysia. Each pass: per-seed discover → dedup against already-
// accumulated placeIds → venue-filter → mode-filter → merge. Bails as
// soon as count >= target or radius hits the cap.

const DEFAULT_TARGET = 8;
const DEFAULT_HARD_CAP_M = 30000;

async function widenSpecialMode({
  specialMode,
  venues,
  seeds,
  searchCenter,
  searchRegionCode,
  lang,
  startRadius,
  anchorCap = null,
  target = DEFAULT_TARGET,
  hardCapM = DEFAULT_HARD_CAP_M,
  discoverFn,
  passesVenueFilter,
  filterByMode,
  logger = console
}) {
  const baseVenues = Array.from(venues || []);
  const result = {
    venues: baseVenues,
    widened: false,
    widenedFromM: null,
    finalRadiusM: startRadius
  };
  if (!specialMode) return result;
  if (typeof discoverFn !== 'function' || typeof filterByMode !== 'function') {
    return result;
  }
  if (typeof passesVenueFilter !== 'function') {
    passesVenueFilter = () => true;
  }
  if (result.venues.length >= target) return result;
  if (!Number.isFinite(startRadius) || startRadius <= 0) return result;

  const cap = (Number.isFinite(anchorCap) && anchorCap > 0)
    ? anchorCap
    : (Number.isFinite(hardCapM) && hardCapM > 0 ? hardCapM : DEFAULT_HARD_CAP_M);

  const tries = [startRadius * 2, startRadius * 3]
    .map((r) => Math.min(r, cap))
    .filter((r) => r > startRadius)
    .filter((r, i, arr) => arr.indexOf(r) === i);

  const seenIds = new Set(
    result.venues.map((v) => v && v.placeId).filter(Boolean)
  );

  for (const wider of tries) {
    if (result.venues.length >= target) break;
    if (logger && typeof logger.log === 'function') {
      logger.log(
        `[Cuisine-Search] D781 specialMode=${specialMode} widening ${result.finalRadiusM}m → ${wider}m (have ${result.venues.length}/${target})`
      );
    }
    const perSeed = await Promise.all((seeds || []).map((q) =>
      discoverFn({
        lat: searchCenter.lat,
        lng: searchCenter.lng,
        radius: wider,
        cuisines: [q],
        maxResults: 15,
        regionCode: searchRegionCode,
        lang,
        expandSingaporean: false
      }).catch((err) => {
        if (logger && typeof logger.warn === 'function') {
          logger.warn(`[Cuisine-Search] widening per-seed "${q}" failed: ${err && err.message}`);
        }
        return [];
      })
    ));
    const flat = perSeed
      .map((r) => Array.isArray(r) ? r : (r && r.venues) || [])
      .flat();
    let fresh = flat.filter((v) => v && v.placeId && !seenIds.has(v.placeId));
    fresh = fresh.filter(passesVenueFilter);
    fresh = filterByMode(fresh, specialMode);
    for (const v of fresh) {
      seenIds.add(v.placeId);
      result.venues.push(v);
      if (result.venues.length >= target) break;
    }
    result.finalRadiusM = wider;
    if (!result.widened) {
      result.widened = true;
      result.widenedFromM = startRadius;
    }
    if (wider >= cap) break;
  }
  return result;
}

module.exports = {
  widenSpecialMode,
  DEFAULT_TARGET,
  DEFAULT_HARD_CAP_M
};
