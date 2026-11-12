// globe-available.js — v0.62.986. Spec: doc/Feature/2026-11-12-safe-updates-globe-chunk-docs-985.spec.md, I4.
//
// The one function the Train map needs at load to decide whether to offer the 🌐 Globe chip. It used to live in
// flight-globe.js, and importing it from there pulled the projection and great-circle code into the first bundle;
// on its own it keeps that code in FlightGlobe's lazy chunk. flight-globe.js re-exports it, so both names agree.

const okPt = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

// I6 (v0.62.985): the chip is offered only for a selected flight whose two airports have positions.
export function globeAvailable(sel) {
  return !!sel && okPt(sel.orig) && okPt(sel.dest);
}
