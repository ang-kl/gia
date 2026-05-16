// web/transport/src/data/line-paths.js — v0.60.230
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
//   - CCL: "CC" arc + a separate "CE" spur segment.
//   - SLRT/PLRT: each "SE/SW" / "PE/PW" branch is prepended with the
//     loop hub (STC / PTC) so the branch visually connects.
//   - JRL: "JS" spine + "JE" branch as two segments (future line).
//   - BPL: a single open BP1→BP13 polyline (documented loop
//     simplification — good enough for 5a-5d).
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

// LRT loop hubs — the interchange station that joins both branches.
const HUB_CODE = { SLRT: 'STC', PLRT: 'PTC' };
const BRANCH_PREFIXES = new Set(['SE', 'SW', 'PE', 'PW']);

function parseCode(code) {
  const m = String(code == null ? '' : code).match(/^([A-Za-z]+)(\d*)$/);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), num: m[2] === '' ? 0 : parseInt(m[2], 10) };
}

export function buildLinePaths(stations) {
  if (!Array.isArray(stations)) return {};
  const byPrefix = {};      // prefix → [{ num, lat, lng }]
  const hubPoint = {};      // 'STC' | 'PTC' → { lat, lng }
  for (const s of stations) {
    if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
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
    const seen = new Set();
    const ordered = pts
      .slice()
      .sort((a, b) => a.num - b.num)
      .filter((p) => { if (seen.has(p.num)) return false; seen.add(p.num); return true; })
      .map((p) => ({ lat: p.lat, lng: p.lng }));
    let segment = ordered;
    const hub = HUB_CODE[line];
    if (hub && hubPoint[hub] && BRANCH_PREFIXES.has(prefix)) {
      segment = [hubPoint[hub], ...ordered];
    }
    if (segment.length < 2) continue;
    (paths[line] || (paths[line] = [])).push(segment);
  }
  return paths;
}
