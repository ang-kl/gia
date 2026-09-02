// Map overlay controller — parks / attractions / taxi stops / MRT exits /
// live carpark / nearby train lines.
// Plain framework-agnostic JS; operates on a google.maps.Map instance.
//
// THREE COPIES, AND THEY ARE **NOT** BYTE-IDENTICAL. This header used to say they
// were, in all three files, and it was false in all three. Two of them even listed
// THEMSELVES as the file they matched, so following the instruction — "edit all
// copies together", meaning copy one over another — would have deleted live code.
// A sync note that is wrong is worse than none: it is an instruction to break
// things, and it reads with the authority of documentation.
//
// The other two copies:
//   web/hawker/src/lib/mapOverlays.js
//   web/cuisine/src/v2/lib/mapOverlays.js
// The three TMAs are separate Vite apps with no shared package, so the module is
// duplicated on purpose. What follows is what is actually true, measured at
// v0.62.894 and asserted by __tests__/map-overlays-copies.test.js:
//
//   87 top-level bindings across the three files
//   71 present in all three — 63 byte-identical, 8 deliberately divergent
//   10 present in transport + cuisine only: the 🍚 hawker overlay helpers.
//      HAWKER DOES NOT HAVE THEM, and that is not an oversight — hawker centres
//      are that app's own content, not a layer it draws over something else.
//    1 hawker only: ensureInfoVisible (its info card pans itself into view)
//    5 cuisine only: the hawker palette constants + carpark-cache internals
//
// SO: DO NOT COPY ONE FILE OVER ANOTHER. Port the specific change, to the copies
// that should have it, and run the test. The `stationInfoCardHtml` region IS held
// byte-identical across all three and is asserted by
// __tests__/station-card-labels.test.js — that one you may sync wholesale.
//
// v0.64.0 — point layers (carpark / taxis / attractions / exits) are
// clipped to a radius of an anchor point (the map viewport centre,
// pushed in via setAnchor on the map `idle` event), so the map shows
// nearby places rather than the whole island. Parks (translucent
// polygons) stay unfiltered.
//
// v0.61.87 — the train-line layer is NOT radius-clipped: the whole
// MRT/LRT network (every line + station) draws when the Train overlay
// is on.
// v0.61.90 — per-TMA zoom tiers (operator spec): a station marker
// steps square → code chip (3 ascending sizes) → full named pill
// across the zoom bands, with per-TMA station-count caps and line
// opacity. The controller is told its TMA via createOverlayController's
// third arg; trainTier() resolves the band.
//
// v0.61.17 — train-overlay station markers are now clickable on every
// TMA (no longer emphasis-gated): tapping one enters a STATION-DETAIL
// view that hides every station except the tapped one and its
// neighbours one stop before / after on the line. Tapping the selected
// station again clears it.
//
// v0.61.26 — in the station-detail view the Exits / Taxis chips are
// scoped to the 3 visible stations: turning on Exits draws those
// stations' exits, Taxis draws their taxi stands + pick-up points.
// Replaces the auto-drawn station-context amenity pins (bus stops and
// carparks are no longer shown in the detail view).

// v0.61.26 — the chip-toggled overlay layers (parks / attractions /
// taxis / carpark / exits) share one fixed radius around the map
// anchor. The Nearby↔Details slider was removed (it didn't work).
const OVERLAY_RADIUS_M = 550;
// v0.61.26 — in the station-detail view the Exits / Taxis chips clip
// to this radius around each of the 3 visible stations instead of the
// anchor radius, so they show the amenities of those stations only.
const STATION_AMENITY_RADIUS_M = 400;
// v0.61.53 — zoom level at and above which the train layer expands:
// every visible station becomes a labelled pill (per-code colour chips +
// <name> station), and the base polyline goes opaque.
// v0.61.87 — below this zoom a station shows a line-coloured code chip
// (codes only, no name); the bare square pin was dropped, so a station
// always shows its code.
const ZOOM_DETAIL_THRESHOLD = 15;

// v0.61.92 — code-chip scale ladder for the train-overlay zoom tiers.
// The operator spec sizes markers "by 1/2 size"; with no fixed unit
// given (G-question答 "Claude picks px values") a "size" is one rung of
// this ladder — ~13 % apart, i.e. roughly 3 px on a ~24 px chip:
//   LG 1.00  the z15 code chip (a demoted z15 pill)
//   MD 0.87  z15 − 1 size  (Transport z12-14 base)
//   SM 0.74  z15 − 2 size  (Cuisine/Hawker z13-z14 base, z15 overlap)
//   XS 0.62  smaller than z13 (Cuisine z12, overlap floor)
const CHIP = { LG: 1, MD: 0.87, SM: 0.74, XS: 0.62 };

// v0.61.90 — per-TMA train-overlay zoom tiers (operator spec). For a
// TMA ('cuisine' | 'hawker' | 'transport') and the current map zoom,
// returns how station markers + line opacity render:
//   station   : 'sq-sm' small square | 'chip' code chip | 'pill' named pill
//   scale     : code-chip size multiplier (ascends with zoom)
//   cap       : when > 0, only the N stations nearest the map anchor
//               show the chip; the rest fall back to `other`
//   capRadius : when > 0, only stations within this many metres of the
//               map anchor show the chip; the rest fall back to `other`
//   opacity   : base train-line stroke opacity
//   emphasis  : Cuisine z15+ — lines touching an in-focus (nearest-
//               result) station render at 95%, the rest at 80%
//   overlapChip: chip scale a marker is demoted TO when it collides
//               with another (see demoteByOverlap)
// v0.61.92 — operator overlap spec. Cuisine z12-14 now depends on
// `inFocus` (the search result inside the viewport): in focus keeps the
// v0.61.91 capRadius/cap behaviour; out of focus every station is a
// plain code chip (z13 like z14 at SM, z12 smaller at XS). z15+ shows
// named pills. The Transport branch drives the Transport TMA's own map
// (MrtMapPanel renderPins): z12-14 code chip (MD), z15+ pill. Hawker
// tiers are unchanged from v0.61.91.
export function trainTier(tma, zoom, inFocus) {
  if (tma === 'hawker') {
    if (zoom < 12) return { station: 'sq-sm', cap: 0, opacity: 0.5 };
    if (zoom < 13) return { station: 'chip', scale: 0.75, cap: 5, opacity: 0.7, other: 'sq-sm', overlapChip: CHIP.XS };
    if (zoom < 14) return { station: 'chip', scale: 0.85, cap: 10, opacity: 0.7, other: 'sq-sm', overlapChip: CHIP.XS };
    if (zoom < 15) return { station: 'chip', scale: 1, cap: 15, opacity: 0.7, other: 'sq-sm', overlapChip: CHIP.SM };
    return { station: 'pill', cap: 0, opacity: 1, overlapChip: CHIP.SM };
  }
  if (tma === 'transport') {
    if (zoom < 12) return { station: 'sq-sm', cap: 0, opacity: 0.5 };
    if (zoom < 15) return { station: 'chip', scale: CHIP.MD, cap: 0, opacity: 0.7, overlapChip: CHIP.SM };
    return { station: 'pill', cap: 0, opacity: 1, overlapChip: CHIP.MD };
  }
  // cuisine
  if (zoom < 12) return { station: 'sq-sm', cap: 0, opacity: 0.8 };
  if (zoom < 15) {
    if (!inFocus) {
      return { station: 'chip', scale: zoom < 13 ? CHIP.XS : CHIP.SM, cap: 0,
        opacity: zoom < 14 ? 0.9 : 0.8, overlapChip: CHIP.XS };
    }
    if (zoom < 13) return { station: 'chip', scale: 0.75, capRadius: 200, opacity: 0.9, other: 'sq-sm', overlapChip: CHIP.XS };
    if (zoom < 14) return { station: 'chip', scale: 0.85, capRadius: 300, opacity: 0.9, other: 'sq-sm', overlapChip: CHIP.XS };
    return { station: 'chip', scale: 1, cap: 15, opacity: 0.8, other: 'sq', overlapChip: CHIP.SM };
  }
  return { station: 'pill', cap: 0, opacity: 0.8, emphasis: true, overlapChip: CHIP.SM };
}

// v0.61.92 — Web-Mercator ground resolution: real-world metres spanned
// by one screen pixel at a given zoom + latitude.
export function metresPerPixelAt(zoom, lat) {
  return 156543.03392 * Math.cos((lat || 0) * Math.PI / 180) / Math.pow(2, zoom);
}

// v0.61.97 — operator: the amenity overlays (Attractions / Clinic /
// Police / Hospital / Park) render by zoom tier, like the train
// stations. Returns: 'dot' (z<12 — a tiny dot), 'glyph' (z12-13 — the
// icon only) or 'label' (z14+ — icon + name). A label that collides
// with another is demoted to 'glyph' (parks: the label is hidden) —
// see applyVisibility.
export function amenityTier(zoom) {
  if (!(zoom >= 12)) return 'dot';
  if (zoom < 14) return 'glyph';
  return 'label';
}

// v0.61.92 — approximate on-screen footprint (px) of a resolved station
// marker. Rough label-size estimates: a code chip is ~23 px per line
// code + ~12 px padding; a pill adds ~6.2 px per name character. Used
// only by the overlap pass, so approximate is fine.
function markerBoxPx(mode, codeCount, nameLen) {
  const codes = codeCount > 0 ? codeCount : 1;
  if (mode === 'pill') return { w: 22 + codes * 23 + (nameLen + 8) * 6.2, h: 23 };
  if (typeof mode === 'string' && mode.indexOf('chip:') === 0) {
    const s = parseFloat(mode.slice(5)) || 1;
    return { w: (12 + codes * 23) * s, h: 21 * s };
  }
  if (mode === 'sq') return { w: 13, h: 13 };
  return { w: 9, h: 9 };
}

// v0.61.92 — screen-space overlap demotion. v0.61.94 — operator: "if
// the text overlaps a nearby pin, change to station code only, and
// pins near each other smaller px". The v0.61.92 pass kept the marker
// nearest the result as a full pill and demoted only the rest — but a
// kept pill is wide enough to still cover a demoted neighbour, so the
// overlap persisted (the City Hall / CC3 screenshot). This pass is
// symmetric + iterative instead: each round, EVERY non-pinned marker
// whose box collides with another's is demoted one step — a named pill
// -> a code chip (drops the name), a code chip -> ~20 % smaller
// (floored at 0.5x). A marker box only ever shrinks, so the loop
// converges; the round cap is a safety bound. A pinned marker (a
// tapped station) is never demoted. `items` is a list of
// { name, lat, lng, codes, mode, pinned? }. Pure geometry (metres ->
// px from the zoom), so the result is pan-invariant. Mutates each
// item's `mode` + returns `items`.
export function demoteByOverlap(items, zoom, overlapChip) {
  const list = (items || []).filter((it) => it && it.mode);
  if (list.length < 2) return items;
  const boxOf = (it) => markerBoxPx(
    it.mode, Array.isArray(it.codes) ? it.codes.length : 1, (it.name || '').length);
  // One demotion step; returns true when `mode` actually changed.
  const demote = (it) => {
    if (it.mode === 'pill') {
      it.mode = 'chip:' + (overlapChip || CHIP.SM);
      return true;
    }
    if (typeof it.mode === 'string' && it.mode.indexOf('chip:') === 0) {
      const s = parseFloat(it.mode.slice(5)) || 1;
      const next = Math.max(+(s * 0.8).toFixed(3), 0.5);
      if (next < s) { it.mode = 'chip:' + next; return true; }
    }
    return false;   // a square, or a chip already at the 0.5x floor
  };
  // v0.61.94 — a few px of breathing room so markers don't settle
  // edge-to-edge touching.
  const GAP = 3;
  for (let round = 0; round < 8; round++) {
    const boxes = list.map(boxOf);
    const hit = new Array(list.length).fill(false);
    for (let i = 0; i < list.length; i++) {
      const mpp = metresPerPixelAt(zoom, list[i].lat) || 1;
      for (let j = i + 1; j < list.length; j++) {
        const dx = metresBetween(list[i].lat, list[i].lng, list[i].lat, list[j].lng) / mpp;
        const dy = metresBetween(list[i].lat, list[i].lng, list[j].lat, list[i].lng) / mpp;
        if (dx < (boxes[i].w + boxes[j].w) / 2 + GAP
          && dy < (boxes[i].h + boxes[j].h) / 2 + GAP) {
          hit[i] = true;
          hit[j] = true;
        }
      }
    }
    let changed = false;
    for (let i = 0; i < list.length; i++) {
      if (hit[i] && !list[i].pinned && demote(list[i])) changed = true;
    }
    if (!changed) break;
  }
  return items;
}

// v0.61.90 — marker content for a resolved station mode (see trainTier
// + applyVisibility's train branch). `mode`: 'sq-sm' | 'sq' | 'pill' |
// 'chip:<scale>'.
function trainStationNode(mode, st) {
  if (mode === 'pill') return stationPillNode(st.station.codes, st.station.name || '', st.hex);
  if (mode === 'sq-sm') return squareStationNode(st.hex, true);
  if (mode === 'sq') return squareStationNode(st.hex, false);
  return stationCodeNode(st.station.codes, st.hex, parseFloat(mode.slice(5)) || 1);
}

// Canonical LTA line colours for the train-line overlay (the transport
// app's LINES_BY_CODE isn't importable across Vite apps).
const LINE_HEX = {
  NSL: '#d42e12', EWL: '#009645', CGL: '#009645', NEL: '#9900aa',
  CCL: '#fa9e0d', DTL: '#005ec4', TEL: '#9D5B25', BPL: '#999999',
  SLRT: '#999999', PLRT: '#999999', JRL: '#0099aa', CRL: '#97c93d'
};

// v0.61.17 — station-code prefix → line code, for station-detail
// neighbour lookup (mirrors line-paths.js's PREFIX_TO_LINE).
const PREFIX_TO_LINE = {
  NS: 'NSL', EW: 'EWL', CG: 'CGL', NE: 'NEL', CC: 'CCL', CE: 'CCL',
  DT: 'DTL', TE: 'TEL', BP: 'BPL', SE: 'SLRT', SW: 'SLRT', STC: 'SLRT',
  PE: 'PLRT', PW: 'PLRT', PTC: 'PLRT', JS: 'JRL', JE: 'JRL', CR: 'CRL'
};

// v0.61.17 — amenity-pin palette (mirrors MrtMapPanel's station-detail).
const AMENITY_EXIT_BG = '#5E35B1';
const AMENITY_BUS_BG = '#1565C0';
const AMENITY_TAXI_BG = '#FBC02D';
const AMENITY_CARPARK_BG = '#1565C0';
// v0.61.54 — CR10: pin backgrounds must not read dark/black against the
// (now stronger-greyscale) base map. Police was previously #1A237E
// (Material Indigo 900 — very dark navy); lifted to Indigo 400, still
// distinctly "police blue" but visibly lighter on white-text labels.
const AMENITY_POLICE_BG = '#5C6BC0';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Approximate planar distance in metres (fine at city scale).
function metresBetween(aLat, aLng, bLat, bLng) {
  const dy = (bLat - aLat) * 110574;
  const dx = (bLng - aLng) * 111320 * Math.cos(aLat * Math.PI / 180);
  return Math.hypot(dx, dy);
}

// v0.61.17 — parse a station code into { prefix, num }.
function parseCode(code) {
  const m = String(code == null ? '' : code).match(/^([A-Za-z]+)(\d*)$/);
  if (!m) return null;
  return { prefix: m[1].toUpperCase(), num: m[2] === '' ? 0 : parseInt(m[2], 10) };
}

// v0.61.17 — a station record's primary line code.
function lineCodeOf(s) {
  return (s && Array.isArray(s.lines) && s.lines[0]) || null;
}

// v0.61.24 — line colour for a station code (EW16 → EWL green, …).
function codeHex(code) {
  const pc = parseCode(code);
  return (pc && LINE_HEX[PREFIX_TO_LINE[pc.prefix]]) || '#888888';
}

// v0.61.24 — a coloured rounded pill for an exit code / station code.
function codePill(text, bg, big) {
  return '<span style="display:inline-block;background:' + bg + ';color:#fff;'
    + 'font-weight:700;white-space:nowrap;border-radius:' + (big ? 7 : 5) + 'px;'
    + 'padding:' + (big ? '2px 9px' : '1px 6px') + ';'
    + 'font-size:' + (big ? 15 : 11) + 'px;line-height:1.4;">'
    + escapeHtml(text) + '</span>';
}

// v0.62.283 — 🍚 Hawker overlay ported VERBATIM from the Cuisine TMA so the
// Train TMA's Hawker layer renders the SAME droplet / H## zoom-tier pins + card.
let hawkerPromise = null;
function fetchHawkerCentres() {
  if (!hawkerPromise) {
    hawkerPromise = fetch('/api/hawker/centres-by-region')
      .then((r) => (r.ok ? r.json() : { regions: [] }))
      .then((d) => {
        const out = [];
        let n = 0;
        const regions = (d && Array.isArray(d.regions)) ? d.regions : [];
        for (const reg of regions) {
          const cs = (reg && Array.isArray(reg.centres)) ? reg.centres : [];
          for (const c of cs) {
            n += 1;
            if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
            out.push({
              name: c.name, lat: c.lat, lng: c.lng, isNew: !!c.isNew,
              address: c.address || '', postal: c.postal || '',
              stalls: Number.isFinite(c.stalls) ? c.stalls : null,
              status: c.status || '', _num: n
            });
          }
        }
        return { centres: out };
      })
      .catch(() => ({ centres: [] }));
  }
  return hawkerPromise;
}
function hawkerTier(zoom) {
  if (zoom >= 17) return 'full';
  if (zoom >= 15) return 'short';
  if (zoom >= 13) return 'code';
  return 'dot';
}
function hawkerCode(num) { return 'H' + String(num == null ? 0 : num).padStart(2, '0'); }
function hawkerAbbrev(s) {
  return String(s || '')
    .replace(/\bRoad\b/gi, 'Rd').replace(/\bAvenue\b/gi, 'Ave')
    .replace(/\bStreet\b/gi, 'St').replace(/\bDrive\b/gi, 'Dr')
    .replace(/\bClose\b/gi, 'Cl');
}
function hawkerFacility(name) {
  const m = String(name || '').match(/(Market\s*(&|and)?\s*Food\s*Centre|Food\s*Centre|Hawker\s*Centre|Food\s*Court|Market|Complex|Centre)\b.*$/i);
  return m ? m[0].trim() : '';
}
function hawkerHead(name) {
  let s = String(name || '').trim().replace(/\s*[-–—]?\s*(Blk|Block)\b.*$/i, '');
  s = s.replace(/\s*(Market\s*(&|and)?\s*Food\s*Centre|Food\s*Centre|Hawker\s*Centre|Food\s*Court|Market|Complex|Centre)\b.*$/i, '').trim();
  return s || String(name || '');
}
function hawkerShort(name) {
  const words = hawkerHead(name).split(/\s+/).filter(Boolean).slice(0, 2).join(' ');
  return hawkerAbbrev(words || String(name || ''));
}
function hawkerDroplet(isNew) {
  const size = 22;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;width:' + size + 'px;height:' + size + 'px;flex:0 0 auto;';
  const el = document.createElement('div');
  el.style.cssText = 'width:' + size + 'px;height:' + size + 'px;border-radius:50% 50% 50% 0;'
    + 'transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 5px rgba(0,0,0,0.45);'
    + 'background:' + (isNew ? '#1e3a8a' : '#e53935') + ';';
  wrap.appendChild(el);
  if (isNew) {
    const badge = document.createElement('div');
    badge.textContent = 'NEW';
    badge.style.cssText = 'position:absolute;left:50%;bottom:calc(100% + 2px);transform:translateX(-50%);'
      + 'background:#1e3a8a;color:#fff;font-size:8px;font-weight:700;line-height:1;letter-spacing:0.5px;'
      + 'padding:2px 4px;border-radius:3px;white-space:nowrap;border:1px solid #fff;';
    wrap.appendChild(badge);
  }
  return wrap;
}
function hawkerTierNode(tier, info) {
  const isNew = !!(info && info.isNew);
  const code = hawkerCode(info && info.num);
  if (tier === 'dot') {
    const d = document.createElement('div');
    d.style.cssText = 'width:11px;height:11px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);'
      + 'background:' + (isNew ? '#1e3a8a' : '#e53935') + ';border:1.5px solid #fff;'
      + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:pointer;';
    return d;
  }
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;cursor:pointer;';
  wrap.appendChild(hawkerDroplet(isNew));
  const lab = document.createElement('div');
  lab.style.cssText = 'background:#fff;color:#111;border:1.5px solid ' + (isNew ? '#1e3a8a' : '#e53935') + ';'
    + 'border-radius:8px;padding:1px 6px;font-weight:700;font-size:11px;line-height:1.25;'
    + 'box-shadow:0 1px 3px rgba(0,0,0,0.3);';
  if (tier === 'short') {
    lab.style.whiteSpace = 'nowrap';
    lab.textContent = code + ' ' + ((info && info.short) || (info && info.head) || '');
  } else if (tier === 'full') {
    lab.style.whiteSpace = 'normal';
    lab.style.maxWidth = '130px';
    const l1 = document.createElement('div');
    l1.textContent = code + ' ' + ((info && info.head) || (info && info.name) || '');
    lab.appendChild(l1);
    if (info && info.facility) {
      const l2 = document.createElement('div');
      l2.textContent = info.facility;
      l2.style.cssText = 'font-weight:600;font-size:10px;opacity:0.75;';
      lab.appendChild(l2);
    }
  } else { // 'code'
    lab.style.whiteSpace = 'nowrap';
    lab.textContent = code;
  }
  wrap.appendChild(lab);
  return wrap;
}

// v0.61.24 — the Exit Template popup body: a line-coloured exit-code
// header, the station name, and a row of colour-coded station codes.
// The exit-code pill takes the station's primary line colour.
// v0.61.28 — plus a 🎡 line of nearby named attractions, when the
// exit feature carries them (geo-exits.json `nearby`).
function exitTemplateHtml({ exitCode, station, codes, nearby }) {
  const list = Array.isArray(codes) ? codes.filter(Boolean) : [];
  const hex = list.length ? codeHex(list[0]) : AMENITY_EXIT_BG;
  let h = '<div>' + codePill(scLabel('exit', _lang) + ' ' + (exitCode || '?'), hex, true) + '</div>';
  if (station) {
    h += '<div style="font-weight:600;margin-top:4px;">'
      + escapeHtml(scLabel('station', _lang, { name: station })) + '</div>';
  }
  if (list.length) {
    h += '<div style="margin-top:3px;display:flex;flex-wrap:wrap;gap:4px;">'
      + list.map((cd) => codePill(cd, codeHex(cd), false)).join('') + '</div>';
  }
  const near = Array.isArray(nearby) ? nearby.filter(Boolean) : [];
  if (near.length) {
    h += '<div style="margin-top:4px;color:' + infoPalette().sub + ';">🎡 '
      + near.map(escapeHtml).join(' · ') + '</div>';
  }
  return h;
}

// v0.61.17 — station records that serve `lineCode`, ordered by that
// line's running order (the numeric suffix of the matching code).
function stationsOnLine(stations, lineCode) {
  if (!Array.isArray(stations) || !lineCode) return [];
  const rows = [];
  for (const s of stations) {
    let best = null;
    for (const c of (Array.isArray(s.codes) ? s.codes : [])) {
      const pc = parseCode(c);
      if (!pc || PREFIX_TO_LINE[pc.prefix] !== lineCode) continue;
      if (!best || pc.num < best.num) best = pc;
    }
    if (best) rows.push({ s, num: best.num });
  }
  rows.sort((a, b) => a.num - b.num);
  return rows.map((r) => r.s);
}

// v0.61.58 — CR5 v2: the sub-path of `pts` between the vertices
// nearest to point A and point B — used to light up the
// prev→current→next stretch of a line around a selected station.
function trackBetween(pts, aLat, aLng, bLat, bLng) {
  if (!Array.isArray(pts) || pts.length < 2) return [];
  const nearestIdx = (lat, lng) => {
    let bi = -1;
    let bd = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = metresBetween(lat, lng, pts[i].lat, pts[i].lng);
      if (d < bd) { bd = d; bi = i; }
    }
    return bi;
  };
  let i = nearestIdx(aLat, aLng);
  let j = nearestIdx(bLat, bLng);
  if (i < 0 || j < 0) return [];
  if (i > j) { const t = i; i = j; j = t; }
  return pts.slice(i, j + 1);
}

// Module-level fetch caches — each runs once per page.
let overlaysPromise = null;
function fetchOverlays() {
  if (!overlaysPromise) {
    overlaysPromise = fetch('/api/geo/overlays')
      .then((r) => r.json())
      .catch(() => ({ parks: [], attractions: [], taxis: [], exits: [], clinics: [], police: [], hospitals: [] }));
  }
  return overlaysPromise;
}
let carparkPromise = null;
function fetchCarpark() {
  if (!carparkPromise) {
    carparkPromise = fetch('/api/geo/carpark')
      .then((r) => r.json())
      .catch(() => ({ carparks: [] }));
  }
  return carparkPromise;
}

// v0.61.42 — the full LTA bus-stop catalogue for the Bus Stop overlay
// layer; fetched once, then radius-clipped to the map anchor.
let busStopsPromise = null;
function fetchBusStops() {
  if (!busStopsPromise) {
    busStopsPromise = fetch('/api/geo/bus-stops')
      .then((r) => r.json())
      .catch(() => ({ busstops: [] }));
  }
  return busStopsPromise;
}
let linePathsPromise = null;
function fetchLinePaths() {
  if (!linePathsPromise) {
    linePathsPromise = fetch('/api/transport/line-paths')
      .then((r) => r.json())
      .catch(() => ({ paths: null }));
  }
  return linePathsPromise;
}
let stationsPromise = null;
function fetchStations() {
  if (!stationsPromise) {
    stationsPromise = fetch('/api/transport/stations')
      .then((r) => r.json())
      .catch(() => ({ stations: [] }));
  }
  return stationsPromise;
}

// v0.61.57 — CR6 Phase 3: the per-station info dataset (data/stations.json,
// keyed by station name) backing the station info card.
let stationInfoPromise = null;
function fetchStationInfo() {
  if (!stationInfoPromise) {
    stationInfoPromise = fetch('/api/geo/stations')
      .then((r) => r.json())
      .catch(() => ({ stations: {} }));
  }
  return stationInfoPromise;
}

// v0.61.17 — a small text-label marker for a station amenity (an exit
// letter/number, a bus-stop code, "Taxi" / "Pick-up", or a 🅿️ glyph).
// v0.61.19 — `clickable` flips the cursor for the tappable bus pins.
// v0.61.20 — exported for the shared attachAmenityPins helper.
export function amenityLabelNode(label, bg, fg, clickable) {
  const el = document.createElement('div');
  el.textContent = label;
  el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:8px;'
    + 'background:' + bg + ';color:' + fg + ';font-size:12px;font-weight:700;'
    + 'line-height:1.5;white-space:nowrap;border:1.5px solid #fff;'
    + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:' + (clickable ? 'pointer' : 'default') + ';';
  return el;
}

// v0.61.85 — shared white-pill base + code-chip loop for the station
// markers. stationCodeNode (chips only) and stationPillNode (chips +
// name) both build on these so an interchange shows each line's colour.
// v0.61.90 — `scale` (default 1) shrinks the pill for the lower zoom
// tiers: gap / padding / font-size all scale, so a code chip reads
// progressively smaller as the map zooms out.
function stationPillBase(scale) {
  const s = scale || 1;
  const el = document.createElement('div');
  el.style.cssText = 'display:inline-flex;align-items:center;gap:' + (3 * s) + 'px;'
    + 'padding:' + s + 'px ' + (5 * s) + 'px;border-radius:8px;background:#fff;'
    + 'font-size:' + (12 * s) + 'px;font-weight:700;line-height:1.5;white-space:nowrap;'
    + 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);cursor:pointer;';
  return el;
}
function appendCodeChips(el, codes, fallbackHex) {
  for (const code of (Array.isArray(codes) ? codes : [])) {
    if (!code) continue;
    const chip = document.createElement('span');
    chip.textContent = code;
    chip.style.cssText = 'display:inline-block;padding:0 4px;border-radius:5px;'
      + 'background:' + (codeHex(code) || fallbackHex || '#888888') + ';color:#fff;';
    el.appendChild(chip);
  }
}

// v0.61.85 — CR-2 station marker: one line-coloured chip per station
// code, no name. v0.61.87 — the default train-station marker, shown
// below ZOOM_DETAIL_THRESHOLD; expands to the full named pill above it.
// v0.61.90 — `scale` shrinks the chip for the lower zoom tiers.
export function stationCodeNode(codes, fallbackHex, scale) {
  const el = stationPillBase(scale);
  appendCodeChips(el, codes, fallbackHex);
  return el;
}

// v0.61.90 — small line-coloured square station marker. Re-introduced
// for the low-zoom tiers of the per-TMA train overlay (operator zoom-
// tier spec): below the chip bands, and for stations beyond a tier's
// nearest-N cap. `small` is the compact form (below z12 and the capped
// remainder at z12/z13); the larger form is the z14 Cuisine remainder.
function squareStationNode(hex, small) {
  const el = document.createElement('div');
  const sz = small ? 7 : 11;
  el.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;border-radius:2px;'
    + 'cursor:pointer;background:' + (hex || '#888888') + ';'
    + 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);';
  return el;
}

// v0.61.65 — labelled station marker: one line-coloured chip per
// station code (e.g. CC4 orange · DT15 blue) on a white pill, then
// "<Name> station". Replaces the single-colour amenityLabelNode label
// so an interchange shows each line's own colour.
export function stationPillNode(codes, name, fallbackHex) {
  const el = stationPillBase();
  appendCodeChips(el, codes, fallbackHex);
  const nm = document.createElement('span');
  const nice = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  nm.textContent = (nice + ' station').trim();
  nm.style.cssText = 'color:#1c1c1f;';
  el.appendChild(nm);
  return el;
}

// v0.61.70 — bus-stop pin: a white rounded-rect like the MRT-exit pins.
// Compact form (zoomed out) is just 🚏; zoomed in it expands to
// 🚏 Bus Stop № <code>. White background per operator standardization.
function busPinNode(code, full) {
  return amenityLabelNode(
    full ? '🚏 ' + scLabel('busStopNo', _lang, { code }) : '🚏', '#FFFFFF', '#1c1c1f', true);
}

// v0.61.102 — operator: the bus-stop overlay marker renders by zoom
// tier — "🚏 Bus Stop № <code>" (z17+), "🚏 № <code>" (z15-16), the
// "🚏" glyph (z13-14, smaller at z11-12), and a light-yellow square
// with a red "b" (z<=10); each tier a touch smaller than the one above.
function busTier(zoom) {
  if (zoom >= 17) return 'full';
  if (zoom >= 16) return 'short';
  if (zoom >= 15) return 'glyph';
  if (zoom >= 14) return 'glyph-lg';   // v0.61.104 — z14 one size larger
  if (zoom >= 13) return 'glyph';
  if (zoom >= 11) return 'glyph-sm';
  return 'square';
}
function busTierNode(tier, code) {
  const el = document.createElement('div');
  if (tier === 'full' || tier === 'short') {
    el.textContent = tier === 'full'
      ? '🚏 ' + scLabel('busStopNo', _lang, { code: code || '' })
      : '🚏 № ' + (code || '');
    el.style.cssText = 'display:inline-block;padding:1px 5px;border-radius:8px;'
      + 'background:#FFFFFF;color:#1c1c1f;white-space:nowrap;font-weight:700;'
      + 'line-height:1.5;border:1.5px solid #fff;cursor:pointer;'
      + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);'
      + 'font-size:' + (tier === 'full' ? 11 : 10) + 'px;';
  } else if (tier === 'glyph' || tier === 'glyph-sm' || tier === 'glyph-lg') {
    el.textContent = '🚏';
    el.style.cssText = 'cursor:pointer;line-height:1;font-size:'
      + (tier === 'glyph-lg' ? 18 : tier === 'glyph' ? 16 : 14) + 'px;';
  } else {
    el.textContent = 'b';
    el.style.cssText = 'width:12px;height:12px;display:flex;align-items:center;'
      + 'justify-content:center;background:#FFF59D;color:#D32F2F;font-weight:800;'
      + 'font-size:9px;line-height:1;cursor:pointer;border:1px solid #fff;'
      + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);';
  }
  return el;
}

// v0.61.82 — CR-5: compact zoomed-out exit marker. A low-chrome text
// node carrying only the alphanumeric exit identifier (e.g. "A", "12");
// a white halo keeps it legible over the greyscale base map. Above the
// detail zoom threshold the marker swaps to the full white
// `Exit <code>` card (amenityLabelNode) — see buildExitMarkers.
function exitTextNode(id, hex) {
  const el = document.createElement('div');
  el.textContent = id || '?';
  el.style.cssText = 'cursor:pointer;font-weight:800;font-size:13px;'
    + 'line-height:1;color:' + (hex || AMENITY_EXIT_BG) + ';'
    + 'text-shadow:0 0 2px #fff,0 0 2px #fff,0 0 2px #fff;';
  return el;
}

// Small coloured dot with an emoji glyph.
function dotNode(bg, glyph, size) {
  // v0.61.105 — `size` (px) sizes the dot for the carpark zoom ladder;
  // buildMarkers passes the feature object as the 3rd arg, so only a
  // number counts — anything else falls back to the default 20 px.
  // v0.61.118 — glyph rendered in white so character glyphs (⚝ for
  // attractions) are legible on the dark-purple dot; emoji glyphs (🅿,
  // 🌳, 👮, 🏥, 💊) ignore CSS `color` and keep their own palette.
  const sz = (typeof size === 'number' && size > 0) ? size : 20;
  const el = document.createElement('div');
  el.style.cssText =
    'display:flex;align-items:center;justify-content:center;' +
    'width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;cursor:pointer;' +
    'border:2px solid #1c1c1f;box-shadow:0 1px 3px rgba(0,0,0,0.4);' +
    'background:' + bg + ';';
  const ic = document.createElement('span');
  ic.textContent = glyph;
  ic.style.cssText = 'font-size:' + Math.round(sz * 0.62) + 'px;line-height:1;color:#fff;';
  el.appendChild(ic);
  return el;
}

// v0.61.105 — operator: the carpark overlay marker shrinks two sizes
// (a "size" is 2 px) per zoom level below z17, and two more on overlap.
function carparkSize(zoom) {
  if (zoom >= 17) return 22;
  if (zoom >= 16) return 18;
  if (zoom >= 15) return 14;
  return 10;
}

// v0.61.97 — marker content for a resolved amenity tier (see
// amenityTier): 'dot' a tiny coloured dot for the low-zoom band,
// 'glyph' the ~20 px icon dot, 'label' the icon + name pill.
function amenityNode(tier, bg, glyph, name) {
  if (tier === 'label' && name) {
    return amenityLabelNode(((glyph || '') + ' ' + name).trim(),
      '#ffffff', '#1c1c1f', true);
  }
  if (tier === 'glyph' || tier === 'label') {
    return dotNode(bg, glyph);
  }
  // 'dot' — a tiny coloured dot for the z<12 band.
  const el = document.createElement('div');
  el.style.cssText = 'width:9px;height:9px;border-radius:50%;cursor:pointer;'
    + 'background:' + (bg || '#888888') + ';border:1.5px solid #fff;'
    + 'box-shadow:0 0 0 0.5px rgba(0,0,0,0.45);';
  return el;
}

// v0.61.86 — attraction pin: an off-white rounded label carrying the
// ⚝ glyph + the attraction name (was a 20 px 📌 dot). 28 px tall, so
// it reads as a named place rather than an anonymous dot. Used via
// buildMarkers' `makeNode` hook, which passes the feature `f`.
function attractionLabelNode(bg, glyph, f) {
  const el = document.createElement('div');
  el.textContent = ((glyph || '⚝') + ' ' + ((f && f.name) || '')).trim();
  el.style.cssText = 'display:inline-flex;align-items:center;height:28px;'
    + 'padding:0 8px;border-radius:8px;cursor:pointer;white-space:nowrap;'
    + 'background:' + (bg || '#f4f3ef') + ';color:#1c1c1f;'
    + 'font-size:13px;font-weight:700;line-height:1;'
    + 'border:1.5px solid #fff;box-shadow:0 0 0 0.5px rgba(0,0,0,0.4);';
  return el;
}

// v0.61.116 — cluster label pill. Used by applyClusterAndDrop on the
// Attractions / Carpark layers when a 40 px screen-tile contains at
// least the per-layer threshold (Attractions ≥ 8, Carpark ≥ 5;
// Carpark below z15 is force-clustered so even singletons render as a
// cluster pill per operator UI/UX spec answer 4 "fully clustered below
// z15"). Shares the white-pill styling with amenityLabelNode so the
// cluster element reads as one of the existing label tiers.
function clusterLabelNode(text) {
  return amenityLabelNode(text, '#ffffff', '#1c1c1f', true);
}

// v0.61.116 — screen-space rectangle-overlap test in metres. Used by
// the source-order drop cascade (operator spec answer 2 "Source-order
// first-in wins"): each candidate marker tests its footprint against
// every already-placed footprint, falling back label → icon → drop on
// collision. aLat/aLng — candidate; aW/aH — candidate footprint px;
// b — { lat, lng, w, h } already-placed; mpp — metres-per-pixel at
// the current zoom. Pads 4 px on each axis to keep adjacent items
// from kissing.
function footprintOverlap(aLat, aLng, aW, aH, b, mpp) {
  const dx = Math.abs(aLng - b.lng) * 111320 * 0.99973 / mpp;
  const dy = Math.abs(aLat - b.lat) * 110574 / mpp;
  return dx < (aW + b.w) / 2 + 4 && dy < (aH + b.h) / 2 + 4;
}

// v0.61.41 — rectangular pin tag: bold white text on a solid-colour
// rectangle with a white outline (the clinic "+" marker). A square-
// cornered alternative to the round dotNode.
function rectPinNode(bg, text) {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = 'display:flex;align-items:center;justify-content:center;'
    + 'min-width:18px;height:18px;padding:0 3px;border-radius:2px;cursor:pointer;'
    + 'background:' + bg + ';color:#fff;font-weight:700;font-size:15px;'
    + 'line-height:1;border:1.5px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.4);';
  return el;
}

// v0.61.41 — shared palette for the in-map quick-toggle buttons (the
// MapControls pills + the Colour nav button).
// v0.61.70 — ON = Singapore blue; OFF = white, matching the white
// navigation-button background. Theme-independent, like the nav
// buttons themselves. (Was the CR7 amber-on / theme-aware palette.)
// v0.62.615 — giaToggleStyle moved to web/_shared/lib/gia-toggle-style.js (was
// byte-identical in cuisine/hawker/transport mapOverlays.js). Re-exported here so
// existing importers (MapControls) keep the same import path.
import { scLabel, dayLabel, dirLabel } from '../../../_shared/lib/station-card-labels.js';
import { lineName } from '../../../_shared/lib/mrt-lines-i18n.generated.js';
import { secondLine } from '../../../_shared/lib/name-second-line.js';
export { giaToggleStyle } from '../../../_shared/lib/gia-toggle-style.js';

// v0.61.22 — popup colour palette.
// v0.61.47 — fixed, theme-independent palette (operator request). The
// card used to follow the Telegram light/dark theme, but a dark card
// washed out in bright sunshine and the hyperlink read poorly. A single
// high-contrast light scheme — white card, near-black text, a strong
// underlined blue link — stays legible regardless of light/dark mode or
// outdoor glare.
export function infoPalette() {
  return { bg: '#ffffff', fg: '#1c1c1f', sub: '#3c3c40', link: '#1558d6', good: '#2e7d32' };
}

// v0.61.38 — greyscale the base map, leaving the DOM overlay markers
// (AdvancedMarkerElement pins) in colour. Injects a one-time stylesheet;
// adding the `.gia-greyscale-map` class to a map container desaturates
// its base layer. The rule re-matches automatically when Google
// recreates the base elements on zoom/pan.
// v0.61.45 — the rule targets both `canvas` (vector / WebGL base map,
// e.g. the Transport + Hawker TMAs) AND `img` (raster tile base map,
// e.g. the Cuisine TMA) so it works whichever rendering mode Google
// hands the map. Marker pins are plain <div>/<span> nodes, so neither
// selector touches them.
export function ensureGreyscaleStyle() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('gia-greyscale-style')) return;
  const st = document.createElement('style');
  st.id = 'gia-greyscale-style';
  // v0.61.66 — plus the gia-pin-flash keyframes: a transient pulse used
  // to draw the eye to a bus-stop pin after a station-card tap.
  st.textContent = '.gia-greyscale-map canvas,.gia-greyscale-map img'
    + '{filter:grayscale(1) contrast(0.8) brightness(0.96)!important}'
    + '@keyframes gia-pin-flash{0%,100%{opacity:1;transform:scale(1)}'
    + '50%{opacity:0.35;transform:scale(1.7)}}'
    // v0.61.90 — shrink Google's camera (pan/tilt/rotate) widget 30%
    // (operator request). Targets the tilt button's container; scales
    // from the bottom-left so it stays pinned in the LEFT_BOTTOM corner.
    + '.gm-style div:has(>button[aria-label*="ilt" i])'
    + '{transform:scale(0.7);transform-origin:0 100%}'
    // v0.61.92 — operator: strip Google's "Keyboard shortcuts" hint and
    // the "Map data / Terms" attribution; keep only the Google logo,
    // shrunk much smaller. The Maps Platform ToS keeps the logo itself
    // visible — `.gm-style-cc` (the © / Terms text) is what's hidden.
    + '.gm-style-cc{display:none!important}'
    + '.gm-style button[aria-label*="eyboard" i]{display:none!important}'
    + '.gm-style img[alt="Google"]{transform:scale(0.4);transform-origin:0 100%}';
  document.head.appendChild(st);
}

// v0.61.95 — operator part 5: the train lines must stay coloured when
// monochrome mode is on. The monochrome filter greyscales the map
// canvas, and on the WebGL-rendered TMA maps (Hawker / Transport) the
// line polylines composite into that canvas — so they grey out with
// it. The fix is a coloured copy of the lines that lives in the DOM,
// outside the filtered canvas: this OverlayView draws each line
// segment as an SVG <path> in the map's overlay pane. It is purely
// decorative (pointer-events:none) — the underlying google.maps
// Polylines stay in place and keep handling clicks + opacity tiers —
// and is attached only while monochrome is active. Built lazily via a
// factory because google.maps.OverlayView is not defined until the
// Maps script has loaded. `segments` items: { hex, pts:[{lat,lng}],
// weight, opacity }.
export function makeTrainColourOverlay(googleMaps) {
  const SVGNS = 'http://www.w3.org/2000/svg';
  class TrainColourOverlay extends googleMaps.OverlayView {
    constructor() {
      super();
      this._segments = [];
      this._div = null;
      this._svg = null;
    }
    onAdd() {
      const div = document.createElement('div');
      div.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;'
        + 'pointer-events:none;';
      const svg = document.createElementNS(SVGNS, 'svg');
      svg.style.cssText = 'position:absolute;left:0;top:0;overflow:visible;';
      div.appendChild(svg);
      this._div = div;
      this._svg = svg;
      // overlayLayer pane: above the base map, below the marker pins.
      const panes = this.getPanes();
      if (panes && panes.overlayLayer) panes.overlayLayer.appendChild(div);
    }
    draw() {
      const svg = this._svg;
      const proj = this.getProjection();
      if (!svg || !proj) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      for (const seg of this._segments) {
        const pts = (seg && seg.pts) || [];
        if (pts.length < 2) continue;
        let d = '';
        for (let i = 0; i < pts.length; i++) {
          const px = proj.fromLatLngToDivPixel(
            new googleMaps.LatLng(pts[i].lat, pts[i].lng));
          if (!px) continue;
          d += (d ? 'L' : 'M') + px.x.toFixed(1) + ' ' + px.y.toFixed(1);
        }
        if (!d) continue;
        const path = document.createElementNS(SVGNS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', seg.hex || '#888888');
        path.setAttribute('stroke-width', String(seg.weight || 4));
        path.setAttribute('stroke-opacity', String(seg.opacity == null ? 1 : seg.opacity));
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
      }
    }
    onRemove() {
      if (this._div && this._div.parentNode) this._div.parentNode.removeChild(this._div);
      this._div = null;
      this._svg = null;
    }
    setSegments(segs) {
      this._segments = Array.isArray(segs) ? segs : [];
      this.draw();
    }
  }
  return new TrainColourOverlay();
}

// v0.61.31 — standard Google-Maps deep link. Every map pin info popup
// ends with this text hyperlink — a TMA-wide convention, never a button.
// v0.62.886 — module-scoped reader locale. The controller's setLang() writes
// it. It lives at module scope rather than in the controller closure because
// gmapsLinkRow and exitTemplateHtml are module-level helpers invoked from info
// cards that never see the controller. Each app bundles its own copy of this
// module and creates one controller, so there is exactly one writer.
let _lang = 'en';
export function setOverlayLang(l) { _lang = l || 'en'; }
function gmapsUrl(lat, lng) {
  return 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;
}
function gmapsLinkRow(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
  return '<div style="margin-top:4px;"><a href="' + escapeHtml(gmapsUrl(lat, lng))
    + '" target="_blank" rel="noopener" style="color:' + infoPalette().link
    + ';font-weight:600;text-decoration:underline;">'
    + escapeHtml(scLabel('googleMap', _lang)) + '</a></div>';
}

// v0.61.18 — rounded popup card so content reads on the light Google
// map. v0.61.22 — theme-aware (infoPalette) + an in-card ✕ that calls
// the host TMA's window.__giaMapInfoClose. Exported so every TMA's
// popups share one look. v0.61.31 — pass `gmaps` ({lat,lng}) to append
// the standard "Google Map ↗" link row.
export function infoCard(inner, gmaps) {
  const c = infoPalette();
  const tail = gmaps ? gmapsLinkRow(gmaps.lat, gmaps.lng) : '';
  // v0.62.129 — operator: the map pop-up card is SKEUOMORPHIC (not liquid glass)
  // — a raised, beveled card (gradient + drop shadow + inset highlight + border).
  return '<div style="position:relative;'
    + 'background:linear-gradient(180deg,' + c.bg + ',color-mix(in srgb,' + c.bg + ' 86%,#000 14%));'
    + 'border-radius:14px;padding:9px 30px 9px 12px;color:' + c.fg + ';'
    + 'border:1px solid color-mix(in srgb,' + c.fg + ' 20%,transparent);'
    + 'box-shadow:0 6px 16px rgba(0,0,0,0.30),0 1px 0 rgba(0,0,0,0.10),inset 0 1px 0 rgba(255,255,255,0.85);'
    + 'font-size:13px;font-weight:500;line-height:1.5;max-width:248px;">'
    + '<span onclick="window.__giaMapInfoClose&&window.__giaMapInfoClose()" '
    + 'style="position:absolute;top:4px;right:6px;width:20px;height:20px;'
    + 'display:flex;align-items:center;justify-content:center;cursor:pointer;'
    + 'border-radius:50%;font-size:13px;font-weight:700;color:' + c.sub + ';">✕</span>'
    + inner + tail + '</div>';
}

// v0.61.57 — CR6 Phase 3: the station info card popup body.
// v0.61.60 — operator template redesign. Per line (stacked, divider
// between blocks for interchanges): a big station-code pill (white
// bold on the line colour) · "<Name> Station" bold in the line
// colour; the "<line_code> · <line_name>" line; a per-line "More Info"
// link. Then a station-level Exits list — "Exit # · <street?> · Bus
// Stop № <code>", each exit + bus stop a tappable map-focus link —
// then the operator(s) and a Google-Maps link. first/last train was
// dropped per the operator template. `exit.street` is optional: it
// renders only once exit street-name data is added to stations.json.
// v0.61.67 — CR6 Phase 2b: first/last-train rendering helpers. Direction
// keys → readable labels; timing-field day suffixes → readable labels.
// v0.62.886 — the two hardcoded English label tables that stood here are gone.
// They lived beside a function that took no `lang`, so a Spanish reader tapping
// a station got "Mon–Sat" and "Towards Expo" while the React StationCard beside
// it rendered "Lun–Sáb" and "Hacia Expo" from keys shipped since v0.62.837. The
// translations were never missing — this surface simply could not reach them.
// dirLabel/dayLabel keep the old title-cased English fallback for a bucket
// stations.json invents, so a new direction degrades to readable English.
// Collect "5:32am (Mon–Sat), 5:52am (Sun/PH)" for kind = 'first' | 'last'.
// The TIMES are verbatim operator strings and stay exactly as stations.json has
// them; only the day bucket in brackets is translated.
function fltTimes(timings, kind, lang) {
  const out = [];
  for (const [k, v] of Object.entries(timings || {})) {
    if (v == null || !k.startsWith(kind + '_')) continue;
    const day = k.slice(kind.length + 1);
    out.push(escapeHtml(String(v)) + ' (' + escapeHtml(dayLabel(day, lang)) + ')');
  }
  return out.join(', ');
}
// One line's first_last_train entries → a "🚆 First / Last Train" block,
// one row per direction. Verbatim source strings; null/terminal rows show
// their source note; an active service adjustment is surfaced once.
function firstLastTrainHtml(entries, c, lang) {
  if (!Array.isArray(entries) || !entries.length) return '';
  let h = '<div style="margin-top:5px;font-weight:700;color:' + c.fg
    + ';">🚆 ' + escapeHtml(scLabel('firstLastTrain', lang)) + '</div>';
  for (const e of entries) {
    const dir = dirLabel(e.direction, lang);
    const first = fltTimes(e.timings, 'first', lang);
    const last = fltTimes(e.timings, 'last', lang);
    let body;
    if (first || last) {
      const parts = [];
      if (first) parts.push(escapeHtml(scLabel('firstTrain', lang)) + ' ' + first);
      if (last) parts.push(escapeHtml(scLabel('lastTrain', lang)) + ' ' + last);
      body = parts.join(' · ');
    } else {
      body = escapeHtml(e.note || scLabel('noTimingData', lang));
    }
    h += '<div style="margin-top:2px;color:' + c.fg + ';"><span style="font-weight:600;">'
      + escapeHtml(dir) + '</span> — ' + body + '</div>';
  }
  // NOT TRANSLATED, DELIBERATELY. `service_adjustment` is LTA's own service
  // notice, carried word-for-word from data/stations.json by
  // scripts/build-station-info.js ("operator-supplied; verbatim source strings,
  // no invention"). Machine-translating a transit authority's notice is a
  // different act from filling an i18n key. Only the ⚠️ glyph is ours.
  const adj = entries.find((e) => e.service_adjustment);
  if (adj) {
    h += '<div style="margin-top:3px;color:' + c.sub + ';">⚠️ '
      + escapeHtml(adj.service_adjustment) + '</div>';
  }
  return h;
}

// v0.61.83 — CR-7: standardised station info card.
//   • Header — single line: code pill · "<Name> Station", then line
//     code/name. Interchange: a combined row of every line's code
//     pill, then "<Name> Station" once.
//   • Exits — station-level, label-sorted: a row of tappable "Exit X"
//     labels; tapping one toggles a detail row below it
//     (Exit # · <street> · Bus Stop № — Exit # and Bus Stop № are
//     map-focus links).
//   • Per-line detail block(s) — More Info ↗ + First/Last Train. An
//     interchange repeats each line's code pill · name · line above
//     its block; a single-line station already showed those up top.
//   • Footer — deduped Operator(s) + Google Map ↗.
function stationInfoCardHtml(rec, lang) {
  const c = infoPalette();
  const rule = 'border-top:1px solid rgba(0,0,0,0.12);margin-top:8px;padding-top:7px;';
  const lk = 'color:' + c.link + ';font-weight:600;text-decoration:underline;cursor:pointer;';
  const focus = (lat, lng, flash) => 'window.__giaStationFocus&&window.__giaStationFocus('
    + Number(lat) + ',' + Number(lng) + (flash ? ',1' : '') + ')';
  const name = rec.station_name || '';
  const lines = Array.isArray(rec.lines) ? rec.lines : [];
  const interchange = lines.length > 1;
  let h = '';

  // codePill(s) · "<Name> Station" header row, the name in `nameHex`.
  const headRow = (pills, nameHex) =>
    '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">'
    + pills
    + '<span style="color:' + c.sub + ';">·</span>'
    + '<span style="font-weight:700;font-size:14px;color:' + nameHex + ';">'
    + escapeHtml(scLabel('station', lang, { name })) + '</span></div>';
  // v0.62.890 — this row localised NOTHING while every label around it did
  // (scLabel, dirLabel, dayLabel all take `lang`). It was the outlier, and the
  // operator saw it: an English line name inside an otherwise Korean popup. Like
  // the station card's line rows it reads data/stations.json's baked English
  // `line_name`, so the code has to be looked up before a locale can apply.
  const lineRow = (ln) => {
    const english = ln.line_name || '';
    const primary = english ? lineName(ln.line_code, english, lang) : '';
    const sl = english ? secondLine({ primary, english, code: ln.line_code, lang }) : null;
    return '<div style="margin-top:3px;color:' + c.fg + ';">'
      + escapeHtml((ln.line_code || '') + ' · ' + primary)
      + (sl ? '<br><small style="opacity:.75">' + escapeHtml(sl.text) + '</small>' : '')
      + '</div>';
  };

  // 1. Header — combined code pills for an interchange, a single pill +
  //    line code/name otherwise.
  if (interchange) {
    let pills = '';
    for (const ln of lines) {
      if (ln.station_code) pills += codePill(ln.station_code, codeHex(ln.station_code), true);
    }
    h += '<div>' + headRow(pills, c.fg) + '</div>';
  } else {
    const ln = lines[0] || {};
    const hex = ln.station_code ? codeHex(ln.station_code) : '#888888';
    h += '<div>' + headRow(ln.station_code ? codePill(ln.station_code, hex, true) : '', hex)
      + lineRow(ln) + '</div>';
  }

  // 2. Exits — station-level, label-sorted, click-to-expand detail.
  const exits = (Array.isArray(rec.exits) ? rec.exits.slice() : [])
    .sort((a, b) => String(a.label || '').localeCompare(
      String(b.label || ''), undefined, { numeric: true }));
  if (exits.length) {
    h += '<div style="' + rule + '"><div style="font-weight:700;">'
      + escapeHtml(scLabel('exits', lang)) + '</div>';
    const labels = [];
    let details = '';
    exits.forEach((ex, i) => {
      const did = 'gia-exit-' + i;
      const exTxt = escapeHtml(scLabel('exit', lang)) + ' ' + escapeHtml(ex.label || '?');
      // Label — tapping it toggles its detail row's visibility.
      const toggle = "var d=document.getElementById('" + did + "');"
        + "if(d)d.style.display=d.style.display==='none'?'block':'none';";
      labels.push('<span style="' + lk + '" onclick="' + toggle + '">' + exTxt + '</span>');
      // Detail row — collapsed by default; Exit # + Bus Stop № are
      // map-focus links (pan + flash the pin).
      const dp = [];
      dp.push((Number.isFinite(ex.lat) && Number.isFinite(ex.lng))
        ? '<span style="' + lk + '" onclick="' + focus(ex.lat, ex.lng, true) + '">' + exTxt + '</span>'
        : '<span style="font-weight:700;">' + exTxt + '</span>');
      if (ex.street) {
        dp.push('<span style="font-weight:700;color:' + c.fg + ';">'
          + escapeHtml(ex.street) + '</span>');
      }
      const bs = ex.nearest_bus_stop;
      if (bs && bs.code && Number.isFinite(bs.lat) && Number.isFinite(bs.lng)) {
        dp.push('<span style="' + lk + '" onclick="' + focus(bs.lat, bs.lng, true)
          + '">' + escapeHtml(scLabel('busStopNo', lang, { code: bs.code })) + '</span>');
      }
      details += '<div id="' + did + '" style="display:none;margin-top:4px;'
        + 'padding-left:8px;">' + dp.join(' · ') + '</div>';
    });
    h += '<div style="margin-top:4px;">' + labels.join(' · ') + '</div>' + details + '</div>';
  }

  // 3. Per-line detail block(s) — More Info ↗ + First/Last Train.
  const lineDetail = (ln, withHead) => {
    let b = '';
    if (withHead) {
      const hex = ln.station_code ? codeHex(ln.station_code) : '#888888';
      b += headRow(ln.station_code ? codePill(ln.station_code, hex, true) : '', hex)
        + lineRow(ln);
    }
    if (ln.more_info_url) {
      b += '<div style="margin-top:3px;"><a href="' + escapeHtml(ln.more_info_url)
        + '" target="_blank" rel="noopener" style="' + lk + '">'
        + escapeHtml(scLabel('moreInfo', lang)) + '</a></div>';
    }
    // v0.61.67 — CR6 Phase 2b: this line's first/last-train timings.
    b += firstLastTrainHtml(
      (Array.isArray(rec.first_last_train) ? rec.first_last_train : [])
        .filter((e) => e.line_code === (ln.line_code || '')), c, lang);
    return b;
  };
  if (interchange) {
    for (const ln of lines) {
      h += '<div style="' + rule + '">' + lineDetail(ln, true) + '</div>';
    }
  } else if (lines.length) {
    const d = lineDetail(lines[0], false);
    if (d) h += '<div style="' + rule + '">' + d + '</div>';
  }

  // 4. Operator(s) + Google Maps — station-level footer.
  const ops = [];
  for (const ln of lines) {
    if (ln.operator && ops.indexOf(ln.operator) < 0) ops.push(ln.operator);
  }
  h += '<div style="' + rule + '">';
  if (ops.length) {
    // The label translates; `ops` are company names (SBS Transit, SMRT) and do not.
    h += '<div style="color:' + c.sub + ';">' + escapeHtml(scLabel('operator', lang))
      + ': ' + escapeHtml(ops.join(' · ')) + '</div>';
  }
  if (Number.isFinite(rec.lat) && Number.isFinite(rec.lng)) {
    h += '<div style="margin-top:3px;"><a href="' + escapeHtml(gmapsUrl(rec.lat, rec.lng))
      + '" target="_blank" rel="noopener" style="' + lk + '">'
      + escapeHtml(scLabel('googleMap', lang)) + '</a></div>';
  }
  h += '</div>';

  return infoCard(h);
}

// v0.61.19 — bucket live bus arrivals into ≤5 / ≤10 / ≤20 / 20+ min and
// render each bucket as a service-number list.
function busArrivalRows(services) {
  const buckets = [
    { max: 5, label: '≤5 min', svcs: [] },
    { max: 10, label: '≤10 min', svcs: [] },
    { max: 20, label: '≤20 min', svcs: [] },
    { max: Infinity, label: '20+ min', svcs: [] }
  ];
  for (const s of (Array.isArray(services) ? services : [])) {
    const m = s && s.next && Number.isFinite(s.next.minutes) ? s.next.minutes : null;
    if (m == null) continue;
    const b = buckets.find((x) => m <= x.max);
    if (b) b.svcs.push(String(s.service || ''));
  }
  let h = '';
  for (const b of buckets) {
    if (!b.svcs.length) continue;
    h += '<div style="margin-top:5px;color:#1c1c1f;font-weight:600;">- '
      + b.label + ' ‧ Bus № ' + escapeHtml(b.svcs.join(', ')) + '</div>';
  }
  return h;
}

// v0.61.64 — bus-stop popup: road name, "Bus Stop №" code, bucketed live
// arrivals (timing label leads each row), then a Google-Maps link. Text is
// dark (#1c1c1f) + bold so it reads on the white card.
function busInfoHtml(b, services) {
  const c = infoPalette();
  const road = b.roadName || b.description || ('Stop ' + b.code);
  let h = '<div style="color:' + c.fg + ';font-weight:700;">🚏 ' + escapeHtml(road) + '</div>';
  h += '<div style="color:' + c.fg + ';font-weight:600;margin-top:2px;">🚏 '
    + escapeHtml(scLabel('busStopNo', _lang, { code: b.code })) + '</div>';
  if (services == null) {
    h += '<div style="color:' + c.fg + ';margin-top:5px;">Loading arrivals…</div>';
  } else if (!services.length) {
    h += '<div style="color:' + c.fg + ';margin-top:5px;">No live arrivals</div>';
  } else {
    h += '<div style="margin-top:3px;">' + busArrivalRows(services) + '</div>';
  }
  if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
    h += '<div style="margin-top:8px;"><a href="' + escapeHtml(gmapsUrl(b.lat, b.lng))
      + '" target="_blank" rel="noopener" style="color:' + c.link
      + ';font-weight:600;text-decoration:underline;">Google Map ➚</a></div>';
  }
  return infoCard(h);
}

// v0.61.19 — open the bus-stop popup, then fetch live arrivals from
// /api/transport/bus-arrival and refresh the open bubble. v0.61.20 —
// module-level; map + infoWindow are passed in (was a closure).
function openBusInfo(map, infoWindow, b, marker) {
  infoWindow.setContent(busInfoHtml(b, null));
  infoWindow.open(map, marker);
  fetch('/api/transport/bus-arrival?code=' + encodeURIComponent(b.code))
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d) return;
      infoWindow.setContent(busInfoHtml(b, Array.isArray(d.services) ? d.services : []));
    })
    .catch(() => { infoWindow.setContent(busInfoHtml(b, [])); });
}

// v0.61.20 — draw clickable amenity pins (station exits / bus stops /
// taxi stands / carparks / nearest MRT station) around a point, from a
// /api/transport/station-context payload. Shared by the Hawker and
// Cuisine TMA maps. `limits` trims bus/carpark/taxi to the nearest few
// (the endpoint returns them distance-sorted). Returns the marker array
// for the caller to clear on the next tap / re-render.
export function attachAmenityPins({ maps, map, infoWindow, ctx, limits }) {
  const out = [];
  if (!maps || !map || !infoWindow || !ctx) return out;
  const c = infoPalette();
  const { AdvancedMarkerElement } = maps.marker;
  const lim = limits || {};
  const place = (lat, lng, node, onClick) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const m = new AdvancedMarkerElement({
      map, position: { lat, lng }, content: node, zIndex: 6, gmpClickable: true
    });
    m.addListener('click', () => onClick(m));
    out.push(m);
  };
  const openCard = (marker, html, lat, lng) => {
    infoWindow.setContent(infoCard(html, { lat, lng }));
    infoWindow.open(map, marker);
  };
  const stationName = ctx.station && ctx.station.name ? ctx.station.name : '';
  // v0.61.24 — exit pins are coloured by the station's line and tap
  // through to the same Exit Template as the overlay exits layer.
  const stationCodes = (ctx.station && Array.isArray(ctx.station.codes)) ? ctx.station.codes : [];
  const exitHex = stationCodes.length ? codeHex(stationCodes[0]) : AMENITY_EXIT_BG;
  for (const ex of (Array.isArray(ctx.exits) ? ctx.exits : [])) {
    const code = String(ex.exit || '').replace(/^exit\s*/i, '') || 'Exit';
    place(ex.lat, ex.lng, amenityLabelNode(code, exitHex, '#fff', true),
      (m) => openCard(m, exitTemplateHtml({ exitCode: code, station: stationName, codes: stationCodes }), ex.lat, ex.lng));
  }
  for (const b of (Array.isArray(ctx.busStops) ? ctx.busStops : []).slice(0, lim.bus || 3)) {
    if (!b || !b.code) continue;
    place(b.lat, b.lng, busPinNode(b.code, true),
      (m) => openBusInfo(map, infoWindow, b, m));
  }
  for (const x of (Array.isArray(ctx.taxis) ? ctx.taxis : [])
    // v0.61.99 — show every taxi feature near the station, including
    // generic "Taxi Stop" points (operator: no taxi pin showed in the
    // station-detail view; many features classify as kind:'stop').
    .filter((t) => !!t).slice(0, lim.taxi || 2)) {
    const pickup = x.kind === 'pickup';
    place(x.lat, x.lng, amenityLabelNode(pickup ? 'Pick-up' : 'Taxi', AMENITY_TAXI_BG, '#1c1c1f', true),
      (m) => openCard(m, '<div style="font-weight:600;">'
        + (pickup ? '🚕 Pick-up point' : '🚕 Taxi stand') + '</div>'
        + (x.name ? '<div style="color:' + c.sub + ';margin-top:2px;">'
          + escapeHtml(x.name) + '</div>' : ''), x.lat, x.lng));
  }
  for (const cp of (Array.isArray(ctx.carparks) ? ctx.carparks : []).slice(0, lim.carpark || 2)) {
    if (!cp) continue;
    place(cp.lat, cp.lng, amenityLabelNode('🅿️', AMENITY_CARPARK_BG, '#fff', true),
      (m) => openCard(m, '<div style="font-weight:600;">🅿️ '
        + escapeHtml(cp.name || 'Carpark') + '</div>'
        + (Number.isFinite(cp.availableLots)
          ? '<div style="color:' + c.sub + ';margin-top:2px;">'
            + cp.availableLots + ' lots available</div>' : ''), cp.lat, cp.lng));
  }
  // v0.61.85 — the short 🚉 station pill + popup was removed: the train
  // overlay's station markers already open the full CR-7 station card,
  // and the venue/centre-detail callers no longer want a station pin.
  return out;
}

export function createOverlayController(map, googleMaps, opts) {
  // v0.61.90 — the host TMA ('cuisine' | 'hawker' | 'transport') drives
  // the per-TMA train-overlay zoom tiers (trainTier). Defaults to the
  // Transport behaviour when not supplied.
  const tma = (opts && opts.tma) || 'transport';
  const { Polygon, Polyline, InfoWindow } = googleMaps;
  const { AdvancedMarkerElement } = googleMaps.marker;
  // v0.61.22 — headerDisabled drops Google's own white header + ✕ so
  // the themed infoCard (with its own in-card ✕) is the whole popup.
  const info = new InfoWindow({ disableAutoPan: true, headerDisabled: true });
  // v0.61.22 — tapping empty map dismisses the overlay popup.
  // v0.61.91 — if a station is in detail mode (its marker forced to the
  // full pill), a tap-out also reverts it to its zoom-tier marker.
  map.addListener('click', () => {
    if (detailStation) exitStationDetail();
    else info.close();
  });
  // v0.61.53 — re-apply the train layer on every zoom change so station
  // markers + line opacity track the active zoom tier (v0.61.90
  // trainTier — square / code chip / named pill bands).
  // v0.61.82 — CR-5: also re-apply the exits layer so exit pins swap
  // bare-identifier ↔ "Exit <code>" card at the same threshold.
  map.addListener('zoom_changed', () => {
    if (layers.train) applyVisibility('train');
    if (layers.busstop) applyVisibility('busstop');
    if (layers.exits) applyVisibility('exits');
    // v0.61.97 — the amenity layers re-tier on zoom (dot / glyph /
    // label) — see amenityTier.
    for (const n of ['attractions', 'clinics', 'police', 'hospitals', 'parks', 'carpark']) {
      if (layers[n]) applyVisibility(n);
    }
  });
  // v0.61.92 — re-apply the train layer on pan-end too: "results in
  // focus" (the anchor inside the viewport) flips as the user pans,
  // which changes the Cuisine z12-14 zoom tier.
  map.addListener('idle', () => {
    if (layers.train && layers.train.visible) applyVisibility('train');
  });
  // name -> { kind:'polygon'|'marker'|'line', items, visible, radius }
  //   marker items: { marker, lat, lng }
  //   line   items: { polyline, pts:[{lat,lng}] }
  const layers = Object.create(null);
  let destroyed = false;
  // v0.62.886 — the reader's locale. Set through setLang() rather than opts
  // because all three call sites create the controller in a mount-once effect
  // with [] deps: anything passed at init would freeze at first render and the
  // popup would keep speaking whatever language the app booted in.
  let lang = (opts && opts.lang) || 'en';
  let anchor = null;                 // { lat, lng } — map viewport centre
  // v0.61.17 — station-detail view state.
  let detailStation = null;          // selected station record, or null
  // v0.61.26 — the 3 stations of the active detail view ({lat,lng} each:
  // the tapped station + its line-neighbours), used to clip the Exits /
  // Taxis chips. Empty when no station-detail view is active.
  let detailStations = [];
  // v0.61.68 — transient bus-stop pins for the open station card: the
  // station's per-exit nearest bus stops, drawn on a station tap even
  // when the Bus Stop overlay is off, cleared when the card closes.
  let stationBusPins = [];
  // v0.61.82 — CR-6: the same idea for the station's exits — pins drawn
  // on a station tap even when the Exit overlay is off, so the card's
  // "Exit #" links can always force-render + flash their target pin.
  let stationExitPins = [];
  // v0.61.95 — operator part 5: monochrome state + the coloured SVG
  // train-line overlay (lazily built — see makeTrainColourOverlay).
  let monochrome = false;
  let colourOverlay = null;
  function ensureColourOverlay() {
    if (!colourOverlay) colourOverlay = makeTrainColourOverlay(googleMaps);
    return colourOverlay;
  }

  function inRadius(lat, lng, r) {
    if (!anchor) return true;        // no anchor yet → show all (avoids a blank map)
    return metresBetween(anchor.lat, anchor.lng, lat, lng) <= r;
  }

  // v0.61.23 — each park carries a representative point (first ring's
  // first vertex) so the parks layer can be radius-clipped by the slider.
  function buildParks(features) {
    return (features || []).map((f) => {
      const rings = (f.rings || []).map((ring) => ring.map(([lng, lat]) => ({ lat, lng })));
      const first = rings[0] && rings[0][0];
      const lat = first ? first.lat : NaN;
      const lng = first ? first.lng : NaN;
      // v0.61.97 — a 🌳 + name label, shown only at the z14+ tier (the
      // green polygon itself serves the lower zoom bands).
      let labelMarker = null;
      if (Number.isFinite(lat) && Number.isFinite(lng) && f.name) {
        labelMarker = new AdvancedMarkerElement({
          position: { lat, lng },
          content: amenityNode('label', '#2E7D32', '🌳', f.name),
          title: f.name || ''
        });
      }
      return {
        polygon: new Polygon({
          paths: rings,
          strokeColor: '#2E7D32', strokeOpacity: 0.6, strokeWeight: 1,
          fillColor: '#4CAF50', fillOpacity: 0.22,
          clickable: false
        }),
        lat, lng, labelMarker, _name: f.name || ''
      };
    });
  }

  // v0.61.97 — `tiered` amenity layers (attractions / clinics / police
  // / hospitals) carry the bg / glyph / name so applyVisibility can
  // re-render the marker per zoom tier (dot / glyph / label).
  function buildMarkers(features, bg, glyph, infoFn, makeNode, tiered) {
    const z0 = map.getZoom?.() || 0;
    return (features || []).map((f) => {
      const content = tiered
        ? amenityNode(amenityTier(z0), bg, glyph, f.name)
        // v0.61.86 — `makeNode` receives the feature `f` too, so a
        // per-feature label (e.g. attractionLabelNode) can read f.name.
        : (makeNode || dotNode)(bg, glyph, f);
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content,
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => {
        info.setContent(infoFn(f));
        info.open(map, marker);
      });
      return { marker, lat: f.lat, lng: f.lng,
        _bg: bg, _glyph: glyph, _name: f.name || '', _tiered: !!tiered };
    });
  }

  // v0.61.42 — bus-stop overlay markers: the shared 🚏 amenity label,
  // and a tap opens the live-arrivals popup (openBusInfo) — the same
  // popup the station-detail amenity pins use.
  function buildBusMarkers(features) {
    // v0.61.102 — the bus-stop marker re-renders by zoom tier (see
    // busTier); applyVisibility swaps marker.content as the band
    // changes. `_code` + the `_busTier` cache drive that.
    const z0 = map.getZoom?.() || 0;
    return (features || []).map((f) => {
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: busTierNode(busTier(z0), f.code),
        title: f.description || ('Stop ' + f.code),
        gmpClickable: true
      });
      marker.addListener('click', () => openBusInfo(map, info, f, marker));
      return { marker, lat: f.lat, lng: f.lng, _bus: true, _code: f.code, _busTier: null };
    });
  }
  // v0.62.283 — 🍚 hawker card + droplet markers (ported from Cuisine). The
  // card's station pills are non-clickable here (this TMA has no focusStation —
  // the window.__giaFocusStation hook is null-guarded → no-op).
  function hawkerCardHtml(f, transit) {
    const p = infoPalette();
    let h = '<div style="font-weight:600;font-size:13px;">' + escapeHtml(f.name || '') + (f.isNew ? ' 🆕' : '') + '</div>';
    if (f.status) {
      h += '<div style="color:' + p.sub + ';margin-top:2px;">🕒 ' + escapeHtml(f.status) + '</div>';
    } else if (Number.isFinite(f.stalls) && f.stalls > 0) {
      h += '<div style="color:' + p.sub + ';margin-top:2px;">' + f.stalls + ' stalls</div>';
    }
    if (f.address) {
      h += '<div style="color:' + p.sub + ';margin-top:3px;">📇 ' + escapeHtml(f.address) + '</div>';
    }
    const bus = (transit && Array.isArray(transit.busStops)) ? transit.busStops : [];
    for (const b of bus.slice(0, 3)) {
      if (!Number.isFinite(b.lat) || !Number.isFinite(b.lng)) continue;
      h += '<div style="margin-top:2px;"><a href="https://maps.google.com/?q=' + b.lat + ',' + b.lng
        + '" target="_blank" rel="noopener" style="color:' + p.link + ';">🚌 '
        + escapeHtml(b.code || '') + ' ' + escapeHtml(b.description || '') + '</a></div>';
    }
    const stations = (transit && Array.isArray(transit.stations)) ? transit.stations : [];
    for (const st of stations.slice(0, 2)) {
      if (!st || !st.name) continue;
      const codeArr = Array.isArray(st.codes) ? st.codes : [];
      const firstCode = codeArr[0] || '';
      const pills = codeArr.map((cd) => codePill(cd, codeHex(cd), false)).join('');
      h += '<div onclick="window.__giaFocusStation&&window.__giaFocusStation(\'' + escapeHtml(firstCode) + '\')"'
        + ' style="margin-top:3px;cursor:pointer;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">'
        + '<span aria-hidden>🚉</span>' + pills
        + '<span style="color:' + p.sub + ';">' + escapeHtml(st.name) + '</span></div>';
    }
    return infoCard(h, f);
  }
  function openHawkerInfo(f, marker) {
    info.setContent(hawkerCardHtml(f, null));
    info.open(map, marker);
    if (Number.isFinite(f.lat) && Number.isFinite(f.lng)) {
      fetch('/api/hawker/centre-transit?lat=' + encodeURIComponent(f.lat) + '&lng=' + encodeURIComponent(f.lng))
        .then((r) => (r.ok ? r.json() : null))
        .then((t) => { if (t) info.setContent(hawkerCardHtml(f, t)); })
        .catch(() => {});
    }
  }
  function buildHawkerMarkers(features) {
    const z0 = map.getZoom?.() || 0;
    return (features || []).map((f) => {
      const info0 = {
        // v0.62.296 — card title prefers the canonical NEA name (displayName);
        // the H## short label below still derives from the raw name.
        num: f._num, name: f.displayName || f.name || '', isNew: !!f.isNew,
        head: hawkerHead(f.name), facility: hawkerFacility(f.name), short: hawkerShort(f.name)
      };
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: hawkerTierNode(hawkerTier(z0), info0),
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => openHawkerInfo(f, marker));
      return { marker, lat: f.lat, lng: f.lng, _hawker: true, _info: info0, _name: f.name || '', _hawkerTier: null };
    });
  }

  // v0.61.24 — MRT-exit overlay pins; a tap opens the Exit Template popup.
  // v0.61.82 — CR-5: dual-state like the bus-stop pins. Compact bare
  // identifier ("A") when zoomed out; full white "Exit A" card at/above
  // the detail zoom threshold. applyVisibility swaps marker.content on
  // zoom_changed.
  function buildExitMarkers(features) {
    return (features || []).map((f) => {
      const codes = Array.isArray(f.codes) ? f.codes : [];
      const hex = codes.length ? codeHex(codes[0]) : AMENITY_EXIT_BG;
      const code = f.exitCode || '?';
      const compact = exitTextNode(code, hex);
      const full = amenityLabelNode(scLabel('exit', lang) + ' ' + code, '#FFFFFF', '#1c1c1f', true);
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: compact,
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => {
        info.setContent(exitInfo(f));
        info.open(map, marker);
      });
      return { marker, lat: f.lat, lng: f.lng, compact, full, _exit: true };
    });
  }

  // v0.61.23 — taxi overlay pins are word labels ("Taxi" / "Pick-up"),
  // classified by the feature name, matching the station-detail amenity
  // taxi pins (no more 🚕 emoji dot).
  function buildTaxiMarkers(features) {
    return (features || []).map((f) => {
      const pickup = /pick ?up/i.test(String(f.name || ''));
      const marker = new AdvancedMarkerElement({
        position: { lat: f.lat, lng: f.lng },
        content: amenityLabelNode(pickup ? 'Pick-up' : 'Taxi', AMENITY_TAXI_BG, '#1c1c1f', true),
        title: f.name || '',
        gmpClickable: true
      });
      marker.addListener('click', () => {
        info.setContent(nameInfo(f));
        info.open(map, marker);
      });
      return { marker, lat: f.lat, lng: f.lng };
    });
  }

  function buildTrain(paths) {
    const out = [];
    for (const [code, segs] of Object.entries(paths || {})) {
      if (code.startsWith('_')) continue;
      const hex = LINE_HEX[code] || '#888888';
      for (const seg of (Array.isArray(segs) ? segs : [])) {
        if (!Array.isArray(seg) || seg.length < 2) continue;
        const pts = seg.map((p) => ({ lat: p.lat, lng: p.lng }));
        const polyline = new Polyline({
          // v0.61.80 — CR-3: zoomed-in default opacity 0.85 → 0.95.
          path: pts, strokeColor: hex, strokeOpacity: 0.95, strokeWeight: 4,
          clickable: false, zIndex: 1
        });
        out.push({ polyline, pts, hex, code });
      }
    }
    return out;
  }

  // v0.61.11 — station markers along the train lines.
  // v0.61.17 — clickable: tapping one enters the station-detail view.
  // v0.61.87 — markers carry a line-coloured code chip (→ named pill at
  // ZOOM_DETAIL_THRESHOLD); the bare square marker was removed.
  function buildTrainStations(stations) {
    const out = [];
    for (const s of (Array.isArray(stations) ? stations : [])) {
      // v0.61.65 — prefer the exit-derived centroid (the real station
      // position from the LTA exit GeoJSON) over the coarse mrt-coords
      // lat/lng, which can sit 100 m+ off. Falls back when absent.
      const ec = s.exit_centroid;
      const lat = (ec && Number.isFinite(ec.lat)) ? ec.lat : s.lat;
      const lng = (ec && Number.isFinite(ec.lng)) ? ec.lng : s.lng;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      if (s.status === 'future') continue;
      const hex = LINE_HEX[lineCodeOf(s)] || '#888888';
      const marker = new AdvancedMarkerElement({
        position: { lat, lng },
        content: stationCodeNode(s.codes, hex),
        title: s.name || '',
        gmpClickable: true
      });
      const item = { marker, lat, lng, station: s, hex, _mode: 'code' };
      marker.addListener('click', () => handleStationTap(item));
      out.push(item);
    }
    return out;
  }

  // --- station-detail view --------------------------------------------

  // v0.61.26 — re-clip the Exits / Taxis chip layers. In a station-
  // detail view they show only the amenities of the 3 visible stations
  // (see applyVisibility's marker branch); out of it, the normal
  // anchor-radius overlay. Called whenever the detail view is entered
  // or cleared.
  function syncDetailAmenityLayers() {
    for (const n of ['exits', 'taxis']) {
      if (layers[n]) applyVisibility(n);
    }
  }

  function exitStationDetail() {
    detailStation = null;
    info.close();
    clearStationBusStops();
    clearStationExitPins();

    if (layers.train) applyVisibility('train');
    if (layers.busstop) applyVisibility('busstop');
    syncDetailAmenityLayers();
  }

  // v0.61.17 — a station marker was tapped. Re-tapping the selected
  // station clears the selection; tapping another re-targets it.
  // v0.61.57 — CR6 Phase 3: a tap opens the station info card
  // (openStationCard) — this replaces the old neighbour-detail view.
  function handleStationTap(item) {
    const s = item.station;
    if (detailStation && detailStation.name === s.name) {
      exitStationDetail();
      return;
    }
    detailStation = s;
    if (layers.train) applyVisibility('train');
    if (layers.busstop) applyVisibility('busstop');
    openStationCard(item);
  }

  // v0.61.66 — flash a transient pulsing halo over a point for ~2 s, so a
  // station-card "Bus Stop №" tap visibly draws the eye to the stop after
  // the map pans there. v0.61.68 — a hollow ring (was a solid 🚏 pin) so
  // it reads as a highlight over the real bus-stop pin, not a duplicate.
  function flashPin(lat, lng) {
    if (typeof document === 'undefined'
      || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    ensureGreyscaleStyle();
    const el = document.createElement('div');
    el.style.cssText = 'width:32px;height:32px;border-radius:50%;'
      + 'border:3px solid ' + AMENITY_BUS_BG + ';background:rgba(21,101,192,0.18);'
      + 'box-shadow:0 0 6px ' + AMENITY_BUS_BG + ';'
      + 'animation:gia-pin-flash 0.5s ease-in-out 4;';
    const m = new AdvancedMarkerElement({
      position: { lat, lng }, content: el, zIndex: 9999
    });
    m.map = map;
    setTimeout(() => { m.map = null; }, 2000);
  }

  // v0.61.68 — the open station card's bus stops. Draws the station's
  // per-exit nearest bus stops as map pins on a station tap — even when
  // the Bus Stop overlay is off — so the card's "Bus Stop №" links have a
  // pin to flash. Skipped when that overlay is already on (it shows every
  // stop in radius). Cleared when the card closes / the map is tapped.
  function clearStationBusStops() {
    for (const m of stationBusPins) m.map = null;
    stationBusPins = [];
  }
  function showStationBusStops(rec) {
    clearStationBusStops();
    if (layers.busstop && layers.busstop.visible) return;
    const seen = new Set();
    for (const ex of (Array.isArray(rec.exits) ? rec.exits : [])) {
      const bs = ex && ex.nearest_bus_stop;
      if (!bs || !bs.code
        || !Number.isFinite(bs.lat) || !Number.isFinite(bs.lng)
        || seen.has(bs.code)) continue;
      seen.add(bs.code);
      const b = { code: bs.code, lat: bs.lat, lng: bs.lng };
      const marker = new AdvancedMarkerElement({
        position: { lat: bs.lat, lng: bs.lng },
        content: busPinNode(bs.code, true),
        gmpClickable: true
      });
      marker.addListener('click', () => openBusInfo(map, info, b, marker));
      marker.map = map;
      stationBusPins.push(marker);
    }
  }

  // v0.61.82 — CR-6: the open station card's exit pins. Mirror of
  // showStationBusStops — draws the station's exits as full "Exit <code>"
  // white-card pins on a station tap, even when the Exit overlay is off,
  // so the card's "Exit #" links always have a pin to focus + flash
  // (force-render the target regardless of the layer toggle). Skipped
  // when that overlay is already on. Cleared when the card closes.
  function clearStationExitPins() {
    for (const m of stationExitPins) m.map = null;
    stationExitPins = [];
  }
  function showStationExits(rec) {
    clearStationExitPins();
    if (layers.exits && layers.exits.visible) return;
    for (const ex of (Array.isArray(rec.exits) ? rec.exits : [])) {
      if (!ex || !Number.isFinite(ex.lat) || !Number.isFinite(ex.lng)) continue;
      const marker = new AdvancedMarkerElement({
        position: { lat: ex.lat, lng: ex.lng },
        content: amenityLabelNode(scLabel('exit', lang) + ' ' + (ex.label || '?'), '#FFFFFF', '#1c1c1f', false)
      });
      marker.map = map;
      stationExitPins.push(marker);
    }
  }

  // v0.61.57 — CR6 Phase 3: render + open the station info card popup
  // for a tapped station, from the data/stations.json record.
  function openStationCard(item) {
    fetchStationInfo().then((doc) => {
      if (destroyed || !detailStation || detailStation.name !== item.station.name) return;
      const rec = doc && doc.stations ? doc.stations[item.station.name] : null;
      if (!rec) { info.close(); return; }
      // Exit / Bus-№ link affordances → pan + zoom the map to the pin.
      // v0.61.66 — a third truthy arg (Exit # / Bus Stop № links) also
      // flashes the pin for ~2 s. v0.61.70 — and closes the station card
      // first, so the card never hides the pin being flashed.
      window.__giaStationFocus = (lat, lng, flash) => {
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        if (flash) info.close();
        map.panTo({ lat, lng });
        const z = map.getZoom ? map.getZoom() : 0;
        if (z < 17) map.setZoom(17);
        if (flash) flashPin(lat, lng);
      };
      info.setContent(stationInfoCardHtml(rec, lang));
      info.open(map, item.marker);
      showStationBusStops(rec);
      showStationExits(rec);     // v0.61.82 — CR-6
    });
  }

  // --- per-feature InfoWindow HTML -------------------------------------
  const nameInfo = (f) =>
    infoCard('<div style="font-weight:600;">' + escapeHtml(f.name || '') + '</div>', f);

  // v0.61.24 — the Exit Template for an enriched geo-exits.json feature.
  const exitInfo = (f) =>
    infoCard(exitTemplateHtml({ exitCode: f.exitCode, station: f.station, codes: f.codes, nearby: f.nearby }), f);

  const carparkInfo = (f) => {
    // v0.61.116 — Carpark Card per operator UI/UX spec (slice 2):
    // Header (Carpark | proper-cased name) + Live Data (lots /
    // availability) + Actions (Google Maps ↗). The `f` 2nd arg to
    // infoCard auto-appends the standard gmapsLinkRow tail (the
    // TMA-wide convention from v0.61.31).
    const lots = Number.isFinite(f.availableLots) ? ' — ' + f.availableLots + ' lots' : '';
    return infoCard('<div style="font-weight:600;">'
      + escapeHtml((f.name || 'Carpark') + lots) + '</div>', f);
  };

  // v0.61.109 — enriched attraction popup: star rating + review count,
  // address, today's opening hours (structured Google-Places week, with
  // the STB prose as fallback), contact number, a wheelchair-accessible
  // flag, the nearest TWO stations each with their exits, website and
  // Instagram. The rating / phone / hoursWeek / wheelchair / instagram
  // fields come from data/attraction-details.json (scripts/fetch-
  // attraction-details.js) and are absent until that fetcher is run.
  const attractionInfo = (f) => {
    const c = infoPalette();
    let h = '<div style="font-weight:600;">' + escapeHtml(f.name || '') + '</div>';
    if (Number.isFinite(f.rating)) {
      const cnt = Number.isFinite(f.ratingCount) ? ' (' + f.ratingCount + ')' : '';
      h += '<div style="color:' + c.sub + ';margin-top:2px;">⭐ ' + escapeHtml(f.rating.toFixed(1)) + cnt + '</div>';
    }
    if (f.address) h += '<div style="color:' + c.sub + ';margin-top:2px;">📇 ' + escapeHtml(f.address) + '</div>';
    let hoursLine = '';
    if (Array.isArray(f.hoursWeek) && f.hoursWeek.length) {
      const jsDay = new Date().getDay();
      hoursLine = f.hoursWeek[jsDay === 0 ? 6 : jsDay - 1] || f.hoursWeek[0];
    } else if (f.hours) {
      hoursLine = f.hours;
    }
    if (hoursLine) h += '<div style="color:' + c.sub + ';margin-top:2px;">🕰 ' + escapeHtml(hoursLine) + '</div>';
    if (f.phone) h += '<div style="color:' + c.sub + ';margin-top:2px;">☎ ' + escapeHtml(f.phone) + '</div>';
    if (f.wheelchair === true) {
      h += '<div style="color:' + c.sub + ';margin-top:2px;">♿ Wheelchair accessible</div>';
    }
    for (const st of (Array.isArray(f.stations) ? f.stations : [])) {
      if (!st || !st.name) continue;
      const codes = Array.isArray(st.codes) ? st.codes.join(' / ') : '';
      h += '<div style="color:' + c.sub + ';margin-top:2px;">🚉 ' + escapeHtml(st.name)
        + (codes ? ' (' + escapeHtml(codes) + ')' : '') + '</div>';
      // v0.61.10 — nearest station's exits (verbatim EXIT_CODE values).
      const exits = Array.isArray(st.exits) ? st.exits.filter(Boolean) : [];
      if (exits.length) {
        h += '<div style="color:' + c.sub + ';margin-top:1px;font-size:12px;">'
          + escapeHtml(exits.join(', ')) + '</div>';
      }
    }
    if (f.website) {
      const href = /^https?:\/\//.test(f.website) ? f.website : 'https://' + f.website;
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(href)
        + '" target="_blank" rel="noopener" style="color:' + c.link + ';">🌐 Website</a></div>';
    }
    if (f.instagram) {
      const ig = /^https?:\/\//.test(f.instagram) ? f.instagram : 'https://' + f.instagram;
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(ig)
        + '" target="_blank" rel="noopener" style="color:' + c.link + ';">📷 Instagram</a></div>';
    }
    return infoCard(h, f);
  };

  // v0.61.32 — police POI popup: glyph + name + address.
  const poiInfo = (glyph) => (f) => {
    const c = infoPalette();
    let h = '<div style="font-weight:600;">' + glyph + ' ' + escapeHtml(f.name || '') + '</div>';
    if (f.address) {
      h += '<div style="color:' + c.sub + ';margin-top:2px;">📇 ' + escapeHtml(f.address) + '</div>';
    }
    return infoCard(h, f);
  };

  // v0.61.39 — CHAS clinic / pharmacy popup template: name, unit number,
  // building (if any), street, postal, telephone, then the standard
  // "Google Map ↗" link (appended by infoCard). Opening hours are not
  // in the CHAS dataset, so that line is omitted.
  const clinicInfo = (f) => {
    const c = infoPalette();
    let h = '<div style="font-weight:600;">💊 ' + escapeHtml(f.name || 'Clinic') + '</div>';
    const addr = [];
    if (f.unit) addr.push(escapeHtml(f.unit));
    if (f.building) addr.push(escapeHtml(f.building));
    if (f.street) {
      addr.push(escapeHtml(f.street) + (f.postal ? ', Singapore ' + escapeHtml(f.postal) : ''));
    } else if (f.postal) {
      addr.push('Singapore ' + escapeHtml(f.postal));
    }
    if (addr.length) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">' + addr.join('<br>') + '</div>';
    }
    // v0.61.39 — opening hours (Google Places weekdayDescriptions, added
    // by scripts/fetch-clinic-hours.js; absent until that script runs).
    // Show today's line — the array is Monday-first, JS getDay() Sun=0.
    if (Array.isArray(f.hours) && f.hours.length) {
      const jsDay = new Date().getDay();
      const today = f.hours[jsDay === 0 ? 6 : jsDay - 1] || f.hours[0];
      h += '<div style="color:' + c.sub + ';margin-top:3px;">🕒 ' + escapeHtml(today) + '</div>';
    }
    if (f.tel) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">☎ ' + escapeHtml(f.tel) + '</div>';
    }
    return infoCard(h, f);
  };

  // v0.61.40 — Hospital popup template: category / type line, name,
  // purpose-labelled telephone lines, WhatsApp (if any), website,
  // building (if any), address, opening hours, then the standard
  // "Google Map ↗" link (appended by infoCard). Data: geo-hospitals.json
  // (scripts/fetch-hospitals.js — curated MD + Google Places).
  const hospitalInfo = (f) => {
    const c = infoPalette();
    let h = '';
    if (f.category) {
      h += '<div style="color:' + c.sub + ';font-size:12px;text-transform:uppercase;'
        + 'letter-spacing:.04em;">' + escapeHtml(f.category) + '</div>';
    }
    h += '<div style="font-weight:600;margin-top:1px;">🏥 ' + escapeHtml(f.name || 'Hospital') + '</div>';
    for (const p of (Array.isArray(f.phones) ? f.phones : [])) {
      if (!p || !p.number) continue;
      const label = p.purpose && p.purpose !== 'Main' ? escapeHtml(p.purpose) + ': ' : '';
      h += '<div style="color:' + c.sub + ';margin-top:3px;">☎ ' + label + escapeHtml(p.number) + '</div>';
    }
    if (f.whatsapp) {
      const wh = f.whatsappHours ? ' (' + escapeHtml(f.whatsappHours) + ')' : '';
      h += '<div style="color:' + c.sub + ';margin-top:3px;">💬 WhatsApp ' + escapeHtml(f.whatsapp) + wh + '</div>';
    }
    if (f.website) {
      const href = /^https?:\/\//.test(f.website) ? f.website : 'https://' + f.website;
      h += '<div style="margin-top:3px;"><a href="' + escapeHtml(href)
        + '" target="_blank" rel="noopener" style="color:' + c.link + ';">🌐 '
        + escapeHtml(f.website) + '</a></div>';
    }
    const addr = [];
    if (f.building) addr.push(escapeHtml(f.building));
    if (f.address) {
      addr.push(escapeHtml(f.address) + (f.postal ? ', Singapore ' + escapeHtml(f.postal) : ''));
    } else if (f.postal) {
      addr.push('Singapore ' + escapeHtml(f.postal));
    }
    if (addr.length) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">📍 ' + addr.join('<br>') + '</div>';
    }
    let hours = f.hoursNote ? escapeHtml(f.hoursNote) : '';
    if (!hours && Array.isArray(f.hours) && f.hours.length) {
      const jsDay = new Date().getDay();
      hours = escapeHtml(f.hours[jsDay === 0 ? 6 : jsDay - 1] || f.hours[0]);
    }
    if (hours) {
      h += '<div style="color:' + c.sub + ';margin-top:3px;">🕒 ' + hours + '</div>';
    }
    return infoCard(h, f);
  };

  async function ensureLayer(name) {
    if (layers[name]) return layers[name];
    let entry;
    if (name === 'carpark') {
      const d = await fetchCarpark();
      if (destroyed) return null;
      entry = { kind: 'marker', visible: false,
        items: buildMarkers(d.carparks, '#1565C0', '🅿', carparkInfo) };
    } else if (name === 'busstop') {
      const d = await fetchBusStops();
      if (destroyed) return null;
      entry = { kind: 'marker', visible: false,
        items: buildBusMarkers(d.busstops) };
    } else if (name === 'hawker') {
      // v0.62.283 — 🍚 hawker centres, radius-clipped via applyVisibility (the
      // same `near` gate as bus stops); the droplet/H## tiers follow hawkerTier.
      const d = await fetchHawkerCentres();
      if (destroyed) return null;
      entry = { kind: 'marker', visible: false,
        items: buildHawkerMarkers(d.centres) };
    } else if (name === 'train') {
      const [lp, st] = await Promise.all([fetchLinePaths(), fetchStations()]);
      if (destroyed) return null;
      // v0.61.87 — no `radius`: the train layer is unclipped, so the
      // whole MRT/LRT network draws when the Train overlay is on.
      entry = { kind: 'train', visible: false,
        lines: buildTrain(lp.paths), stations: buildTrainStations(st.stations),
        highlights: [] };
    } else {
      const d = await fetchOverlays();
      if (destroyed) return null;
      if (name === 'parks') {
        entry = { kind: 'polygon', visible: false, items: buildParks(d.parks) };
      } else if (name === 'attractions') {
        // v0.61.97 — attractions render by zoom tier (dot / ⚝ glyph /
        // ⚝ + name); see amenityTier + amenityNode.
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.attractions, '#8E24AA', '⚝', attractionInfo, null, true) };
      } else if (name === 'taxis') {
        entry = { kind: 'marker', visible: false,
          items: buildTaxiMarkers(d.taxis) };
      } else if (name === 'exits') {
        entry = { kind: 'marker', visible: false,
          items: buildExitMarkers(d.exits) };
      } else if (name === 'clinics') {
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.clinics, '#C62828', '✚', clinicInfo, null, true) };
      } else if (name === 'police') {
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.police, AMENITY_POLICE_BG, '👮', poiInfo('👮'), null, true) };
      } else if (name === 'hospitals') {
        entry = { kind: 'marker', visible: false,
          items: buildMarkers(d.hospitals, '#00897B', '🏥', hospitalInfo, null, true) };
      } else {
        return null;
      }
    }
    layers[name] = entry;
    return entry;
  }

  // v0.61.26 — the chip overlay layers all share one fixed radius.
  function currentRadius() {
    return OVERLAY_RADIUS_M;
  }

  // v0.61.116 — clustering engine for the Attractions / Carpark layers
  // per operator UI/UX spec (slice 2). Bucket every visible marker
  // into a 40 px screen tile (mppAt-scaled lat/lng), then per tile
  // decide cluster-vs-individual:
  //
  //   • Carpark, zoom < 15  → force cluster (every non-empty tile
  //     renders an "N 🅿 here" pill regardless of N; v0.61.105's
  //     icon-size ladder for z<15 is gone by operator answer 4).
  //   • Carpark, zoom ≥ 15  → cluster when tile count ≥ 5, else
  //     individuals via the source-order drop cascade.
  //   • Attractions, any zoom → cluster when tile count ≥ 8, else
  //     individuals via the source-order drop cascade.
  //
  // The drop cascade (operator answer 2) iterates the tile's items
  // in source order:
  //   1. Try to place a label (only when the zoom is in the label
  //      band: z ≥ 14 attractions, z ≥ 15 carpark).
  //   2. If the label collides with anything already placed → fall
  //      back to the icon (⚝ glyph at ~18 px, 🅿 icon at
  //      carparkSize(zoom)).
  //   3. If the icon also collides → drop (marker.map = null).
  //
  // Cluster markers live in `e._clusters`, reused across renders
  // (positions + content updated in place). Unused entries are
  // hidden (map = null) but kept for the next render. Click on a
  // cluster pill zooms in by 2 levels capped at z18 — Google
  // MarkerClusterer's default behaviour, since the spec did not
  // define a cluster-tap action.
  function applyClusterAndDrop(name, e) {
    const isCarpark = (name === 'carpark');
    const isAttraction = (name === 'attractions');
    // v0.61.118 — attractions threshold lowered from 8 to 7 per operator.
    const threshold = isCarpark ? 5 : 7;
    const zoom = map.getZoom?.() || 0;
    const forceCluster = isCarpark && zoom < 15;
    const allowLabel = isCarpark ? (zoom >= 15) : (zoom >= 14);
    const mpp = metresPerPixelAt(zoom, 1.35) || 1;
    // v0.61.119 — operator: at z11 a 200 px tile spans ~7.6 km in
    // Singapore (~38 m/px × 200), easily holding 45+ attractions in
    // central SG → one mega "45 ⚝ here" pill that hides every
    // individual attraction. Reverts the v0.61.118 low-zoom widening:
    // 40 px tile for attractions at every zoom (same as carpark),
    // so individuals dominate at typical zoom and clusters only form
    // where ≥7 attractions sit within ~1.5 km × 1.5 km.
    const TILE_PX = 40;
    const TILE_M = TILE_PX * mpp;

    // 1) Filter to candidates that should be considered for placement.
    const candidates = [];
    const r = currentRadius();
    for (const it of e.items) {
      const near = isAttraction
        ? true
        : Number.isFinite(it.lat) && inRadius(it.lat, it.lng, r);
      if (!(e.visible && near && Number.isFinite(it.lat) && Number.isFinite(it.lng))) {
        it.marker.map = null;
        continue;
      }
      candidates.push(it);
    }

    // 2) Bucket by 40 px screen tile. Convert lat/lng to a
    //    pixel-space integer key — approximate (treats SG as flat at
    //    lat 1.35), but 40 px is too small for the curvature to
    //    matter at this latitude.
    const tiles = new Map();
    for (const it of candidates) {
      const tx = Math.floor((it.lng * 111320 * 0.99973) / TILE_M);
      const ty = Math.floor((it.lat * 110574) / TILE_M);
      const key = tx + '|' + ty;
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key).push(it);
    }

    // 3) Ensure cluster pool exists; reuse across renders.
    if (!e._clusters) e._clusters = [];
    let cIdx = 0;

    // 4) Per tile: cluster or individual cascade.
    const placedLabels = [];
    const placedIcons = [];
    for (const items of tiles.values()) {
      const doCluster = forceCluster || items.length >= threshold;
      if (doCluster) {
        // Hide every individual marker in this tile.
        for (const it of items) it.marker.map = null;
        // Cluster pill at the tile centroid.
        let cLat = 0, cLng = 0;
        for (const it of items) { cLat += it.lat; cLng += it.lng; }
        cLat /= items.length;
        cLng /= items.length;
        const text = isCarpark
          ? items.length + ' 🅿 here'
          : items.length + ' ⚝ here';
        let cm = e._clusters[cIdx];
        if (!cm) {
          cm = new AdvancedMarkerElement({
            position: { lat: cLat, lng: cLng },
            content: clusterLabelNode(text),
            gmpClickable: true
          });
          cm._text = text;
          cm.addListener('click', () => {
            const z = map.getZoom?.() || 0;
            map.setZoom(Math.min(z + 2, 18));
            if (cm.position) map.setCenter(cm.position);
          });
          e._clusters.push(cm);
        } else {
          cm.position = { lat: cLat, lng: cLng };
          if (cm._text !== text) {
            cm.content = clusterLabelNode(text);
            cm._text = text;
          }
        }
        cm.map = map;
        // v0.61.116 — register the cluster pill's footprint so
        // individual labels in adjacent non-clustering tiles don't
        // render on top of it. clusterW estimated from the same
        // ~7 px/char heuristic the individual labels use.
        const clusterW = 34 + text.length * 7;
        placedLabels.push({ lat: cLat, lng: cLng, w: clusterW, h: 26 });
        cIdx++;
        continue;
      }
      // Individual cascade (label → icon → drop), source order.
      for (const it of items) {
        const w = 34 + (it._name || '').length * 7;
        const h = 26;
        let placed = false;
        if (allowLabel) {
          const labelClash = placedLabels.some((p) => footprintOverlap(it.lat, it.lng, w, h, p, mpp))
            || placedIcons.some((p) => footprintOverlap(it.lat, it.lng, w, h, p, mpp));
          if (!labelClash) {
            const glyph = isCarpark ? '🅿' : (it._glyph || '⚝');
            const displayName = it._name || (isCarpark ? 'Carpark' : 'Attraction');
            it.marker.content = amenityLabelNode((glyph + ' ' + displayName).trim(),
              '#ffffff', '#1c1c1f', true);
            it.marker.map = map;
            placedLabels.push({ lat: it.lat, lng: it.lng, w, h });
            placed = true;
          }
        }
        if (!placed) {
          const sz = isCarpark ? carparkSize(zoom) : 18;
          const iconClash = placedLabels.some((p) => footprintOverlap(it.lat, it.lng, sz, sz, p, mpp))
            || placedIcons.some((p) => footprintOverlap(it.lat, it.lng, sz, sz, p, mpp));
          if (!iconClash) {
            it.marker.content = isCarpark
              ? dotNode(it._bg, it._glyph, sz)
              : amenityNode('glyph', it._bg, it._glyph, it._name);
            it.marker.map = map;
            placedIcons.push({ lat: it.lat, lng: it.lng, w: sz, h: sz });
            placed = true;
          }
        }
        if (!placed) {
          // Drop — last-resort per spec answer 2 "Source-order
          // first-in wins". The marker stays in e.items so the
          // next render can re-evaluate it.
          it.marker.map = null;
        }
      }
    }

    // 5) Hide any cluster pills the previous render placed and that
    //    are not used this time.
    for (let i = cIdx; i < e._clusters.length; i++) {
      if (e._clusters[i].map) e._clusters[i].map = null;
    }
  }

  function applyVisibility(name) {
    const e = layers[name];
    if (!e) return;
    if (e.kind === 'polygon') {
      // parks are radius-clipped to the anchor.
      const r = currentRadius();
      // v0.61.97 — the 🌳 + name park label shows only at the z14+
      // tier; a label colliding with one already placed is hidden
      // (the green polygon still marks the park).
      const zoom = map.getZoom?.() || 0;
      const labelTier = e.visible && amenityTier(zoom) === 'label';
      const placedLabels = [];
      for (const it of e.items) {
        const near = !Number.isFinite(it.lat) || inRadius(it.lat, it.lng, r);
        it.polygon.setMap(e.visible && near ? map : null);
        if (it.labelMarker) {
          let show = labelTier && near && Number.isFinite(it.lat);
          if (show) {
            const mpp = metresPerPixelAt(zoom, it.lat) || 1;
            const w = 34 + (it._name || '').length * 7;
            const clash = placedLabels.some((p) => {
              const dx = metresBetween(it.lat, it.lng, it.lat, p.lng) / mpp;
              const dy = metresBetween(it.lat, it.lng, p.lat, it.lng) / mpp;
              return dx < (w + p.w) / 2 + 4 && dy < 26;
            });
            if (clash) show = false;
            else placedLabels.push({ lat: it.lat, lng: it.lng, w });
          }
          it.labelMarker.map = show ? map : null;
        }
      }
      return;
    }
    // v0.61.11 — train layer: polylines + zoom-aware station markers.
    // v0.61.90 — per-TMA zoom tiers (operator spec). trainTier(tma,
    // zoom) resolves the station marker mode + base line opacity; a
    // capped tier shows the nearest-N stations as chips and the rest
    // as squares; a tapped station always shows the full named pill.
    if (e.kind === 'train') {
      const zoom = map.getZoom?.() || 0;
      // v0.61.92 — "results in focus" = the search / centre anchor sits
      // inside the current viewport; it drives the Cuisine z12-14 tier.
      let inFocus = true;
      const vb = map.getBounds?.();
      if (anchor && vb) {
        try { inFocus = vb.contains({ lat: anchor.lat, lng: anchor.lng }); }
        catch (_e) { inFocus = true; }
      }
      const tier = trainTier(tma, zoom, inFocus);
      for (const h of (e.highlights || [])) h.setMap(null);
      e.highlights = [];

      // v0.61.90 — resolve the in-focus station set near the map anchor
      // (the viewport centre — "nearest to the cuisine result / focused
      // hawker centre" the spec asks for) when a tier caps the chip
      // count, or for the Cuisine z15+ line emphasis.
      // v0.61.91 — a `capRadius` tier selects every station within N
      // metres of the anchor (Cuisine z12/z13); a `cap` tier selects the
      // nearest N; the emphasis-only z15+ case uses the nearest 15.
      let nearSet = null;
      let nearCoords = null;
      if (e.visible && (tier.cap > 0 || tier.capRadius > 0 || tier.emphasis)) {
        const ctr = map.getCenter?.();
        const ref = anchor || (ctr && { lat: ctr.lat(), lng: ctr.lng() });
        if (ref) {
          let nearest;
          if (tier.capRadius > 0) {
            nearest = e.stations.filter((st) =>
              metresBetween(ref.lat, ref.lng, st.lat, st.lng) <= tier.capRadius);
          } else {
            const n = tier.cap > 0 ? tier.cap : 15;
            nearest = e.stations
              .map((st) => ({ st, d: metresBetween(ref.lat, ref.lng, st.lat, st.lng) }))
              .sort((a, b) => a.d - b.d)
              .slice(0, n)
              .map((x) => x.st);
          }
          nearSet = new Set(nearest.map((st) => st.station.name));
          nearCoords = nearest.map((st) => ({ lat: st.lat, lng: st.lng }));
        }
      }

      // v0.61.95 — collect a coloured SVG copy of every line for the
      // monochrome overlay (the base polylines grey out with the canvas).
      const colourSegs = [];
      for (const ln of e.lines) {
        ln.polyline.setMap(e.visible ? map : null);
        // Base opacity tracks the tier; a tapped station mutes every
        // base line hard so its prev→current→next highlight stands out;
        // Cuisine z15+ keeps lines touching an in-focus station at 95%
        // and drops the rest to 80%.
        let opacity = tier.opacity;
        if (e.visible && detailStation) {
          opacity = 0.1;
        } else if (e.visible && tier.emphasis && nearCoords) {
          const touches = ln.pts.some((p) => nearCoords.some((c) =>
            metresBetween(c.lat, c.lng, p.lat, p.lng) <= 150));
          opacity = touches ? 0.95 : 0.8;
        }
        // v0.61.103 — in monochrome the base polyline renders invisible
        // (strokeOpacity 0) so it doesn't grey out under the canvas
        // filter; the coloured SVG overlay (colourSegs) carries the
        // line instead. colourSegs keeps the real opacity.
        ln.polyline.setOptions({
          strokeOpacity: monochrome ? 0 : opacity,
          strokeWeight: detailStation ? 3 : 4
        });
        colourSegs.push({ hex: ln.hex, pts: ln.pts, opacity,
          weight: detailStation ? 3 : 4 });
        // v0.61.58 — CR5 v2 selected-station emphasis: light up the
        // stretch of THIS line from the station before to the station
        // after the tapped station, full opacity in the line colour.
        if (e.visible && detailStation) {
          const ordered = stationsOnLine(e.stations.map((x) => x.station), ln.code);
          const idx = ordered.findIndex((x) => x.name === detailStation.name);
          const onSeg = idx >= 0 && ln.pts.some((p) =>
            metresBetween(detailStation.lat, detailStation.lng, p.lat, p.lng) <= 150);
          if (onSeg) {
            const a = ordered[idx - 1] || ordered[idx];
            const b = ordered[idx + 1] || ordered[idx];
            const seg = trackBetween(ln.pts, a.lat, a.lng, b.lat, b.lng);
            if (seg.length >= 2) {
              e.highlights.push(new Polyline({
                path: seg, strokeColor: ln.hex,
                strokeOpacity: monochrome ? 0 : 1, strokeWeight: 5,
                clickable: false, zIndex: 3, map
              }));
              colourSegs.push({ hex: ln.hex, pts: seg, opacity: 1, weight: 5 });
            }
          }
        }
      }
      // v0.61.57 — `detailStation` marks the tapped station (for the
      // CR5 v2 highlight + the always-pill marker); `detailStations`
      // stays empty so the Exits / Taxis chip layers are anchor-clipped.
      detailStations = [];

      // v0.61.90 — per-station marker mode. A tapped station always
      // shows the full named pill (operator spec); otherwise trainTier
      // decides, and a capped tier renders the stations beyond the
      // nearest-N as squares. `_mode` caches the resolved mode so a
      // marker only rebuilds when its band actually changes.
      // v0.61.92 — pass 1 resolves the base tier mode; pass 2 demotes
      // any marker overlapping a nearer one; pass 3 rebuilds only the
      // markers whose mode actually changed.
      const items = [];
      for (const st of e.stations) {
        st.marker.map = e.visible ? map : null;
        if (!e.visible) continue;
        const pinned = !!(detailStation && detailStation.name === st.station.name);
        let mode;
        if (pinned) {
          mode = 'pill';
        } else if (tier.station === 'pill') {
          mode = 'pill';
        } else if (tier.station === 'sq-sm') {
          mode = 'sq-sm';
        } else if ((tier.cap > 0 || tier.capRadius > 0) && nearSet
          && !nearSet.has(st.station.name)) {
          mode = tier.other || 'sq-sm';
        } else {
          mode = 'chip:' + (tier.scale || 1);
        }
        items.push({ st, name: st.station.name, lat: st.lat, lng: st.lng,
          codes: st.station.codes, mode, pinned });
      }
      if (e.visible) {
        demoteByOverlap(items, zoom, tier.overlapChip);
        for (const it of items) {
          if (it.st._mode !== it.mode) {
            it.st.marker.content = trainStationNode(it.mode, it.st);
            it.st._mode = it.mode;
          }
        }
      }
      // v0.61.95 — monochrome: attach the coloured SVG line copy so the
      // lines stay coloured against the greyscaled base; else detach it.
      if (e.visible && monochrome) {
        const ov = ensureColourOverlay();
        ov.setSegments(colourSegs);
        if (ov.getMap() !== map) ov.setMap(map);
      } else if (colourOverlay) {
        colourOverlay.setMap(null);
      }
      return;
    }
    // marker — chip overlay layer. v0.61.26 — in a station-detail view
    // the Exits / Taxis chips clip to the 3 visible stations (so they
    // show those stations' amenities); every other case clips to the
    // anchor radius.
    // v0.61.116 — Attractions and Carpark layers no longer iterate
    // here; they run through applyClusterAndDrop, which owns the
    // 40 px screen-tile cluster engine + the source-order label →
    // icon → drop cascade per operator UI/UX spec answers 1, 2, 4.
    if (name === 'attractions' || name === 'carpark') {
      applyClusterAndDrop(name, e);
      return;
    }
    const stationScoped = detailStations.length && (name === 'exits' || name === 'taxis');
    // v0.62.290 — operator: hawker pins were radius-clipped to 550 m like the
    // dense amenity layers, so centres beyond 550 m of the map centre vanished
    // on pan/zoom ("show and disappear"). Hawker centres are a sparse, nameable
    // set — show ALL in the region (matching the Hawker TMA), unclipped; the
    // hawkerTier ladder (dot→code→short→full) still declutters by zoom.
    const r = name === 'hawker' ? Infinity : currentRadius();
    // v0.61.70 — bus-stop pins are zoom-aware: compact 🚏 when zoomed
    // out, full 🚏 Bus Stop № … at/above the detail zoom threshold.
    const zoomedIn = (map.getZoom?.() || 0) >= ZOOM_DETAIL_THRESHOLD;
    // v0.61.97 — amenity layers (clinics / police / hospitals) render
    // by zoom tier: a tiny dot (z<12), the icon (z12-13) or the icon
    // + name (z14+). A label colliding with one already placed is
    // demoted to its icon. (Attractions split off to
    // applyClusterAndDrop in v0.61.116; this branch now only serves
    // clinics / police / hospitals.)
    const zoom = map.getZoom?.() || 0;
    const aTier = amenityTier(zoom);
    const placedLabels = [];
    for (const it of e.items) {
      const near = stationScoped
        ? detailStations.some((s) => metresBetween(s.lat, s.lng, it.lat, it.lng) <= STATION_AMENITY_RADIUS_M)
        : inRadius(it.lat, it.lng, r);
      it.marker.map = (e.visible && near) ? map : null;
      // v0.61.82 — CR-5: exit pins swap compact/full at the detail
      // zoom threshold. v0.61.102 — bus-stop pins follow the 5-band
      // busTier ladder instead.
      if (it._bus && e.visible && near) {
        const bt = busTier(zoom);
        if (it._busTier !== bt) {
          it.marker.content = busTierNode(bt, it._code);
          it._busTier = bt;
        }
      } else if (it._hawker && e.visible && near) {
        // v0.62.283 — droplet hawker pins follow the hawkerTier ladder.
        const ht = hawkerTier(zoom);
        if (it._hawkerTier !== ht) {
          it.marker.content = hawkerTierNode(ht, it._info);
          it._hawkerTier = ht;
        }
      } else if (it._exit && e.visible && near) {
        const want = zoomedIn ? it.full : it.compact;
        if (it.marker.content !== want) it.marker.content = want;
      } else if (it._tiered && e.visible && near) {
        let t = aTier;
        if (t === 'label') {
          const mpp = metresPerPixelAt(zoom, it.lat) || 1;
          const w = 34 + (it._name || '').length * 7;
          const clash = placedLabels.some((p) => {
            const dx = metresBetween(it.lat, it.lng, it.lat, p.lng) / mpp;
            const dy = metresBetween(it.lat, it.lng, p.lat, it.lng) / mpp;
            return dx < (w + p.w) / 2 + 4 && dy < 26;
          });
          if (clash) t = 'glyph';
          else placedLabels.push({ lat: it.lat, lng: it.lng, w });
        }
        if (it._tierRendered !== t) {
          it.marker.content = amenityNode(t, it._bg, it._glyph, it._name);
          it._tierRendered = t;
        }
      }
    }
  }

  // v0.61.111 — operator point 2: turning the Attractions overlay on
  // frames the map to the attractions, mirroring the bot's "View N
  // Train Stations" fit. Single attraction → centre + z17; multiple →
  // fitBounds with 80 px padding.
  // v0.61.112 — frame the whole attraction set (not a radius subset):
  // the attractions layer is no longer radius-clipped, so applyVisibility
  // shows them all and the frame must match.
  function frameAttractions(entry) {
    const pts = (entry.items || []).filter((it) =>
      Number.isFinite(it.lat) && Number.isFinite(it.lng));
    if (!pts.length) return;
    if (pts.length === 1) {
      map.setCenter({ lat: pts[0].lat, lng: pts[0].lng });
      map.setZoom(17);
      return;
    }
    const bounds = new googleMaps.LatLngBounds();
    for (const p of pts) bounds.extend({ lat: p.lat, lng: p.lng });
    map.fitBounds(bounds, 80);
  }

  return {
    // v0.61.22 — let the host TMA close the overlay popup (in-card ✕ /
    // tap-elsewhere) alongside its own venue/station InfoWindow.
    // v0.61.68 — also clears the station card's transient bus-stop pins,
    // so a tap on the empty map removes them (when Bus Stop is off).
    // v0.61.91 — closing the station info card (the in-card ✕ or a
    // tap-out) reverts the tapped station's marker from the forced full
    // pill back to its zoom-tier mode (square / code chip).
    closeInfo() {
      if (detailStation) { exitStationDetail(); return; }
      info.close();
      clearStationBusStops();
      clearStationExitPins();
    },
    async setLayer(name, visible) {
      if (destroyed) return;
      if (!visible && !layers[name]) return;
      const entry = await ensureLayer(name);
      if (!entry || destroyed) return;
      entry.visible = visible;
      // v0.61.17 — turning the train layer off also clears any active
      // station-detail view.
      if (name === 'train' && !visible && detailStation) {
        detailStation = null;
        detailStations = [];
        info.close();
      }
      // v0.61.68 — when the Bus Stop overlay turns on, drop the card's
      // transient station bus pins so they don't duplicate the layer.
      // v0.61.82 — CR-6: same for the Exit overlay vs the card's exit pins.
      if (name === 'busstop' && visible) clearStationBusStops();
      if (name === 'exits' && visible) clearStationExitPins();
      applyVisibility(name);
      // v0.61.111 — auto-frame the map to the attractions when the
      // layer turns on (operator point 2).
      if (name === 'attractions' && visible) frameAttractions(entry);
      // v0.61.26 — leaving station-detail un-scopes the Exits / Taxis
      // chips back to the anchor radius.
      if (name === 'train' && !visible) syncDetailAmenityLayers();
    },
    // Map viewport centre — re-clips every radius-filtered layer.
    setAnchor(lat, lng) {
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      anchor = { lat, lng };
      for (const name of Object.keys(layers)) applyVisibility(name);
    },
    // v0.61.95 — operator part 5: monochrome on/off. While on, the
    // train layer also draws a coloured SVG copy of the lines so they
    // stay coloured against the greyscaled base map.
    setMonochrome(on) {
      monochrome = !!on;
      if (layers.train) applyVisibility('train');
    },
    // v0.62.886 — the reader's locale, pushed in from a useEffect([lang]).
    setLang(l) {
      lang = l || 'en';
      setOverlayLang(lang);
    },
    // v0.61.17 — clear the station-detail view (if any).
    clearStationDetail() {
      if (detailStation) exitStationDetail();
    },
    destroy() {
      destroyed = true;
      detailStation = null;
      detailStations = [];
      clearStationBusStops();
      clearStationExitPins();
      for (const name of Object.keys(layers)) {
        layers[name].visible = false;
        applyVisibility(name);
      }
      if (colourOverlay) colourOverlay.setMap(null);
      info.close();
    }
  };
}
