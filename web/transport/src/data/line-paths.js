// web/transport/src/data/line-paths.js — v0.61.1
//
// Build E 5a — derive MRT/LRT line polyline geometry from the station
// list served by /api/transport/stations. No precomputed path file and
// no map dependency: ordering is a pure function of the per-line
// station codes (NS1…NS28, EW1…EW33, …), which already encode the
// running order along each line.
//
// buildLinePaths(stations) → { [lineCode]: Array<Array<{lat,lng}>> }
//   — an array of SEGMENTS per line, so branched lines (CGL, the CCL
//   CE spur, the SLRT/PLRT loop branches, JRL) carry more than one.
//
// Edge cases handled:
//   - CGL: "CG" (Tanah Merah) parses as ordinal 0, then CG1/CG2.
//   - CCL: drawn from an explicit closed-loop sequence (LINE_SEQUENCES)
//     running through the CCL6 stations (Keppel / Cantonment / Prince
//     Edward Road) and back to Promenade, so the Circle Line draws as
//     one full closed ring rather than an open arc plus a CE spur.
//   - SLRT: each "SE/SW" branch is wrapped with the STC hub at both
//     ends so the branch draws as a closed loop.
//   - BPL / PLRT: drawn from explicit operator-verified station-name
//     sequences (LINE_SEQUENCES), not numeric code order, so both LRTs
//     close their loops.
//   - JRL: "JS" spine + "JE" branch as two segments (future line).
//   - Duplicate codes (EW1/EW27 appear twice): de-duped by ordinal.
//   - Gaps (CC18, DT4, TE10/21 never built): the polyline simply
//     connects the next existing station.

// Station-code prefix → line code. Mirrors the mapPrefix table in
// MrtMapPanel.jsx's InfoWindow renderer.
const PREFIX_TO_LINE = {
  NS: 'NSL', EW: 'EWL', CG: 'CGL', NE: 'NEL', CC: 'CCL', CE: 'CCL',
  DT: 'DTL', TE: 'TEL', BP: 'BPL', SE: 'SLRT', SW: 'SLRT', STC: 'SLRT',
  PE: 'PLRT', PW: 'PLRT', PTC: 'PLRT', JS: 'JRL', JE: 'JRL', CR: 'CRL'
};

// SLRT loop hub — the interchange that joins both branches. PLRT is
// handled by LINE_SEQUENCES instead, so only SLRT needs this.
const HUB_CODE = { SLRT: 'STC' };
const BRANCH_PREFIXES = new Set(['SE', 'SW']);

// Lines drawn from an explicit station-name sequence rather than numeric
// code order. Needed where the loop must visibly close (a repeated
// first/last name closes it) — both LRT loop lines and the Circle Line.
// Each entry is an array of segments; a segment is an ordered list of
// station names.
const LINE_SEQUENCES = {
  BPL: [[
    'Choa Chu Kang', 'South View', 'Keat Hong', 'Teck Whye', 'Phoenix',
    'Bukit Panjang', 'Petir', 'Pending', 'Bangkit', 'Fajar', 'Segar',
    'Jelapang', 'Senja', 'Bukit Panjang',
  ]],
  PLRT: [
    ['Punggol', 'Sam Kee', 'Teck Lee', 'Punggol Point', 'Samudera',
      'Nibong', 'Sumang', 'Soo Teck', 'Punggol'],
    ['Punggol', 'Cove', 'Meridian', 'Coral Edge', 'Riviera', 'Kadaloor',
      'Oasis', 'Damai', 'Punggol'],
  ],
  // Circle Line as one full closed ring: the CC arc continues through
  // the CCL6 stations (Keppel / Cantonment / Prince Edward Road) and the
  // CE stations (Marina Bay / Bayfront) back to Promenade, which also
  // sits between Esplanade and Nicoll Highway — so the ring closes.
  CCL: [[
    'Dhoby Ghaut', 'Bras Basah', 'Esplanade', 'Promenade', 'Nicoll Highway',
    'Stadium', 'Mountbatten', 'Dakota', 'Paya Lebar', 'MacPherson',
    'Tai Seng', 'Bartley', 'Serangoon', 'Lorong Chuan', 'Bishan',
    'Marymount', 'Caldecott', 'Botanic Gardens', 'Farrer Road',
    'Holland Village', 'Buona Vista', 'one-north', 'Kent Ridge',
    'Haw Par Villa', 'Pasir Panjang', 'Labrador Park', 'Telok Blangah',
    'HarbourFront', 'Keppel', 'Cantonment', 'Prince Edward Road',
    'Marina Bay', 'Bayfront', 'Promenade',
  ]],
};

function parseCode(code) {
  const m = String(code == null ? '' : code).match(/^([A-Za-z]+)(\d*)$/);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), num: m[2] === '' ? 0 : parseInt(m[2], 10) };
}

export function buildLinePaths(stations) {
  if (!Array.isArray(stations)) return {};
  const byPrefix = {};      // prefix → [{ num, lat, lng }]
  const hubPoint = {};      // 'STC' → { lat, lng }
  const pointByName = {};   // station name → { lat, lng }
  for (const s of stations) {
    if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    if (s.name) pointByName[s.name] = { lat: s.lat, lng: s.lng };
    for (const code of (Array.isArray(s.codes) ? s.codes : [])) {
      const pc = parseCode(code);
      if (!pc || !PREFIX_TO_LINE[pc.prefix]) continue;
      if (pc.prefix === 'STC' || pc.prefix === 'PTC') {
        hubPoint[pc.prefix] = { lat: s.lat, lng: s.lng };
        continue;
      }
      (byPrefix[pc.prefix] || (byPrefix[pc.prefix] = []))
        .push({ num: pc.num, lat: s.lat, lng: s.lng });
    }
  }

  const paths = {};
  for (const [prefix, pts] of Object.entries(byPrefix)) {
    const line = PREFIX_TO_LINE[prefix];
    // BPL / PLRT are drawn from LINE_SEQUENCES below, not numeric order.
    if (LINE_SEQUENCES[line]) continue;
    const seen = new Set();
    const ordered = pts
      .slice()
      .sort((a, b) => a.num - b.num)
      .filter((p) => { if (seen.has(p.num)) return false; seen.add(p.num); return true; })
      .map((p) => ({ lat: p.lat, lng: p.lng }));
    let segment = ordered;
    // SLRT branches close back to the STC hub at both ends.
    const hub = HUB_CODE[line];
    if (hub && hubPoint[hub] && BRANCH_PREFIXES.has(prefix)) {
      segment = [hubPoint[hub], ...ordered, hubPoint[hub]];
    }
    if (segment.length < 2) continue;
    (paths[line] || (paths[line] = [])).push(segment);
  }

  // Explicit operator-verified sequences for the LRT loop lines.
  for (const [line, seqs] of Object.entries(LINE_SEQUENCES)) {
    for (const names of seqs) {
      const segment = names
        .map((n) => pointByName[n])
        .filter(Boolean)
        .map((p) => ({ lat: p.lat, lng: p.lng }));
      if (segment.length < 2) continue;
      (paths[line] || (paths[line] = [])).push(segment);
    }
  }
  return paths;
}

// v0.66.0 — Chaikin corner-cutting. The station-code-derived polylines
// connect stations with hard straight segments; smoothing rounds those
// corners so the fallback geometry reads as a curve rather than a
// zig-zag. Real LTA route geometry (data/mrt-line-paths.json) is
// already curved and is NOT smoothed — only the derived fallback is.

function _samePoint(a, b) {
  return a && b && Math.abs(a.lat - b.lat) < 1e-9 && Math.abs(a.lng - b.lng) < 1e-9;
}

function _round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// One Chaikin pass. `closed` rings cut every corner (including the
// join); open paths preserve their two endpoints.
function _chaikinOnce(pts, closed) {
  const n = pts.length;
  const out = [];
  if (!closed) out.push(pts[0]);
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    out.push({ lat: a.lat * 0.75 + b.lat * 0.25, lng: a.lng * 0.75 + b.lng * 0.25 });
    out.push({ lat: a.lat * 0.25 + b.lat * 0.75, lng: a.lng * 0.25 + b.lng * 0.75 });
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

// Smooth one polyline segment. A segment whose first and last point
// coincide is treated as a closed loop and stays closed.
export function smoothSegment(seg, iterations = 2) {
  if (!Array.isArray(seg) || seg.length < 3) return seg;
  const closed = _samePoint(seg[0], seg[seg.length - 1]);
  let pts = closed ? seg.slice(0, -1) : seg.slice();
  for (let i = 0; i < iterations; i++) pts = _chaikinOnce(pts, closed);
  pts = pts.map((p) => ({ lat: _round6(p.lat), lng: _round6(p.lng) }));
  if (closed) pts.push({ ...pts[0] });
  return pts;
}

// Smooth every segment of a { lineCode: segments[] } map.
export function smoothLinePaths(paths) {
  const out = {};
  for (const [code, segs] of Object.entries(paths || {})) {
    if (code.startsWith('_')) { out[code] = segs; continue; }
    out[code] = (Array.isArray(segs) ? segs : []).map((seg) => smoothSegment(seg, 2));
  }
  return out;
}

// v0.60.232 (Build E 5e) — pick the real LTA route geometry served by
// /api/transport/line-paths when it's present and well-formed, else
// fall back to the station-code-derived polylines from buildLinePaths.
// `fetched` has the same shape buildLinePaths returns:
//   { [lineCode]: Array<Array<{lat,lng}>> }
export function resolveLinePaths(fetched, stations) {
  if (fetched && typeof fetched === 'object') {
    const valid = {};
    for (const [code, segments] of Object.entries(fetched)) {
      if (code.startsWith('_')) continue;   // skip _meta
      const good = (Array.isArray(segments) ? segments : []).filter(
        (seg) => Array.isArray(seg) && seg.length >= 2
          && seg.every((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng)),
      );
      if (good.length) valid[code] = good;
    }
    if (Object.keys(valid).length) return valid;
  }
  // Derived fallback — smoothed (real LTA geometry above is left as-is).
  return smoothLinePaths(buildLinePaths(stations));
}
