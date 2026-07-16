import React, { useEffect, useState } from 'react';
import { openLink, initData, tg } from './tg.js';
import { t, tn, useLocale } from './i18n.js';
import HawkerMapPanel from './components/HawkerMapPanel.jsx';
import { codeHex } from './lib/mapOverlays.js';
import FooterNav from '../../_shared/components/FooterNav.jsx';
import WeatherBadge from '../../_shared/components/WeatherBadge.jsx';
import { useViewport, viewportTag } from '../../_shared/lib/use-viewport.js';
import LocaleToggle from './components/LocaleToggle.jsx';

// v0.60.59 — render "🍳 38 stalls · Operating" / "🍳 38 stands ·
// Opérationnel" when stall count and/or status are known. Replaces
// the v0.60.53 closure-tag helper (closures dataset retired by NEA).
// Status values come from the data.gov.sg dataset (typical: "Existing",
// "Under Construction"); we localise via stalls.status.<key> when a
// translation exists, otherwise fall through to the raw English label.
function formatStalls(centre, lang) {
  const bits = [];
  if (Number.isFinite(centre.stalls) && centre.stalls > 0) {
    bits.push(tn('stalls.count', lang, { n: centre.stalls }));
  }
  if (centre.status) {
    const slug = centre.status.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const key = `stalls.status.${slug}`;
    const localised = t(key, lang);
    bits.push(localised === key ? centre.status : localised);
  }
  return bits.join(' · ');
}

// v0.62.547 — the localised NEA status ("Operating"/"Under Construction") on its
// own, for the Cuisine-style status chip (formatStalls joins it with the stall
// count; here we want it separately). Mirrors formatStalls' status lookup.
function statusLabel(centre, lang) {
  if (!centre.status) return '';
  const slug = centre.status.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const key = `stalls.status.${slug}`;
  const localised = t(key, lang);
  return localised === key ? centre.status : localised;
}
// "Operating"/"Existing" → the good (green) state; anything else (Under
// Construction, …) → the amber caution state.
function statusIsOpen(centre) {
  return /^(oper|exist)/i.test(String(centre.status || ''));
}

// v0.62.548 — tablet/desktop list⇄map toggle, docked at the BOTTOM-RIGHT just
// above the FooterNav (operator: "next to the bottom right (end, down, etc)").
// 🗺 Map = hide the list/carousel to reveal the full map; 📋 List = bring it
// back. The old top-right placement collided with Telegram's fullscreen controls.
function MapToggle({ isHidden, onToggle, lang }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isHidden}
      className="fixed right-3 z-50 skeuo-pill text-[11px] font-semibold px-3 py-1.5 rounded-full text-tg-text active:scale-95 shadow-lg"
      style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
    >
      {isHidden ? `📋 ${t('btn.showList', lang)}` : `🗺 ${t('btn.showMap', lang)}`}
    </button>
  );
}

const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';
const NEA_HOME = 'https://www.nea.gov.sg/our-services/hawker-management';
const REGION_EMOJI = {
  Central: '🏙️', South: '🛳️', East: '🌅', North: '🌳', West: '🌇'
};

// v0.56.0 — TMA simplified per Human Lead. Only the regional browser
// remains. Closures, R&R, About tabs removed (the LLM scrape was
// unreliable; users now see only the deterministic 122-centre vault).
// TMA renamed: "Hawker Centre Status" → "Hawker Centre".
// v0.59.15 — full FR localisation. Reads locale from the same
// localStorage key the cuisine TMA uses ('gia.locale'); flips
// instantly on the 'gia:locale' CustomEvent so the user's /language
// or cuisine-TMA toggle propagates here without a reload.
export default function App() {
  const lang = useLocale();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState(null);
  const [activeRegion, setActiveRegion] = useState('Central');
  const [savingName, setSavingName] = useState(null);
  // v0.62.547 — tablet "list" toggle (operator, mirrors Cuisine's hide-results):
  // hide the list/panel to reveal the full-bleed map, and bring it back.
  const [listHidden, setListHidden] = useState(false);
  // v0.62.550 — operator (point 4a): in the PORTRAIT tablet/desktop layout the map
  // is anchored at the top with a separate scrollable list panel below; tapping
  // the map's ⇲ expand flips `mapExpanded` so the layout switches to the full-map
  // + bottom-carousel (the point-2 landscape carousel), and ⇱ collapses back.
  const [mapExpanded, setMapExpanded] = useState(false);
  // v0.62.549 — operator: a station / bus-stop pill in a card is a two-tap
  // control. 1st tap → highlight the point on the embedded map (3 s pulse) and
  // mark THIS pill toggled (only one at a time); 2nd tap on the same pill →
  // open external Google Maps and clear the toggle. `activePill` is the toggled
  // pill's id, or null.
  const [activePill, setActivePill] = useState(null);
  const handlePillTap = (id, lat, lng, url) => {
    if (activePill === id) {
      if (url) openLink(url);
      setActivePill(null);
    } else {
      if (Number.isFinite(lat) && Number.isFinite(lng) && typeof window !== 'undefined') {
        window.__giaHawkerHighlight?.(lat, lng);
      }
      setActivePill(id);
    }
  };
  // v0.61.0 — map overlay layer toggles (parks / attractions / taxis).
  const [overlayLayers, setOverlayLayers] = useState({ attractions: false, carpark: false, busstop: false, colour: true, train: true, exits: false, taxis: false, parks: false, police: false, clinics: false, hospitals: false });
  // v0.65.0 — per-centre transit (nearest MRT station + 2 bus stops),
  // lazy-fetched per active region from /api/hawker/centre-transit.
  const [transitByName, setTransitByName] = useState({});
  // v0.60.96 — operator: "flip to Top when I am at the bottom of the
  // screen". Detect when user has scrolled to (or near) the bottom of
  // the document, not just past the hero. Threshold 50 px to absorb
  // momentum-overshoot on iOS. FAB labels "⇣ down" while there's more
  // to scroll; "⇡ top" when there isn't.
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const reached = window.scrollY + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setAtBottom(reached >= fullH - 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // v0.60.53 — POST /api/hawker/save-pick. Server validates initData,
  // looks up the centre in the vault, and sends a formatted chat card
  // back via the bot. On success, close the WebApp.
  const saveToChat = async (centreName) => {
    if (savingName) return;
    setSavingName(centreName);
    try {
      const res = await fetch('/api/hawker/save-pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: initData(), centreName })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const w = tg();
      if (w && typeof w.close === 'function') w.close();
    } catch (e) {
      const w = tg();
      const msg = t('msg.saveFailed', lang);
      if (w && typeof w.showAlert === 'function') w.showAlert(msg);
      else alert(msg);
      console.warn('[hawker] save-to-chat failed:', e.message);
    } finally {
      setSavingName(null);
    }
  };

  useEffect(() => {
    fetch('/api/hawker/centres-by-region')
      .then((r) => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then((b) => setData(b))
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  }, []);

  const regionList = data?.regions || [];
  const active = regionList.find((r) => r.region === activeRegion);

  // v0.65.0 — fetch transit (nearest station + bus stops) for every
  // centre of the active region; results merge into transitByName.
  useEffect(() => {
    const act = (data?.regions || []).find((r) => r.region === activeRegion);
    if (!act || !Array.isArray(act.centres)) return undefined;
    let cancelled = false;
    const todo = act.centres.filter(
      (c) => Number.isFinite(c.lat) && Number.isFinite(c.lng) && !transitByName[c.name]
    );
    if (!todo.length) return undefined;
    Promise.all(todo.map((c) =>
      fetch(`/api/hawker/centre-transit?lat=${c.lat}&lng=${c.lng}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => ({ name: c.name, data: d }))
        .catch(() => ({ name: c.name, data: null }))
    )).then((results) => {
      if (cancelled) return;
      setTransitByName((prev) => {
        const next = { ...prev };
        for (const r of results) if (r.data) next[r.name] = r.data;
        return next;
      });
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRegion, data]);

  // v0.60.40 — when the active region's centres carry lat/lng (from
  // data/hawker-coords.json populated by scripts/fetch-hawker-coords.js),
  // build a soleat /app/map multi-pin URL so users see all N pins on
  // one map. Falls back to the v0.50 Google Maps free-text query when
  // coords aren't present (e.g. before the geocode JSON is committed).
  const buildMultiPinUrl = (centres) => {
    const slim = (centres || [])
      .filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
      .map((c) => ({
        placeId: '',
        name: c.name,
        area: c.address || '',
        lat: c.lat,
        lng: c.lng,
        url: c.mapsUrl || ''
      }));
    if (!slim.length) return null;
    const enc = btoa(unescape(encodeURIComponent(JSON.stringify(slim))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    return `/app/map#venues=${enc}`;
  };
  const multiPinUrl = active ? buildMultiPinUrl(active.centres) : null;
  const fallbackGoogleUrl = active
    ? `https://maps.google.com/?q=${encodeURIComponent('hawker centres ' + activeRegion + ' Singapore')}`
    : '';
  const allOnMapUrl = multiPinUrl || fallbackGoogleUrl;

  // Localised region label — the API returns canonical EN names
  // (Central/South/East/North/West); we render the FR equivalent at
  // chip + heading time via `region.<EN>` keys.
  const regionLabel = (en) => t(`region.${en}`, lang);

  // v0.62.544 — tablet/desktop (iPad Pro) layout. `isWide` gates it.
  const vp = useViewport();
  const isWide = vp.isWide;
  // v0.62.548 — LANDSCAPE tablet/desktop = the Cuisine-style layout: the map
  // fills the whole screen and the cards ride a bottom-docked horizontal
  // CAROUSEL (operator: "In landscape it should be like Cuisine TMA Carousel
  // Result cards"), with a slim header + region chips on a top bar over the map.
  // PORTRAIT tablet stacks (inline map on top, 2-col card grid below); phones
  // stay single-column.
  const landscapeTablet = isWide && vp.orientation === 'landscape';
  // v0.62.550 — PORTRAIT tablet/desktop = anchored-map + separate scrollable list
  // panel; the map's ⇲ expand switches it to the full-map carousel (point 4a).
  const portraitTablet = isWide && vp.orientation === 'portrait';
  const footerTag = viewportTag(vp);
  // Stacked-layout list grid (portrait tablet = 2 cols, phones = single column).
  const listClass = isWide ? 'grid grid-cols-2 gap-1.5 mt-1' : 'flex flex-col gap-1.5 mt-1';

  // v0.62.548 — one centre card, shared by the portrait/mobile grid AND the
  // landscape carousel. Cuisine-style: numbered name header, 📇 address, stall +
  // status chip, codeHex MRT line-code chips + station name, and bus-stop pills
  // that now carry the stop DESCRIPTION (operator: "Bus Stop 41129 · Opposite
  // S'pore Bible College") — mirroring the map InfoWindow's `🚌 code desc`
  // standard. Rounded-full pill actions (📍 Maps / Save to chat).
  const renderCentreCard = (c, i) => {
    const tr = transitByName[c.name];
    return (
      // v0.62.549 — opaque card surface (operator: carousel cards in focus with
      // an opaque background = the card background colour, not translucent).
      <div className="rounded-lg border border-tg-border bg-tg-card p-2.5 text-xs flex flex-col gap-1">
        <div className="font-semibold text-[13px] leading-tight text-tg-text">
          <span className="text-tg-hint font-semibold tabular-nums">{i + 1} · </span>{c.name}{c.isNew ? ' 🆕' : ''}
        </div>
        {c.address && <div className="text-[11px] text-tg-hint leading-snug">📇 {c.address}</div>}
        {(Number.isFinite(c.stalls) || c.status) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {Number.isFinite(c.stalls) && c.stalls > 0 && (
              <span className="text-[10px] text-tg-text/80">🍳 {tn('stalls.count', lang, { n: c.stalls })}</span>
            )}
            {c.status && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusIsOpen(c) ? 'bg-green-600/20 text-green-500' : 'bg-amber-500/20 text-amber-600'}`}>
                {statusLabel(c, lang)}
              </span>
            )}
          </div>
        )}
        {/* v0.65.0/0.62.549 — nearest MRT (codeHex chips + station name) + bus
            stops (pills WITH description). Two-tap (operator): 1st tap highlights
            the point on the embedded map (3 s pulse) + toggles the pill to a pale
            accent; 2nd tap opens external Google Maps + clears the toggle. */}
        {tr && (tr.station || (tr.busStops || []).length) && (
          <div className="flex flex-col gap-1">
            {tr.station && (() => {
              const id = `${c.name}|stn`;
              const on = activePill === id;
              return (
                <button type="button"
                  aria-pressed={on}
                  onClick={() => handlePillTap(id, tr.station.lat, tr.station.lng,
                    `https://maps.google.com/?q=${encodeURIComponent(`${tr.station.name || ''} MRT Station Singapore`)}`)}
                  className={`self-start flex items-center flex-wrap gap-1 text-[11px] rounded px-1 py-0.5 border ${on ? 'bg-tg-accent/20 border-tg-accent' : 'border-transparent'}`}
                >
                  {(tr.station.codes || []).map((cd, k) => (
                    <span key={k} style={{ background: codeHex(cd) }}
                      className="text-white font-bold rounded px-1 text-[10px] leading-[1.5]">{cd}</span>
                  ))}
                  <span className="text-tg-text/80">{tr.station.name}</span>
                </button>
              );
            })()}
            {(tr.busStops || []).length > 0 && (
              <div className="flex flex-col gap-1 items-start">
                {(tr.busStops || []).map((b, j) => {
                  const desc = b.description || b.roadName || '';
                  const id = `${c.name}|bus|${b.code}`;
                  const on = activePill === id;
                  return (
                    <button key={j} type="button"
                      aria-pressed={on}
                      onClick={() => handlePillTap(id, b.lat, b.lng,
                        `https://maps.google.com/?q=${encodeURIComponent(['Bus Stop', b.code, desc, 'Singapore'].filter(Boolean).join(' '))}`)}
                      className={`rounded border px-1.5 py-0.5 text-[10px] text-tg-text leading-snug ${on ? 'bg-tg-accent/20 border-tg-accent' : 'bg-tg-bg border-tg-border'}`}>
                      🚌 {b.code}{desc ? ` · ${desc}` : ''}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5 mt-0.5">
          {c.mapsUrl && (
            <a href={c.mapsUrl} target="_blank" rel="noreferrer"
              className="text-[11px] px-2.5 py-0.5 rounded-full border border-tg-border bg-tg-bg text-tg-text">
              📍 {t('btn.maps', lang)}
            </a>
          )}
          <button type="button" onClick={() => saveToChat(c.name)}
            disabled={savingName === c.name}
            className="text-[11px] px-2.5 py-0.5 rounded-full border border-tg-border bg-tg-bg text-tg-text disabled:opacity-60">
            {savingName === c.name ? t('btn.saving', lang) : t('btn.saveToChat', lang)}
          </button>
        </div>
      </div>
    );
  };

  // v0.62.548/550 — the Cuisine-style FULL CAROUSEL: full-bleed map + a slim
  // translucent top bar (header + region chips) + a bottom-docked horizontal
  // swipe carousel of the centre cards. Used by LANDSCAPE tablet/desktop AND by
  // PORTRAIT tablet/desktop once the map is expanded (point 4a). `collapsible`
  // wires the map's ⇲/⇱ to App's `mapExpanded` so portrait can collapse back to
  // the anchored-map + list-panel view; landscape has no collapse (always full).
  const carouselLayout = (collapsible) => (
      <div className="fixed inset-0 overflow-hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0)' }}>
        {active && (
          <HawkerMapPanel centres={active.centres} region={activeRegion} overlayLayers={overlayLayers} onOverlayChange={setOverlayLayers} fill
            expanded={collapsible ? mapExpanded : null}
            onToggleExpand={collapsible ? () => setMapExpanded(false) : null} />
        )}
        {/* Top bar over the map: slim header + region chips. Cleared below
            Telegram's fullscreen top controls with the content-safe-area inset.
            v0.62.549 — operator: the temperature + NEA link move DOWN onto the
            chips row (row 2) so they no longer sit level with Telegram's top-right
            ⌄ ··· system buttons; row 1 is the title alone, padded right to clear
            those buttons. */}
        <div
          className="absolute top-0 inset-x-0 z-20 bg-tg-bg/80 backdrop-blur-md border-b border-tg-border px-2 py-1.5 flex flex-col gap-1.5"
          style={{ paddingTop: 'calc(var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px)) + 0.375rem)' }}
        >
          <div className="flex items-center pr-24">
            <h1 className="text-sm font-semibold leading-tight truncate">{t('header.title', lang)}</h1>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
              {regionList.map((r) => {
                const sel = r.region === activeRegion;
                return (
                  <button key={r.region} onClick={() => setActiveRegion(r.region)} aria-pressed={sel}
                    className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap active:scale-95 ${sel ? 'skeuo-pill--selected border border-tg-accent/50 font-semibold' : 'bg-tg-bg/90 liquid-glass text-tg-text'}`}>
                    <span className="mr-1">{REGION_EMOJI[r.region] || '·'}</span>{regionLabel(r.region)} ({r.count})
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] text-tg-hint flex items-center gap-1"><WeatherBadge /></span>
              <LocaleToggle className="flex-shrink-0" />
              <button onClick={() => openLink(NEA_HOME)} className="skeuo-pill text-[11px] px-2.5 py-1 rounded-full text-tg-text active:scale-95">NEA ↗</button>
            </div>
          </div>
        </div>
        {busy && <p className="absolute top-24 left-1/2 -translate-x-1/2 text-xs text-tg-hint bg-tg-bg/90 rounded-full px-3 py-1 z-20">{t('status.loading', lang)}</p>}
        {err && <p className="absolute top-24 left-1/2 -translate-x-1/2 text-xs text-red-500 bg-tg-bg/90 rounded-full px-3 py-1 z-20">⚠ {err}</p>}
        {/* Bottom-docked horizontal carousel (mirrors ResultCarousel.jsx): snap
            strip, cards shrink-0 with a peek of the neighbours. Hidden by the
            🗺 toggle so the map can fill completely. */}
        {active && !listHidden && (
          <div className="fixed inset-x-0 bottom-16 z-30 px-1 pb-1 pointer-events-none">
            <div
              className="flex gap-2 overflow-x-auto snap-x snap-mandatory px-[6%] pb-1 pointer-events-auto"
              style={{ scrollbarWidth: 'none' }}
            >
              {/* v0.62.549 — operator: THREE cards in focus on tablet/desktop
                  (basis ≈ 1/3), ONE card for a phone aspect ratio (basis 82%). */}
              {active.centres.map((c, i) => (
                <div key={i} className="snap-center shrink-0 basis-[82%] md:basis-[30%] max-h-[46vh] overflow-y-auto rounded-lg shadow-xl">
                  {renderCentreCard(c, i)}
                </div>
              ))}
            </div>
          </div>
        )}
        {active && <MapToggle isHidden={listHidden} onToggle={() => setListHidden((v) => !v)} lang={lang} />}
        <FooterNav
          atBottom={atBottom}
          labels={{
            top: t('btn.fabTop', lang), down: t('btn.fabDown', lang),
            topAria: t('btn.fabTopAria', lang), downAria: t('btn.fabDownAria', lang),
            back: t('btn.fabBack', lang), end: t('btn.fabEnd', lang),
            backAria: t('btn.fabBackAria', lang), endAria: t('btn.fabEndAria', lang)
          }}
        />
      </div>
  );

  // v0.62.550 — PORTRAIT tablet/desktop panel (point 4a): header + region chips +
  // the map ANCHORED at the top + a SEPARATE scrollable list panel below (the map
  // does not scroll away with the list). The map's ⇲ expand switches to the
  // full-map carousel above; ⇱ collapses back here.
  const portraitTabletPanel = () => (
    <div className="fixed inset-0 flex flex-col overflow-hidden"
      style={{
        paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}>
      <div className="skeuo-card mx-2 mt-2 rounded-2xl px-3 py-2 flex items-center gap-2 relative z-10 shrink-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">{t('header.title', lang)}</h1>
          <p className="text-[10px] text-tg-hint leading-tight flex items-center gap-1"><WeatherBadge /></p>
        </div>
        <LocaleToggle className="flex-shrink-0" />
        <button onClick={() => openLink(NEA_HOME)} className="skeuo-pill text-xs px-3 py-1.5 rounded-full text-tg-text active:scale-95">NEA ↗</button>
      </div>
      <div className="flex flex-wrap gap-1.5 px-3 py-1.5 shrink-0">
        {regionList.map((r) => {
          const sel = r.region === activeRegion;
          return (
            <button key={r.region} onClick={() => setActiveRegion(r.region)} aria-pressed={sel}
              className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap active:scale-95 ${sel ? 'skeuo-pill--selected border border-tg-accent/50 font-semibold' : 'bg-tg-bg/90 liquid-glass text-tg-text'}`}>
              <span className="mr-1">{REGION_EMOJI[r.region] || '·'}</span>{regionLabel(r.region)} ({r.count})
            </button>
          );
        })}
      </div>
      {/* Map anchored at the top (does not scroll with the list); ⇲ → carousel. */}
      {active && (
        <div className="px-2 shrink-0">
          <HawkerMapPanel centres={active.centres} region={activeRegion} overlayLayers={overlayLayers} onOverlayChange={setOverlayLayers}
            expanded={mapExpanded} onToggleExpand={() => setMapExpanded(true)} />
        </div>
      )}
      {/* Separate scrollable list panel (the operator's "scroll up/down" panel). */}
      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-2">
        {busy && <p className="text-xs text-tg-hint p-3">{t('status.loading', lang)}</p>}
        {err && <p className="text-xs text-red-500 p-3">⚠ {err}</p>}
        {!busy && !err && active && (
          <>
            <div className="mx-1 px-2.5 py-1 rounded-lg bg-tg-bg/90 liquid-glass text-[11px] text-tg-hint">
              <strong className="text-tg-text">{regionLabel(active.region)}</strong>
              {tn('list.headingBody', lang, { n: active.count })}
            </div>
            <div className={listClass}>
              {active.centres.map((c, i) => (
                <React.Fragment key={i}>{renderCentreCard(c, i)}</React.Fragment>
              ))}
            </div>
          </>
        )}
        <footer className="mx-2 mb-2 mt-2 px-3 py-2 text-[9px] text-tg-hint text-center">
          {t('footer.tag', lang)} · v{BUILD_VERSION}{footerTag ? ` · ${footerTag}` : ''}
        </footer>
      </div>
      <FooterNav
        atBottom={atBottom}
        labels={{
          top: t('btn.fabTop', lang), down: t('btn.fabDown', lang),
          topAria: t('btn.fabTopAria', lang), downAria: t('btn.fabDownAria', lang),
          back: t('btn.fabBack', lang), end: t('btn.fabEnd', lang),
          backAria: t('btn.fabBackAria', lang), endAria: t('btn.fabEndAria', lang)
        }}
      />
    </div>
  );

  if (landscapeTablet) return carouselLayout(false);
  if (portraitTablet && mapExpanded) return carouselLayout(true);
  if (portraitTablet) return portraitTabletPanel();

  // v0.62.548/550 — PHONES: the stacked scroll layout (inline map on top, card
  // list below). (Tablet/desktop returned a dedicated layout above.)
  return (
    <div
      className="flex flex-col"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      <div className="contents">
      {/* v0.62.164 — operator: neo-skeuomorphic header card — 🍚 title + live
          weather + a tactile NEA pill. Raised frosted surface (theme-agnostic,
          colour-blind safe); floats with a margin instead of a full-bleed
          border so it reads as a physical card. */}
      <div className="skeuo-card mx-2 mt-2 rounded-2xl px-3 py-2.5 flex items-center gap-2 relative z-10">
        {/* v0.62.x — operator: hawker header without the soleat logo. */}
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold leading-tight">{t('header.title', lang)}</h1>
          {/* v0.60.219 — live Singapore weather emoji. */}
          <p className="text-[10px] text-tg-hint leading-tight flex items-center gap-1">
            <WeatherBadge />
            {/* v0.62.x — operator: tiny ↻ refresh after the weather temp (same
                size) so a stale webview can be force-reloaded without closing. */}
            <button
              type="button"
              onClick={() => window.location.reload()}
              aria-label={lang === 'fr' ? 'Actualiser' : 'Refresh'}
              title={lang === 'fr' ? 'Actualiser' : 'Refresh'}
              className="text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
            >↻</button>
          </p>
        </div>
        <LocaleToggle className="flex-shrink-0" />
        <button onClick={() => openLink(NEA_HOME)} className="skeuo-pill text-xs px-3 py-1.5 rounded-full text-tg-text active:scale-95">
          NEA ↗
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3 flex flex-col gap-2">
        {busy && <p className="text-xs text-tg-hint p-3">{t('status.loading', lang)}</p>}
        {err && <p className="text-xs text-red-500 p-3">⚠ {err}</p>}
        {!busy && !err && (
          <>
            {/* v0.62.164 — operator: region chips as liquid-glass-80% pills
                (bg-tg-bg/80 backdrop-blur); the active region reads as a
                debossed accent (skeuo-pill--selected) — pressed-in, not just
                a flat colour, so it's distinguishable without relying on hue. */}
            <div className="flex flex-wrap gap-1.5 px-1">
              {regionList.map((r) => {
                const sel = r.region === activeRegion;
                return (
                  <button key={r.region} onClick={() => setActiveRegion(r.region)} aria-pressed={sel}
                    className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap active:scale-95 ${sel ? 'skeuo-pill--selected border border-tg-accent/50 font-semibold' : 'bg-tg-bg/90 liquid-glass text-tg-text'}`}>
                    <span className="mr-1">{REGION_EMOJI[r.region] || '·'}</span>{regionLabel(r.region)} ({r.count})
                  </button>
                );
              })}
            </div>
            {active && (
              <>
                {/* v0.62.164 — operator: the "Central — 22 …" section header as a
                    liquid-glass-80% strip (bg-tg-bg/80 backdrop-blur). */}
                <div className="mx-1 px-2.5 py-1 rounded-lg bg-tg-bg/90 liquid-glass text-[11px] text-tg-hint">
                  <strong className="text-tg-text">{regionLabel(active.region)}</strong>
                  {tn('list.headingBody', lang, { n: active.count })}
                </div>
                {/* v0.60.41 — embedded multi-pin map for the active region.
                    Falls back to a "coordinates not yet loaded" placeholder
                    when data/hawker-coords.json hasn't been bootstrapped yet. */}
                {/* v0.62.544/548 — inline map for mobile + PORTRAIT tablet (map on
                    top, list below); LANDSCAPE uses the full-bleed carousel above. */}
                <HawkerMapPanel centres={active.centres} region={activeRegion} overlayLayers={overlayLayers} onOverlayChange={setOverlayLayers} />
                {/* v0.60.56 — explicit mapped-vs-total status so the
                    user knows when the data file is incomplete (i.e.
                    fewer pins than centres in the region). */}
                <div className="px-1 text-[10px] text-tg-hint">
                  {tn('map.mappedRatio', lang, {
                    mapped: Number.isFinite(active.mappedCount) ? active.mappedCount : 0,
                    total: active.count
                  })}
                </div>
                {/* v0.60.61 — three buttons squeezed into one row:
                    1. Internal /app/map (Fullscreen) — handles all
                       centres regardless of count.
                    2. External Google Maps tour 1 (pins 1–11).
                    3. External Google Maps tour 2 (pins 12–22).
                    Google Maps URL API caps at 11 stops, so a 22-
                    centre region needs two URLs. The 📍 icon stands
                    in for "Google Maps" without claiming the brand. */}
                {/* v0.60.66 — 4-button row switches to 2x2 (grid-cols-2)
                    instead of 1x4 because the unified "## 📍 in a map ↗"
                    label needs ~140 px and would overflow at grid-cols-4
                    (~80 px per cell on a 375 px phone). */}
                <div className={`mx-1 grid gap-1.5 ${
                  (active.tours?.length || 0) >= 3 ? 'grid-cols-2'
                  : (active.tours?.length === 2 ? 'grid-cols-3'
                  : (active.tours?.length === 1 ? 'grid-cols-2'
                  : 'grid-cols-1'))
                }`}>
                  <a href={allOnMapUrl} target={multiPinUrl ? '_self' : '_blank'} rel="noreferrer"
                    className="text-[11px] text-center px-2 py-1.5 rounded-md border border-tg-border bg-tg-bg text-tg-text whitespace-nowrap">
                    {multiPinUrl
                      ? t('btn.openFullscreenMap', lang)
                      : tn('btn.openAllOnGoogleMaps', lang, { n: active.count })}
                  </a>
                  {(active.tours || []).map((tour, idx) => (
                    <a key={idx} href={tour.url} target="_blank" rel="noreferrer"
                      className="text-[11px] text-center px-2 py-1.5 rounded-md border border-tg-border bg-tg-bg text-tg-text whitespace-nowrap">
                      {tn('btn.openTourGoogleMapsRange', lang, {
                        from: tour.start,
                        to: tour.end,
                        total: active.mappedCount
                      })}
                    </a>
                  ))}
                </div>
                {/* v0.62.548 — operator: Cuisine-style cards (shared renderer:
                    name header, stall/status chip, codeHex MRT chips + station
                    name, bus-stop pills WITH description, pill actions). Hidden
                    when the "list" toggle collapses to the full map (tablet). */}
                {!(isWide && listHidden) && (
                <div className={listClass}>
                  {active.centres.map((c, i) => (
                    <React.Fragment key={i}>{renderCentreCard(c, i)}</React.Fragment>
                  ))}
                </div>
                )}
              </>
            )}
          </>
        )}
        {/* v0.60.213 — standardised footer tag line.
            v0.60.217 — no border; font +1pt. */}
        {/* v0.62.544 — footer carries the device/orientation cue beside the
            version: "(tablet · landscape)" / "(tablet)" / "(desktop · landscape)";
            empty on phones. */}
        <footer className="mx-2 mb-2 mt-2 px-3 py-2 text-[9px] text-tg-hint text-center">
          {t('footer.tag', lang)} · v{BUILD_VERSION}{footerTag ? ` · ${footerTag}` : ''}
        </footer>
      </div>
      </div>

      {/* v0.62.548 — operator: the list/map toggle moved to the BOTTOM-RIGHT,
          beside the FooterNav (down / end) — the old top-right spot collided with
          Telegram's fullscreen ⌄ ··· controls (IMG_0677). */}
      {isWide && active && <MapToggle isHidden={listHidden} onToggle={() => setListHidden((v) => !v)} lang={lang} />}

      {/* v0.62.213 — operator (IMG_1069 item 6): the separate bottom-left BackFab
          + bottom-right scroll FAB are replaced by ONE standardised FooterNav row
          (⇡ top / ⇣ down · ↩ back / 🔚 end), mirroring the Cuisine TMA footer. */}
      <FooterNav
        atBottom={atBottom}
        labels={{
          top: t('btn.fabTop', lang), down: t('btn.fabDown', lang),
          topAria: t('btn.fabTopAria', lang), downAria: t('btn.fabDownAria', lang),
          back: t('btn.fabBack', lang), end: t('btn.fabEnd', lang),
          backAria: t('btn.fabBackAria', lang), endAria: t('btn.fabEndAria', lang)
        }}
      />
    </div>
  );
}
