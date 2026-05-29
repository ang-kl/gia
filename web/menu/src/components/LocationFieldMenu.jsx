// LocationFieldMenu.jsx — v0.61.123
//
// Menu TMA location anchor picker. Rendered inside the PLAN section
// (above TrainPanel) per operator spec 2026-05-23. Two ways to set
// the anchor:
//
//   1. Dropdown of 17 curated precincts (10 STB + 5 SG region buckets
//      + 2 Malaysia anchors), grouped by section. Server returns the
//      list at /api/menu/precincts.
//   2. Free-text input that POSTs to /api/menu/set-location with
//      { text }, server runs geocodeQuery and stamps the cached
//      location.
//
// When the user picks a Malaysia anchor (region 'JB' or 'MY-PUT'),
// the parent App reads the resolved location and renders SG-only
// tiles + the TrainPanel in a disabled state (greyed + tooltip).
//
// Telegram WebApp `keepalive: true` ensures the POST hits the server
// even if the user immediately taps a tile that closes the webview.

import React, { useEffect, useRef, useState } from 'react';
import { tg } from '../tg.js';
import { t } from '../i18n.js';
import { OTHER_COUNTRIES, DEFAULT_OTHER_COUNTRY, findCountry } from '../countries.js';
import { citiesForCountry } from '../cities.js';

// v0.61.208 — same custom-dropdown pattern as the Cuisine TMA's
// LocationField (closed = "<flag> <CC>", open = "<flag> <Name>").
// Native <select> can't render different text for closed vs open.
// v0.61.233 — custom city dropdown matching CountryDropdownMenu's
// closed-short / open-full-name pattern. Closed state shows the
// 3-letter city code (BKK, KUL, TYO, …); open state lists every
// city name. The list is scrollable (max-h-72 + overflow-y-auto)
// so 15 capitals (Malaysia) fit on a phone viewport. Narrow
// closed-state (~4rem) leaves the free-text input room.
// v0.61.265 — operator (29-05 '26):
//   "the location field box cannot be a country like singapore or
//    malaysia. it has to be street number + building name +
//    Street name."
//   "always show 'unnamed' on whatever i typed in the other mode. why"
// Display guards mirrored from the Cuisine TMA's LocationField.jsx —
// keep the two TMAs' resting-label semantics in lock-step.
const COUNTRY_ONLY_RX = /^(singapore|malaysia|indonesia|thailand|vietnam|philippines|brunei|cambodia|laos|myanmar|japan|china|hong\s*kong|taiwan|south\s*korea|korea|australia|new\s*zealand|united\s*states|usa|united\s*kingdom|uk)$/i;
function _isCountryOnly(s) {
  return !!s && COUNTRY_ONLY_RX.test(String(s).trim());
}
function _safeLabel(primaryText, secondaryText, typedFallback = '') {
  const p = String(primaryText || '').trim();
  if (p && p !== 'Unnamed' && !_isCountryOnly(p)) return p;
  const s = String(secondaryText || '').trim();
  if (s && s !== 'Unnamed' && !_isCountryOnly(s)) return s;
  return String(typedFallback || '').trim();
}

// v0.61.251 — module-scoped haversine helper for the cities.js
// nearest-by-distance fallback inside LocationFieldMenu. Returns km
// between two lat/lng pairs (Earth R = 6371 km). Plain JS, no deps.
function _haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function CityDropdownMenu({ countryCode, value, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const itemRefs = useRef([]);
  const list = citiesForCountry(countryCode);
  const current = value ? list.find((c) => c.name === value) : null;
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  function pick(name) {
    setOpen(false);
    onChange?.(name);
  }
  if (!list.length) return null;
  // v0.61.248 — compact layout matching Cuisine TMA's CityDropdown
  // (web/cuisine/src/v2/components/LocationField.jsx ~line 305).
  // Operator: "make the country and city dropdown smaller and too
  // much gaps. it should be like the Cuisine TMA way of selection.
  // be consistent for Menu TMA and Cuisine TMA."
  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        type="button"
        aria-label={ariaLabel || 'City'}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-sm bg-transparent text-tg-text border border-tg-border rounded px-1.5 py-0.5 whitespace-nowrap inline-flex items-center gap-0.5"
        style={{ minWidth: '3.5rem' }}
      >
        <span className="font-mono tracking-tight">{current ? current.code : '— —'}</span>
        <span aria-hidden className="text-tg-hint text-[10px]">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full mt-1 z-30 max-h-72 overflow-y-auto rounded-md border border-tg-border bg-tg-card shadow-lg min-w-[12rem] py-0.5"
        >
          {list.map((c, i) => {
            const sel = current && c.name === current.name;
            return (
              <li key={c.name} role="option" aria-selected={sel}>
                <button
                  type="button"
                  ref={(el) => { itemRefs.current[i] = el; }}
                  onClick={() => pick(c.name)}
                  className={`w-full text-left px-3 py-1.5 text-[13px] whitespace-nowrap inline-flex items-center justify-between gap-2 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none ${sel ? 'bg-tg-bg/60 font-semibold' : ''}`}
                >
                  <span>{c.name}</span>
                  <span className="font-mono text-[11px] text-tg-hint">{c.code}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// v0.61.211 — keyboard nav: ↑/↓/Home/End + Enter, mirrors Cuisine
// TMA's CountryDropdown.
function CountryDropdownMenu({ value, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const itemRefs = useRef([]);
  const current = findCountry(value) || findCountry(DEFAULT_OTHER_COUNTRY);
  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  // v0.61.211 — focus the currently-selected option on open so
  // Enter immediately picks it; arrows from there move the focus.
  useEffect(() => {
    if (!open) return;
    const idx = OTHER_COUNTRIES.findIndex((c) => c.code === value);
    const target = itemRefs.current[idx >= 0 ? idx : 0];
    if (target && typeof target.focus === 'function') {
      const id = setTimeout(() => target.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open, value]);
  function pick(code) {
    setOpen(false);
    if (code !== value) onChange?.(code);
  }
  function onListKey(e) {
    if (!open) return;
    const len = OTHER_COUNTRIES.length;
    const active = document.activeElement;
    const idx = itemRefs.current.findIndex((el) => el === active);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = idx < 0 ? 0 : (idx + 1) % len;
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = idx < 0 ? len - 1 : (idx - 1 + len) % len;
      itemRefs.current[next]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      itemRefs.current[len - 1]?.focus();
    }
  }
  // v0.61.248 — compact layout matching Cuisine TMA's CountryDropdown
  // (web/cuisine/src/v2/components/LocationField.jsx ~line 360).
  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="bg-transparent text-sm outline-none whitespace-nowrap inline-flex items-center gap-0.5"
        style={{ minWidth: '4.5rem' }}
      >
        <span aria-hidden>{current.flag}</span>
        <span>{current.code}</span>
        <span aria-hidden className="text-tg-hint text-[10px]">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          onKeyDown={onListKey}
          className="absolute left-0 top-full mt-1 z-30 max-h-72 overflow-y-auto rounded-md border border-tg-border bg-tg-card shadow-lg min-w-[10rem] py-0.5"
        >
          {OTHER_COUNTRIES.map((c, i) => {
            const sel = c.code === value;
            return (
              <li key={c.code} role="option" aria-selected={sel}>
                <button
                  type="button"
                  ref={(el) => { itemRefs.current[i] = el; }}
                  onClick={() => pick(c.code)}
                  className={`w-full text-left px-3 py-1.5 text-[13px] whitespace-nowrap inline-flex items-center gap-1.5 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none ${sel ? 'bg-tg-bg/60 font-semibold' : ''}`}
                >
                  <span aria-hidden>{c.flag}</span>
                  <span>{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function LocationFieldMenu({ lang, onAnchorChange, currentAnchor }) {
  // v0.61.254 — operator: "in the location card, has two boxes is
  // currently wrong see picture. it should be Cuisine TMA's location
  // box '📍🇲🇾 Kuala Lumpur' (left flush). '🔍' (right flush) next
  // line (font size smaller by 2 pt, flush right so the '🔝' is
  // directly below 🔍). like this '5 places nearby · tap to change
  // 🔝' (below 🔍 or ✏️)."
  // Compact-pill mode (collapsed): when an anchor is set, render a
  // single 2-row pill mirroring v0.61.253 Cuisine TMA layout. Tap the
  // body to expand the full picker. Expanded by default when there's
  // no anchor (user needs the picker to set one).
  //
  // v0.61.256 — operator-reported bug (image 2 in the 29-05 '26
  // afternoon batch): the Menu TMA kept showing the expanded picker
  // even when an anchor was already set ("Anchored at Sydney · 20 km
  // cap." with the full precinct + flag/city/text form below).
  // Root cause: the v0.61.254 init `useState(!currentAnchor)` captures
  // the value at FIRST render — when the anchor fetch is still
  // pending, `currentAnchor === null`, so `expanded` starts at true.
  // The fetch resolves later → `currentAnchor` becomes an object,
  // but the `expanded` state is already `true` and stays there.
  // Fix: start collapsed (`useState(false)`), then a useEffect
  // collapses again on every anchor change so an externally-updated
  // anchor (chat /location command, GPS auto-detect after deploy)
  // always lands the user back in compact mode. The user can still
  // tap ✏️ / pill body to expand; the next anchor change re-collapses
  // (matches the v0.61.254 auto-collapse-after-pick contract).
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (currentAnchor && Number.isFinite(currentAnchor.lat) && Number.isFinite(currentAnchor.lng)) {
      setExpanded(false);
    } else {
      setExpanded(true);
    }
  }, [currentAnchor?.lat, currentAnchor?.lng]);
  const [precincts, setPrecincts] = useState({ sg: [], sgRegion: [], my: [] });
  const [pickerValue, setPickerValue] = useState('');
  const [textValue, setTextValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  // v0.61.124 — autocomplete suggestions for the free-text input,
  // backed by the existing /api/cuisine/place-autocomplete endpoint
  // (Google Places Autocomplete proxy with 5-min Redis cache). Debounced
  // 300 ms after the last keystroke; cleared on submit / pick.
  const [suggestions, setSuggestions] = useState([]);
  const [acOpen, setAcOpen] = useState(false);
  // v0.61.192 — OTHER-region country picker. countryPref is the
  // ISO 3166-1 alpha-2 code the user picked in the flag dropdown
  // (defaults to MY). otherResults is the 5-row confirmation list
  // returned by /api/cuisine/place-search-by-country.
  const [countryPref, setCountryPref] = useState(DEFAULT_OTHER_COUNTRY);
  const [otherResults, setOtherResults] = useState([]);
  const [otherSearching, setOtherSearching] = useState(false);
  const [otherNoMatch, setOtherNoMatch] = useState(false);
  // v0.61.226 — child city dropdown. Mirrors countryPref; cleared
  // whenever the country changes. When the user picks a city, the
  // form set-locations to that city's centroid directly (skips the
  // geocode round-trip that the free-text path would otherwise need).
  const [cityPick, setCityPick] = useState('');

  // v0.61.209 — seed countryPref from the server (`country-pref:<chatId>`)
  // on mount so the Menu TMA's OTHER picker opens on whatever the user
  // last set via /lcountry chat command or the Cuisine TMA's OTHER picker
  // (v0.61.196 already wires Cuisine TMA → server; this closes the
  // Menu TMA half of the bidirectional sync). Silently falls back to
  // DEFAULT_OTHER_COUNTRY on any network failure / 401.
  useEffect(() => {
    let cancelled = false;
    const w = tg();
    if (!w) return;
    fetch('/api/cuisine/country-pref', {
      headers: {
        Accept: 'application/json',
        'X-Telegram-Init-Data': w.initData || ''
      }
    }).then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (cancelled || !body?.countryCode) return;
        // v0.61.221 — 'SG' is now in OTHER_COUNTRIES (bottom of list)
        // so we read it back like any other country. Was: explicit
        // skip because the dropdown couldn't render SG.
        setCountryPref((cur) => (cur === body.countryCode ? cur : body.countryCode));
      })
      .catch(() => { /* non-fatal */ });
    return () => { cancelled = true; };
  }, []);

  // v0.61.209 — fire-and-forget push to /api/cuisine/country-pref when
  // the user changes the flag dropdown. Mirrors Cuisine TMA's
  // saveCountryPref helper.
  function updateCountryPref(code) {
    setCountryPref(code);
    // v0.61.265 — operator: "i select johor bahru, the street name
    // should be erased in the box." A street name typed for the old
    // country (e.g. SG) is meaningless after the flip; clear it so
    // the user starts fresh in the new country's picker.
    setTextValue('');
    setSuggestions([]);
    setAcOpen(false);
    const w = tg();
    if (!w) return;
    fetch('/api/cuisine/country-pref', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ countryCode: code, initData: w.initData || '' })
    }).catch(() => { /* non-fatal */ });
  }

  useEffect(() => {
    let cancelled = false;
    fetch('/api/menu/precincts')
      .then((r) => r.ok ? r.json() : null)
      .then((body) => {
        if (cancelled || !body?.precincts) return;
        const grouped = { sg: [], sgRegion: [], my: [] };
        for (const p of body.precincts) {
          if (p.source === 'STB') grouped.sg.push(p);
          else if (p.source === 'region') grouped.sgRegion.push(p);
          else grouped.my.push(p);
        }
        setPrecincts(grouped);
      })
      .catch((err) => console.warn('[LocationFieldMenu] precincts fetch failed:', err.message));
    return () => { cancelled = true; };
  }, []);

  async function postSetLocation(payload) {
    const w = tg();
    if (!w) {
      setErrorMsg(t('location.setErr', lang));
      return null;
    }
    setBusy(true);
    setErrorMsg('');
    try {
      const r = await fetch('/api/menu/set-location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, initData: w.initData || '' }),
        keepalive: true
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = await r.json();
      if (!body?.ok) throw new Error(body?.error || 'set-location failed');
      onAnchorChange?.({
        label: body.label,
        lat: body.lat,
        lng: body.lng,
        region: body.region || 'SG',
        radiusCapM: body.radiusCapM || null,
        // v0.61.139 — propagate structured address parts so the
        // summary line re-renders with "<street> + <building> +
        // (<postal>)" without waiting for App.jsx to re-fetch.
        street: body.street || null,
        building: body.building || null,
        postal: body.postal || null
      });
      return body;
    } catch (err) {
      console.warn('[LocationFieldMenu] set-location failed:', err.message);
      setErrorMsg(t('location.setErr', lang));
      return null;
    } finally {
      setBusy(false);
    }
  }

  // v0.61.250 — operator: *"Whenever I select a new country code,
  // immediately change the city code to the capital don't leave it
  // as '--' unless i am currently in the city change to the city
  // the location is detected."*
  // v0.61.251 — operator: *"cities.js nearest-by-distance sync —
  // fix the HK / Sibu dropdown '— --' gap so the CityDropdown
  // reflects the detected city even when the canonical IATA name
  // isn't in cities.js."* Falls back to nearest cities.js entry by
  // haversine when the anchor name doesn't match. Mirrors the
  // Cuisine TMA v0.61.251 in LocationField.jsx.
  useEffect(() => {
    const list = citiesForCountry(countryPref);
    if (!list.length) { setCityPick(''); return; }
    // (a) anchor label matches a cities.js entry directly.
    const anchorName = (currentAnchor?.label || '').trim();
    if (anchorName) {
      const hit = list.find((c) => c.name === anchorName);
      if (hit) { setCityPick(hit.name); return; }
    }
    // (b) anchor has coords → pick nearest cities.js entry by haversine.
    if (currentAnchor && Number.isFinite(currentAnchor.lat) && Number.isFinite(currentAnchor.lng)) {
      let best = null;
      let bestD = Infinity;
      for (const c of list) {
        const d = _haversineKm(currentAnchor.lat, currentAnchor.lng, c.lat, c.lng);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best) { setCityPick(best.name); return; }
    }
    // (c) no anchor → capital (first entry).
    setCityPick(list[0].name);
  }, [countryPref, currentAnchor?.label, currentAnchor?.lat, currentAnchor?.lng]);

  // v0.61.226 — city picked from the cascading child dropdown. Sets
  // the Menu TMA anchor directly to the city's centroid (lat/lng) +
  // label; no geocode round-trip needed because cities.js carries the
  // coords inline.
  function onCityPick(cityName) {
    if (!cityName) { setCityPick(''); return; }
    setCityPick(cityName);
    const list = citiesForCountry(countryPref);
    const hit = list.find((c) => c.name === cityName);
    if (!hit) return;
    postSetLocation({
      lat: hit.lat,
      lng: hit.lng,
      label: hit.name,
      country: countryPref
    }).then((body) => { if (body?.ok) setExpanded(false); });
  }

  function onPickerChange(e) {
    const id = e.target.value;
    setPickerValue(id);
    if (!id) return;
    // v0.61.223 — sync the flag dropdown to match the picked
    // precinct's country: SG/SGRegion sources → 'SG'; MY source
    // (JB / IOI Resort City / MY-PUT etc.) → 'MY'.
    const isSgPrecinct = precincts.sg.some((p) => p.id === id)
      || precincts.sgRegion.some((p) => p.id === id);
    const isMyPrecinct = precincts.my.some((p) => p.id === id);
    if (isSgPrecinct) updateCountryPref('SG');
    else if (isMyPrecinct) updateCountryPref('MY');
    postSetLocation({ precinctId: id }).then((body) => { if (body?.ok) setExpanded(false); });
  }

  // v0.61.223 — keep the flag dropdown in sync with the resolved
  // anchor region when the user changes anchor by another route
  // (e.g. typed text geocodes to SG → flag dropdown should read
  // 🇸🇬). For OTHER anchors, leave countryPref as the explicit
  // user pick (could be any of the 16 non-SG codes).
  useEffect(() => {
    if (!currentAnchor) return;
    const region = currentAnchor.region;
    if (region === 'SG') {
      setCountryPref((cur) => (cur === 'SG' ? cur : 'SG'));
    } else if (region === 'JB' || region === 'MY-PUT') {
      setCountryPref((cur) => (cur === 'MY' ? cur : 'MY'));
    }
    // region === 'OTHER' — keep whatever the user explicitly picked.
  }, [currentAnchor?.region]);

  // v0.61.192 — OTHER-region search. Calls the v0.61.191
  // /api/cuisine/place-search-by-country endpoint with the
  // selected country code; renders top 5 in a confirmation panel.
  // Tap a row → postSetLocation with the picked lat/lng/label (no
  // server-side geocode round-trip needed).
  async function onOtherSearch(e) {
    e?.preventDefault?.();
    const text = textValue.trim();
    if (text.length < 2) return;
    const w = tg();
    if (!w) { setErrorMsg(t('location.setErr', lang)); return; }
    setOtherSearching(true); setOtherNoMatch(false); setOtherResults([]); setErrorMsg('');
    try {
      // v0.61.199 — was: `res.ok ? res.json() : null` then treat null
      // as "noMatch", which made HTTP 502 look identical to a clean
      // zero-results response. Now distinguish: !res.ok → throw a
      // typed error so the user sees a real failure message instead
      // of "No match in Malaysia".
      const res = await fetch('/api/cuisine/place-search-by-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, countryCode: countryPref, initData: w.initData || '' })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const r = await res.json();
      const arr = Array.isArray(r?.results) ? r.results : [];
      if (arr.length === 0) setOtherNoMatch(true);
      setOtherResults(arr);
    } catch (err) {
      const raw = err?.message || String(err);
      const countryName = findCountry(countryPref)?.name || countryPref;
      const friendly = lang === 'fr'
        ? `Recherche dans ${countryName} impossible. Réessayez ou changez de pays. (${raw})`
        : `Couldn't search ${countryName}. Try again or pick a different country. (${raw})`;
      setErrorMsg(friendly);
    } finally {
      setOtherSearching(false);
    }
  }

  function pickOtherResult(r) {
    // v0.61.256 — operator (image 3): "Anchored at **Unnamed**" surfaced
    // after a place pick. Root cause: when Places has no displayName,
    // index.js /api/cuisine/place-search-by-country fills primaryText
    // with the literal string 'Unnamed' (see line ~12055 / 12098). That
    // string then gets POSTed as the anchor `label` here, persisted to
    // Redis, and read back by every TMA. Guard at this seam: prefer
    // r.secondaryText (the full formatted address) when primaryText is
    // missing or the literal 'Unnamed' fallback; falls through to
    // r.primaryText as last resort so we never persist 'Unnamed'.
    // v0.61.265 — also strip bare country names (Singapore / Malaysia
    // / …) so they never persist as the anchor label. Server-side
    // fix lives in smart-place-label.js + the route fallback chain.
    const labelOut = _safeLabel(r.primaryText, r.secondaryText, textValue.trim())
      || 'Pinned location';
    postSetLocation({ lat: r.lat, lng: r.lng, label: labelOut, country: countryPref })
      .then((body) => {
        if (body?.ok) {
          setTextValue('');
          setOtherResults([]);
          setOtherNoMatch(false);
          setExpanded(false);
        }
      });
  }

  function cancelOtherSearch() {
    setOtherResults([]); setOtherNoMatch(false); setErrorMsg('');
  }

  function onTextSubmit(e) {
    e.preventDefault();
    const text = textValue.trim();
    if (!text) return;
    postSetLocation({ text }).then((body) => {
      if (body?.ok) { setTextValue(''); setSuggestions([]); setAcOpen(false); setExpanded(false); }
    });
  }

  // v0.61.124 — debounced autocomplete. Mirrors the Cuisine TMA's
  // LocationField: POST /api/cuisine/place-autocomplete with the
  // typed text + current anchor (used as a location bias). Only fires
  // when the input has ≥ 3 chars and we're not already submitting.
  useEffect(() => {
    const text = textValue.trim();
    if (text.length < 3 || busy) { setSuggestions([]); setAcOpen(false); return; }
    const timer = setTimeout(() => {
      const w = tg();
      if (!w) return;
      fetch('/api/cuisine/place-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: text,
          lat: currentAnchor?.lat || null,
          lng: currentAnchor?.lng || null,
          region: (currentAnchor?.region === 'JB' || currentAnchor?.region === 'MY-PUT' || currentAnchor?.region === 'OTHER') ? 'JB' : 'SG',
          initData: w.initData || ''
        })
      })
        .then((r) => r.ok ? r.json() : null)
        .then((b) => {
          if (!b || !Array.isArray(b.suggestions)) return;
          setSuggestions(b.suggestions.slice(0, 5));
          setAcOpen(true);
        })
        .catch(() => { /* silent */ });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textValue, busy]);

  function pickSuggestion(s) {
    // The cuisine TMA's LocationField uses /api/cuisine/place-resolve
    // to convert placeId → coords. The Menu TMA's set-location
    // endpoint already accepts free text + geocodes it server-side,
    // so feeding the suggestion's primaryText is good enough and saves
    // a round-trip. Operator can flip to placeId-resolve later if
    // accuracy needs improving for ambiguous picks.
    const text = `${s.primaryText || ''}${s.secondaryText ? ' ' + s.secondaryText : ''}`.trim();
    setTextValue(text);
    setSuggestions([]); setAcOpen(false);
    postSetLocation({ text }).then((body) => {
      if (body?.ok) { setTextValue(''); setExpanded(false); }
    });
  }

  // Current-anchor summary line, with cap note when present.
  // v0.61.125 — operator: the "Anchored at X · 30 km cap" line should
  // read bigger; the disabled-tiles list goes on its OWN next line.
  // v0.61.139 — operator: a typed-text anchor (like "Heavenly Wang")
  // should show as "<street> + <building, if any> + (<postal>)"
  // instead of just the Places displayName, which for shops-in-malls
  // reads as the shop name only without geographic context. When the
  // backend (v0.61.139 geocodeQueryRegion) provides `street` /
  // `building` / `postal` via the addressComponents parser, build a
  // composite address-label via composeAddressLabel and substitute it
  // for {label}. Precinct picks (no addressComponents) and pre-
  // v0.61.139 cached anchors fall back to the curated `label` field
  // — unchanged behaviour.
  const capKm = currentAnchor?.radiusCapM ? Math.round(currentAnchor.radiusCapM / 1000) : null;
  const capStr = capKm ? t('location.capNote', lang).replace('{km}', String(capKm)) : '';
  const isMy = currentAnchor && (currentAnchor.region === 'JB' || currentAnchor.region === 'MY-PUT' || currentAnchor.region === 'OTHER');
  // v0.61.265 — operator: "the location field box cannot be a country."
  // composeAddressLabel returns null when anchor.street is missing,
  // and we fall back to anchor.label. If THAT label is a bare country
  // name ("Singapore" / "Malaysia") or the literal 'Unnamed', collapse
  // it to empty so the resting pill shows the i18n placeholder instead
  // of the country.
  const rawComposed = composeAddressLabel(currentAnchor) || currentAnchor?.label;
  const composedLabel = (rawComposed && rawComposed !== 'Unnamed' && !_isCountryOnly(rawComposed))
    ? rawComposed : '';
  const summaryMain = composedLabel
    ? t('location.currentSet', lang).replace('{label}', escapeHtml(composedLabel)).replace('{cap}', capStr)
    : t('location.currentNone', lang);
  // The disabled-list i18n string begins with " (" — strip the
  // leading " " + the parens for the standalone next-line render.
  const disabledListRaw = isMy ? t('location.disabledList', lang) : '';
  const disabledListLine = disabledListRaw
    .replace(/^\s*\(/, '')
    .replace(/\)\s*$/, '')
    .trim();

  // v0.61.254 — compact pill mode. When an anchor is set AND the user
  // hasn't tapped to expand, render the same 2-row layout as the
  // Cuisine TMA's LocationField (v0.61.253): row 1 "📍 <flag>
  // <label>" + ✏️; row 2 (text-[10px] italic, right-flush) "{capStr
  // ·} tap to change 🔝". Body tap → expand.
  if (currentAnchor && !expanded) {
    let flagEl;
    if (currentAnchor.region === 'SG') {
      flagEl = <span aria-hidden className="flex-shrink-0">🇸🇬</span>;
    } else if (currentAnchor.region === 'JB') {
      flagEl = <img src="MY_Johor_flag.png" alt="" width="16" height="11" className="rounded-sm border border-tg-border/40 flex-shrink-0" />;
    } else {
      const cc = findCountry(countryPref);
      flagEl = <span aria-hidden className="flex-shrink-0">{cc?.flag || '🌏'}</span>;
    }
    const metaLeftRaw = capStr || '';
    const tapStr = lang === 'fr' ? 'touchez pour changer' : 'tap to change';
    return (
      <div className="rounded-md border border-tg-border bg-tg-card p-2 flex flex-col gap-1.5">
        <div className="text-[12px] font-semibold text-tg-text">{t('location.fieldLabel', lang)}</div>
        <div className="rounded-md border border-tg-accent bg-tg-card px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-tg-accent">📍</span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex-1 min-w-0 text-left text-sm text-tg-text inline-flex items-center gap-1.5"
            >
              {flagEl}
              <span className="truncate">{composedLabel || currentAnchor.label || ''}</span>
            </button>
            <span aria-hidden className="text-tg-hint text-xs flex-shrink-0">✏️</span>
          </div>
          <div className="text-[10px] text-tg-hint italic text-right leading-tight mt-0.5">
            {metaLeftRaw ? `${metaLeftRaw.replace(/^\s*·\s*/, '').trim()} · ` : ''}{tapStr} 🔝
          </div>
        </div>
        {disabledListLine && (
          <div className="text-[11px] text-tg-hint leading-snug">{disabledListLine}</div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-md border border-tg-border bg-tg-card p-2 flex flex-col gap-1.5">
      {/* v0.61.125 — fonts bumped one size per operator:
          fieldLabel [11px]→[12px], summary [10px]→[13px] (the
          "Anchored at …" line specifically should read bigger),
          disabled-list [10px]→[11px] on its OWN line.
          v0.61.254 — when an anchor is set the user sees the new
          compact 2-row pill (above). Reaching this expanded JSX
          means either no anchor yet OR the user tapped ✏️ to
          edit. The expanded form retains all the v0.61.248 picker
          parts: summary line + precinct dropdown + country/city/
          text form. Tap any pick → setExpanded(false) collapses
          back to the compact pill once a new anchor lands. */}
      <div className="text-[12px] font-semibold text-tg-text">{t('location.fieldLabel', lang)}</div>
      <div className="text-[13px] text-tg-text leading-snug" dangerouslySetInnerHTML={{ __html: summaryMain }} />
      {disabledListLine && (
        <div className="text-[11px] text-tg-hint leading-snug">{disabledListLine}</div>
      )}
      {currentAnchor && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="text-[11px] text-tg-accent underline self-start"
        >{lang === 'fr' ? '↩︎ Replier' : '↩︎ Collapse'}</button>
      )}
      {/* v0.61.223 — precinct quick-pick is now ALWAYS visible
          regardless of region (operator: "the quick pick dropdown
          select still there and not remove in the Menu TMA"). Was
          v0.61.192: hidden when region was OTHER / MY-PUT. */}
      <select
        value={pickerValue}
        onChange={onPickerChange}
        disabled={busy}
        className="text-[13px] px-2 py-1.5 rounded bg-tg-bg border border-tg-border text-tg-text"
      >
        <option value="">{t('location.dropdownLabel', lang)}</option>
        {precincts.sg.length > 0 && (
          <optgroup label={t('location.dropdownGroupSg', lang)}>
            {precincts.sg.map((p) => (
              <option key={p.id} value={p.id}>🇸🇬 {p.label}</option>
            ))}
          </optgroup>
        )}
        {precincts.sgRegion.length > 0 && (
          <optgroup label={t('location.dropdownGroupSgReg', lang)}>
            {precincts.sgRegion.map((p) => (
              <option key={p.id} value={p.id}>🇸🇬 {p.label}</option>
            ))}
          </optgroup>
        )}
        {precincts.my.length > 0 && (
          <optgroup label={t('location.dropdownGroupMy', lang)}>
            {precincts.my.map((p) => (
              <option key={p.id} value={p.id}>🇲🇾 {p.label}{p.radiusCapM ? ` (${Math.round(p.radiusCapM/1000)} km)` : ''}</option>
            ))}
          </optgroup>
        )}
      </select>
      {/* v0.61.223 — form mode now driven by countryPref (SG vs non-SG),
          not by currentAnchor.region. Flag dropdown is ALWAYS visible
          (was OTHER-mode-only in v0.61.192). When countryPref === 'SG'
          → SG mode (text + Set + autocomplete). Else → OTHER mode
          (flag-biased Places search via place-search-by-country). */}
      {countryPref !== 'SG' ? (
        <>
          {/* v0.61.248 — operator: "make the country and city dropdown
              smaller and too much gaps. … the 🔍 icon is off the
              boundary." Pill wrapped in `flex items-center gap-1.5
              px-3 py-1.5 rounded-md border border-tg-accent
              bg-tg-card` to mirror Cuisine TMA's OtherLocationPicker
              expanded row; that gives the 🔍 button a defined
              container so it never overflows. Gap tightened 1.5 → 1.5
              kept (Cuisine TMA value). The 🔍 button is now a bare
              text-tg-accent icon (Cuisine TMA style) — no background
              fill — so it doesn't visually compete with the dropdowns. */}
          <form onSubmit={onOtherSearch} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-tg-accent bg-tg-card">
            {/* v0.61.208 — custom dropdown (open: flag + full name,
                closed: flag + CC). Mirrors Cuisine TMA. */}
            <CountryDropdownMenu
              value={countryPref}
              onChange={(code) => updateCountryPref(code)}
              ariaLabel={t('loc.other.country', lang)}
            />
            {/* v0.61.233 — cascading child city dropdown. Closed
                state shows the 3-letter city code (BKK / KUL / …);
                open state lists every full name with the code on
                the right and scrolls (max-h-72). Narrow closed-state
                leaves the free-text input usable. */}
            <CityDropdownMenu
              countryCode={countryPref}
              value={cityPick}
              onChange={(name) => onCityPick(name)}
              ariaLabel={t('loc.other.city', lang) || 'City'}
            />
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={t('loc.other.placeholder', lang)}
              disabled={busy || otherSearching}
              autoComplete="off"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-hint min-w-0"
            />
            <button
              type="submit"
              disabled={busy || otherSearching || textValue.trim().length < 2}
              className="text-tg-accent text-sm leading-none flex-shrink-0 px-1 disabled:opacity-40"
              aria-label={t('loc.other.searchBtn', lang)}
            >{otherSearching ? '…' : '🔍'}</button>
          </form>
          {otherSearching && (
            <div className="text-[11px] text-tg-hint italic">
              {t('loc.other.searching', lang).replace('{country}', (findCountry(countryPref) || {}).name || countryPref)}
            </div>
          )}
          {otherNoMatch && (
            <div className="text-[11px] text-tg-hint italic">
              {t('loc.other.noMatch', lang).replace('{country}', (findCountry(countryPref) || {}).name || countryPref)}
            </div>
          )}
          {otherResults.length > 0 && (
            <div className="rounded border border-tg-border bg-tg-bg overflow-hidden">
              <div className="px-2 py-1 text-[11px] text-tg-hint font-semibold border-b border-tg-border bg-tg-card">
                {t('loc.other.confirmHeader', lang)
                  .replace('{flag}', (findCountry(countryPref) || {}).flag || '')
                  .replace('{country}', (findCountry(countryPref) || {}).name || countryPref)}
              </div>
              {otherResults.map((r) => {
                // v0.61.265 — never show literal 'Unnamed' or a bare
                // country name in the result row; fall back to
                // secondaryText / user-typed query.
                const primaryDisplay = _safeLabel(r.primaryText, r.secondaryText, textValue.trim())
                  || 'Pinned location';
                return (
                <button
                  key={r.placeId}
                  type="button"
                  onClick={() => pickOtherResult(r)}
                  disabled={busy}
                  className="block w-full text-left px-2 py-1.5 text-[12px] hover:bg-tg-card border-b border-tg-border/40 last:border-b-0"
                >
                  <div className="text-tg-text">{primaryDisplay}</div>
                  {r.secondaryText && r.secondaryText !== primaryDisplay && (
                    <div className="text-[11px] text-tg-hint">{r.secondaryText}</div>
                  )}
                </button>
                );
              })}
              <button
                type="button"
                onClick={cancelOtherSearch}
                className="block w-full text-left px-2 py-1 text-[11px] text-tg-hint italic bg-tg-card"
              >
                {t('loc.other.cancel', lang)}
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* v0.61.248 — same compact pill layout as the OTHER form
              above (consistent across SG / OTHER and with Cuisine
              TMA's LocationField). The trailing button used to be a
              text-label "Set" pill; now it's a bare 🔍 icon for
              consistency. */}
          <form onSubmit={onTextSubmit} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-tg-accent bg-tg-card">
            {/* v0.61.223 — flag dropdown ALSO visible in SG mode so
                the user can flip to a non-SG country without leaving
                the picker. Picking a non-SG code in here flips the
                form to OTHER mode on the next render. */}
            <CountryDropdownMenu
              value={countryPref}
              onChange={(code) => updateCountryPref(code)}
              ariaLabel={t('loc.other.country', lang)}
            />
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onFocus={() => suggestions.length > 0 && setAcOpen(true)}
              onBlur={() => { setTimeout(() => setAcOpen(false), 150); }}
              placeholder={t('location.searchPlaceholder', lang)}
              disabled={busy}
              autoComplete="off"
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-hint min-w-0"
            />
            <button
              type="submit"
              disabled={busy || !textValue.trim()}
              className="text-tg-accent text-sm leading-none flex-shrink-0 px-1 disabled:opacity-40"
              aria-label={t('location.searchSubmit', lang)}
            >{busy ? '…' : '🔍'}</button>
          </form>
          {acOpen && suggestions.length > 0 && (
            <div className="rounded border border-tg-border bg-tg-bg max-h-40 overflow-y-auto">
              {suggestions.map((s) => {
                // v0.61.265 — display guard mirroring the OTHER results
                // list above.
                const primaryDisplay = _safeLabel(s.primaryText, s.secondaryText, textValue.trim())
                  || s.primaryText;
                return (
                <button
                  key={s.placeId || s.primaryText}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s)}
                  className="block w-full text-left px-2 py-1.5 text-[12px] hover:bg-tg-card border-b border-tg-border/40 last:border-b-0"
                >
                  <div className="text-tg-text">{primaryDisplay}</div>
                  {s.secondaryText && s.secondaryText !== primaryDisplay && (
                    <div className="text-[11px] text-tg-hint">{s.secondaryText}</div>
                  )}
                </button>
                );
              })}
            </div>
          )}
        </>
      )}
      {errorMsg && <div className="text-[11px] text-red-500">{errorMsg}</div>}
    </div>
  );
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// v0.61.139 — composes the operator's anchor format. Returns:
//   "<street>"                            (no building, no postal)
//   "<street>, <building>"                (no postal)
//   "<street> (<postal>)"                 (no building)
//   "<street>, <building> (<postal>)"     (everything)
// Returns null when there's no `street` to anchor the composition
// on; the caller then falls back to the legacy `label` field
// (precinct picks, pre-v0.61.139 cached anchors).
function composeAddressLabel(anchor) {
  if (!anchor) return null;
  const street = (typeof anchor.street === 'string' && anchor.street.trim()) ? anchor.street.trim() : null;
  if (!street) return null;
  const building = (typeof anchor.building === 'string' && anchor.building.trim()) ? anchor.building.trim() : null;
  const postal = (typeof anchor.postal === 'string' && anchor.postal.trim()) ? anchor.postal.trim() : null;
  let out = street;
  if (building && building !== street) out += ', ' + building;
  if (postal) out += ' (' + postal + ')';
  return out;
}
