import React, { useEffect, useState } from 'react';
import { openLink, initData, tg } from './tg.js';
import { t, tn, useLocale } from './i18n.js';
import HawkerMapPanel from './components/HawkerMapPanel.jsx';
import FooterNav from '../../_shared/components/FooterNav.jsx';
import WeatherBadge from '../../_shared/components/WeatherBadge.jsx';
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

  return (
    <div
      className="flex flex-col"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
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
                <div className="flex flex-col gap-1.5 mt-1">
                  {active.centres.map((c, i) => (
                    <div key={i} className="rounded-md border border-tg-border bg-tg-card p-2 text-xs">
                      <div className="font-semibold leading-tight">
                        {i + 1}. {c.name}{c.isNew ? ' 🆕' : ''}
                      </div>
                      {c.address && <div className="text-tg-hint mt-0.5">{c.address}</div>}
                      {(Number.isFinite(c.stalls) || c.status) && (
                        <div className="mt-0.5 text-[10px] text-tg-hint">
                          {formatStalls(c, lang)}
                        </div>
                      )}
                      {/* v0.65.0 — nearest MRT station + 2 bus stops,
                          each linking to its location in Google Maps. */}
                      {(() => {
                        const tr = transitByName[c.name];
                        if (!tr || (!tr.station && !(tr.busStops || []).length)) return null;
                        return (
                          <div className="mt-1 flex flex-col gap-0.5 text-[10px]">
                            {tr.station && (
                              <a
                                /* v0.62.177 — operator: link to the REAL named place, not a
                                   bare coordinate pin. Query by station name (+ "MRT Station")
                                   so Google Maps resolves the actual station card. */
                                href={`https://maps.google.com/?q=${encodeURIComponent(`${tr.station.name || ''} MRT Station Singapore`)}`}
                                target="_blank" rel="noreferrer"
                                className="text-[#1a73e8] underline"
                              >
                                🚉 {(tr.station.codes || []).join('/')} {tr.station.name}
                                {(tr.station.lines || []).length ? ` · ${tr.station.lines.join('/')}` : ''}
                              </a>
                            )}
                            {(tr.busStops || []).map((b, j) => (
                              <a key={j}
                                /* v0.62.177 — query by the bus-stop code + description so it
                                   resolves to the actual stop (Google indexes SG stop codes),
                                   not a nameless coordinate. */
                                href={`https://maps.google.com/?q=${encodeURIComponent(['Bus Stop', b.code, b.description, 'Singapore'].filter(Boolean).join(' '))}`}
                                target="_blank" rel="noreferrer"
                                className="text-[#1a73e8] underline"
                              >🚌 {b.code} {b.description}</a>
                            ))}
                          </div>
                        );
                      })()}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.mapsUrl && (
                          <a href={c.mapsUrl} target="_blank" rel="noreferrer"
                            className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg">
                            {t('btn.maps', lang)}
                          </a>
                        )}
                        <button type="button" onClick={() => saveToChat(c.name)}
                          disabled={savingName === c.name}
                          className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg disabled:opacity-60">
                          {savingName === c.name ? t('btn.saving', lang) : t('btn.saveToChat', lang)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        {/* v0.60.213 — standardised footer tag line.
            v0.60.217 — no border; font +1pt. */}
        <footer className="mx-2 mb-2 mt-2 px-3 py-2 text-[9px] text-tg-hint text-center">
          {t('footer.tag', lang)} · v{BUILD_VERSION}
        </footer>
      </div>

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
