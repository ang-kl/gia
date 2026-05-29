import React, { useEffect, useRef, useState } from 'react';
import { placeAutocomplete, placeResolve, placeSearchByCountry, reverseGeocode } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';
import { OTHER_COUNTRIES, DEFAULT_OTHER_COUNTRY, findCountry } from '../lib/countries.js';
import { citiesForCountry } from '../lib/cities.js';

// v0.58.7: location anchor field. Shows the user's current
// neighbourhood as a placeholder, and lets them search for a
// different anchor via Google Places Autocomplete. Picking a
// suggestion calls onSelect({ lat, lng, label }) which the parent
// uses to re-anchor the search via runSearchAt.
//
// Behaviour:
//   • Closed by default — clicking opens the input + popover.
//   • Debounced 250 ms on every keystroke.
//   • Suggestions biased to a 50 km circle around userLoc.
//   • Mouse-down preventDefault on suggestion buttons so the input
//     doesn't blur before the click registers.
// v0.60.119: `anchor` (the parent's locationAnchor — {lat, lng, name})
// is the location the user has explicitly locked in. It lets the field
// keep showing the picked place after the criteria card collapses and
// re-opens (the component unmounts/remounts and loses its internal
// pickedLabel), and after a TMA background/restore. Without it, the
// field re-showed the device / cached-pin neighbourhood even though
// searches were still running at the locked-in location.
// v0.61.50 — the right-side icon is now context-aware:
//   • closed (search mode) → 🔍 button that fires `onSearch`;
//   • open  (edit mode)   → ✏️ visual indicator only.
// v0.61.160 — operator bug report: the previous 2.5 s keystroke-idle
// auto-close was too aggressive — users typing a long address found
// the dropdown vanishing mid-thought, and the field appeared to
// "revert" to the device location while they were still composing.
// The auto-close is removed; the dropdown now stays open until the
// user (a) picks a suggestion, (b) taps the × clear button,
// (c) clicks outside the field (onBlur closes after 200 ms — long
// enough for suggestion clicks to register), or (d) hits Enter.
// Picking a suggestion that resolves to the SAME coordinates as the
// current anchor is now a no-op (no anchor re-commit, no map
// re-render, no server save) per the operator's "if the new
// location set is same as current location, don't do anything"
// instruction.
// v0.61.265 — operator (29-05 '26):
//   "the location field box cannot be a country like singapore or
//    malaysia. it has to be street number + building name +
//    Street name."
//   "always show 'unnamed' on whatever i typed in the other mode. why"
//   "i select johor bahru, the street name should be erased in the box."
// _isCountryOnly() screens labels that resolved to a bare country
// name (Places sometimes returns just "Singapore" for ambiguous
// inputs, and our pre-v0.61.265 `smart-place-label.js` deep fallback
// of 'Unnamed' would also leak through). _safeLabel() picks the
// best display string from a {primaryText, secondaryText} pair and
// the user's typed query, never showing 'Unnamed' to the user.
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

// v0.61.251 — module-scoped haversine helper for the v0.61.251
// nearest-cities.js-entry sync. Returns km between two lat/lng
// pairs; Earth radius 6371 km. Plain JS, no deps.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LocationField({ userLoc, region, onSelect, anchor = null, suffix = '', onSearch = null, countryPref = DEFAULT_OTHER_COUNTRY, onCountryChange = null }) {
  // v0.61.191 — branch on region AFTER all hooks below have been
  // declared (React Rules of Hooks: same order every render). The
  // OTHER picker is wholly its own sub-component; the SG/JB path
  // keeps the v0.61.189 code intact and uses the hooks declared
  // here. The early-return at the very end of this hook prologue
  // skips the rest of the SG/JB JSX when region === 'OTHER'.
  const [lang] = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  // v0.59.12 (Codex review #216): track which query produced the
  // current suggestions array so the Enter handler can refuse to pick
  // a stale result when the user has edited the query faster than the
  // 250 ms debounce + Autocomplete round-trip.
  const [suggestionsQuery, setSuggestionsQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentLabel, setCurrentLabel] = useState('');
  const [pickedLabel, setPickedLabel] = useState('');
  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  // v0.61.244 — operator: "remind users to click search after 6
  // seconds idle from typing the location field". Show a small
  // upward-pointing speech bubble next to the 🔍 button when the
  // user has typed something AND has been idle for 6 s without
  // picking. The bubble disappears on next keystroke, pick, clear,
  // submit, or blur.
  const [idleHintActive, setIdleHintActive] = useState(false);
  const idleTimerRef = useRef(null);
  function clearIdleHint() {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    setIdleHintActive(false);
  }
  useEffect(() => {
    clearIdleHint();
    const trimmed = query.trim();
    if (!open || trimmed.length < 1) return;
    idleTimerRef.current = setTimeout(() => { setIdleHintActive(true); }, 6000);
    return () => { if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; } };
  }, [query, open]);

  // Reverse-geocode the user's GPS once so the field shows
  // "📍 Telok Blangah" as the placeholder rather than coordinates.
  useEffect(() => {
    if (!userLoc?.lat || !userLoc?.lng) return;
    let cancelled = false;
    reverseGeocode({ lat: userLoc.lat, lng: userLoc.lng })
      .then((r) => { if (!cancelled) setCurrentLabel(r?.name || ''); })
      .catch(() => { /* placeholder stays empty; field still works */ });
    return () => { cancelled = true; };
  }, [userLoc?.lat, userLoc?.lng]);

  // v0.61.160 — the v0.61.50 2.5 s keystroke-idle auto-close was
  // removed (operator bug report). The dropdown now stays open until
  // the user explicitly picks, clears, blurs, or hits Enter. See the
  // file header for the full rationale.

  // Debounced autocomplete fetch on every keystroke.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      setSuggestionsQuery('');
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await placeAutocomplete({
          input: trimmed, lat: userLoc?.lat, lng: userLoc?.lng, region
        });
        // v0.59.12 (Codex review #216): drop the response if the user
        // kept typing during the round-trip. setSuggestionsQuery records
        // the query that owns this batch so Enter can verify freshness.
        setSuggestions(r?.suggestions || []);
        setSuggestionsQuery(trimmed);
      } catch {
        setSuggestions([]);
        setSuggestionsQuery('');
      } finally { setLoading(false); }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, userLoc?.lat, userLoc?.lng, region]);

  async function handlePick(s) {
    setOpen(false);
    setQuery('');
    setSuggestions([]);
    setSuggestionsQuery('');
    clearIdleHint();
    setLoading(true);
    try {
      const r = await placeResolve({ placeId: s.placeId });
      if (r?.lat != null && r?.lng != null) {
        const label = r.name || s.primaryText || '';
        // v0.61.160 — idempotent pick. If the resolved coords match
        // the current anchor (~10 m tolerance for floating-point
        // drift), do nothing: no anchor re-commit, no server save,
        // no map re-centre. The user can still click the explicit
        // search button to fire a fresh query. This stops the
        // "picked the same place I'm already at" loop the operator
        // observed (the prior code re-saved the anchor + reset
        // searchCenter, which contributed to the "looks like a
        // revert" feel when combined with the 2.5 s auto-close).
        const same = anchor
          && Math.abs(anchor.lat - r.lat) < 1e-4
          && Math.abs(anchor.lng - r.lng) < 1e-4;
        if (!same) {
          setPickedLabel(label);
          // v0.61.244 — operator: "do not fire search from the
          // location box for johor and others until user fire".
          // SG keeps the v0.61.237 auto-fire (it's the chat-bot
          // default region; users expect a tap-pick to surface
          // results). JB and OTHER require an explicit 🔍 tap.
          onSelect?.({ lat: r.lat, lng: r.lng, label, noAutoFire: region !== 'SG' });
        }
      }
    } catch (err) {
      console.warn('[LocationField] resolve failed:', err.message);
    } finally { setLoading(false); }
  }

  // v0.59.12: Enter-to-anchor. The autocomplete dropdown previously
  // required a tap, which the Human Lead reported was easily missed —
  // they would type an address, expect Enter to anchor, and end up
  // with the search running on the stale GPS location. Now Enter
  // auto-picks the top suggestion (same code path as a tap).
  //
  // Codex review #216: refuse to pick when suggestions are stale —
  // i.e. the user edited the query faster than the 250 ms debounce
  // could roundtrip and the current suggestions[] still belongs to a
  // previous keystroke. We compare suggestionsQuery (set inside the
  // debounce effect) against the current trimmed input. Enter is also
  // a no-op when an inflight fetch is loading.
  function handleKeyDown(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (loading) return;
    if (suggestions.length === 0) return;
    if (suggestionsQuery !== query.trim()) return;
    handlePick(suggestions[0]);
  }

  function handleClear() {
    setPickedLabel('');
    setQuery('');
    setSuggestions([]);
    setSuggestionsQuery('');
    clearIdleHint();
    if (userLoc?.lat && userLoc?.lng) {
      // Clearing snaps the search anchor back to the device / cached
      // pin. The parent re-runs the search there and resets
      // locationAnchor accordingly.
      onSelect?.({ lat: userLoc.lat, lng: userLoc.lng, label: '' });
    }
  }

  // v0.60.119: is the locked-in anchor actually a *different* place
  // from the device / cached pin? (After a "clear", the parent sets
  // locationAnchor ≈ userLoc, so we don't want the field to still look
  // like an override is active.)
  const anchorDiffers = !!(anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)
    && (!userLoc || Math.abs(anchor.lat - userLoc.lat) > 1e-5 || Math.abs(anchor.lng - userLoc.lng) > 1e-5));
  const anchorLabel = anchorDiffers ? (anchor.name || '').trim() : '';
  // Resting label: just-picked label > locked-in anchor name >
  // device-pin neighbourhood > i18n('Search location').
  // v0.61.265 — operator: bare country names are NEVER acceptable
  // resting labels; the field should show street/building/street
  // name, not "Singapore" or "Malaysia". Filter at each tier so a
  // bad reverseGeocode or an ambiguous pick falls through to the
  // i18n placeholder.
  const pickedSafe = _isCountryOnly(pickedLabel) ? '' : pickedLabel;
  const anchorSafe = _isCountryOnly(anchorLabel) ? '' : anchorLabel;
  const currentSafe = _isCountryOnly(currentLabel) ? '' : currentLabel;
  const resting = pickedSafe || anchorSafe || currentSafe || tr('loc.searchLocation', lang);
  const showClear = !!(pickedSafe || (anchorDiffers && anchorSafe));

  // v0.61.265 — operator: "i select johor bahru, the street name
  // should be erased in the box." Region switching invalidates any
  // typed-but-not-yet-picked input from the previous region (a
  // street name typed for SG isn't relevant to JB). Reset query +
  // suggestions when the region prop flips. The pickedLabel /
  // anchor state is owned by the parent and persists by design.
  useEffect(() => {
    setQuery('');
    setSuggestions([]);
    setSuggestionsQuery('');
    clearIdleHint();
    setOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  // v0.61.191 — OTHER region: branch to the dedicated picker that
  // uses country dropdown + free-text + confirmation list. The
  // SG/JB JSX below stays the same as v0.61.189.
  if (region === 'OTHER') {
    return (
      <OtherLocationPicker
        countryPref={countryPref}
        onCountryChange={onCountryChange}
        onSelect={onSelect}
        anchor={anchor}
        suffix={suffix}
        onSearch={onSearch}
      />
    );
  }

  return (
    <div className="relative">
      {/* v0.61.253 — operator: 2-row layout — line 1: "📍🇸🇬 Singapore"
          (left) + 🔍 (right); line 2 (smaller, right-flush): "5
          places nearby · tap to change 🔝" with the 🔝 directly
          below the 🔍. SG/JB get a flag prefix: 🇸🇬 emoji for SG, the
          MY_Johor_flag.png image for JB (mirrors the region-pill
          row's flag-handling convention).
          Open (input) state keeps the single-row layout (input + ✏️). */}
      <div className="rounded-md border border-tg-accent bg-tg-card px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span aria-hidden className="text-tg-accent">📍</span>
          {open ? (
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              onKeyDown={handleKeyDown}
              enterKeyHint="search"
              placeholder={resting}
              className="flex-1 min-w-0 bg-transparent text-sm outline-none placeholder:text-tg-hint"
            />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex-1 min-w-0 text-left text-sm text-tg-text inline-flex items-center gap-1.5"
            >
              {region === 'SG' && (
                <span aria-hidden className="flex-shrink-0">🇸🇬</span>
              )}
              {region === 'JB' && (
                <img
                  src="MY_Johor_flag.png"
                  alt=""
                  width="16"
                  height="11"
                  className="rounded-sm border border-tg-border/40 flex-shrink-0"
                />
              )}
              <span className="truncate">{resting}</span>
            </button>
          )}
          {loading && <span className="text-tg-hint text-xs">…</span>}
          {showClear && !open && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={tr('loc.clear', lang)}
              className="text-tg-hint hover:text-tg-text text-xs leading-none px-1"
            >×</button>
          )}
          {open ? (
            <span aria-hidden className="text-tg-hint text-xs flex-shrink-0">✏️</span>
          ) : (
            <button
              type="button"
              onClick={() => { clearIdleHint(); onSearch?.(); }}
              aria-label={tr('loc.searchHere', lang)}
              title={tr('loc.searchHere', lang)}
              className="text-tg-accent hover:text-tg-text text-sm leading-none flex-shrink-0 px-1"
            >🔍</button>
          )}
        </div>
        {!open && suffix && (
          <div className="text-[10px] text-tg-hint italic text-right leading-tight mt-0.5">
            {suffix} · {lang === 'fr' ? 'touchez pour changer' : 'tap to change'} 🔝
          </div>
        )}
      </div>
      {/* v0.61.244 — 6 s idle reminder: small upward-pointing speech
          bubble below the pill, near the 🔍 button. Pulses to draw
          attention. Mirrors the v0.61.241 location-suffix bubble
          shape (rounded-2xl + rotated-square tail) but tail points
          UP at the 🔍 icon instead of DOWN at the pill. */}
      {idleHintActive && (
        <div
          aria-hidden="true"
          className="absolute top-full right-2 mt-1.5 select-none pointer-events-none z-10 animate-pulse"
        >
          <div className="relative bg-tg-accent text-tg-bg text-[10px] font-semibold rounded-2xl px-2.5 py-1 whitespace-nowrap shadow-md">
            <span className="absolute right-3 -top-1 w-2 h-2 bg-tg-accent rotate-45" />
            {lang === 'fr' ? 'Touchez 🔍 pour rechercher' : 'Tap 🔍 to search'}
          </div>
        </div>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-tg-border bg-tg-card shadow-lg overflow-hidden">
          {suggestions.map((s, i) => {
            // v0.61.265 — display guard: never show literal 'Unnamed'
            // or a bare country name in the suggestion list; fall
            // back to secondaryText or the user's typed query.
            const primaryDisplay = _safeLabel(s.primaryText, s.secondaryText, query.trim());
            return (
            <button
              key={s.placeId}
              type="button"
              aria-selected={i === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(s)}
              className={`block w-full text-left px-3 py-2 hover:bg-tg-bg border-b border-tg-border last:border-0 ${i === 0 ? 'bg-tg-bg/50' : ''}`}
            >
              <div className="text-sm">{primaryDisplay || s.primaryText}</div>
              {s.secondaryText && s.secondaryText !== primaryDisplay && (
                <div className="text-[11px] text-tg-hint truncate">{s.secondaryText}</div>
              )}
            </button>
            );
          })}
          {/* v0.59.12: Enter-to-anchor affordance — makes the new keyboard
              shortcut discoverable without forcing the user to read docs. */}
          <div className="px-3 py-1.5 text-[10px] text-tg-hint italic border-t border-tg-border bg-tg-bg/40">
            {tr('loc.enterHint', lang)}
          </div>
        </div>
      )}
      {/* v0.59.12: visible "no match" feedback when the user typed
          ≥ 2 chars but Autocomplete returned no result. Keeps the
          Enter-key contract honest — Enter no-ops, and now the user
          knows why. */}
      {open && !loading && query.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-tg-border bg-tg-card shadow-lg px-3 py-2 text-xs text-tg-hint">
          {tr('loc.noMatch', lang)}
        </div>
      )}
    </div>
  );
}

// v0.61.208 — custom country dropdown. Native <select> renders the
// selected option's text identically when closed and when open —
// operator wanted "<flag> <CC>" when closed (compact) but
// "<flag> <Name>" when the dropdown is open (descriptive). This
// component implements that via a button + absolutely-positioned
// popover. Click-outside / Esc closes; focus stays on the button.
// v0.61.211 — keyboard nav: ↑/↓ to move highlight, Home/End to
// jump to first/last, Enter to pick. Initial focus on the
// v0.61.233 — custom city dropdown matching CountryDropdown's
// closed-short / open-full-name pattern. Closed state shows the
// 3-letter city code (BKK, KUL, TYO, …); open state lists every
// city name with the code on the right. Scrollable (max-h-72)
// so 15 Malaysia capitals fit on a phone viewport.
function CityDropdown({ countryCode, value, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
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
  function pick(name) { setOpen(false); onChange?.(name); }
  if (!list.length) return null;
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
          {list.map((c) => {
            const sel = current && c.name === current.name;
            return (
              <li key={c.name} role="option" aria-selected={sel}>
                <button
                  type="button"
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

// currently-selected country (or first country if none).
function CountryDropdown({ value, onChange, ariaLabel }) {
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
  // v0.61.211 — when the listbox opens, focus the currently-selected
  // option (or the first one if `value` isn't in the list). Native
  // button focus drives Enter-to-pick + visual focus ring.
  useEffect(() => {
    if (!open) return;
    const idx = OTHER_COUNTRIES.findIndex((c) => c.code === value);
    const target = itemRefs.current[idx >= 0 ? idx : 0];
    if (target && typeof target.focus === 'function') {
      // setTimeout 0 so the popover is in the DOM when focus runs.
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
                  className={`w-full text-left px-3 py-1.5 text-sm whitespace-nowrap inline-flex items-center gap-1.5 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none ${sel ? 'bg-tg-bg/60 font-semibold' : ''}`}
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

// v0.61.191 — OTHER-region location picker. Replaces the
// autocomplete-dropdown flow with: tiny flag dropdown on the left
// (16 ASEAN/Oceania/N-Asia countries minus SG), free-text input,
// 🔍 Search button, then a 5-entry confirmation list returned by
// /api/cuisine/place-search-by-country. No autocomplete dropdown
// during typing (operator: "too many for a dropdown to be useful").
function OtherLocationPicker({ countryPref, onCountryChange, onSelect, anchor, suffix, onSearch }) {
  const [lang] = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);   // [{placeId, primaryText, secondaryText, lat, lng}, ...]
  const [searching, setSearching] = useState(false);
  // v0.61.244 — 6 s idle reminder. Mirrors the SG/JB branch above.
  // Shows a small upward-pointing bubble next to the 🔍 button when
  // the user has typed something AND has been idle for 6 s without
  // pressing 🔍. Dismissed on next keystroke, 🔍 tap, pick, or cancel.
  const [idleHintActive, setIdleHintActive] = useState(false);
  const idleTimerRef = useRef(null);
  function clearIdleHint() {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    setIdleHintActive(false);
  }
  useEffect(() => {
    clearIdleHint();
    const trimmed = query.trim();
    if (trimmed.length < 1) return;
    idleTimerRef.current = setTimeout(() => { setIdleHintActive(true); }, 6000);
    return () => { if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; } };
  }, [query]);
  const [noMatch, setNoMatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const country = findCountry(countryPref) || findCountry(DEFAULT_OTHER_COUNTRY);
  // v0.61.236 — collapsed/expanded toggle. Mirrors SG mode's resting
  // pill. When `anchor` is set, render a single-line "📍 {label} ·
  // {suffix} tap to change" pill (operator: "the {country code} +
  // {city code} is taking too much UI estate"). Expanded form
  // (flag + city + text + 🔍) shows only when user taps to edit OR
  // when there's no anchor yet.
  const [expanded, setExpanded] = useState(false);
  // v0.61.265 — show the compact pill only when the anchor name is
  // actually meaningful (not a stale country label, not the literal
  // 'Unnamed' placeholder). Otherwise the picker stays expanded so
  // the user can re-anchor cleanly.
  const showCompact = !!(anchor && anchor.name && !_isCountryOnly(anchor.name)
    && anchor.name !== 'Unnamed') && !expanded && results.length === 0;
  // v0.61.228 — child city dropdown. Mirrors v0.61.227 Menu TMA. The
  // cityPick value is reset whenever the country flips because each
  // country has its own catalogue. Picking a city sets the anchor
  // directly to that city's centroid (no geocode round-trip — coords
  // are inline in lib/cities.js).
  const [cityPick, setCityPick] = useState('');
  // v0.61.250 — operator: *"Whenever I select a new country code,
  // immediately change the city code to the capital don't leave it
  // as '--' unless i am currently in the city change to the city
  // the location is detected."*
  // v0.61.251 — operator: *"cities.js nearest-by-distance sync —
  // fix the HK / Sibu dropdown '— —' gap so the CityDropdown
  // reflects the detected city even when the canonical IATA name
  // isn't in cities.js."*
  // Strategy: on country change, prefer in order:
  //   (a) the anchor's name when it's a city in this country's list
  //       (GPS auto-detect feeds it through: "Kuala Lumpur" →
  //       cities.js[MY] hit → KUL)
  //   (b) the cities.js entry NEAREST to anchor.lat/lng by haversine
  //       (covers HK: anchor "Hong Kong" doesn't match cities.js[HK]
  //       district names, but anchor coords are inside Tsim Sha Tsui
  //       or Central → nearest district entry wins; covers Sibu: SBW
  //       isn't in cities.js[MY], but Kuching KCH is the nearest
  //       cities.js[MY] entry at ~150 km)
  //   (c) the first cities.js entry (capital — only when there's no
  //       anchor at all)
  useEffect(() => {
    const list = citiesForCountry(country.code);
    if (!list.length) { setCityPick(''); return; }
    // (a) anchor name matches a cities.js entry directly.
    const anchorName = (anchor?.name || '').trim();
    if (anchorName) {
      const hit = list.find((c) => c.name === anchorName);
      if (hit) { setCityPick(hit.name); return; }
    }
    // (b) anchor has coords → pick nearest cities.js entry by haversine.
    if (anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)) {
      let best = null;
      let bestD = Infinity;
      for (const c of list) {
        const d = haversineKm(anchor.lat, anchor.lng, c.lat, c.lng);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (best) { setCityPick(best.name); return; }
    }
    // (c) no anchor → capital (first entry).
    setCityPick(list[0].name);
  }, [country.code, anchor?.name, anchor?.lat, anchor?.lng]);
  function onCityPick(name) {
    if (!name) { setCityPick(''); return; }
    setCityPick(name);
    const list = citiesForCountry(country.code);
    const hit = list.find((c) => c.name === name);
    if (!hit) return;
    // v0.61.241 — operator: "you fire search after selecting the city
    // is wrong. It should wait until clicking the search button."
    // Pass noAutoFire so App.jsx.onLocationSelect sets the anchor but
    // skips the v0.61.237 Promise.resolve()→runSearch microtask. The
    // user must press 🔍 to fire.
    onSelect?.({ lat: hit.lat, lng: hit.lng, label: hit.name, noAutoFire: true });
    setResults([]); setQuery(''); setNoMatch(false); setErrorMsg('');
    // v0.61.241 — keep cityPick set so the dropdown shows the picked
    // city code (e.g. "KUL") after collapse instead of reverting to
    // "— —". Previously we reset to '' which made the code disappear.
    setExpanded(false);
  }

  async function doSearch() {
    const text = query.trim();
    if (text.length < 2) return;
    clearIdleHint();
    setSearching(true); setNoMatch(false); setErrorMsg(''); setResults([]);
    try {
      const r = await placeSearchByCountry({ input: text, countryCode: country.code });
      const arr = Array.isArray(r?.results) ? r.results : [];
      if (arr.length === 0) setNoMatch(true);
      setResults(arr);
    } catch (err) {
      // v0.61.199 — operator log showed "HTTP 502" surfaced verbatim
      // to the user, which is meaningless. Rewrite to a friendlier
      // line so they know the anchor IS unchanged and what to try.
      const raw = err?.message || String(err);
      const friendly = lang === 'fr'
        ? `Recherche dans ${country.name} impossible. Réessayez ou changez de pays. (${raw})`
        : `Couldn't search ${country.name}. Try again or pick a different country. (${raw})`;
      setErrorMsg(friendly);
    } finally {
      setSearching(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
  }

  function pickResult(r) {
    // v0.61.244 — operator: "do not fire search from the location
    // box for johor and others until user fire". OTHER free-text
    // picks now set the anchor but the operator still presses 🔍
    // to fire. Matches v0.61.241 city-dropdown semantics.
    // v0.61.256 — operator (image 3 batch): the server's
    // /api/cuisine/place-search-by-country fills primaryText with
    // the literal string 'Unnamed' when Places has no displayName.
    // v0.61.265 — operator: "always show 'unnamed' on whatever i
    // typed in the other mode." Add the country-only filter on top
    // of the v0.61.256 'Unnamed' guard so bare country picks fall
    // through to the user's typed text rather than persisting
    // "Singapore" or "Malaysia" as the anchor name.
    const labelOut = _safeLabel(r.primaryText, r.secondaryText, query.trim())
      || 'Pinned location';
    onSelect?.({ lat: r.lat, lng: r.lng, label: labelOut, noAutoFire: true });
    setResults([]); setQuery(''); setNoMatch(false);
    clearIdleHint();
    setExpanded(false); // v0.61.236 — collapse after a pick
  }

  function cancel() {
    setResults([]); setQuery(''); setNoMatch(false); setErrorMsg('');
    clearIdleHint();
  }

  // v0.61.265 — operator: "the location field box cannot be a country."
  // Guard the resting label so a stale country-named anchor (e.g.
  // server returned just "Singapore" pre-v0.61.265) falls back to
  // the i18n placeholder rather than the bare country.
  const anchorNameSafe = (anchor && anchor.name && !_isCountryOnly(anchor.name)
    && anchor.name !== 'Unnamed') ? anchor.name : '';
  const restingLabel = anchorNameSafe || tr('loc.other.placeholder', lang);

  return (
    <div className="flex flex-col gap-1.5">
      {/* v0.61.236 — compact resting pill (anchor set, not expanded).
          v0.61.253 — 2-row layout per operator spec: line 1 "📍🇲🇾
          Kuala Lumpur" (left) + 🔍 (right); line 2 (smaller,
          right-flush): "5 places nearby · tap to change 🔝" with
          🔝 directly below 🔍. Tap the left-side body to expand
          the picker; tap 🔍 to fire the search at the current
          anchor (forwarded onSearch prop). */}
      {showCompact ? (
        <div className="rounded-md border border-tg-accent bg-tg-card px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-tg-accent">📍</span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex-1 min-w-0 text-left text-sm text-tg-text inline-flex items-center gap-1.5"
            >
              <span className="flex-shrink-0" aria-hidden>{country.flag}</span>
              <span className="truncate">{anchor.name}</span>
            </button>
            <button
              type="button"
              onClick={() => onSearch?.()}
              aria-label={tr('loc.searchHere', lang)}
              title={tr('loc.searchHere', lang)}
              className="text-tg-accent hover:text-tg-text text-sm leading-none flex-shrink-0 px-1"
            >🔍</button>
          </div>
          {suffix && (
            <div className="text-[10px] text-tg-hint italic text-right leading-tight mt-0.5">
              {suffix} · {lang === 'fr' ? 'touchez pour changer' : 'tap to change'} 🔝
            </div>
          )}
        </div>
      ) : (
      <div className="relative">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-tg-accent bg-tg-card">
          {/* v0.61.208 — custom dropdown: closed shows "<flag> <CC>"
              (compact), opened shows "<flag> <Name>" (descriptive).
              Native <select> can't differentiate closed vs open
              text, so we use a button + popover. */}
          <CountryDropdown
            value={country.code}
            onChange={(code) => onCountryChange?.(code)}
            ariaLabel={tr('loc.other.country', lang)}
          />
          {/* v0.61.233 — cascading child city dropdown, now a custom
              CityDropdown: closed state shows the 3-letter city code
              (BKK / KUL / …) mirroring the country flag's closed-CC
              pattern; open state lists every full name + code on
              the right and scrolls (max-h-72). Narrow closed-state
              leaves the free-text input usable. */}
          <CityDropdown
            countryCode={country.code}
            value={cityPick}
            onChange={(name) => onCityPick(name)}
            ariaLabel={tr('loc.other.city', lang) || 'City'}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            enterKeyHint="search"
            placeholder={anchorNameSafe || tr('loc.other.placeholder', lang)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-hint"
          />
          <button
            type="button"
            onClick={doSearch}
            disabled={searching || query.trim().length < 2}
            className="text-tg-accent text-sm leading-none flex-shrink-0 px-1 disabled:opacity-40"
            aria-label={tr('loc.other.searchBtn', lang)}
          >🔍</button>
        </div>
        {/* v0.61.244 — 6 s idle reminder: small upward-pointing
            bubble below the pill, near the 🔍 button. Pulses to
            draw attention. */}
        {idleHintActive && (
          <div
            aria-hidden="true"
            className="absolute top-full right-2 mt-1.5 select-none pointer-events-none z-10 animate-pulse"
          >
            <div className="relative bg-tg-accent text-tg-bg text-[10px] font-semibold rounded-2xl px-2.5 py-1 whitespace-nowrap shadow-md">
              <span className="absolute right-3 -top-1 w-2 h-2 bg-tg-accent rotate-45" />
              {lang === 'fr' ? 'Touchez 🔍 pour rechercher' : 'Tap 🔍 to search'}
            </div>
          </div>
        )}
      </div>
      )}
      {/* v0.61.236 — collapse back to compact pill after a city pick. */}
      {/* Current anchor + suffix hint (only when expanded and no results
          panel). The compact pill above shows this same info in resting. */}
      {!showCompact && anchor?.name && results.length === 0 && !searching && (
        <div className="text-[11px] text-tg-hint truncate px-1">
          📍 {anchor.name}{suffix ? ` · ${suffix}` : ''}
          {' '}<button type="button" onClick={() => setExpanded(false)} className="text-tg-accent underline">collapse</button>
        </div>
      )}
      {searching && (
        <div className="text-[11px] text-tg-hint px-1 italic">
          {tr('loc.other.searching', lang).replace('{country}', country.name)}
        </div>
      )}
      {noMatch && (
        <div className="text-[11px] text-tg-hint px-1 italic">
          {tr('loc.other.noMatch', lang).replace('{country}', country.name)}
        </div>
      )}
      {errorMsg && (
        <div className="text-[11px] text-red-500 px-1">{errorMsg}</div>
      )}
      {results.length > 0 && (
        <div className="rounded-md border border-tg-border bg-tg-card overflow-hidden">
          <div className="px-3 py-1.5 text-[11px] text-tg-hint font-semibold border-b border-tg-border bg-tg-bg/40">
            {tr('loc.other.confirmHeader', lang)
              .replace('{flag}', country.flag)
              .replace('{country}', country.name)}
          </div>
          {results.map((r) => {
            // v0.61.265 — never render literal 'Unnamed' or a bare
            // country name; fall back to secondaryText / typed query.
            const primaryDisplay = _safeLabel(r.primaryText, r.secondaryText, query.trim())
              || 'Pinned location';
            return (
            <button
              key={r.placeId}
              type="button"
              onClick={() => pickResult(r)}
              className="block w-full text-left px-3 py-2 hover:bg-tg-bg border-b border-tg-border last:border-0"
            >
              <div className="text-sm">{primaryDisplay}</div>
              {r.secondaryText && r.secondaryText !== primaryDisplay && (
                <div className="text-[11px] text-tg-hint truncate">{r.secondaryText}</div>
              )}
            </button>
            );
          })}
          <button
            type="button"
            onClick={cancel}
            className="block w-full text-left px-3 py-1.5 text-[11px] text-tg-hint italic bg-tg-bg/40"
          >
            {tr('loc.other.cancel', lang)}
          </button>
        </div>
      )}
    </div>
  );
}
