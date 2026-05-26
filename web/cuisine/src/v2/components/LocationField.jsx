import React, { useEffect, useRef, useState } from 'react';
import { placeAutocomplete, placeResolve, placeSearchByCountry, reverseGeocode } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';
import { OTHER_COUNTRIES, DEFAULT_OTHER_COUNTRY, findCountry } from '../lib/countries.js';

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
          onSelect?.({ lat: r.lat, lng: r.lng, label });
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
  const resting = pickedLabel || anchorLabel || currentLabel || tr('loc.searchLocation', lang);
  const showClear = !!(pickedLabel || anchorDiffers);

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
      />
    );
  }

  return (
    <div className="relative">
      {/* v0.58.14: clearer affordance — accent-coloured pin, "Tap to
          change" hint when resting, ✏️ pencil icon on the right so
          users see this is editable, not a label. */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-tg-accent bg-tg-card">
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
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-tg-hint"
          />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex-1 text-left text-sm truncate text-tg-text flex items-baseline gap-1.5"
          >
            <span className="truncate">{resting}</span>
            {suffix && (
              <span className="text-[11px] text-tg-hint flex-shrink-0">· {suffix}</span>
            )}
            <span className="text-[10px] text-tg-hint italic flex-shrink-0">{lang === 'fr' ? 'touchez pour changer' : 'tap to change'}</span>
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
            onClick={() => onSearch?.()}
            aria-label={tr('loc.searchHere', lang)}
            title={tr('loc.searchHere', lang)}
            className="text-tg-accent hover:text-tg-text text-sm leading-none flex-shrink-0 px-1"
          >🔍</button>
        )}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-tg-border bg-tg-card shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={s.placeId}
              type="button"
              aria-selected={i === 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(s)}
              className={`block w-full text-left px-3 py-2 hover:bg-tg-bg border-b border-tg-border last:border-0 ${i === 0 ? 'bg-tg-bg/50' : ''}`}
            >
              <div className="text-sm">{s.primaryText}</div>
              {s.secondaryText && (
                <div className="text-[11px] text-tg-hint truncate">{s.secondaryText}</div>
              )}
            </button>
          ))}
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

// v0.61.191 — OTHER-region location picker. Replaces the
// autocomplete-dropdown flow with: tiny flag dropdown on the left
// (16 ASEAN/Oceania/N-Asia countries minus SG), free-text input,
// 🔍 Search button, then a 5-entry confirmation list returned by
// /api/cuisine/place-search-by-country. No autocomplete dropdown
// during typing (operator: "too many for a dropdown to be useful").
function OtherLocationPicker({ countryPref, onCountryChange, onSelect, anchor, suffix }) {
  const [lang] = useLocale();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);   // [{placeId, primaryText, secondaryText, lat, lng}, ...]
  const [searching, setSearching] = useState(false);
  const [noMatch, setNoMatch] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const country = findCountry(countryPref) || findCountry(DEFAULT_OTHER_COUNTRY);

  async function doSearch() {
    const text = query.trim();
    if (text.length < 2) return;
    setSearching(true); setNoMatch(false); setErrorMsg(''); setResults([]);
    try {
      const r = await placeSearchByCountry({ input: text, countryCode: country.code });
      const arr = Array.isArray(r?.results) ? r.results : [];
      if (arr.length === 0) setNoMatch(true);
      setResults(arr);
    } catch (err) {
      setErrorMsg(err?.message || String(err));
    } finally {
      setSearching(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter') { e.preventDefault(); doSearch(); }
  }

  function pickResult(r) {
    onSelect?.({ lat: r.lat, lng: r.lng, label: r.primaryText });
    setResults([]); setQuery(''); setNoMatch(false);
  }

  function cancel() {
    setResults([]); setQuery(''); setNoMatch(false); setErrorMsg('');
  }

  const restingLabel = (anchor && anchor.name) ? anchor.name : tr('loc.other.placeholder', lang);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-tg-accent bg-tg-card">
        {/* Tiny flag-only dropdown on the left. Native <select> keeps
            it accessible without building a custom popover. */}
        <select
          aria-label={tr('loc.other.country', lang)}
          value={country.code}
          onChange={(e) => onCountryChange?.(e.target.value)}
          className="bg-transparent text-sm outline-none flex-shrink-0 pr-1"
          style={{ width: '4.5rem' }}
        >
          {OTHER_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
          ))}
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKey}
          enterKeyHint="search"
          placeholder={anchor && anchor.name ? anchor.name : tr('loc.other.placeholder', lang)}
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
      {/* Current anchor + suffix hint (mirrors the SG/JB resting line) */}
      {anchor?.name && results.length === 0 && !searching && (
        <div className="text-[11px] text-tg-hint truncate px-1">
          📍 {anchor.name}{suffix ? ` · ${suffix}` : ''}
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
          {results.map((r) => (
            <button
              key={r.placeId}
              type="button"
              onClick={() => pickResult(r)}
              className="block w-full text-left px-3 py-2 hover:bg-tg-bg border-b border-tg-border last:border-0"
            >
              <div className="text-sm">{r.primaryText}</div>
              {r.secondaryText && (
                <div className="text-[11px] text-tg-hint truncate">{r.secondaryText}</div>
              )}
            </button>
          ))}
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
