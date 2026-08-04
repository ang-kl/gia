// ItineraryMapSheet — the Sketchbook itinerary map.
//
// A pull-out drawer over the cabinet, with a LIVE Google map (same loader,
// same AdvancedMarkerElement pins, same gesture handling as Cuisine / Hawker /
// Transport — Clipboard is no longer the one TMA whose map cannot zoom), a
// Material 3 layer panel, and a printable stop list separated by drawer.
//
// The SVG schematic is still here, but only for print: see ItinerarySvgMap.
//
// PHYSICS come from the shared BottomSheet — snaps [0.14, 0.48, 0.80],
// 140ms velocity projection, rubber-band overdrag, per-device friction. Not
// re-implemented here, on purpose.
//
// See instr/GIA_Sketchbook_Itinerary_Map_AI_Prompt.md.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import BottomSheet from '../../../_shared/components/BottomSheet.jsx';
import ItineraryLayers from './ItineraryLayers.jsx';
import ItinerarySvgMap from './ItinerarySvgMap.jsx';
import { loadGoogleMaps } from '../../../_shared/lib/gmaps-loader.js';
import { buildItinerary, drawerZone, visibleLegs, dayParts, mappable, mapsUrl, toPlainText } from '../lib/itinerary.js';
import { t } from '../lib/i18n.js';
import { haptic } from '../lib/tg.js';

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// The Hawker teardrop, not a bare dot — a pin should read as a pin.
function pinNode(label, color) {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    `width:26px;height:26px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);` +
    `background:${color};border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.35);` +
    `display:flex;align-items:center;justify-content:center;`;
  const span = document.createElement('span');
  span.textContent = label;
  span.style.cssText = 'transform:rotate(45deg);color:#fff;font-size:9.5px;font-weight:700;font-family:ui-monospace,monospace;';
  wrap.appendChild(span);
  return wrap;
}

export default function ItineraryMapSheet({ payload, lang, onClose }) {
  const model = useMemo(() => buildItinerary(payload, lang), [payload, lang]);
  const { drawers, totalStops, mappedStops } = model;

  const [drawerOn, setDrawerOn] = useState(() => {
    const o = {}; drawers.forEach((d) => { o[d.idx] = true; }); return o;
  });
  const [layers, setLayers] = useState({ zones: true, legs: true, pins: true, anchors: true });
  const [mapState, setMapState] = useState('loading');   // loading | ready | nokey | error
  const [copied, setCopied] = useState(false);

  const hostRef = useRef(null);
  const mapRef = useRef(null);
  const gmapsRef = useRef(null);
  const markersRef = useRef([]);
  const shapesRef = useRef([]);
  const infoRef = useRef(null);

  const visible = useMemo(() => drawers.filter((d) => drawerOn[d.idx]), [drawers, drawerOn]);
  const zones = useMemo(
    () => visible.map(drawerZone).filter(Boolean), [visible]);
  const legs = useMemo(
    () => visibleLegs(drawers, (i) => drawerOn[i]), [drawers, drawerOn]);
  const parts = useMemo(() => dayParts(drawers), [drawers]);

  const unmapped = totalStops - mappedStops;

  /* ── boot the map once ─────────────────────────────────────────────── */
  useEffect(() => {
    let dead = false;
    loadGoogleMaps()
      .then(({ maps, mapId }) => {
        if (dead || !hostRef.current) return;
        gmapsRef.current = maps;
        mapRef.current = new maps.Map(hostRef.current, {
          center: { lat: 1.3521, lng: 103.8198 }, zoom: 12,
          // Identical to the other three panels. `clickableIcons:false`
          // suppresses Google's own POI cards so a tap hits our pin;
          // `minZoom:7` is a hang fix, not a preference.
          disableDefaultUI: true, zoomControl: false, cameraControl: false,
          clickableIcons: false, keyboardShortcuts: true,
          minZoom: 7, maxZoom: 20, gestureHandling: 'greedy', mapId
        });
        infoRef.current = new maps.InfoWindow({ headerDisabled: true, disableAutoPan: false });
        setMapState('ready');
      })
      .catch((err) => { if (!dead) setMapState(String(err && err.message) === 'nokey' ? 'nokey' : 'error'); });
    return () => { dead = true; };
  }, []);

  /* ── redraw whenever the visible selection changes ──────────────────── */
  useEffect(() => {
    const maps = gmapsRef.current, map = mapRef.current;
    if (mapState !== 'ready' || !maps || !map) return;

    markersRef.current.forEach((m) => { m.map = null; });
    markersRef.current = [];
    shapesRef.current.forEach((s) => s.setMap(null));
    shapesRef.current = [];

    const bounds = new maps.LatLngBounds();
    let any = false;

    if (layers.zones) {
      zones.forEach((z) => {
        const c = new maps.Circle({
          map, center: { lat: z.lat, lng: z.lng },
          // Metres. The floor keeps a single-stop drawer visible as the same
          // kind of mark as the others rather than collapsing to a dot.
          radius: Math.max(z.spreadKm * 1000 + 120, 220),
          strokeColor: z.color, strokeOpacity: 0.9, strokeWeight: 1.5,
          fillColor: z.color, fillOpacity: 0.1, clickable: false
        });
        shapesRef.current.push(c);
      });
    }

    if (layers.legs) {
      legs.forEach((h) => {
        const line = new maps.Polyline({
          map,
          path: [{ lat: h.from.z.lat, lng: h.from.z.lng }, { lat: h.to.z.lat, lng: h.to.z.lng }],
          strokeColor: h.tight ? '#d1495b' : '#7e88a8',
          strokeOpacity: h.tight ? 1 : 0.6,
          strokeWeight: h.tight ? 3 : 2,
          clickable: false
        });
        shapesRef.current.push(line);
      });
    }

    visible.forEach((d) => {
      if (layers.anchors && d.anchor) {
        bounds.extend({ lat: d.anchor.lat, lng: d.anchor.lng }); any = true;
      }
      if (!layers.pins) return;
      d.stops.forEach((s, si) => {
        if (!mappable(s)) return;
        const id = `${d.idx + 1}.${si + 1}`;
        const marker = new maps.marker.AdvancedMarkerElement({
          map, position: { lat: s.lat, lng: s.lng },
          content: pinNode(id, d.color), gmpClickable: true, zIndex: 1000,
          title: `${id} — ${s.name}`
        });
        marker.addListener('click', () => {
          infoRef.current.setContent(
            `<div style="font:13px/1.4 system-ui;color:#141a36;max-width:210px">` +
            `<b>${escapeHtml(id)} · ${escapeHtml(s.name)}</b>` +
            (s.addr ? `<br><span style="color:#7e88a8">${escapeHtml(s.addr)}</span>` : '') +
            (s.rating ? `<br>★${escapeHtml(s.rating.toFixed(1))}` : '') +
            `</div>`);
          infoRef.current.open({ map, anchor: marker });
          const row = document.getElementById(`itin-stop-${d.idx}-${si}`);
          if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        markersRef.current.push(marker);
        bounds.extend({ lat: s.lat, lng: s.lng });
        any = true;
      });
    });

    if (any) {
      map.fitBounds(bounds, 48);
      // Two near-identical pins make fitBounds zoom in absurdly close — the
      // same clamp Cuisine carries.
      const once = maps.event.addListenerOnce(map, 'idle', () => {
        if (map.getZoom() > 16) map.setZoom(16);
      });
      shapesRef.current.push({ setMap: () => maps.event.removeListener(once) });
    }
  }, [mapState, zones, legs, visible, layers]);

  /* ── objectives (1): print · copy · share ──────────────────────────── */
  const doPrint = () => { haptic('light'); window.print(); };

  const doCopy = async () => {
    // Cuisine's copy UX: the app STAYS OPEN and the button confirms for 3s.
    // Never tg().close() — that was O-95, and it is settled.
    const text = toPlainText({ cabinet: payload.cabinet, drawers: visible, legs, lang });
    try {
      await navigator.clipboard.writeText(text);
      haptic('light'); setCopied(true); setTimeout(() => setCopied(false), 3000);
    } catch { /* clipboard unavailable */ }
  };

  const btnPrimary = 'flex-1 py-2 rounded-lg bg-tg-accent text-tg-accent-text text-sm font-semibold';
  const btnSecondary = 'flex-1 py-2 rounded-lg border border-tg-border text-sm';

  return (
    <BottomSheet
      // Below Clipboard's z-20 footer nav, so the app's primary navigation
      // stays reachable — exactly how this component sits under Hawker's and
      // Transport's z-40 footers. `footerPad` is what leaves room for it.
      zClass="z-[15]"
      className="gia-itin-sheet"
      ariaLabel={t('itin.resize', lang)}
      snaps={[0.14, 0.48, 0.80]}
      initialSnap={1}
    >
      <div className="px-3 pb-4">
        <div className="flex items-baseline gap-2 mb-2">
          <h2 className="text-sm font-semibold flex-1 truncate">{t('itin.title', lang)}</h2>
          <span className="font-mono text-[11px] text-tg-hint">
            {t('itin.stopCount', lang, { n: mappedStops })}
          </span>
          <button onClick={onClose} className="gia-hit text-tg-hint text-sm gia-print-hide" aria-label={t('chrome.close', lang)}>✕</button>
        </div>

        <div className="flex gap-1.5 mb-2 gia-print-hide">
          <button type="button" onClick={doPrint} className={btnPrimary}>{t('itin.print', lang)}</button>
          <button type="button" onClick={doCopy} className={btnSecondary}>
            {copied ? t('itin.copied', lang) : t('itin.copy', lang)}
          </button>
        </div>

        {unmapped > 0 && (
          <p className="text-[11px] text-tg-hint bg-sk-soft rounded-md px-2 py-1.5 mb-2">
            {t('itin.unmappedNote', lang, { mapped: mappedStops, total: totalStops, n: unmapped })}
          </p>
        )}

        <ItineraryLayers
          parts={parts} layers={layers} drawerOn={drawerOn} lang={lang}
          onToggleLayer={(k, v) => setLayers((s) => ({ ...s, [k]: v }))}
          onToggleDrawer={(i, v) => setDrawerOn((s) => ({ ...s, [i]: v }))}
          onTogglePart={(p, v) => setDrawerOn((s) => {
            const n = { ...s }; p.items.forEach((d) => { n[d.idx] = v; }); return n;
          })}
        />

        {/* Screen: the live Google map. */}
        <div className="gia-print-hide bg-tg-card border border-tg-border rounded-xl overflow-hidden mb-2 relative" style={{ height: 240 }}>
          <div ref={hostRef} className="w-full h-full" />
          {mapState !== 'ready' && (
            <div className="absolute inset-0 grid place-items-center text-[12px] text-tg-hint bg-tg-card px-4 text-center">
              {t(mapState === 'nokey' ? 'itin.map.nokey' : mapState === 'error' ? 'itin.map.error' : 'itin.map.loading', lang)}
            </div>
          )}
        </div>

        {/* Print: the SVG. A WebGL canvas of raster tiles prints blank. */}
        <div className="gia-print-only mb-2">
          <ItinerarySvgMap drawers={visible} zones={zones} legs={legs} layers={layers} />
        </div>

        {/* The list, separated by drawer, with the travel leg between them. */}
        {visible.map((d) => {
          const leg = legs.find((h) => h.to.d.idx === d.idx);
          return (
            <div key={d.idx} className="gia-itin-drawer">
              {leg && (
                <div className={`flex flex-wrap items-baseline gap-x-2.5 my-2 ml-2 px-2 py-1.5 text-[11.5px] border-l-2 border-dashed ${
                  leg.tight ? 'border-sk-pin text-sk-pin bg-sk-pin/[0.07] rounded-r-md' : 'border-tg-border text-tg-hint'}`}>
                  <b className="font-mono tabular-nums">{leg.km.toFixed(1)} km</b>
                  <span>{leg.gapMin > 0 ? t('itin.gap', lang, { n: leg.gapMin }) : t('itin.noGap', lang)}</span>
                  {leg.tight && <span className="font-semibold">{t('itin.tight', lang)}</span>}
                </div>
              )}
              <div className="rounded-xl border border-tg-border bg-tg-card p-2.5 mb-1.5" style={{ borderLeft: `4px solid ${d.color}` }}>
                <div className="flex items-baseline gap-2">
                  <span className="flex-none w-5 h-5 rounded-full grid place-items-center font-mono text-[10px] font-bold text-white"
                        style={{ background: d.color }} aria-hidden>{d.idx + 1}</span>
                  <b className="text-[12.5px]">{d.emoji} {d.name}</b>
                  <span className="font-mono text-[10px] text-tg-hint ml-auto">{d.time}</span>
                </div>
                {d.dayTag && <div className="text-[10px] text-tg-hint mt-0.5">{d.dayTag}</div>}
                {d.anchor && d.anchor.label && <div className="text-[10px] text-tg-hint mt-0.5">◇ {d.anchor.label}</div>}
                {d.stops.length > 1 && (
                  <div className="text-[10px] text-tg-hint italic mt-1">{t('itin.candidates', lang, { n: d.stops.length })}</div>
                )}

                {d.stops.map((s, si) => {
                  const can = mappable(s);
                  return (
                    <div key={si} id={`itin-stop-${d.idx}-${si}`} className={`mt-2 pt-2 border-t border-tg-border ${can ? '' : 'opacity-60'}`}>
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-mono text-[10px] font-bold" style={{ color: can ? d.color : '#7e88a8' }}>
                          {can ? `${d.idx + 1}.${si + 1}` : '—'}
                        </span>
                        <b className="text-[12px] flex-1 min-w-0">{s.name}</b>
                        {s.rating != null && <span className="text-[10px] text-tg-hint">★{s.rating.toFixed(1)}</span>}
                      </div>
                      {s.addr && <div className="text-[10.5px] text-tg-hint mt-0.5">{s.addr}</div>}
                      {!!s.tags.length && <div className="text-[10px] text-tg-hint mt-0.5">{s.tags.join(' · ')}</div>}
                      {s.note && <div className="text-[10.5px] mt-0.5 italic">✎ {s.note}</div>}
                      {can
                        ? <a href={mapsUrl(s)} target="_blank" rel="noreferrer" className="inline-block text-[10.5px] text-tg-accent mt-0.5">{t('itin.openMaps', lang)}</a>
                        : <div className="text-[10px] text-tg-hint mt-0.5">{t('itin.noCoords', lang)}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <p className="text-[10px] text-tg-hint mt-2 leading-relaxed">{t('itin.foot', lang)}</p>
      </div>
    </BottomSheet>
  );
}
