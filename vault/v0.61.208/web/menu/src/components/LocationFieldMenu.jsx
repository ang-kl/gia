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

// v0.61.208 — same custom-dropdown pattern as the Cuisine TMA's
// LocationField (closed = "<flag> <CC>", open = "<flag> <Name>").
// Native <select> can't render different text for closed vs open.
function CountryDropdownMenu({ value, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
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
  function pick(code) {
    setOpen(false);
    if (code !== value) onChange?.(code);
  }
  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-[13px] bg-tg-bg border border-tg-border rounded px-1 py-1.5 text-tg-text whitespace-nowrap inline-flex items-center gap-0.5"
        style={{ minWidth: '4.5rem' }}
      >
        <span aria-hidden>{current.flag}</span>
        <span>{current.code}</span>
        <span aria-hidden className="text-tg-hint text-[10px]">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full mt-1 z-30 max-h-72 overflow-y-auto rounded-md border border-tg-border bg-tg-card shadow-lg min-w-[10rem] py-0.5"
        >
          {OTHER_COUNTRIES.map((c) => {
            const sel = c.code === value;
            return (
              <li key={c.code} role="option" aria-selected={sel}>
                <button
                  type="button"
                  onClick={() => pick(c.code)}
                  className={`w-full text-left px-3 py-1.5 text-[13px] whitespace-nowrap inline-flex items-center gap-1.5 hover:bg-tg-bg ${sel ? 'bg-tg-bg/60 font-semibold' : ''}`}
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

  function onPickerChange(e) {
    const id = e.target.value;
    setPickerValue(id);
    if (!id) return;
    postSetLocation({ precinctId: id }).then(() => setPickerValue(''));
  }

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
    postSetLocation({ lat: r.lat, lng: r.lng, label: r.primaryText, country: countryPref })
      .then((body) => {
        if (body?.ok) {
          setTextValue('');
          setOtherResults([]);
          setOtherNoMatch(false);
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
      if (body?.ok) { setTextValue(''); setSuggestions([]); setAcOpen(false); }
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
      if (body?.ok) setTextValue('');
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
  const composedLabel = composeAddressLabel(currentAnchor) || currentAnchor?.label;
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

  return (
    <div className="rounded-md border border-tg-border bg-tg-card p-2 flex flex-col gap-1.5">
      {/* v0.61.125 — fonts bumped one size per operator:
          fieldLabel [11px]→[12px], summary [10px]→[13px] (the
          "Anchored at …" line specifically should read bigger),
          disabled-list [10px]→[11px] on its OWN line. */}
      <div className="text-[12px] font-semibold text-tg-text">{t('location.fieldLabel', lang)}</div>
      <div className="text-[13px] text-tg-text leading-snug" dangerouslySetInnerHTML={{ __html: summaryMain }} />
      {disabledListLine && (
        <div className="text-[11px] text-tg-hint leading-snug">{disabledListLine}</div>
      )}
      {/* v0.61.192 — when active anchor is OTHER region (Putrajaya
          / KL / Tokyo / etc.), hide the precinct dropdown and the
          existing free-text + autocomplete input. Render the flag
          picker + free-text + Search button + confirmation list
          (mirror of Cuisine TMA's v0.61.191 flow). SG/JB unchanged. */}
      {currentAnchor && (currentAnchor.region === 'OTHER' || currentAnchor.region === 'MY-PUT') ? null : (
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
      )}
      {/* v0.61.192 — input row. For OTHER: country flag dropdown +
          free-text + 🔍 Search. For SG/JB: free-text + Set button +
          autocomplete dropdown below. */}
      {currentAnchor && (currentAnchor.region === 'OTHER' || currentAnchor.region === 'MY-PUT') ? (
        <>
          <form onSubmit={onOtherSearch} className="flex gap-1.5 items-center">
            {/* v0.61.208 — custom dropdown (open: flag + full name,
                closed: flag + CC). Mirrors Cuisine TMA. */}
            <CountryDropdownMenu
              value={countryPref}
              onChange={(code) => setCountryPref(code)}
              ariaLabel={t('loc.other.country', lang)}
            />
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              placeholder={t('loc.other.placeholder', lang)}
              disabled={busy || otherSearching}
              autoComplete="off"
              className="flex-1 text-[13px] px-2 py-1.5 rounded bg-tg-bg border border-tg-border text-tg-text outline-none"
            />
            <button
              type="submit"
              disabled={busy || otherSearching || textValue.trim().length < 2}
              className="text-[12px] px-2.5 py-1.5 rounded bg-tg-accent text-tg-accent-text disabled:opacity-40 active:opacity-90"
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
              {otherResults.map((r) => (
                <button
                  key={r.placeId}
                  type="button"
                  onClick={() => pickOtherResult(r)}
                  disabled={busy}
                  className="block w-full text-left px-2 py-1.5 text-[12px] hover:bg-tg-card border-b border-tg-border/40 last:border-b-0"
                >
                  <div className="text-tg-text">{r.primaryText}</div>
                  {r.secondaryText && <div className="text-[11px] text-tg-hint">{r.secondaryText}</div>}
                </button>
              ))}
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
          <form onSubmit={onTextSubmit} className="flex gap-1.5 items-center">
            <input
              type="text"
              value={textValue}
              onChange={(e) => setTextValue(e.target.value)}
              onFocus={() => suggestions.length > 0 && setAcOpen(true)}
              onBlur={() => { setTimeout(() => setAcOpen(false), 150); }}
              placeholder={t('location.searchPlaceholder', lang)}
              disabled={busy}
              autoComplete="off"
              className="flex-1 text-[13px] px-2 py-1.5 rounded bg-tg-bg border border-tg-border text-tg-text outline-none"
            />
            <button
              type="submit"
              disabled={busy || !textValue.trim()}
              className="text-[12px] px-2.5 py-1.5 rounded bg-tg-accent text-tg-accent-text disabled:opacity-40 active:opacity-90"
            >{busy ? '…' : t('location.searchSubmit', lang)}</button>
          </form>
          {acOpen && suggestions.length > 0 && (
            <div className="rounded border border-tg-border bg-tg-bg max-h-40 overflow-y-auto">
              {suggestions.map((s) => (
                <button
                  key={s.placeId || s.primaryText}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(s)}
                  className="block w-full text-left px-2 py-1.5 text-[12px] hover:bg-tg-card border-b border-tg-border/40 last:border-b-0"
                >
                  <div className="text-tg-text">{s.primaryText}</div>
                  {s.secondaryText && <div className="text-[11px] text-tg-hint">{s.secondaryText}</div>}
                </button>
              ))}
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
