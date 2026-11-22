// location-follow.js — v0.61.372
//
// Pure decision for the 20 s "follow device" location sync: should this
// device reading REPLACE the current anchor / userLoc? Extracted from
// App.jsx so the rule is unit-testable (operator: "be careful not to
// change unless there is a test").
//
// The bug it closes (Railway 07-06 '26): the operator picked Wellington
// (NZ) in the Menu TMA, launched Cuisine, but the first search ran at the
// Singapore device GPS. Root cause: the sync's first tick fired BEFORE the
// mount-time resolution (tryServerCache) had read the Menu pick from the
// loc table, so it overwrote the cached Wellington anchor with raw GPS and
// the label was lost. Gating on `initialResolveDone` closes that race; the
// explicit-anchor rule then holds the pick.

export function haversineMeters(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)
      || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return Infinity;
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// shouldFollowDevice({ initialResolveDone, firstLoadPending, explicitAnchorName, current, loc, thresholdM })
//   → boolean. True only when ALL hold:
//     1. the mount-time location resolution has finished (so the sync
//        can't clobber the server-cached pick before it's installed),
//     2. the FIRST load has finished (v0.61.387 — operator: "first load
//        just ask user to wait". A slow boot load that crosses the 20 s
//        sync window must not be re-centred / re-searched mid-flight; that
//        re-search also counts as 'rotating', which would pop a fact card
//        on top of the first load. Hold the follow until the load lands.),
//     3. there is NO explicit named pick to hold (Menu / deep-link /
//        LocationField anchors carry a name; device-followed anchors do not),
//     3b. (v0.61.430) the user has not made an EXPLICIT pick this session —
//        `explicitPick` is set once they deliberately choose a city / country
//        / foreign region (OTHER / JB). Operator: "explicit pick wins." This
//        is the robust backstop for the case where an inherited foreign pick
//        (Menu handoff) lands WITHOUT an anchor name, so rule 3 alone misses
//        it and the SG device GPS would otherwise drag region back to SG.
//     4. the device has moved at least `thresholdM` from `current`
//        (GPS jitter / a stationary city pick is never yanked).
export function shouldFollowDevice({
  initialResolveDone,
  firstLoadPending = false,
  explicitAnchorName,
  explicitPick = false,
  // v0.62.965 — anchor-age.js isLocked(): a labelled place under 6 hours old. Defaults to TRUE on purpose: a caller
  // that does not know the age keeps the old never-follow-off-a-name rule, which is the safe side (the v0.61.430
  // country-drift bug was a follow that should not have happened). App.jsx passes it explicitly and
  // saved-place-expiry.test.js pins that it does.
  locked = true,
  current,
  loc,
  thresholdM = 1500,
} = {}) {
  if (!initialResolveDone) return false;
  if (firstLoadPending) return false;
  if (explicitPick) return false;
  // v0.62.965 — spec 2026-11-02-saved-place-expires-after-six-hours, I3 / C9. A named anchor used to block the follow
  // for ever (yesterday's Kyoto still won in Singapore the next morning). Now `locked` (anchor-age.js: a labelled
  // place under 6 hours old) is what blocks it; a named anchor past its lock follows only when the phone is over
  // 50 km away. An unnamed anchor keeps the 1.5 km rule below, unchanged.
  const named = !!(explicitAnchorName && String(explicitAnchorName).trim());
  if (named && locked) return false;
  const threshold = named ? Math.max(thresholdM, 50_000) : thresholdM;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return false;
  if (current && Number.isFinite(current.lat) && Number.isFinite(current.lng)
      && haversineMeters(current, loc) < threshold) {
    return false;
  }
  return true;
}
