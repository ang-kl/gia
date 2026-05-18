import React, { useEffect, useRef, useState } from 'react';
import { placeAutocomplete, placeResolve, reverseGeocode } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';

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
export default function LocationField({ userLoc, region, onSelect, anchor = null, suffix = '' }) {
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
        setPickedLabel(label);
        onSelect?.({ lat: r.lat, lng: r.lng, label });
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
        {!open && (
          <span aria-hidden className="text-tg-hint text-xs flex-shrink-0">✏️</span>
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
