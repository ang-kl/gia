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

// shouldFollowDevice({ initialResolveDone, explicitAnchorName, current, loc, thresholdM })
//   → boolean. True only when ALL hold:
//     1. the mount-time location resolution has finished (so the sync
//        can't clobber the server-cached pick before it's installed),
//     2. there is NO explicit named pick to hold (Menu / deep-link /
//        LocationField anchors carry a name; device-followed anchors do not),
//     3. the device has moved at least `thresholdM` from `current`
//        (GPS jitter / a stationary city pick is never yanked).
export function shouldFollowDevice({
  initialResolveDone,
  explicitAnchorName,
  current,
  loc,
  thresholdM = 1500,
} = {}) {
  if (!initialResolveDone) return false;
  if (explicitAnchorName && String(explicitAnchorName).trim()) return false;
  if (!loc || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return false;
  if (current && Number.isFinite(current.lat) && Number.isFinite(current.lng)
      && haversineMeters(current, loc) < thresholdM) {
    return false;
  }
  return true;
}
