import React, { useEffect, useRef, useState } from 'react';
import Tile from './components/Tile.jsx';
import TrainPanel from './components/TrainPanel.jsx';
import BackFab from './components/BackFab.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';
import LocationFieldMenu from './components/LocationFieldMenu.jsx';
import { tg } from './tg.js';
import { t, useLocale } from './i18n.js';
import { IATA_CITIES, nearestIataCity } from './iata-cities.js';
import { OTHER_COUNTRIES } from './countries.js';
import { CITIES_BY_COUNTRY } from './cities.js';
// v0.61.274 — coords-based country detector for the mount-time
// coherence check. Mirrors web/cuisine/src/v2/lib/coords-to-country.js.
import { coordsToCountry } from './coords-to-country.js';

// v0.61.123 — tiles that don't work outside Singapore. When the user
// has anchored to JB or IOI Resort City Putrajaya (region 'JB' or
// 'MY-PUT'), App.jsx flips these to disabled with the
// `tile.disabledMy` tooltip.
const SG_ONLY_TILES = new Set(['hawker', 'incidents', 'busnearest', 'weather']);

// v0.60.55 — hub redesign per Human Lead 2026-05-09 ("still big,
// half the size"). Tiles drop sub-text and switch to a 3-column
// grid; section gaps tighten. The Train tile is replaced by an
// always-visible TrainPanel inside the PLAN section that shows the
// cached LTA status and a one-tap shortcut to the MRT map TMA.
//
// Cuisine + Hawker stay 'navigate' (in-webview, no chat round-trip).
// Everything else POSTs to /api/menu-dispatch (v0.60.52) which
// validates initData and re-uses the server-side routeMenuCommand
// (index.js:2050) — same routing path /start <cmd> deep links use.
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

// v0.60.67 — operator slim: Buddy / Recognised / Location / Drive /
// Plan-route tiles dropped (still reachable via slash commands; the
// hub focuses on the most-used surfaces). Each section now renders
// 2 tiles in a grid-cols-2 layout.
const SECTIONS = [
  {
    id: 'eat',
    titleKey: 'section.eat',
    tiles: [
      { id: 'cuisine', icon: '🍛', iconImage: '/app/menu/cuisine-icon.png', labelKey: 'tile.cuisine.label', kind: 'navigate', path: '/app/cuisine' },
      { id: 'hawker',  icon: '🥢', iconImage: '/app/menu/hawker-icon.png',  labelKey: 'tile.hawker.label',  kind: 'navigate', path: '/app/hawker' }
    ]
  },
  {
    id: 'discover',
    titleKey: 'section.discover',
    tiles: [
      { id: 'search',  icon: '🔍', iconImage: '/app/menu/search-icon.png', labelKey: 'tile.search.label',  kind: 'dispatch' },
      { id: 'weather', icon: '🌇', labelKey: 'tile.weather.label', kind: 'dispatch' }
    ]
  },
  {
    id: 'plan',
    titleKey: 'section.plan',
    tiles: [
      { id: 'incidents',  icon: '🚧', labelKey: 'tile.incidents.label',  kind: 'dispatch' },
      { id: 'busnearest', icon: '🚏', iconImage: '/app/menu/bus-icon.png', labelKey: 'tile.busNearest.label', kind: 'dispatch' }
    ]
  },
  // v0.61.125 — Location section split out of PLAN per operator. The
  // search anchor + LocationFieldMenu live here as their own section
  // below PLAN, so users see it as a first-class feature rather than
  // a sub-row of train/incidents/bus. No tile grid — the section just
  // holds the field component (LocationFieldMenu) rendered inside
  // the section render below.
  {
    id: 'location',
    titleKey: 'section.location',
    tiles: []   // no tile grid; field rendered via the `section.id === 'location'` branch
  }
];

// v0.60.62 — `language` chip removed; replaced by inline LocaleToggle
// (the chip dispatched a `language` cmd that routeMenuCommand never
// handled, so it was a silent no-op).
const FOOTER_CHIPS = [
  { id: 'privacy',  labelKey: 'chip.privacy' },
  { id: 'forgetme', labelKey: 'chip.forgetme' }
];

export default function App() {
  const lang = useLocale();
  // v0.60.60 — track at-bottom for the scroll FAB navigation
  // standardised across all four TMAs.
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const reached = (window.scrollY || 0) + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setAtBottom(reached >= fullH - 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // v0.60.54 / v0.60.55 — fetch cached LTA train status once on
  // mount. Endpoint reads Redis only, so no extra LTA roundtrip.
  const [live, setLive] = useState({ code: null, updatedAt: null });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/menu/live')
      .then((r) => r.ok ? r.json() : null)
      .then((b) => {
        if (cancelled) return;
        setLive({
          code: b?.train?.code || null,
          updatedAt: b?.train?.updatedAt || null
        });
      })
      .catch(() => { /* silent — panel just shows warmup label */ });
    return () => { cancelled = true; };
  }, []);

  // v0.61.123 — cached user-location anchor (region + radiusCapM +
  // label) for the LocationFieldMenu summary line + disabled-tile
  // logic. Reuses /api/cuisine/user-location (existing initData-gated
  // read). Null when unset / stale.
  const [anchor, setAnchor] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const w = tg();
    if (!w) return;
    fetch('/api/cuisine/user-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: w.initData || '' })
    })
      .then((r) => r.ok ? r.json() : null)
      .then((b) => {
        if (cancelled || !b) return;
        if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
          setAnchor({
            label: b.label || null,
            lat: b.lat,
            lng: b.lng,
            region: b.region || 'SG',
            radiusCapM: b.radiusCapM || null,
            // v0.61.139 — structured address parts persisted by
            // /api/menu/set-location for typed-text anchors (precinct
            // picks have no address parts, so these stay null and the
            // pill falls back to the curated `label`).
            street: b.street || null,
            building: b.building || null,
            postal: b.postal || null,
            // v0.61.274 — surface the country code persisted by
            // /api/cuisine/user-location (v0.61.270 round-trip).
            // Used by the compact pill flag + coherence check.
            country: (typeof b.country === 'string' && /^[A-Z]{2}$/.test(b.country)) ? b.country : null
          });
        }
      })
      .catch(() => { /* silent — anchor stays null */ });
    return () => { cancelled = true; };
  }, []);

  // v0.61.249 — GPS auto-detect on mount, mirroring Cuisine TMA
  // v0.61.243. Operator (29-05 '26): *"If the location isn't the
  // current selection in Menu TMA, should change to the location as
  // spec earlier in 5 PR ago investigate."*
  //
  // Algorithm (matches Cuisine TMA App.jsx):
  //   1. One-shot via autoDetectedRef.
  //   2. Ask navigator.geolocation for a fresh reading.
  //   3. nearestIataCity(GPS) from the v0.61.242 table; if >2000 km
  //      from any covered city, call /api/cuisine/iata-snap for the
  //      Gemini-resolved nearest IATA city globally.
  //   4. Decide whether to re-anchor: skip when GPS is within
  //      ~10 km of the cached anchor (the v0.61.243 drift rule).
  //      Skip outright when GPS lands inside the SG bbox AND the
  //      cached anchor is already SG (Menu TMA's home mode).
  //   5. Otherwise POST /api/menu/set-location with the detected
  //      coords + canonical IATA city name + country code. The
  //      server flips region (JB / OTHER) and the LocationFieldMenu
  //      picks up the new anchor via the `currentAnchor` prop +
  //      v0.61.223 region-sync useEffect.
  const autoDetectedRef = useRef(false);
  useEffect(() => {
    if (autoDetectedRef.current) return;
    // Don't fire until the initial /api/cuisine/user-location fetch
    // resolves (anchor === null could mean "still loading" or "no
    // cached anchor"). 800 ms tolerance: by the time the user notices
    // the hub, the anchor fetch has either returned or is going to fail.
    const wakeup = setTimeout(() => {
      if (autoDetectedRef.current) return;
      autoDetectedRef.current = true;
      runAutoDetect();
    }, 800);
    return () => clearTimeout(wakeup);

    async function runAutoDetect() {
      const w = tg();
      if (!w) return;
      // Fresh GPS reading.
      const fresh = await new Promise((resolve) => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          resolve(null); return;
        }
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const { latitude, longitude } = p.coords || {};
            if (Number.isFinite(latitude) && Number.isFinite(longitude)
                && !(Math.abs(latitude) < 0.001 && Math.abs(longitude) < 0.001)) {
              resolve({ lat: latitude, lng: longitude });
            } else resolve(null);
          },
          () => resolve(null),
          { timeout: 5000, maximumAge: 60_000, enableHighAccuracy: false }
        );
      });
      if (!fresh) {
        console.log('[Menu-TMA] auto-detect: no fresh GPS, skip');
        return;
      }
      // Skip when GPS sits inside the SG bbox AND no cached anchor
      // already says "I'm somewhere else explicitly".
      const SG_LAT_MIN = 1.13, SG_LAT_MAX = 1.50;
      const SG_LNG_MIN = 103.55, SG_LNG_MAX = 104.10;
      const insideSG = fresh.lat >= SG_LAT_MIN && fresh.lat <= SG_LAT_MAX
        && fresh.lng >= SG_LNG_MIN && fresh.lng <= SG_LNG_MAX;
      if (insideSG && (!anchor || anchor.region === 'SG')) {
        console.log('[Menu-TMA] auto-detect: GPS in SG bbox + anchor SG/none, skip');
        return;
      }
      // Drift check.
      if (anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)) {
        const drift = haversineKm(fresh.lat, fresh.lng, anchor.lat, anchor.lng);
        if (drift < 10) {
          console.log(`[Menu-TMA] auto-detect: GPS within ${drift.toFixed(1)}km of cached anchor, skip`);
          return;
        }
      }
      // Local IATA lookup.
      let detected = null;
      const local = nearestIataCity(fresh.lat, fresh.lng);
      if (local && local.distanceKm < 2000) {
        detected = local.city;
        console.log('[Menu-TMA] auto-detect: local hit', detected.iata, detected.name,
          local.distanceKm.toFixed(0) + 'km');
      } else {
        // Gemini fallback via /api/cuisine/iata-snap (same endpoint
        // Cuisine TMA uses; G4 pre-approved per v0.61.243).
        try {
          const r = await fetch('/api/cuisine/iata-snap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: fresh.lat, lng: fresh.lng, initData: w.initData || '' })
          });
          if (r.ok) {
            const body = await r.json();
            if (body?.iata) {
              const canon = IATA_CITIES.find((c) => c.iata === body.iata);
              detected = canon || body;
              console.log('[Menu-TMA] auto-detect: Gemini hit', detected.iata, detected.name);
            }
          }
        } catch (err) {
          console.warn('[Menu-TMA] auto-detect: Gemini fetch failed', err?.message);
        }
        if (!detected && local) {
          detected = local.city;
          console.log('[Menu-TMA] auto-detect: distant local fallback', detected.iata);
        }
      }
      if (!detected) {
        console.log('[Menu-TMA] auto-detect: no detected city');
        return;
      }
      // Only act on the 16 OTHER countries + SG. Detected in any other
      // country (India, UAE, GB, US…) means Menu TMA's country dropdown
      // can't represent it — log and skip rather than emit a confusing
      // half-state.
      const OTHER_SUPPORTED = new Set(OTHER_COUNTRIES.map((c) => c.code));
      const isSgDetected = detected.countryCode === 'SG';
      const isSupportedOther = OTHER_SUPPORTED.has(detected.countryCode);
      if (!isSgDetected && !isSupportedOther) {
        console.log(`[Menu-TMA] auto-detect: detected ${detected.iata}/${detected.countryCode} not in Menu TMA's country list; skip`);
        return;
      }
      // v0.61.252 — operator: "My location is Malaysia, Putrajaya. I
      // start the Menu TMA, it jump to Kuala LUmpur. this is wrong."
      // Prefer a curated cities.js entry within 30 km of GPS over the
      // IATA canonical name. KL metro's IATA name "Kuala Lumpur"
      // covers KUL coords (3.14, 101.69) but the nearby cities.js
      // entries (Putrajaya at 2.93, 101.70 ≈ 22 km; Shah Alam at
      // 3.07, 101.52 ≈ 22 km; Seremban at 2.73, 101.94 ≈ 50 km) are
      // the names the operator actually wants displayed.
      let preferLabel = null;
      const myList = (typeof CITIES_BY_COUNTRY !== 'undefined' ? CITIES_BY_COUNTRY[detected.countryCode] : null) || [];
      let nearestCurated = null;
      let nearestKm = Infinity;
      for (const c of myList) {
        const dLat = (c.lat - fresh.lat) * Math.PI / 180;
        const dLng = (c.lng - fresh.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(fresh.lat * Math.PI / 180) * Math.cos(c.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const km = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        if (km < nearestKm) { nearestKm = km; nearestCurated = c; }
      }
      if (nearestCurated && nearestKm < 30) {
        preferLabel = nearestCurated.name;
        console.log('[Menu-TMA] auto-detect: prefer curated cities.js entry',
          preferLabel, `(${nearestKm.toFixed(1)} km)`,
          'over IATA canonical', detected.name);
      }
      // v0.61.256 — defensive: Gemini fallback may return a poor `name`
      // (sometimes literally 'Unnamed' when no good lookup exists).
      // Filter that out so we never persist the placeholder string as
      // the anchor label.
      let labelOut = preferLabel
        || (IATA_CITIES.find((c) => c.iata === detected.iata)?.name || detected.name);
      if (!labelOut || labelOut === 'Unnamed') {
        labelOut = `${detected.countryCode || 'Pinned'} location`;
      }

      // POST set-location.
      try {
        const r = await fetch('/api/menu/set-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: fresh.lat,
            lng: fresh.lng,
            label: labelOut,
            country: detected.countryCode,
            initData: w.initData || ''
          }),
          keepalive: true
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body = await r.json();
        if (body?.ok) {
          setAnchor({
            label: body.label,
            lat: body.lat,
            lng: body.lng,
            region: body.region || 'SG',
            radiusCapM: body.radiusCapM || null,
            street: body.street || null,
            building: body.building || null,
            postal: body.postal || null
          });
          console.log('[Menu-TMA] auto-detect applied', { iata: detected.iata, region: body.region });
          // Sync chat country-pref (fire-and-forget).
          if (!isSgDetected) {
            fetch('/api/cuisine/country-pref', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ countryCode: detected.countryCode, initData: w.initData || '' })
            }).catch(() => { /* non-fatal */ });
          }
        }
      } catch (err) {
        console.warn('[Menu-TMA] auto-detect: set-location failed', err?.message);
      }
    }

    function haversineKm(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const toRad = (d) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }
  }, [anchor?.lat, anchor?.lng]);

  // v0.61.185 — accept 'OTHER' alongside legacy 'MY-PUT' (was Putrajaya-specific).
  const isMy = anchor && (anchor.region === 'JB' || anchor.region === 'MY-PUT' || anchor.region === 'OTHER');

  // v0.60.67 — fire-and-forget. Per Human Lead 2026-05-10, the TMA
  // wasn't closing immediately after a dispatch tap (Incidents,
  // Location, …). Root cause: prior implementation awaited the fetch
  // before calling w.close(), so any sluggish round-trip kept the
  // hub visible. The /api/menu-dispatch endpoint already returns 202
  // synchronously and runs the actual command in the background
  // (the bot delivers output via sendMessage, not the HTTP body) —
  // so we can fire the request and close the WebApp on the same
  // tick. Errors surface server-side via console + bot fallback
  // sendMessage; the user sees them in chat after the TMA collapses.
  //
  // v0.60.69 — keepalive:true so Telegram's webview tear-down on
  // close() doesn't abort the request before bytes hit the wire
  // (Codex review 2026-05-10). The 64 KB keepalive cap is not a
  // concern — payload is initData + cmd, well under 1 KB.
  const dispatchCmd = (cmd) => {
    const w = tg();
    if (!w) {
      alert('This menu only works inside Telegram.');
      return;
    }
    fetch('/api/menu-dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: w.initData || '', cmd }),
      keepalive: true
    }).catch(() => { /* logged server-side; user sees fallback in chat */ });
    if (typeof w.close === 'function') w.close();
  };

  const handle = (tile) => {
    if (tile.kind === 'navigate') {
      window.location.href = tile.path + (window.location.search || '');
      return;
    }
    dispatchCmd(tile.id);
  };

  // v0.61.274 — mount-time location coherence check. Operator
  // (30-05 '26): screenshot showed "🇦🇺 Singapore" — anchor.label
  // freshly resolved to "Singapore" but the flag came from a stale
  // saved country code. Same option B (Prompt) as the Cuisine TMA.
  const coherenceCheckedMenuRef = useRef(false);
  const [coherenceMismatch, setCoherenceMismatch] = useState(null);
  useEffect(() => {
    if (coherenceCheckedMenuRef.current) return;
    if (!anchor || !Number.isFinite(anchor.lat) || !Number.isFinite(anchor.lng)) return;
    if (!anchor.country) return;  // no saved country to compare
    const coordsCountry = coordsToCountry(anchor);
    if (!coordsCountry) return;  // outside SG/MY bbox, trust the saved value
    if (anchor.country !== coordsCountry) {
      setCoherenceMismatch({ saved: anchor.country, coords: coordsCountry });
      console.log(`[Menu-TMA] coherence MISMATCH saved=${anchor.country} coords=${coordsCountry}`);
    }
    coherenceCheckedMenuRef.current = true;
  }, [anchor?.lat, anchor?.lng, anchor?.country]);

  function applyCoherenceChoice(useCoords) {
    if (!coherenceMismatch) return;
    if (useCoords) {
      // Rewrite the anchor in-memory + persist to Redis so the
      // next session doesn't repeat the prompt. Country goes to
      // SG / MY; region follows: SG → 'SG'; MY at JB-coords → 'JB';
      // MY elsewhere → 'OTHER'.
      const newCountry = coherenceMismatch.coords;
      const newRegion = newCountry === 'SG' ? 'SG'
        : (anchor && coordsToCountry(anchor) === 'MY' && anchor.lat < 1.55) ? 'JB'
        : 'OTHER';
      setAnchor((a) => a ? ({ ...a, country: newCountry, region: newRegion }) : a);
      // Fire-and-forget — server-side rewrite. The route already
      // accepts country + region in v0.61.270.
      const w = tg();
      if (w && anchor) {
        fetch('/api/menu/set-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: anchor.lat, lng: anchor.lng, label: anchor.label || '',
            country: newCountry, initData: w.initData || ''
          })
        }).catch(() => {});
      }
    }
    setCoherenceMismatch(null);
  }

  return (
    <div
      className="flex flex-col"
      style={{
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      {/* v0.61.274 — same coherence modal as the Cuisine TMA. */}
      {coherenceMismatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'fr' ? 'Conflit de localisation' : 'Location mismatch'}
        >
          <div className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 className="text-sm font-semibold flex-1">
                {lang === 'fr' ? 'Conflit de localisation' : 'Location mismatch'}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text">
              {lang === 'fr'
                ? `Vous aviez choisi ${coherenceMismatch.saved} précédemment, mais votre appareil est actuellement en ${coherenceMismatch.coords === 'SG' ? 'Singapour' : 'Malaisie'}.`
                : `You set your location to ${coherenceMismatch.saved} previously, but your device is now in ${coherenceMismatch.coords === 'SG' ? 'Singapore' : 'Malaysia'}.`}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => applyCoherenceChoice(true)}
                className="w-full px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text text-sm font-semibold"
              >
                {lang === 'fr'
                  ? `Utiliser ${coherenceMismatch.coords === 'SG' ? 'Singapour' : 'Malaisie'}`
                  : `Use ${coherenceMismatch.coords === 'SG' ? 'Singapore' : 'Malaysia'}`}
              </button>
              <button
                type="button"
                onClick={() => applyCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm"
              >
                {lang === 'fr'
                  ? `Garder ${coherenceMismatch.saved}`
                  : `Keep ${coherenceMismatch.saved}`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* v0.60.67 — hero rework: LocaleToggle moved out of the footer
          and lives at the right end of the subtitle row, so the
          language flip is reachable without scrolling to the bottom.
          A new sub-tagline ("Explore Singapore's 50+ cuisines beyond
          familiar favourites") sits below the existing "Solo eat ·
          So let's eat" line to pitch the catalogue breadth. */}
      <div className="px-3 pt-2 pb-1.5 flex items-start gap-2">
        <img src="/app/menu/soleat-icon.png" alt="soleat" width="24" height="24" className="rounded-full flex-shrink-0 mt-0.5" />
        <div className="min-w-0 leading-tight flex-1">
          <h1 className="text-base font-semibold">{t('hero.title', lang)}</h1>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-tg-hint truncate">
              {t('hero.tagline.line1', lang)} · {t('hero.tagline.line2', lang)}
            </p>
            <LocaleToggle />
          </div>
          <p className="text-[11px] text-tg-hint leading-snug pt-0.5">
            {t('hero.subtagline', lang)}
          </p>
        </div>
      </div>

      <div className="flex-1 px-3 pb-2 flex flex-col gap-1.5">
        {SECTIONS.map((section) => (
          <section key={section.id} className="flex flex-col gap-1">
            <h2 className="text-[11px] uppercase tracking-wide text-tg-hint pl-1">
              {t(section.titleKey, lang)}
            </h2>
            {section.id === 'plan' && (
              /* TrainPanel is SG-only — grey it out when a Malaysia
                 anchor is set. Done via an opacity wrapper since
                 TrainPanel takes no disabled prop. v0.61.125 — the
                 LocationFieldMenu moved out to its own section
                 (`section.id === 'location'` below). */
              <div
                style={isMy ? { opacity: 0.4, pointerEvents: 'none' } : {}}
                title={isMy ? t('tile.disabledMy', lang) : undefined}
              >
                <TrainPanel
                  live={live}
                  lang={lang}
                  onFullStatus={() => dispatchCmd('train')}
                />
              </div>
            )}
            {section.id === 'location' && (
              /* v0.61.125 — own section: location anchor picker. The
                 LocationFieldMenu was moved out of PLAN per operator
                 to give it equal visibility with eat / discover / plan
                 above. */
              <LocationFieldMenu
                lang={lang}
                currentAnchor={anchor}
                onAnchorChange={setAnchor}
              />
            )}
            {/* v0.60.67 — each section now carries 2 tiles after the
                operator slim, so grid drops from 3 cols to 2 cols
                (each tile gets ~170 px on a 375 px phone).
                v0.61.123 — SG-only tiles flip to disabled when a
                Malaysia anchor is set. */}
            <div className="grid grid-cols-2 gap-1.5">
              {section.tiles.map((tile) => {
                const disabled = isMy && SG_ONLY_TILES.has(tile.id);
                return (
                  <Tile
                    key={tile.id}
                    icon={tile.icon}
                    iconImage={tile.iconImage}
                    label={t(tile.labelKey, lang)}
                    onClick={() => handle(tile)}
                    disabled={disabled}
                    disabledTooltip={disabled ? t('tile.disabledMy', lang) : ''}
                  />
                );
              })}
            </div>
          </section>
        ))}
        <p className="text-[11px] text-tg-hint text-center pt-0.5 px-2 leading-snug">
          {t('hint.tap', lang)}
        </p>
      </div>

      {/* v0.60.67 — LocaleToggle moved to the hero subtitle row, so
          the footer trims down to just Privacy + Forget me chips. */}
      <div className="px-3 pb-1.5 flex flex-wrap gap-1.5 justify-center items-center">
        {FOOTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => dispatchCmd(chip.id)}
            className="text-[11px] px-2 py-0.5 rounded-full bg-tg-card border border-tg-border text-tg-hint active:bg-tg-accent active:text-tg-accent-text transition"
          >
            {t(chip.labelKey, lang)}
          </button>
        ))}
      </div>

      {/* v0.60.213 — standardised "Experimental · Singapore · v<build>"
          tag line. v0.60.217 — no border; font +1pt.
          v0.60.222 — operator: dropped the "Soleat <v> · 2026" brand
          line; the tag line is the whole footer now. */}
      <div className="mx-2 mb-2 mt-1 px-3 py-2 text-center text-[10px] text-tg-hint leading-tight">
        <div>{t('footer.tag', lang)} · v{BUILD_VERSION}</div>
      </div>

      <BackFab />

      {/* v0.60.96 — scroll FAB. Standardised across all four TMAs
          per operator: bottom-right, aqua, text label "⇣ down" /
          "⇡ top" toggled by atBottom state. */}
      <button
        type="button"
        onClick={() => window.scrollTo({
          top: atBottom ? 0 : window.scrollY + window.innerHeight,
          behavior: 'smooth'
        })}
        aria-label={atBottom ? t('btn.fabTopAria', lang) : t('btn.fabDownAria', lang)}
        style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f', bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        className="fixed right-4 px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-95 z-50 whitespace-nowrap"
      >{atBottom ? t('btn.fabTop', lang) : t('btn.fabDown', lang)}</button>
    </div>
  );
}
