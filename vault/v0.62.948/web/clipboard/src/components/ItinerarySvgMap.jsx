// ItinerarySvgMap — the PRINT renderer.
//
// On screen the itinerary uses a live Google map, like every other TMA. This
// exists only because that map cannot be printed: it is a WebGL canvas of
// raster tiles, browsers routinely print it blank or as grey boxes, and
// Google's terms restrict reuse of captured tiles. There is no Static Maps
// call here — that is a paid endpoint and a G4 gate.
//
// So the printed page gets a vector schematic: no basemap, no streets, just
// the drawer circles, the legs, the numbered pins and a 1 km scale bar. It
// prints at full resolution and works with no key and no network.
//
// Geometry comes from lib/itinerary.js — the same module the Google map
// draws from — so the printed page cannot drift from the screen.

import React from 'react';
import { mappable, haversineKm } from '../lib/itinerary.js';

const W = 520, H = 380, PAD = 34;

// Equirectangular with a cos(lat) correction on longitude. At city scale the
// distortion is far below the width of a pin.
function project(points) {
  const lat0 = points.reduce((a, p) => a + p.lat, 0) / points.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = points.map((p) => p.lng * k);
  const lats = points.map((p) => p.lat);
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  let y0 = Math.min(...lats), y1 = Math.max(...lats);
  if (x1 - x0 < 1e-6) { x0 -= 5e-4; x1 += 5e-4; }
  if (y1 - y0 < 1e-6) { y0 -= 5e-4; y1 += 5e-4; }
  const scale = Math.min((W - PAD * 2) / (x1 - x0), (H - PAD * 2) / (y1 - y0));
  const offX = (W - (x1 - x0) * scale) / 2;
  const offY = (H - (y1 - y0) * scale) / 2;
  return {
    scale,
    to: (p) => ({ x: offX + (p.lng * k - x0) * scale, y: H - (offY + (p.lat - y0) * scale) })
  };
}

export default function ItinerarySvgMap({ drawers, zones, legs, layers, noun = '1 km' }) {
  const pins = [];
  const anchors = [];
  drawers.forEach((d) => {
    if (d.anchor) anchors.push({ ...d.anchor, color: d.color });
    d.stops.forEach((s, si) => {
      if (mappable(s)) pins.push({ ...s, color: d.color, id: `${d.idx + 1}.${si + 1}` });
    });
  });

  const fit = zones.concat(pins, anchors);
  if (!fit.length) return null;

  const proj = project(fit);
  const kmPx = (1 / 111.32) * proj.scale;
  const zp = zones.map((z) => ({ ...z, ...proj.to(z) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
         aria-label={`Itinerary schematic: ${zones.length} drawers, ${pins.length} stops`}>
      {layers.zones && zp.map((z) => {
        // A drawer with one candidate has zero spread, so the circle gets a
        // floor — enough to hold the name and to read as the same kind of
        // mark as the others.
        const r = Math.max(z.spreadKm * kmPx + 16, 30);
        return (
          <g key={`z${z.idx}`}>
            <circle cx={z.x} cy={z.y} r={r} fill={z.color} fillOpacity="0.10" stroke={z.color} strokeWidth="1.5" />
            <text x={z.x} y={z.y} fill={z.color} textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize: 10, fontWeight: 700, paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3.5 }}>
              {z.name}
            </text>
          </g>
        );
      })}

      {layers.legs && legs.map((h, i) => {
        const a = proj.to(h.from.z), b = proj.to(h.to.z);
        return (
          <g key={`l${i}`}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke={h.tight ? '#d1495b' : '#7e88a8'} strokeWidth={h.tight ? 2 : 1.5}
                  opacity={h.tight ? 1 : 0.6} />
            <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 5} textAnchor="middle"
                  fill={h.tight ? '#d1495b' : '#7e88a8'}
                  style={{ fontSize: 9, fontWeight: h.tight ? 700 : 400, paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3 }}>
              {h.km.toFixed(1)} km
            </text>
          </g>
        );
      })}

      {layers.anchors && anchors.map((a, i) => {
        const p = proj.to(a);
        return (
          <g key={`a${i}`} transform={`translate(${p.x},${p.y})`}>
            <rect x="-6" y="-6" width="12" height="12" transform="rotate(45)" fill="none" stroke={a.color} strokeWidth="2" />
          </g>
        );
      })}

      {layers.pins && pins.map((p) => {
        const q = proj.to(p);
        return (
          <g key={p.id} transform={`translate(${q.x},${q.y})`}>
            <circle r="12" fill={p.color} />
            <text y="0.5" textAnchor="middle" dominantBaseline="central"
                  style={{ fontSize: 9.5, fontWeight: 700, fill: '#fff' }}>{p.id}</text>
          </g>
        );
      })}

      <g transform={`translate(${PAD},${H - 14})`}>
        <line x1="0" y1="0" x2={kmPx} y2="0" stroke="#7e88a8" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke="#7e88a8" />
        <line x1={kmPx} y1="-4" x2={kmPx} y2="4" stroke="#7e88a8" />
        <text x={kmPx / 2} y="-7" textAnchor="middle" fill="#7e88a8" style={{ fontSize: 9 }}>{noun}</text>
      </g>
    </svg>
  );
}

export { haversineKm };
