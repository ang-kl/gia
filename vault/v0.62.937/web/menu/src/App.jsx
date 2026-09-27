import React, { useEffect, useRef, useState } from 'react';
import Tile from './components/Tile.jsx';
import { useDialog } from '../../_shared/lib/use-dialog.js';
import FooterNav from '../../_shared/components/FooterNav.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';
import LocationFieldMenu from './components/LocationFieldMenu.jsx';
import { tg, getTelegramLocation } from './tg.js';
import { t, tn, useLocale } from './i18n.js';
import { IATA_CITIES, nearestIataCity } from '../../_shared/lib/iata-cities.js';
import { OTHER_COUNTRIES } from './countries.js';
import { CITIES_BY_COUNTRY } from './cities.js';
// v0.61.274 — coords-based country detector for the mount-time
// coherence check. Mirrors web/cuisine/src/v2/lib/coords-to-country.js.
import { coordsToCountry } from './coords-to-country.js';
import { startLocationSync } from '../../_shared/lib/location-sync.js';
import { deviceId } from '../../_shared/lib/device-id.js';
// v0.62.x — idle-return rating reset (operator): shared floor → Good+ 3.7.
import { saveRatingPref } from './api.js';

// v0.61.123 — tiles that don't work outside Singapore. When the user
// has anchored to JB or IOI Resort City Putrajaya (region 'JB' or
// 'MY-PUT'), App.jsx flips these to disabled with the
// `tile.disabledMy` tooltip.
const SG_ONLY_TILES = new Set(['hawker', 'train', 'incidents', 'busnearest', 'weather']);

// v0.61.362 — countries the Menu flag/picker can show (SG + the OTHER
// list). The 20 s location-sync only flips the flag to a country in this
// set; outside it, the prior flag is kept.
const MENU_FLAG_COUNTRIES = new Set(OTHER_COUNTRIES.map((c) => c.code));

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
// v0.62.215 — operator: slim the hub to the THREE key TMAs — Cuisine / Train /
// Hawker — as navigate tiles, plus the Location setting. The old Discover
// (search / weather) and Plan (incidents / bus) DISPATCH tiles and the live
// TrainPanel are dropped; those surfaces stay reachable via slash commands.
// The Train tile is now a first-class navigate tile (→ /app/transport) carrying
// the cropped Soleat train logo PNG.
// v0.62.226 — operator: Cuisine stands alone (works region-wide); Train + Hawker
// are SG-only, grouped inside a bordered "🇸🇬 Singapore" box. Each tile carries a
// `subKey` subtitle saying what you can search.
const SECTIONS = [
  {
    id: 'cuisine-app',
    titleKey: null,
    tiles: [
      // v0.62.263 — operator (IMG_2552): bigger line-art drawing (was max-h-9 ≈ 36px → unreadable).
      { id: 'cuisine', icon: '🍛', iconImage: `/app/menu/cuisine-icon-v3.png?v=${BUILD_VERSION}`, iconImgClass: 'max-h-[74px] max-w-full object-contain icon-navy', iconBoxClass: 'w-[74px] h-[74px]', labelKey: 'tile.cuisine.label', subKey: 'tile.cuisine.sub', kind: 'navigate', path: '/app/cuisine' }
    ]
  },
  {
    id: 'sg',
    titleKey: 'section.sg',   // "🇸🇬 Singapore"
    boxed: true,
    tiles: [
      { id: 'train',  icon: '🚆', iconImage: `/app/menu/train-logo.png?v=${BUILD_VERSION}`,  labelKey: 'tile.train.label',  subKey: 'tile.train.sub',  kind: 'navigate', path: '/app/transport' },
      // v0.62.263 — operator (IMG_2552): bigger line-art drawing (was max-h-9 ≈ 36px → unreadable).
      { id: 'hawker', icon: '🥢', iconImage: `/app/menu/hawker-icon-v3.png?v=${BUILD_VERSION}`, iconImgClass: 'max-h-16 max-w-full object-contain icon-navy', labelKey: 'tile.hawker.label', subKey: 'tile.hawker.sub', kind: 'navigate', path: '/app/hawker' }
    ]
  },
  // v0.61.125 — Location is its own section so users see it as a first-class
  // feature. No tile grid — the field renders via the `section.id === 'location'`
  // branch below.
  {
    id: 'location',
    titleKey: 'section.location',
    tiles: []
  },
  // v0.62.437 — operator: launch Sketchbook (Clipboard TMA) from the hub, below
  // the Location section. (No dedicated PNG asset yet → emoji icon for now.)
  {
    id: 'sketchbook-app',
    titleKey: null,
    tiles: [
      { id: 'sketchbook', icon: '📋', iconImage: `/app/menu/sketchboard_clip_icon.png?v=${BUILD_VERSION}`, iconImgClass: 'max-h-16 max-w-full object-contain icon-navy', labelKey: 'tile.sketchbook.label', subKey: 'tile.sketchbook.sub', kind: 'navigate', path: '/app/clipboard' }
    ]
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
  // v0.62.x — operator: returning from ≥2 min idle into the MENU TMA also
  // resets the shared Google-rating floor to Good+ 3.7 (G3, operator-
  // confirmed: a custom rating lasts for the session only) and announces it
  // with the same pop-up copy as the Cuisine TMA. Tap / 7 s to dismiss.
  const [ratingResetNote, setRatingResetNote] = useState(false);
  useEffect(() => {
    if (!ratingResetNote) return undefined;
    const id = setTimeout(() => setRatingResetNote(false), 7000);
    return () => clearTimeout(id);
  }, [ratingResetNote]);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let hiddenAt = null;
    const onVis = () => {
      if (document.hidden) { hiddenAt = Date.now(); return; }
      if (hiddenAt && Date.now() - hiddenAt >= 120000) {
        saveRatingPref('3.7'); // fire-and-forget; helper swallows failures
        setRatingResetNote(true);
      }
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
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
  // v0.62.215 — the live LTA train-status fetch (/api/menu/live) was removed with
  // the TrainPanel; Train is now a plain navigate tile into the Transport TMA,
  // which fetches its own live status.

  // v0.61.123 — cached user-location anchor (region + radiusCapM +
  // label) for the LocationFieldMenu summary line + disabled-tile
  // logic. Reuses /api/cuisine/user-location (existing initData-gated
  // read). Null when unset / stale.
  const [anchor, setAnchor] = useState(null);
  // v0.61.279 — Register O-27: parity with Cuisine TMA v0.61.273
  // `__NONE__` sentinel. Before the cached-anchor fetch resolves we
  // don't know the user's region; rendering SG-mode UI by default
  // ("no fallback leaks to Singapore" per PLATFORM REFRACTORING §3)
  // would briefly show train + SG-only tiles to a Malaysia user.
  // While `anchorLoading === true`, treat the region as unresolved
  // and gate the SG-mode affordances (train panel + SG-only tiles).
  const [anchorLoading, setAnchorLoading] = useState(true);
  // v0.62.31 — stale-travel hint (operator: "hint, never auto"). Set by the
  // auto-detect when device GPS is >50 km from a LABELLED pick it refused to
  // move (the v0.62.30 explicit-pick rule); dismissible; cleared whenever the
  // anchor changes (the user re-picked).
  const [farFromPickHint, setFarFromPickHint] = useState(null);
  useEffect(() => { setFarFromPickHint(null); }, [anchor?.lat, anchor?.lng, anchor?.label]);
  // v0.62.259 — operator (urgent): trace the Menu TMA loading state (anchor +
  // region resolution) alongside the Cuisine TMA log, so the two surfaces'
  // loading can be compared side by side in the console.
  useEffect(() => {
    console.log('[Menu-TMA] LOADING →', {
      anchorLoading,
      hasAnchor: !!anchor,
      anchorLabel: anchor?.label || null,
      region: anchor?.region || null,
      lang,
    });
  }, [anchorLoading, anchor?.label, anchor?.region, lang]);
  // v0.61.356 — location-sync (shared): on load, poll device GPS + Telegram for
  // ~20 s and FOLLOW the device (flag/region + anchor + persist) on a >1.5 km
  // move, so the Menu flag stops going stale after you've moved. Mirrors cuisine.
  const anchorRef = useRef(anchor);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);
  const menuSyncStartedRef = useRef(false);
  useEffect(() => {
    if (menuSyncStartedRef.current) return;
    menuSyncStartedRef.current = true;
    const havM = (a, b) => { const R = 6371000, r = (d) => d * Math.PI / 180;
      const dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
      const x = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(x)); };
    const stop = startLocationSync({
      current: anchorRef.current,
      onLocation: (loc) => {
        const cur = anchorRef.current;
        if (cur && Number.isFinite(cur.lat) && havM(cur, loc) < 1500) return;
        // v0.61.362 — operator: the 20 s sync must detect the location AND
        // the flag. The old path resolved the country with coordsToCountry
        // (SG/MY-only bbox), so moving into any of the other ~13 Menu
        // countries (TH/JP/KR/ID/VN/PH/AU/NZ/CN/HK/MO/TW/BN) kept the stale
        // flag. Now: SG/MY use the cheap bbox; everywhere else falls back to
        // the same global nearestIataCity detector the mount auto-detect
        // uses, filtered to the countries the Menu flag can actually show.
        let country = coordsToCountry(loc);
        if (!country) {
          const near = nearestIataCity(loc.lat, loc.lng);
          const cc = near && near.city && near.city.countryCode;
          if (cc && MENU_FLAG_COUNTRIES.has(cc)) country = cc;
        }
        if (!country) country = (cur && cur.country) || null;
        const region = country === 'SG' ? 'SG'
          : (country === 'MY' && loc.lat < 1.55) ? 'JB'
          : country ? 'OTHER'
          : (cur && cur.region) || null;
        console.log('[Menu-LocationSync] following device →', loc.lat.toFixed(4), loc.lng.toFixed(4), '(' + loc.source + ')', country || '?');
        setAnchor((a) => ({ ...(a || {}), lat: loc.lat, lng: loc.lng, country, region }));
        try {
          const w = tg();
          fetch('/api/menu/set-location', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat: loc.lat, lng: loc.lng, country, region, deviceId: deviceId(), initData: (w && w.initData) || '' }),
            keepalive: true,
          }).catch(() => {});
          // Mirror the mount auto-detect: keep the chat / picker country-pref
          // in step so the flag and the OTHER picker agree after a follow.
          if (country && country !== 'SG') {
            fetch('/api/cuisine/country-pref', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ countryCode: country, deviceId: deviceId(), initData: (w && w.initData) || '' }),
            }).catch(() => {});
          }
        } catch { /* non-fatal */ }
      },
    });
    return stop;
  }, []); // eslint-disable-line
  useEffect(() => {
    let cancelled = false;
    const w = tg();
    if (!w) { setAnchorLoading(false); return; }
    fetch('/api/cuisine/user-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: deviceId(), initData: w.initData || '' })
    })
      .then((r) => r.ok ? r.json() : null)
      .then((b) => {
        if (cancelled) return;
        if (b && Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
          setAnchor({
            label: b.label || null,
            lat: b.lat,
            lng: b.lng,
            // v0.61.279 — Register O-27: drop the `|| 'SG'` fallback.
            // If the server's user-location echo omits region, leave
            // it null instead of silently coercing to 'SG'. `isMy` /
            // `anchorLoading` already handle the missing-region case.
            region: b.region || null,
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
        setAnchorLoading(false);
      })
      .catch(() => { if (!cancelled) setAnchorLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // v0.61.304 — visibility / viewportChanged re-fetch, mirroring the
  // Cuisine TMA's v0.61.186 listener. Without this, Menu TMA's anchor
  // is read once on mount and never refreshes — if the user flips to
  // Cuisine (or chat /location), changes the anchor, then returns,
  // Menu still shows the stale value. Reuses /api/cuisine/user-location
  // (the SSOT since v0.61.270) so any TMA's write propagates here.
  useEffect(() => {
    async function refetchAnchor() {
      if (typeof document !== 'undefined' && document.visibilityState && document.visibilityState !== 'visible') return;
      const w = tg();
      if (!w) return;
      try {
        const r = await fetch('/api/cuisine/user-location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId: deviceId(), initData: w.initData || '' })
        });
        if (!r.ok) return;
        const b = await r.json();
        if (!b || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return;
        setAnchor({
          label: b.label || null,
          lat: b.lat,
          lng: b.lng,
          region: b.region || null,
          radiusCapM: b.radiusCapM || null,
          street: b.street || null,
          building: b.building || null,
          postal: b.postal || null,
          country: (typeof b.country === 'string' && /^[A-Z]{2}$/.test(b.country)) ? b.country : null
        });
      } catch { /* network blip — leave prior anchor in place */ }
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refetchAnchor);
    }
    const w = tg();
    if (w && typeof w.onEvent === 'function') {
      w.onEvent('viewportChanged', refetchAnchor);
    }
    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refetchAnchor);
      }
      if (w && typeof w.offEvent === 'function') {
        w.offEvent('viewportChanged', refetchAnchor);
      }
    };
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
    // v0.62.498 — wait for the initial /api/cuisine/user-location fetch
    // to SETTLE before deciding whether to auto-detect. `anchor === null`
    // is ambiguous ("still loading" vs "no cached anchor"), so we gate on
    // `anchorLoading`, which flips false in every terminal branch of that
    // fetch (.then / .catch / no-Telegram). This replaces the prior fixed
    // 800 ms `setTimeout` guess: we now fire the instant the cache fetch
    // resolves (never later, never before the anchor commits — `setAnchor`
    // batches with `setAnchorLoading(false)`, so runAutoDetect always sees
    // the fetched anchor). NOT a boot gate — Menu has none; this only
    // sequences auto-detect, it never gates render.
    if (anchorLoading) return;
    autoDetectedRef.current = true;
    runAutoDetect();

    async function runAutoDetect() {
      const w = tg();
      if (!w) return;
      // Fresh GPS reading. v0.62.x — prefer Telegram's native LocationManager
      // (Bot API 8.0); the webview's navigator.geolocation often drops a
      // first-launch "Allow Once".
      const fresh = (await getTelegramLocation()) || await new Promise((resolve) => {
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
        // v0.62.30 — operator: "problem again to lock the location." Railway
        // log 11:35: this auto-detect POSTed label="Singapore" over a
        // deliberate Putrajaya pick (the step-4 comment above already says
        // "skip when the cached anchor says I'm somewhere else explicitly" —
        // but the code only skipped SG anchors). A LABELLED cached anchor is
        // a deliberate Menu/chat/TMA pick → never auto-overwrite it with
        // device GPS (same "explicit pick wins" rule as the Cuisine TMA's
        // v0.61.430 latch). The user re-anchors by picking a location.
        if (anchor.label && String(anchor.label).trim()) {
          console.log(`[Menu-TMA] auto-detect: cached anchor is a labelled pick ("${anchor.label}"), skip — explicit pick wins`);
          // v0.62.31 — stale-travel recovery (operator: "hint, never auto"):
          // when the device sits FAR (>50 km — genuine travel, not the daily
          // SG↔JB hop) from the kept pick, surface a dismissible hint so the
          // user knows the pick is held and how to update it.
          if (drift > 50) setFarFromPickHint(String(anchor.label).trim());
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
            deviceId: deviceId(),
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
            // v0.61.279 — Register O-27: drop the `|| 'SG'` fallback;
            // see the user-location useEffect above for rationale.
            region: body.region || null,
            // v0.61.362 — carry the detected country so the compact-pill
            // flag (which now reads currentAnchor.country) is correct on
            // the auto-detect path too, not just the user-location echo.
            country: detected.countryCode || null,
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
              body: JSON.stringify({ countryCode: detected.countryCode, deviceId: deviceId(), initData: w.initData || '' })
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
  }, [anchorLoading, anchor?.lat, anchor?.lng]);

  // v0.61.370 — operator: when the anchor coords are clearly in Singapore,
  // re-enable the SG-only tiles even if the STORED region is a stale 'OTHER'
  // from a prior overseas session (a Bukit Merah anchor was wrongly greying
  // Hawker / Train / Incidents / Bus stops / Weather). Coords are the ground
  // truth — same principle as the v0.61.369 flag fix. `anchorInSG` overrides
  // both the `isMy` disable and the unresolved-region disable.
  const anchorInSG = anchor && coordsToCountry(anchor) === 'SG';
  // v0.61.185 — accept 'OTHER' alongside legacy 'MY-PUT' (was Putrajaya-specific).
  const isMy = anchor && !anchorInSG && (anchor.region === 'JB' || anchor.region === 'MY-PUT' || anchor.region === 'OTHER');
  // v0.61.279 — Register O-27: while the initial anchor fetch is in
  // flight we don't know the region, so gate the SG-mode affordances
  // (train panel active + SG-only tiles enabled) on `anchorLoading`
  // being false. Once the fetch resolves — whether to an SG anchor,
  // an MY anchor, or no anchor at all — the gate releases and `isMy`
  // takes over. v0.61.370 — a coords-in-SG anchor is never "unresolved".
  const regionUnresolved = anchorLoading || (anchor && !anchor.region && !anchorInSG);

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
      // v0.61.304 — preserve `window.location.hash`. Telegram's WebApp
      // SDK reads initData from the URL fragment (`#tgWebAppData=…`)
      // at script load. Without this, same-origin nav to /app/cuisine
      // loads with empty initData; gated API calls 401; the container
      // ends up bouncing the user back to chat on some clients.
      window.location.href = tile.path + (window.location.search || '') + (window.location.hash || '');
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
  // P1-d — dialog behaviour for the coherence modal (no onClose: forced choice).
  const coherenceDialogRef = useDialog({ open: !!coherenceMismatch });
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
            country: newCountry, deviceId: deviceId(), initData: w.initData || ''
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
        // v0.62.640 — operator (iPad mini, IMG_1203): the hub's content started at
        // y=0, so the first tile sat UNDER Telegram's floating Back / ⌄ / ···
        // buttons. v0.62.638 wired the safe-area var app-wide but this root never
        // consumed it. (Completes the "audit all TMA" header pass.)
        paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      {/* v0.62.x — idle-return rating-reset pop-up (same copy as Cuisine). */}
      {ratingResetNote && (
        <div className="pointer-events-none fixed inset-x-0 bottom-14 z-50 flex justify-center px-3">
          <button
            type="button"
            onClick={() => setRatingResetNote(false)}
            className="pointer-events-auto max-w-sm rounded-2xl border border-tg-accent/40 bg-tg-card/95 px-3 py-2 text-left text-[12px] leading-snug text-tg-text shadow-lg backdrop-blur"
          >
            <div className="font-semibold">{t('rating.resetTitle', lang)}</div>
            <div className="mt-0.5 text-tg-hint">{t('rating.resetBody', lang)}</div>
          </button>
        </div>
      )}
      {/* v0.61.274 — same coherence modal as the Cuisine TMA.
          P1-d — dialog contract via useDialog (focus in, Tab containment,
          focus restore; Escape is a deliberate no-op — this is a forced
          choice between two location options with no dismiss affordance).
          The visible <h2> is now the accessible name (aria-labelledby). */}
      {coherenceMismatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gia-coherence-title"
        >
          <div ref={coherenceDialogRef} className="w-full max-w-[420px] rounded-2xl border border-tg-border bg-tg-bg shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-tg-border bg-tg-card flex items-center gap-2">
              <span aria-hidden>📍</span>
              <h2 id="gia-coherence-title" className="text-sm font-semibold flex-1">
                {t('coh.title', lang)}
              </h2>
            </div>
            <div className="px-4 py-3 text-[13px] leading-snug text-tg-text">
              {tn('coh.body', lang, { saved: t(`country.${coherenceMismatch.saved}`, lang), device: t(`country.${coherenceMismatch.coords}`, lang) })}
            </div>
            <div className="flex flex-col gap-2 px-4 pb-4">
              <button
                type="button"
                onClick={() => applyCoherenceChoice(true)}
                className="w-full px-3 py-2 rounded-xl bg-tg-accent text-tg-accent-text text-sm font-semibold"
              >
                {tn('coh.use', lang, { country: t(`country.${coherenceMismatch.coords}`, lang) })}
              </button>
              <button
                type="button"
                onClick={() => applyCoherenceChoice(false)}
                className="w-full px-3 py-2 rounded-xl bg-tg-card border border-tg-border text-tg-text text-sm"
              >
                {tn('coh.keep', lang, { country: t(`country.${coherenceMismatch.saved}`, lang) })}
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
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* v0.62.x — operator: tiny ↻ refresh (Menu has no weather badge,
                  so it sits beside the locale toggle). */}
              <button
                type="button"
                onClick={() => window.location.reload()}
                aria-label={t('ui.refresh', lang)}
                title={t('ui.refresh', lang)}
                className="gia-hit text-[11px] text-tg-hint hover:text-tg-text leading-none px-0.5 active:scale-90"
              >↻</button>
              <LocaleToggle />
            </div>
          </div>
          <p className="text-[11px] text-tg-hint leading-snug pt-0.5">
            {t('hero.subtagline', lang)}
          </p>
        </div>
      </div>

      {/* v0.62.220 — operator ("too much gap"): drop flex-1 so the content sits at
          its natural height instead of stretching to fill the viewport and pushing
          the footer chips far down — the hub now reads compact. */}
      <div className="px-3 pb-2 flex flex-col gap-2.5">
        {SECTIONS.map((section) => {
          const tileEls = section.tiles.map((tile) => {
            const disabled = (isMy || regionUnresolved) && SG_ONLY_TILES.has(tile.id);
            return (
              <Tile
                key={tile.id}
                icon={tile.icon}
                iconImage={tile.iconImage}
                imgClass={tile.iconImgClass || 'max-h-12 max-w-full object-contain'}
                boxClass={tile.iconBoxClass || 'w-16 h-16'}
                label={t(tile.labelKey, lang)}
                subtitle={tile.subKey ? t(tile.subKey, lang) : ''}
                onClick={() => handle(tile)}
                disabled={disabled}
                disabledTooltip={disabled ? t('tile.disabledMy', lang) : ''}
              />
            );
          });
          return (
          <section key={section.id} className="flex flex-col gap-1">
            {/* boxed sections render their heading INSIDE the box (below) */}
            {!section.boxed && section.titleKey && (
              <h2 className="text-[11px] uppercase tracking-wide text-tg-hint pl-1">
                {t(section.titleKey, lang)}
              </h2>
            )}
            {section.id === 'location' && (
              /* v0.61.125 — own section: location anchor picker. The
                 LocationFieldMenu was moved out of PLAN per operator
                 to give it equal visibility with eat / discover / plan
                 above. */
              <>
                {/* v0.62.31 — stale-travel hint (dismissible): the auto-detect
                    held a labelled pick while the device is >50 km away
                    (operator: "hint, never auto"). Blue accent — colour-blind
                    safe, no red/green. */}
                {farFromPickHint && (
                  <button
                    type="button"
                    onClick={() => setFarFromPickHint(null)}
                    className="w-full text-left mb-1.5 rounded-xl border border-tg-accent/40 bg-tg-card px-3 py-2 text-[12px] leading-snug text-tg-text"
                    aria-label={t('loc.farFromPick', lang).replace('{label}', farFromPickHint)}
                  >
                    {t('loc.farFromPick', lang).replace('{label}', farFromPickHint)}
                  </button>
                )}
                <LocationFieldMenu
                  lang={lang}
                  currentAnchor={anchor}
                  onAnchorChange={setAnchor}
                />
              </>
            )}
            {/* v0.62.226 — Train + Hawker (SG-only) sit inside a bordered
                "🇸🇬 Singapore" box; Cuisine (region-wide) stands alone. Each tile
                is a full-width row with title + subtitle + › chevron. */}
            {section.tiles.length > 0 && (
              section.boxed ? (
                <div className="rounded-2xl border border-tg-border bg-tg-card/30 px-2 pt-2 pb-2 flex flex-col gap-1.5">
                  {section.titleKey && (
                    <div className="text-[12px] font-semibold text-tg-text pl-1 pb-0.5">{t(section.titleKey, lang)}</div>
                  )}
                  {tileEls}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">{tileEls}</div>
              )
            )}
          </section>
          );
        })}
      </div>

      {/* v0.62.226 — operator: the footer block (tap-hint + Privacy/Forget-me +
          version tag) is pinned to the BOTTOM (mt-auto pushes it down in the
          min-height flex column). Contrast standardised across light/dark: text
          uses text-tg-text/N (the theme's own text colour, faded) instead of the
          low-contrast --tg-hint, so it reads cleanly on both backgrounds. */}
      <div className="mt-auto px-3 pt-3 pb-2 flex flex-col items-center gap-2">
        <p className="text-[11px] text-tg-text/70 text-center leading-snug">{t('hint.tap', lang)}</p>
        <div className="flex flex-wrap gap-1.5 justify-center items-center">
          {FOOTER_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => dispatchCmd(chip.id)}
              className="text-[11px] px-2 py-0.5 rounded-full bg-tg-card border border-tg-border text-tg-text/80 active:bg-tg-accent active:text-tg-accent-text transition"
            >
              {t(chip.labelKey, lang)}
            </button>
          ))}
        </div>
        <div className="text-center text-[10px] text-tg-text/60 leading-tight">
          <div>{t('footer.tag', lang)} · v{BUILD_VERSION}</div>
        </div>
      </div>

      {/* v0.62.213 — operator (IMG_1069 item 6): the separate bottom-left BackFab
          + bottom-right scroll FAB are replaced by ONE standardised FooterNav row
          (⇡ top / ⇣ down · ↩ back / 🔚 end), mirroring the Cuisine TMA footer. */}
      {/* v0.62.220 — operator: drop the "top" (scroll) button — the hub is a short
          screen with nothing to scroll; leave just back/end. */}
      <FooterNav
        showScroll={false}
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
