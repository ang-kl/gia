// FlightGlobe.jsx — v0.62.985. Spec: doc/Feature/2026-11-11-fr24-globe-arrival-tz.spec.md, A3, I5, I6.
//
// The selected flight on a globe: a small card at the top right of the Train map, which expands to the whole screen
// on a tap; drag to turn it, ✕ to close. Origin → destination on a great circle, flown part solid up to the plane,
// the rest dashed. The look follows hongjia's opener globe (same owner): a pale sphere, a graticule, dotted land and
// thin coastlines from Natural Earth 1:110m. MrtMapPanel loads this file with import(), so neither it nor the land
// data is in the Train app's first load.
import { useEffect, useMemo, useRef, useState } from 'react';
import land from '../data/globe-land.json';
import { decodeLand, globeScene, initialView, GLOBE_C, GLOBE_R } from '../lib/flight-globe.js';
import { ft, PLANE_FILL, PLANE_PICKED } from '../lib/fr24-layer.js';

const LAND = decodeLand(land);
const ROUTE = PLANE_PICKED;

function Sphere({ scene, title }) {
  return (
    <svg viewBox="0 0 400 400" role="img" aria-label={title} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none' }}>
      <defs>
        <radialGradient id="fg-sphere" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#f7f2e8" />
          <stop offset="1" stopColor="#e6d9bf" />
        </radialGradient>
      </defs>
      <circle cx={GLOBE_C} cy={GLOBE_C} r={GLOBE_R} fill="url(#fg-sphere)" stroke="#dcc8a2" strokeWidth="1" />
      <path d={scene.grat} fill="none" stroke="#dcc8a2" strokeWidth="0.6" opacity="0.7" />
      <path d={scene.dots} fill="none" stroke="#b08d57" strokeWidth="2.7" strokeLinecap="round" opacity="0.8" />
      <path d={scene.coast} fill="none" stroke="#7a5c28" strokeWidth="0.7" opacity="0.55" strokeLinejoin="round" />
      <path d={scene.flown} fill="none" stroke={ROUTE} strokeWidth="2.8" strokeLinecap="round" data-globe-flown />
      <path d={scene.ahead} fill="none" stroke={ROUTE} strokeWidth="2.4" strokeDasharray="7 7" strokeLinecap="round" opacity="0.85" data-globe-ahead />
      {scene.pins.map((p) => (
        <g key={p.kind} transform={`translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`} data-globe-pin={p.kind}>
          {p.kind === 'plane'
            ? <circle r="7" fill={PLANE_FILL} stroke="#1F2937" strokeWidth="2" />
            : <circle r={p.kind === 'dest' ? 6 : 5} fill={p.kind === 'dest' ? '#b08d57' : '#fff'} stroke={p.kind === 'dest' ? '#fff' : '#7a5c28'} strokeWidth="2.5" />}
          {p.label && (
            <text x="10" y="4" style={{ font: "600 15px system-ui, sans-serif", fill: '#1d1b18', paintOrder: 'stroke', stroke: '#fff', strokeWidth: 3.5, strokeLinejoin: 'round' }}>{p.label}</text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function FlightGlobe({ flight, lang = 'en', full = false, onExpand, onClose, top = '92px' }) {
  const [view, setView] = useState(() => initialView(flight));
  const key = flight ? `${flight.id}|${flight.orig?.lat}|${flight.dest?.lat}` : '';
  useEffect(() => { setView(initialView(flight)); }, [key]); // a new flight turns the globe to face it
  const scene = useMemo(() => globeScene(LAND, flight, view), [flight, view]);
  const drag = useRef(null);
  const title = flight?.title || [flight?.orig?.label, flight?.dest?.label].filter(Boolean).join(' → ');

  // Drag to turn, as hongjia does: sideways turns the longitude, up and down the latitude, held within ±80°.
  const onDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, view, moved: false, w: e.currentTarget.getBoundingClientRect().width || 400 };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not every WebView allows it */ }
  };
  const onMove = (e) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    if (!full || !d.moved) return;
    const k = (0.45 * 400) / d.w;
    setView({ lng: d.view.lng - dx * k, lat: Math.max(-80, Math.min(80, d.view.lat + dy * k)) });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!full && d && !d.moved) onExpand?.();   // the small card: a tap expands it
  };
  const handlers = { onPointerDown: onDown, onPointerMove: onMove, onPointerUp: onUp, onPointerCancel: () => { drag.current = null; } };

  if (!full) {
    return (
      <div
        className="absolute right-2 z-20 rounded-xl shadow-lg overflow-hidden"
        style={{ top, width: 148, background: '#fffaf0', cursor: 'pointer', border: '1px solid #e6d9bf' }}
        role="button"
        tabIndex={0}
        aria-label={`${title} · ${ft('globe.expand', lang)}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onExpand?.(); } }}
        data-flight-globe="card"
        {...handlers}
      >
        <div className="flex items-center justify-between px-2 pt-1 text-[10px] font-semibold" style={{ color: '#5b4520' }}>
          <span className="truncate">✈ {title}</span>
          <button type="button" aria-label={ft('btn.close', lang)} className="ml-1 px-1" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onClose?.(); }}>✕</button>
        </div>
        <Sphere scene={scene} title={title} />
        <div className="px-2 pb-1 text-[9px]" style={{ color: '#7a5c28' }}>{ft('globe.expand', lang)}</div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3" style={{ background: 'rgba(17,24,39,0.88)' }} data-flight-globe="full" role="dialog" aria-label={title}>
      <div className="w-full max-w-[560px] flex items-center justify-between mb-2" style={{ color: '#FDE68A' }}>
        <span className="text-sm font-semibold truncate">✈ {title}</span>
        <button type="button" aria-label={ft('btn.close', lang)} className="px-2 py-1 rounded border border-amber-300 text-sm" onClick={() => onClose?.()}>✕</button>
      </div>
      <div className="w-full max-w-[min(92vw,72vh,560px)]" style={{ cursor: 'grab' }} {...handlers}>
        <Sphere scene={scene} title={title} />
      </div>
      <div className="mt-2 text-[11px]" style={{ color: '#E5E7EB' }}>{ft('globe.drag', lang)} · Natural Earth</div>
    </div>
  );
}
