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
export default function LocationField({ userLoc, region, onSelect }) {
  const [lang] = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
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
    if (!query.trim() || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await placeAutocomplete({
          input: query, lat: userLoc?.lat, lng: userLoc?.lng, region
        });
        setSuggestions(r?.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally { setLoading(false); }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, userLoc?.lat, userLoc?.lng, region]);

  async function handlePick(s) {
    setOpen(false);
    setQuery('');
    setSuggestions([]);
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

  function handleClear() {
    setPickedLabel('');
    setQuery('');
    setSuggestions([]);
    if (userLoc?.lat && userLoc?.lng) {
      onSelect?.({ lat: userLoc.lat, lng: userLoc.lng, label: '' });
    }
  }

  // Resting label: pickedLabel > currentLabel > i18n('Search location').
  const resting = pickedLabel || currentLabel || tr('loc.searchLocation', lang);

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
            <span className="text-[10px] text-tg-hint italic flex-shrink-0">{lang === 'fr' ? 'touchez pour changer' : 'tap to change'}</span>
          </button>
        )}
        {loading && <span className="text-tg-hint text-xs">…</span>}
        {pickedLabel && !open && (
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
          {suggestions.map((s) => (
            <button
              key={s.placeId}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handlePick(s)}
              className="block w-full text-left px-3 py-2 hover:bg-tg-bg border-b border-tg-border last:border-0"
            >
              <div className="text-sm">{s.primaryText}</div>
              {s.secondaryText && (
                <div className="text-[11px] text-tg-hint truncate">{s.secondaryText}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
