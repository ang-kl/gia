// bus-motion.js — v0.62.990. Buses that glide between LTA readings instead of jumping.
//
// Spec: doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md, B4 and J3-J4.
//
// LTA reports a bus's position about every 30 s and gives it no id, so each refresh used to delete every marker and
// draw a new one where LTA put it: buses hopped. Here a new reading is matched to the bus already on the map (along
// the route by how far it has come, which only grows; in the stop view by which bus of that service is nearest), and
// the marker then slides from where it is to where LTA now says, over one refresh. The motion costs no LTA call: it
// only moves markers between readings the views already fetch. Pure helpers at the top, the animator at the bottom.
// Hawker and Cuisine reach this file through web/_shared/lib/bus-motion.js, a re-export, so there is one copy.

// One glide lasts one refresh, so a bus arrives where LTA last saw it as the next reading comes in.
export const GLIDE_MS = 30000;
// The farthest a bus can go between two readings and still be the same bus: 30 s at 180 km/h, which no bus reaches,
// so a real bus is never lost; anything further is a different bus.
export const MAX_STEP_M = 1500;
// GPS wobble: a bus may appear to go back this far and still be the same bus (it is then held where it was).
export const BACK_M = 60;

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;

// Metres between two points (equirectangular; exact enough over the few kilometres between two stops).
export function distM(a, b) {
  const x = rad(b.lng - a.lng) * Math.cos(rad((a.lat + b.lat) / 2));
  const y = rad(b.lat - a.lat);
  return Math.sqrt(x * x + y * y) * R;
}

// A polyline with the distance from its start to each vertex.
export function measure(path) {
  const pts = (Array.isArray(path) ? path : []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + distM(pts[i - 1], pts[i]));
  return { pts, cum, total: cum[cum.length - 1] || 0 };
}

// The point of the polyline nearest p: how far along it lies (d) and how far p is from it (off), both in metres.
// v0.62.990, Codex review of #1933: a route that retraces its road has two equally near points, one on the way out and
// one on the way back, so the search can be held to a stretch of the line (`from`..`to`, metres along it), and among
// points within `slack` metres of the nearest it takes the first (`prefer: 'first'`) or the last (`'last'`).
export function locate(track, p, { from = -Infinity, to = Infinity, slack = 0, prefer = 'first' } = {}) {
  const { pts, cum } = track;
  if (!pts.length) return { d: 0, off: Infinity };
  if (pts.length === 1) return { d: 0, off: distM(pts[0], p) };
  const found = [];
  for (let i = 1; i < pts.length; i++) {
    const seg = cum[i] - cum[i - 1];
    if (cum[i] < from || cum[i - 1] > to) continue;
    const a = pts[i - 1];
    const b = pts[i];
    // Work in a local flat frame around a, in metres.
    const kx = Math.cos(rad(a.lat)) * rad(1) * R;
    const ky = rad(1) * R;
    const bx = (b.lng - a.lng) * kx; const by = (b.lat - a.lat) * ky;
    const px = (p.lng - a.lng) * kx; const py = (p.lat - a.lat) * ky;
    const len2 = bx * bx + by * by;
    let t = len2 > 0 ? Math.max(0, Math.min(1, (px * bx + py * by) / len2)) : 0;
    if (seg > 0) t = Math.max((from - cum[i - 1]) / seg, Math.min((to - cum[i - 1]) / seg, t));
    t = Math.max(0, Math.min(1, t));
    found.push({ d: cum[i - 1] + seg * t, off: Math.hypot(px - bx * t, py - by * t) });
  }
  if (!found.length) return { d: Math.max(0, Math.min(cum[cum.length - 1], from)), off: Infinity };
  const least = Math.min(...found.map((f) => f.off));
  const near = found.filter((f) => f.off <= least + slack);
  return near.reduce((x, y) => ((prefer === 'last' ? y.d > x.d : y.d < x.d) ? y : x));
}

// Each stop's distance along the line, in route order: every stop is looked for only after the one before it, so on
// a road the route drives twice each visit is placed on its own pass.
export function stopDistances(track, stops, { slack = 15 } = {}) {
  const out = new Map();
  let prev = 0;
  for (const s of [...(stops || [])].filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng) && Number.isFinite(Number(x.seq))).sort((a, b) => a.seq - b.seq)) {
    const at = locate(track, s, { from: prev, slack, prefer: 'first' });
    prev = at.d;
    out.set(Number(s.seq), at.d);
  }
  return out;
}

// The point d metres along the polyline (clamped to its ends).
export function pointAt(track, d) {
  const { pts, cum, total } = track;
  if (!pts.length) return null;
  if (pts.length === 1 || d <= 0) return { lat: pts[0].lat, lng: pts[0].lng };
  if (d >= total) return { lat: pts[pts.length - 1].lat, lng: pts[pts.length - 1].lng };
  let i = 1;
  while (i < cum.length - 1 && cum[i] < d) i++;
  const seg = cum[i] - cum[i - 1];
  const t = seg > 0 ? (d - cum[i - 1]) / seg : 0;
  return lerp(pts[i - 1], pts[i], t);
}

// Straight-line interpolation, t clamped to [0, 1].
export function lerp(a, b, t) {
  const k = Math.max(0, Math.min(1, t));
  return { lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k };
}

// Along the route: for each new distance, the index of the bus it continues, or -1 for a bus not seen before.
// The furthest new bus is matched first, to the furthest unused old bus that is not ahead of it by more than the
// wobble and not behind it by more than one reading's reach; buses keep their order, so none takes another's marker.
export function matchAlong(prev, next, { back = BACK_M, maxStep = MAX_STEP_M } = {}) {
  const out = next.map(() => -1);
  const used = new Set();
  const order = next.map((d, i) => i).sort((a, b) => next[b] - next[a]);
  for (const i of order) {
    let best = -1;
    for (let j = 0; j < prev.length; j++) {
      if (used.has(j)) continue;
      const gap = next[i] - prev[j];
      if (gap < -back || gap > maxStep) continue;
      if (best < 0 || prev[j] > prev[best]) best = j;
    }
    if (best >= 0) { out[i] = best; used.add(best); }
  }
  return out;
}

// Straight: for each new point, the index of the old point it continues, or -1; the closest pairs are taken first.
export function matchNearest(prev, next, { maxStep = MAX_STEP_M } = {}) {
  const pairs = [];
  next.forEach((n, i) => prev.forEach((p, j) => { const d = distM(p, n); if (d <= maxStep) pairs.push([d, i, j]); }));
  pairs.sort((a, b) => a[0] - b[0]);
  const out = next.map(() => -1);
  const usedPrev = new Set();
  for (const [, i, j] of pairs) {
    if (out[i] !== -1 || usedPrev.has(j)) continue;
    out[i] = j;
    usedPrev.add(j);
  }
  return out;
}

// One frame loop for every moving marker. run(key, ms, step) calls step(t) with t rising from 0 to exactly 1 over ms;
// a second run on the same key replaces the first. The loop stops when nothing moves, so a map with still buses costs
// nothing. In the browser frames come from requestAnimationFrame, which also pauses while the page is hidden.
export function createAnimator({ now = () => Date.now(), schedule = null, cancel = null, frameMs = 100 } = {}) {
  const raf = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null;
  const sched = schedule || (raf ? (f) => raf(f) : (f) => setTimeout(f, frameMs));
  const canc = cancel || (raf && !schedule && typeof cancelAnimationFrame === 'function' ? cancelAnimationFrame : clearTimeout);
  const runs = new Map();
  let handle = null;
  let last = 0;
  function frame() {
    handle = null;
    const t0 = now();
    // A display refreshing 60 times a second is throttled to about frameMs: a bus moves a few metres a second.
    if (!schedule && raf && t0 - last < frameMs) { if (runs.size) handle = sched(frame); return; }
    last = t0;
    for (const [key, r] of [...runs]) {
      const t = r.ms > 0 ? Math.min(1, (t0 - r.start) / r.ms) : 1;
      r.step(t);
      if (t >= 1 && runs.get(key) === r) runs.delete(key);
    }
    if (runs.size) handle = sched(frame);
  }
  return {
    run(key, ms, step) {
      runs.set(key, { start: now(), ms, step });
      step(0);
      if (handle == null) handle = sched(frame);
    },
    stop(key) { runs.delete(key); },
    stopAll() { runs.clear(); if (handle != null) { canc(handle); handle = null; } },
    active: () => runs.size,
  };
}
