// flight-globe.js — v0.62.985. Spec: doc/Feature/2026-11-11-fr24-globe-arrival-tz.spec.md, I5, I6.
//
// The geometry of the Train Mini App's flight globe, with no DOM: an orthographic projection, the great circle between
// two airports, the split of that circle at the plane (flown solid, the rest dashed), and the SVG path strings. Ported
// from hongjia's holiday-coffee-table opener globe (kit/assets/kit.js, same owner): the same projection, R = 180 about
// C = 200 in a 400 × 400 box, and the same land data shape (tenths of a degree, coastlines as deltas), built for this
// repo by scripts/build-globe-land.mjs from Natural Earth 1:110m land.
//
// FlightGlobe.jsx draws what this returns; the tests call it directly.

export const GLOBE_R = 180;
export const GLOBE_C = 200;
const RAD = Math.PI / 180;

const okPt = (p) => !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng);

// I6: the 🌐 Globe chip is offered only for a selected flight whose two airports have positions.
export function globeAvailable(sel) {
  return !!sel && okPt(sel.orig) && okPt(sel.dest);
}

export function unit(p) {
  const lo = p.lng * RAD;
  const la = p.lat * RAD;
  return [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
}
const toPt = (x, y, z) => {
  const r = Math.sqrt(x * x + y * y + z * z) || 1;
  return { lat: Math.asin(Math.max(-1, Math.min(1, z / r))) / RAD, lng: Math.atan2(y, x) / RAD };
};

// The angle between two points, in degrees.
export function arcDeg(a, b) {
  const p = unit(a);
  const q = unit(b);
  const dot = Math.max(-1, Math.min(1, p[0] * q[0] + p[1] * q[1] + p[2] * q[2]));
  return Math.acos(dot) / RAD;
}

// n + 1 points along the shorter great circle from a to b (spherical linear interpolation), as { lat, lng }.
export function greatCircle(a, b, n = 64) {
  const p = unit(a);
  const q = unit(b);
  const om = arcDeg(a, b) * RAD;
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const s1 = om < 1e-6 ? 1 - t : Math.sin((1 - t) * om) / Math.sin(om);
    const s2 = om < 1e-6 ? t : Math.sin(t * om) / Math.sin(om);
    out.push(toPt(s1 * p[0] + s2 * q[0], s1 * p[1] + s2 * q[1], s1 * p[2] + s2 * q[2]));
  }
  return out;
}

// The point halfway along the great circle: the globe turns to face it, so both ends are in view.
export function midpoint(a, b) {
  const p = unit(a);
  const q = unit(b);
  return toPt(p[0] + q[0], p[1] + q[1], p[2] + q[2]);
}

// I5: the route as two parts. With the plane known, flown = origin → plane and ahead = plane → destination (two great
// circles through where the plane is now). Without it, a landed flight is all flown and anything else is all ahead.
export function flightPaths({ orig, dest, plane = null, landed = false, n = 64 } = {}) {
  if (!okPt(orig) || !okPt(dest)) return { flown: [], ahead: [] };
  if (okPt(plane)) {
    const a = arcDeg(orig, plane);
    const b = arcDeg(plane, dest);
    const k = Math.max(2, Math.round((n * a) / Math.max(1e-9, a + b)));
    return { flown: greatCircle(orig, plane, k), ahead: greatCircle(plane, dest, Math.max(2, n - k)) };
  }
  const all = greatCircle(orig, dest, n);
  return landed ? { flown: all, ahead: [] } : { flown: [], ahead: all };
}

// Orthographic projection about the view centre { lat, lng }: [x, y] in the 400 × 400 box, or null on the far side.
export function project(p, view, R = GLOBE_R, C = GLOBE_C) {
  const la = p.lat * RAD;
  const dl = (p.lng - view.lng) * RAD;
  const sp = Math.sin(view.lat * RAD);
  const cp = Math.cos(view.lat * RAD);
  const cla = Math.cos(la);
  const cd = Math.cos(dl);
  const cosc = sp * Math.sin(la) + cp * cla * cd;
  if (cosc < 0) return null;
  return [C + R * cla * Math.sin(dl), C - R * (cp * Math.sin(la) - sp * cla * cd)];
}

// An SVG path through the visible points; the pen lifts across the far side, so nothing is drawn through the Earth.
export function pathD(points, view) {
  const out = [];
  let pen = false;
  for (const p of points) {
    const q = project(p, view);
    if (q) { out.push(`${pen ? 'L' : 'M'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`); pen = true; } else pen = false;
  }
  return out.join('');
}

// globe-land.json (tenths of a degree) → { coast: [[{lat,lng}...]...], dots: [{lat,lng}...], grat: [...] }.
export function decodeLand(G) {
  const coast = [];
  for (const a of (G && G.c) || []) {
    let x = a[0];
    let y = a[1];
    const pts = [{ lng: x / 10, lat: y / 10 }];
    for (let j = 2; j + 1 < a.length; j += 2) { x += a[j]; y += a[j + 1]; pts.push({ lng: x / 10, lat: y / 10 }); }
    coast.push(pts);
  }
  const dots = [];
  const d = (G && G.d) || [];
  for (let i = 0; i + 1 < d.length; i += 2) dots.push({ lng: d[i] / 10, lat: d[i + 1] / 10 });
  const grat = [];
  for (let k = -180; k < 180; k += 30) { const s = []; for (let la = -80; la <= 80; la += 4) s.push({ lng: k, lat: la }); grat.push(s); }
  for (let k = -60; k <= 60; k += 30) { const s = []; for (let lo = -180; lo <= 180; lo += 4) s.push({ lng: lo, lat: k }); grat.push(s); }
  return { coast, dots, grat };
}

// Everything the SVG needs for one view: the land, the two route parts and the pins, as path strings and points.
export function globeScene(land, sel, view) {
  const { flown, ahead } = flightPaths(sel || {});
  const pin = (p, kind, label) => {
    const q = okPt(p) ? project(p, view) : null;
    return q ? { kind, label: label || '', x: q[0], y: q[1] } : null;
  };
  const dots = [];
  for (const p of land.dots) {
    const q = project(p, view);
    if (q) dots.push(`M${q[0].toFixed(1)} ${q[1].toFixed(1)}h0`);
  }
  return {
    grat: land.grat.map((s) => pathD(s, view)).join(''),
    coast: land.coast.map((s) => pathD(s, view)).join(''),
    dots: dots.join(''),
    flown: pathD(flown, view),
    ahead: pathD(ahead, view),
    pins: [
      pin(sel && sel.orig, 'orig', sel && sel.orig && sel.orig.label),
      pin(sel && sel.dest, 'dest', sel && sel.dest && sel.dest.label),
      pin(sel && sel.plane, 'plane', ''),
    ].filter(Boolean),
  };
}

// The view a flight opens at: facing the middle of the route, latitude kept within ±70° as hongjia does.
export function initialView(sel) {
  if (!globeAvailable(sel)) return { lat: 0, lng: 0 };
  const m = midpoint(sel.orig, sel.dest);
  return { lat: Math.max(-70, Math.min(70, m.lat)), lng: m.lng };
}
