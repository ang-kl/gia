import React, { useEffect, useRef, useState } from 'react';
import { placeAutocomplete, placeResolve, reverseGeocode, fetchRecentLocations, clearRecentLocationsRemote } from '../lib/api.js';
import { useLocale, t as tr } from '../lib/i18n.js';
import { OTHER_COUNTRIES, DEFAULT_OTHER_COUNTRY, findCountry } from '../lib/countries.js';
import { citiesForCountry, cityRadiusCapM, computeGroupedRows, defaultCollapsedRegions, REGION_LABEL_BY_COUNTRY } from '../lib/cities.js';
// v0.61.277 — shared with App.jsx for the JB region-pill auto-anchor.
import { JB_FOCUS_POINTS, JB_FOCUS_DEFAULT, JB_FOCUS_KEYS, JB_FOCUS_CHIP_LABELS } from '../lib/jb-focus-points.js';
import { isJbCoords } from '../lib/coords-to-country.js';
import { groupByZone, zoneHeader } from '../lib/nearby-zones.js';

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
// v0.61.268 — operator (29-05 '26 audit task, items #4 + #5):
//   #4 — "if i click search without typing, select a focus point like
//        Southkey." (AskUserQuestion → "Both Southkey + JB CBD as
//        alternates" — toggle/swap chip)
//   #5 — "if i select others, and the country and city isnt selected,
//        revert back to the current location." (AskUserQuestion →
//        "Both" first-paint AND explicit-clear cases)
//
// v0.61.277 — JB_FOCUS_POINTS lifted to lib/jb-focus-points.js so App.jsx
// can use the same constants for the region-pill auto-anchor on JB tap.

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

// v0.61.418 — the OTHER-picker's "nearest curated city" auto-pick (tier b) only
// applies when the anchor is plausibly IN the selected country. Beyond this, the
// anchor is treated as cross-country (stale pin) and the picker defaults to the
// capital. 500 km clears every in-country gap (HK districts ~30 km, Sibu→Kuching
// ~150 km) while excluding any cross-country jump (SG→Japan ~3300 km).
const NEAREST_CITY_MAX_KM = 500;

export default function LocationField({ userLoc, region, onSelect, anchor = null, suffix = '', onSearch = null, countryPref = DEFAULT_OTHER_COUNTRY, onCountryChange = null, selectedCity = null, onActivity = null, searchPending = false, nearbyVenues = null }) {
  // v0.61.191 — branch on region AFTER all hooks below have been
  // declared (React Rules of Hooks: same order every render). The
  // OTHER picker is wholly its own sub-component; the SG/JB path
  // keeps the v0.61.189 code intact and uses the hooks declared
  // here. The early-return at the very end of this hook prologue
  // skips the rest of the SG/JB JSX when region === 'OTHER'.
  const [lang] = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // v0.61.305 — recents drawer state. Tap on 📍 opens the in-TMA
  // drawer (icon flips to 🧭). Lazy-load: items only fetched when
  // the drawer first opens, so users who never tap 📍 don't pay the
  // round-trip. `recentsMax` mirrors the server's MAX_ENTRIES so the
  // header "(N/20)" stays in sync if the cap is bumped again.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recents, setRecents] = useState([]);
  const [recentsMax, setRecentsMax] = useState(20);
  const [recentsLoading, setRecentsLoading] = useState(false);
  // v0.61.268 — operator #4: JB focus-point alternates. When the user
  // is on the JB region pill with no anchor and no typed query and
  // taps 🔍, search fires at JB_FOCUS_POINTS[jbFocusKey]. Default
  // 'southkey' per the operator's verbatim wording; toggle to 'cbd'
  // via the inline chip rendered below the compact pill (region === 'JB').
  // Persistence: session-only — server sync deferred to a future PR
  // if usage warrants it.
  const [jbFocusKey, setJbFocusKey] = useState('southkey');
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
  // v0.61.281 — operator screenshot annotation: auto-hide the
  // "{N} places nearby · tap to change 🔝" line after 8 s. Useful as
  // a first-launch affordance; visual noise once seen. Resets to
  // visible whenever `suffix` changes (next search / new location).
  const [suffixVisible, setSuffixVisible] = useState(true);
  useEffect(() => {
    if (!suffix) return undefined;
    setSuffixVisible(true);
    const id = setTimeout(() => setSuffixVisible(false), 30000);
    return () => clearTimeout(id);
  }, [suffix]);
  // v0.61.284 — operator: *"i thought when i type in the location in
  // cuisine tma like orchard, it wouldn't auto-fire, the message
  // flush right 'tap to search 🔝' will be below the 🔍 until the
  // user click any of the 3 search feature."* The v0.61.244 idle
  // hint waited 6 s and cleared on every keystroke, so the user
  // rarely saw it. Re-spec: show the "Tap 🔍 to search" bubble
  // immediately when the user has typed 1+ chars AND the field is
  // open; stays visible while typing; only clears on pick / clear /
  // submit / blur (i.e. the existing clearIdleHint callers).
  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 1) {
      clearIdleHint();
      return;
    }
    setIdleHintActive(true);
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
          // v0.61.305 — auto-fire on autocomplete pick for ALL regions.
          // Previously (v0.61.244) only SG auto-fired; JB and OTHER
          // required an explicit 🔍 tap to avoid burning a search call
          // when the user misjudged the pick. The new in-TMA recents
          // drawer (📍 → 🧭) is the revert affordance — picking the
          // wrong row is now one tap to undo, so the round-trip cost
          // of auto-fire is acceptable everywhere.
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
    clearIdleHint();
    if (userLoc?.lat && userLoc?.lng) {
      // Clearing snaps the search anchor back to the device / cached
      // pin. The parent re-runs the search there and resets
      // locationAnchor accordingly.
      onSelect?.({ lat: userLoc.lat, lng: userLoc.lng, label: '' });
    }
  }

  // v0.61.305 — recents drawer handlers. openDrawer fetches the LRU
  // lazily and flips drawerOpen. handleRecentPick re-anchors via the
  // existing onSelect callback (auto-fires search; the drawer is the
  // operator's "back to previous" affordance). handleClearRecents
  // wipes the LRU server-side then resets local state.
  async function openDrawer() {
    clearIdleHint();
    if (open) setOpen(false);
    setDrawerOpen(true);
    setRecentsLoading(true);
    try {
      const r = await fetchRecentLocations();
      setRecents(Array.isArray(r?.items) ? r.items : []);
      if (r?.max) setRecentsMax(r.max);
    } catch {
      setRecents([]);
    } finally {
      setRecentsLoading(false);
    }
  }
  function handleRecentPick(entry) {
    if (!entry || !Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) return;
    setDrawerOpen(false);
    const label = (typeof entry.label === 'string' && entry.label.trim()) || '';
    if (label) setPickedLabel(label);
    onSelect?.({ lat: entry.lat, lng: entry.lng, label });
  }
  async function handleClearRecents() {
    // v0.61.415 — operator: "Clear all except current". Keep the CURRENT row
    // (the one matching the active anchor — the ✓ row — else the most-recent),
    // drop the rest. The server keeps the matching coord; we mirror it locally.
    const current = recents.find((e) => anchor
      && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)
      && Math.abs(anchor.lat - e.lat) < 1e-4 && Math.abs(anchor.lng - e.lng) < 1e-4)
      || recents[0] || null;
    await clearRecentLocationsRemote(current ? { lat: current.lat, lng: current.lng } : null);
    setRecents(current ? [current] : []);
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
  // v0.62.186 — operator (IMG_2507 #3): when no real location is set yet, the
  // resting label is the "Enter a location" placeholder — show it in hint style
  // with a ✏️ pencil so it's obviously editable (vs a committed street/building).
  const hasLoc = !!(pickedSafe || anchorSafe || currentSafe);

  // v0.62.x — operator: make the "tap to change" edit affordance prominent.
  // When a location is set (or changes), blink the boxed edit row for ~2 s so
  // the user notices it's editable; the box stays (light-grey bordered) but the
  // pulse stops after the timer so it isn't a permanent distraction.
  const [editBlink, setEditBlink] = useState(false);
  // v0.62.x — operator (IMG_2578): "N places nearby" expands (tiny +) into a
  // glass dropdown of the result places, grouped by precinct zone (SG → nearest
  // MRT). Tapping a row sets that spot as the anchor (no auto-fire) and the 🔍
  // pulses to invite the search — mirrors the location-field "tap to change".
  const [zonesOpen, setZonesOpen] = useState(false);
  const zones = groupByZone(nearbyVenues, region);
  useEffect(() => {
    if (!hasLoc) { setEditBlink(false); return undefined; }
    setEditBlink(true);
    // v0.62.x — operator: highlight the location section for 30s (NO blink), OR
    // until a search fires (the 🔍 onClick clears it) — whichever comes first.
    const id = setTimeout(() => setEditBlink(false), 30000);
    return () => clearTimeout(id);
  }, [resting, hasLoc]);

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
  // v0.61.268 — passes userLoc through so the picker's revert-to-GPS
  // effect (operator #5) has GPS coords to emit on city-clear.
  if (region === 'OTHER') {
    return (
      <OtherLocationPicker
        countryPref={countryPref}
        onCountryChange={onCountryChange}
        onSelect={onSelect}
        anchor={anchor}
        selectedCity={selectedCity}
        suffix={suffix}
        onSearch={onSearch}
        userLoc={userLoc}
        onActivity={onActivity}
        searchPending={searchPending}
        nearbyVenues={nearbyVenues}
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
      {/* v0.62.189 — operator: WHITE field, blue accent border REMOVED
          (loc-field-surface: white in light, card+hint in dark). */}
      <div className="rounded-md border loc-field-surface px-3 py-1.5">
        {drawerOpen ? (
          <div>
            <div className="flex items-center justify-between py-0.5">
              <span className="text-tg-text text-sm inline-flex items-center gap-1.5">
                <span aria-hidden className="text-tg-accent">🧭</span>
                <span>{lang === 'fr' ? 'Récents' : 'Recent'} ({recents.length}/{recentsMax})</span>
              </span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label={tr('loc.close', lang)}
                className="text-tg-hint hover:text-tg-text text-xs leading-none px-1"
              >✕</button>
            </div>
            <div className="border-t border-tg-border/40 mt-1 max-h-[280px] overflow-y-auto">
              {recentsLoading ? (
                <div className="text-tg-hint text-xs py-2 text-center">…</div>
              ) : recents.length === 0 ? (
                <div className="text-tg-hint text-xs py-2 text-center italic">
                  {lang === 'fr' ? 'Aucun emplacement récent' : 'No recent locations yet'}
                </div>
              ) : (
                recents.map((e, i) => {
                  const flag = (e.country && findCountry(e.country)?.flag) || '🌍';
                  const isCurrent = anchor
                    && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)
                    && Math.abs(anchor.lat - e.lat) < 1e-4
                    && Math.abs(anchor.lng - e.lng) < 1e-4;
                  const label = (typeof e.label === 'string' && e.label.trim())
                    || `${Number(e.lat).toFixed(4)}, ${Number(e.lng).toFixed(4)}`;
                  return (
                    <button
                      key={`${e.lat},${e.lng},${i}`}
                      type="button"
                      onClick={() => handleRecentPick(e)}
                      className="flex w-full items-center gap-2 py-1 px-0.5 text-left text-sm text-tg-text hover:bg-tg-bg/50"
                      title={label}
                      aria-label={label}
                    >
                      <span aria-hidden className="flex-shrink-0">{flag}</span>
                      <span className="truncate flex-1">{label}</span>
                      {isCurrent && <span aria-hidden className="text-tg-accent text-xs flex-shrink-0">✓</span>}
                    </button>
                  );
                })
              )}
            </div>
            {recents.length > 0 && (
              <div className="border-t border-tg-border/40 mt-1 pt-1">
                <button
                  type="button"
                  onClick={handleClearRecents}
                  className="text-tg-hint hover:text-tg-text text-xs inline-flex items-center gap-1"
                >🗑 {lang === 'fr' ? "Tout effacer sauf l'actuel" : 'Clear all except current'}</button>
              </div>
            )}
          </div>
        ) : (
        <>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openDrawer}
            aria-label={tr('loc.recent', lang)}
            title={tr('loc.recent', lang)}
            className="text-tg-accent text-sm leading-none flex-shrink-0"
          >📍</button>
          {open ? (
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={query}
              onChange={(e) => { setQuery(e.target.value); onActivity?.(); }}
              onBlur={() => setTimeout(() => setOpen(false), 200)}
              onKeyDown={handleKeyDown}
              enterKeyHint="search"
              placeholder={resting}
              /* P1-e — placeholder-only field name. The aria-label reuses the
                 BASE placeholder key ("Search location…"), not `resting`'s
                 current-value fallback, so the field is named by purpose. */
              aria-label={tr('loc.searchLocation', lang)}
              className="flex-1 min-w-0 bg-transparent text-[16px] outline-none placeholder:text-tg-hint"
            />
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              /* v0.62.x — operator: prominent edit affordance. When a location is
                 set, wrap the row in a light-grey bordered box and blink it ~2 s
                 so it reads as "tap to change". Empty state keeps the bare ✏️ row. */
              className={`flex-1 min-w-0 text-left text-sm inline-flex items-center gap-1.5 ${hasLoc ? 'text-tg-text border border-tg-border rounded-md px-2 py-1 bg-tg-bg/40' : 'text-tg-hint'} ${editBlink ? 'ring-1 ring-tg-accent' : ''}`}
            >
              {hasLoc && region === 'SG' && (
                <span aria-hidden className="flex-shrink-0">🇸🇬</span>
              )}
              {hasLoc && region === 'JB' && (
                <img
                  src="MY_Johor_flag.png"
                  alt=""
                  width="16"
                  height="11"
                  className="rounded-sm border border-tg-border/40 flex-shrink-0"
                />
              )}
              {/* v0.62.186 — operator (IMG_2507 #3): empty field → ✏️ pencil +
                  "Enter a location" prompt so the edit affordance is obvious. */}
              {!hasLoc && <span aria-hidden className="flex-shrink-0">✏️</span>}
              <span className="truncate">{resting}</span>
              {/* v0.62.x — operator: the box border + blink already signal
                  "editable"; the worded affordance lives on the collapsed
                  "Click to change" line, so no duplicate label here. */}
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
              onClick={() => {
                clearIdleHint();
                // v0.61.268 — operator #4: JB focus-point fallback.
                // When the user is on JB region with no anchor and
                // no typed query, anchor to JB_FOCUS_POINTS[jbFocusKey]
                // before the search fires. Other regions and any
                // anchored/pick-already state fall through to the
                // existing onSearch wiring unchanged.
                // v0.62.98 — operator: 📍 Current on a Johor highway kept locking
                // to Mid Valley Southkey. Root cause: a Current pick makes the
                // anchor EQUAL the device GPS, so `!anchorDiffers` was true and
                // the snap fired — overriding the user's real location with the
                // focus default. The snap is only meant for "JB region but the
                // search point is NOT yet in Johor" (e.g. user physically in SG
                // toggled JB). So gate on the EFFECTIVE point: only snap when the
                // anchor/GPS isn't already inside Johor.
                const effPt = (anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng))
                  ? anchor : userLoc;
                if (region === 'JB' && !pickedLabel && !query.trim()
                    && !(effPt && isJbCoords(effPt))) {
                  const fp = JB_FOCUS_POINTS[jbFocusKey];
                  onSelect?.({ lat: fp.lat, lng: fp.lng, label: fp.name });
                  return;
                }
                setEditBlink(false); // v0.62.x — stop the edit-box blink once a search fires
                onSearch?.();
              }}
              aria-label={tr('loc.searchHere', lang)}
              title={tr('loc.searchHere', lang)}
              /* v0.62.x — operator: selections only set criteria; nothing fires
                 until 🔍. When the criteria are "dirty" (changed since the last
                 search) pulse the 🔍 with an accent ring so the user knows to
                 tap it. The cue clears once a search runs (searchPending←false). */
              className={`text-tg-accent hover:text-tg-text text-sm leading-none flex-shrink-0 px-1 ${searchPending ? 'animate-pulse' : ''}`}
            >🔍</button>
          )}
        </div>
        {!open && suffix && suffixVisible && (
          <div className="flex items-center justify-end gap-1 text-[10px] text-tg-hint italic leading-tight mt-0.5">
            <span>{suffix}</span>
            {zones.length > 0 && (
              <button
                type="button"
                onClick={() => setZonesOpen((v) => !v)}
                aria-label={zonesOpen
                  ? (lang === 'fr' ? 'Masquer les lieux proches' : 'Hide nearby places')
                  : (lang === 'fr' ? 'Voir les lieux proches' : 'Browse nearby places')}
                aria-expanded={zonesOpen}
                className="gia-hit inline-flex items-center justify-center w-4 h-4 rounded-full border border-tg-border text-tg-accent not-italic leading-none"
              >{zonesOpen ? '−' : '+'}</button>
            )}
          </div>
        )}
        {!open && zonesOpen && zones.length > 0 && (
          /* v0.62.x — glass nearby browser, styled like the Local-food-pick
             dropdown. Scrollable; each row sets the anchor + pulses 🔍. */
          <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-tg-border bg-tg-card/90 backdrop-blur-sm shadow-lg divide-y divide-tg-border/40">
            {zones.map((g, gi) => (
              <div key={gi} className="py-1">
                <div className="px-2.5 py-1 text-[10px] font-semibold text-tg-hint uppercase tracking-wide flex items-center justify-between">
                  <span>{zoneHeader(g.zone, lang)}</span>
                  <span className="font-normal normal-case">{g.items.length}</span>
                </div>
                {g.items.map((it, ii) => (
                  <button
                    key={ii}
                    type="button"
                    onClick={() => {
                      if (Number.isFinite(it.lat) && Number.isFinite(it.lng)) {
                        // Set anchor only — no auto-fire; 🔍 pulses (dirty) so the
                        // user taps to search, per the location-field contract.
                        onSelect?.({ lat: it.lat, lng: it.lng, label: it.street || it.name });
                      }
                      setZonesOpen(false);
                    }}
                    className="w-full text-left px-2.5 py-1.5 min-h-[40px] flex items-baseline gap-1.5 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none"
                  >
                    <span className="text-[10px] text-tg-text truncate">{it.street || it.name}</span>
                    {it.street && <span className="text-[10px] truncate nearby-venue">· {it.name}</span>}
                    {Number.isFinite(it.distanceM) && (
                      <span className="ml-auto shrink-0 text-[10px] text-tg-hint tabular-nums">
                        {it.distanceM >= 1000 ? `${(it.distanceM / 1000).toFixed(1)}km` : `${Math.round(it.distanceM)}m`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
        {/* v0.61.268 — operator #4: focus-point chip.
            v0.61.277 — chip tap COMMITS the anchor via onSelect (not
            just `jbFocusKey` state).
            v0.61.281 — operator screenshot annotation: replace the
            2-chip "Default focus: Southkey · JB CBD" with a flat 5-chip
            row in this order: Legoland, Bukit Indah, CBD, Southkey,
            Mt Austin. "Default focus:" prefix dropped. Small pill font
            (text-[10px] preserved). Chip keys + labels live in
            jb-focus-points.js so the order can be tuned in one place. */}
        {!open && region === 'JB' && (
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            {JB_FOCUS_KEYS.map((key) => {
              const fp = JB_FOCUS_POINTS[key];
              const label = JB_FOCUS_CHIP_LABELS[key] || fp.name;
              // v0.62.100 — operator: "Southkey" showed highlighted even when the
              // anchor was the live 📍 Current spot (e.g. Senai). A chip is only
              // "active" when the committed anchor IS that focus point (~1 km),
              // so a Current / typed pick leaves all chips inactive.
              const active = !!(anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)
                && Math.abs(anchor.lat - fp.lat) < 0.01 && Math.abs(anchor.lng - fp.lng) < 0.01);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setJbFocusKey(key);
                    onSelect?.({ lat: fp.lat, lng: fp.lng, label: fp.name, noAutoFire: true });
                  }}
                  aria-pressed={active}
                  className={`text-[10px] px-1.5 py-0.5 rounded border ${active
                    ? 'bg-tg-accent text-tg-bg border-tg-accent font-semibold'
                    : 'bg-tg-card text-tg-hint border-tg-border'}`}
                >{label}</button>
              );
            })}
          </div>
        )}
        </>
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
            {tr('lastCard.tapSearch', lang)}
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
// v0.61.268 — operator #5: "if i select others, and the country and
// city isnt selected, revert back to the current location." The
// CityDropdown now renders a leading "— Clear —" row that emits an
// empty value, telling OtherLocationPicker that the user intentionally
// wants no city → revert to GPS. The clear row is suppressed when
// `hideClearOption` is true (legacy callers that don't want it).
function CityDropdown({ countryCode, value, onChange, ariaLabel, hideClearOption = false }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const itemRefs = useRef([]);
  const list = citiesForCountry(countryCode);
  const current = value ? list.find((c) => c.name === value) : null;
  // P1-d — keyboard rows = the optional "— Clear —" row + the city rows;
  // itemRefs indices follow render order (clear row first when present).
  const clearOffset = hideClearOption ? 0 : 1;
  // v0.62.697 — operator: region groups use the standard disclosure triangles,
  // "▸ for collapsed regions and ▾ for expanded regions". Default is EXPANDED
  // for every group, so a list that previously showed its cities immediately
  // still does; the triangles are there to fold a long list (AU is 33 cities
  // across 8 groups) down to its headings. The group holding the CURRENT pick
  // is forced open regardless, so the selected city can never be hidden
  // behind a fold.
  // v0.62.712 — generalized from AU-only `state` to any country's `region`
  // field (MY/CN/FR now carry one too). China needs a non-default seed (its
  // non-Popular provinces start collapsed) — defaultCollapsedRegions()
  // returns that per-country, and the effect below reseeds it whenever
  // `countryCode` changes, since this component is NOT remounted on a
  // country switch (same instance, new prop) and a stale Set from the
  // previous country would otherwise carry over.
  const [collapsedRegions, setCollapsedRegions] = useState(() => defaultCollapsedRegions(countryCode));
  useEffect(() => {
    setCollapsedRegions(defaultCollapsedRegions(countryCode));
  }, [countryCode]);
  const toggleRegion = (rg) => setCollapsedRegions((prev) => {
    const next = new Set(prev);
    if (next.has(rg)) next.delete(rg); else next.add(rg);
    return next;
  });
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
  // P1-d — mirror CountryDropdown's v0.61.211 focus-on-open: focus the
  // currently-selected city option (or the first row) so ↑/↓/Enter work
  // immediately. setTimeout 0 so the popover is in the DOM when focus runs.
  useEffect(() => {
    if (!open) return;
    const idx = current ? list.findIndex((c) => c.name === current.name) : -1;
    const target = itemRefs.current[idx >= 0 ? idx + clearOffset : 0];
    if (target && typeof target.focus === 'function') {
      const id = setTimeout(() => target.focus(), 0);
      return () => clearTimeout(id);
    }
  }, [open, value]);
  function pick(name) { setOpen(false); onChange?.(name); }
  // P1-d — same arrow-key roving-focus model as CountryDropdown's onListKey:
  // ↑/↓ move (wrapping), Home/End jump; Enter picks via native button focus.
  function onListKey(e) {
    if (!open) return;
    const len = list.length + clearOffset;
    const active = document.activeElement;
    const idx = itemRefs.current.findIndex((el) => el === active);
    // v0.62.697 — a collapsed state group leaves NULL holes in itemRefs (its
    // rows aren't rendered). Stepping by one and calling `?.focus()` would
    // silently no-op and strand the focus, so walk to the next row that exists.
    const step = (from, dir) => {
      for (let n = 1; n <= len; n += 1) {
        const i = ((from + dir * n) % len + len) % len;
        if (itemRefs.current[i]) return i;
      }
      return -1;
    };
    const edge = (dir) => {
      for (let n = 0; n < len; n += 1) {
        const i = dir > 0 ? n : len - 1 - n;
        if (itemRefs.current[i]) return i;
      }
      return -1;
    };
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = idx < 0 ? edge(1) : step(idx, 1);
      if (next >= 0) itemRefs.current[next].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = idx < 0 ? edge(-1) : step(idx, -1);
      if (next >= 0) itemRefs.current[next].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      const i = edge(1); if (i >= 0) itemRefs.current[i].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const i = edge(-1); if (i >= 0) itemRefs.current[i].focus();
    }
  }
  if (!list.length) return null;
  // v0.62.712 — the region holding the current pick, so its group is never
  // folded out of sight; feeds both computeGroupedRows() and the divider's
  // toggle affordance below.
  const currentRegion = current ? (list.find((x) => x.name === current.name) || {}).region : null;
  return (
    <div ref={wrapRef} className="relative flex-shrink-0">
      <button
        type="button"
        aria-label={ariaLabel || 'City'}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        /* v0.61.364 — operator: shrink the closed CITY pill font by 2px
           (text-sm → text-xs). The open picker-list items below keep text-[13px]. */
        className="text-xs bg-transparent text-tg-text border border-tg-border rounded px-1.5 py-0.5 whitespace-nowrap inline-flex items-center gap-0.5"
        style={{ minWidth: '3.5rem' }}
      >
        <span className="font-mono tracking-tight">{current ? current.code : '— —'}</span>
        <span aria-hidden className="text-tg-hint text-[10px]">▾</span>
      </button>
      {open && (
        <ul
          role="listbox"
          onKeyDown={onListKey}
          className="absolute left-0 top-full mt-1 z-30 max-h-72 overflow-y-auto rounded-md border border-tg-border bg-tg-card shadow-lg min-w-[12rem] py-0.5"
        >
          {/* v0.61.268 — "— Clear —" row emits '' so the OtherLocationPicker
              can mark userClearedCity=true and revert the anchor to GPS. */}
          {/* v0.62.574 — operator (IMG_0735-0739): "so much row spacing to show
              countries and cities in Other." Tighten each option row from py-1.5
              (6px) to py-1 (4px) + leading-tight so the list is denser without
              losing tap-target usability. */}
          {!hideClearOption && (
            <li role="option" aria-selected={!current}>
              <button
                type="button"
                ref={(el) => { itemRefs.current[0] = el; }}
                onClick={() => pick('')}
                className={`w-full text-left px-3 py-1 text-[13px] italic whitespace-nowrap text-tg-hint hover:bg-tg-bg focus:bg-tg-bg focus:outline-none border-b border-tg-border/40`}
              >— Clear —</button>
            </li>
          )}
          {/* v0.62.712 — grouping computed once via the shared pure function
              (cities.js) instead of inline per-row booleans, so Cuisine and
              Menu render from the identical descriptor list rather than two
              hand-maintained copies of the same logic. */}
          {computeGroupedRows(list, { collapsedRegions, currentRegion }).map((r) => {
            if (r.type === 'divider') {
              // v0.62.697 — operator: "lite-thin hollow line separation by state
              // and the state now in 2 font size smaller in the middle of the
              // hollow line (1 character spacing before and after the state
              // name)". Drawn whenever `region` changes between consecutive
              // rows, so it costs nothing for the countries whose lists carry
              // no `region` field at all. aria-hidden + role="presentation": it
              // is a visual grouping cue, and a non-option <li> inside
              // role="listbox" would otherwise be announced as an empty
              // option. The divider is also the expand/collapse control: ▸
              // (U+25B8) collapsed / ▾ (U+25BE) expanded, the same pair
              // v0.62.684 standardised on the carousel cards. The hairline
              // runs either side of the label, and the label sits at
              // text-[11px] against the rows' text-[13px] — two steps
              // smaller — with a literal \u00A0 before and after, so the "1
              // character spacing" is one character rather than a padding
              // value that merely looks like one.
              return (
                <li key={r.key} role="presentation" className="select-none">
                  <button
                    type="button"
                    onClick={() => toggleRegion(r.region)}
                    aria-expanded={r.open}
                    aria-label={`${REGION_LABEL_BY_COUNTRY[countryCode] || 'Region'}: ${r.region} ${r.open ? '(expanded)' : '(collapsed)'}`}
                    className="w-full flex items-center px-3 py-1 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none"
                  >
                    <span className="flex-1 h-px bg-tg-border/60" />
                    <span className="text-[11px] leading-none text-tg-hint whitespace-nowrap">
                      {'\u00A0'}<span aria-hidden>{r.open ? '▾' : '▸'}</span>{' '}{r.region}{'\u00A0'}
                    </span>
                    <span className="flex-1 h-px bg-tg-border/60" />
                  </button>
                </li>
              );
            }
            if (r.folded) return null;
            const c = r.city, i = r.index;
            const sel = current && c.name === current.name;
            return (
              <li key={c.name} role="option" aria-selected={sel}>
                <button
                  type="button"
                  ref={(el) => { itemRefs.current[i + clearOffset] = el; }}
                  onClick={() => pick(c.name)}
                  className={`w-full text-left px-3 py-1 text-[13px] leading-tight whitespace-nowrap inline-flex items-center justify-between gap-2 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none ${sel ? 'bg-tg-bg/60 font-semibold' : ''}`}
                >
                  {/* v0.61.420 — operator: the Johor whole-STATE row shows
                      "Johor state" in italics to distinguish it from a city. */}
                  <span className={c.code === 'JOHOR' ? 'italic' : ''}>{c.name}</span>
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
        /* v0.61.364 — operator: shrink the closed COUNTRY pill font by 2px
           (text-sm → text-xs). The open picker-list items below keep text-sm. */
        /* v0.62.82 — operator: "MY and KUL are so far apart". The 4.5rem
           min-width left ~1.5rem of empty space to the RIGHT of "🇲🇾 MY ▾",
           pushing the KUL pill away despite the gap-0 group. Drop it so the
           country pill sizes to its content and KUL butts right against it. */
        className="bg-transparent text-xs outline-none whitespace-nowrap inline-flex items-center gap-0.5"
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
                  /* v0.62.574 — operator: tighter country rows (py-1.5 → py-1 +
                     leading-tight), matching the CityDropdown density fix. */
                  className={`w-full text-left px-3 py-1 text-sm leading-tight whitespace-nowrap inline-flex items-center gap-1.5 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none ${sel ? 'bg-tg-bg/60 font-semibold' : ''}`}
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
//
// v0.61.267 — operator: "can [Other], select {country +/- {city},
// follow the same codes as Johor bahru." Refactored to use the
// SAME autocomplete-on-keystroke flow as the SG/JB branch above:
//   • debounced 250 ms placeAutocomplete with countryCode = country
//     dropdown selection (server v0.61.267 accepts any 2-letter ISO).
//   • locationBias.circle keyed on the city dropdown's centroid so
//     "Pavilion" biased near KUL finds Pavilion KL, not Pavilion BKK.
//   • Picking a suggestion calls placeResolve → onSelect, exactly
//     like the JB handlePick. No more 🔍-button searchText step,
//     no more 5-entry confirmation panel, no more placeSearchByCountry.
//   • City pick keeps v0.61.241 commit-as-anchor semantics so the
//     operator's #6 ("country and city but no street → centre of
//     the city to search") still works: pick city → anchor at city
//     centroid with noAutoFire; tap 🔍 → search at city centroid.
function OtherLocationPicker({ countryPref, onCountryChange, onSelect, anchor, selectedCity, suffix, onSearch, userLoc, onActivity = null, searchPending = false, nearbyVenues = null }) {
  const [lang] = useLocale();
  const [query, setQuery] = useState('');
  // v0.61.418 — set true by the country dropdown's onChange so the auto-pick
  // effect knows the country change was USER-initiated (vs boot / server-cache
  // hydration) and may fly the map to the capital. Cleared after it fires.
  const userChangedCountryRef = useRef(false);
  // v0.61.268 — operator #5: "if i select others, and the country and
  // city isnt selected, revert back to the current location." When the
  // user picks "— Clear —" in the city dropdown, this flag flips true
  // and stays true until the country code mutates. The
  // revert-to-GPS effect (further below) consumes it to emit
  // onSelect({ lat: userLoc.lat, lng: userLoc.lng, label: '' }).
  const [userClearedCity, setUserClearedCity] = useState(false);
  // v0.61.267 — JB-style autocomplete state. Suggestions stream in
  // on every keystroke; user picks a row → placeResolve → anchor.
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsQuery, setSuggestionsQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  // v0.61.244 — 6 s idle reminder. Mirrors the SG/JB branch above.
  // Shows a small upward-pointing bubble next to the 🔍 button when
  // the user has typed something AND has been idle for 6 s without
  // pressing 🔍. Dismissed on next keystroke, pick, or cancel.
  const [idleHintActive, setIdleHintActive] = useState(false);
  const idleTimerRef = useRef(null);
  function clearIdleHint() {
    if (idleTimerRef.current) { clearTimeout(idleTimerRef.current); idleTimerRef.current = null; }
    setIdleHintActive(false);
  }
  // v0.61.284 — mirrors the SG/JB branch: show "Tap 🔍 to search"
  // bubble immediately on type instead of after 6 s. Persists while
  // typing; clears on pick / clear / submit (the clearIdleHint
  // call sites).
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      clearIdleHint();
      return;
    }
    setIdleHintActive(true);
  }, [query]);
  // v0.61.281 — operator screenshot annotation: auto-hide the
  // "{N} places nearby · tap to change 🔝" line after 8 s. Mirrors
  // the SG/JB LocationField above. Resets visible when `suffix`
  // changes (new search / new location).
  const [suffixVisible, setSuffixVisible] = useState(true);
  // v0.62.x — operator: OTHER cities also get the nearby browser. region
  // 'OTHER' has no bundled transit graph yet, so groupByZone returns one flat
  // street+venue group (SG-first zone headers; other-city stations are a
  // follow-up). Tap a row → anchor + 🔍 pulse, same contract as SG.
  const [zonesOpen, setZonesOpen] = useState(false);
  const zones = groupByZone(nearbyVenues, 'OTHER');
  useEffect(() => {
    if (!suffix) return undefined;
    setSuffixVisible(true);
    const id = setTimeout(() => setSuffixVisible(false), 30000);
    return () => clearTimeout(id);
  }, [suffix]);
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
  // v0.61.267 — `results` state is gone; the autocomplete suggestions
  // live inside the expanded form, not as a separate confirmation
  // panel. Compact pill shows whenever the anchor is meaningful and
  // the user hasn't tapped to expand.
  // v0.61.423 — operator: "If I select the new city, the location erases the
  // current address and is blank … confusion as country+city+location(old)."
  // A city-dropdown pick is a PREVIEW (selectedCity) that doesn't commit the
  // anchor, so the field used to read the stale committed anchor (old/blank).
  // Prefer the PREVIEWED city so the field always reflects the current
  // selection; fall back to the committed anchor when there's no preview.
  const _committedName = (anchor && anchor.name && !_isCountryOnly(anchor.name)
    && anchor.name !== 'Unnamed') ? anchor.name : '';
  const _previewName = (selectedCity && typeof selectedCity.name === 'string'
    && selectedCity.name.trim() && !_isCountryOnly(selectedCity.name)
    && selectedCity.name !== 'Unnamed') ? selectedCity.name.trim() : '';
  const displayLocName = _previewName || _committedName;
  const showCompact = !!displayLocName && !expanded;
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
    // v0.61.268 — operator #5: when the user has explicitly cleared
    // the city via "— Clear —", do NOT auto-re-pick. The cleared
    // flag stays true until the country code mutates (reset below).
    if (userClearedCity) { userChangedCountryRef.current = false; return; }
    const list = citiesForCountry(country.code);
    if (!list.length) { setCityPick(''); userChangedCountryRef.current = false; return; }
    // Resolve the city to pre-select, in order:
    //   (a) the anchor's name when it's a city in this country's list (restore).
    //   (b) the NEAREST cities.js entry — but ONLY when the anchor is plausibly
    //       IN this country (≤ 500 km — covers HK districts, Sibu→Kuching).
    //   (c) the capital (first entry). v0.61.418 — operator: "Why did I select
    //       JAPAN? It doesn't select Tokyo as the first choice." A leftover
    //       CROSS-COUNTRY pin (e.g. SG when switching to Japan) made (b) snap to
    //       the nearest JP city to SG (Fukuoka) instead of Tokyo; the > 500 km
    //       guard now falls through to the capital.
    // v0.62.x — operator: "selecting a country should select the capital."
    // An EXPLICIT country-dropdown pick (userChangedCountryRef) always anchors
    // to the capital (list[0]) — the nearest-city restore below is for GPS /
    // boot hydration ONLY, when the device is genuinely in-country. Without
    // this gate, a stale cross-country anchor made rule (b) win: a Singapore
    // pin → Malaysia picked Johor (15 km) over Kuala Lumpur; a leftover
    // near-Fukuoka pin → Japan picked Fukuoka over Tokyo. The 500 km guard
    // could not tell "I'm standing in Johor" from "I have a pin next door", so
    // an explicit pick now skips (a)/(b) entirely.
    const explicitCountryPick = userChangedCountryRef.current;
    let picked = null;
    if (!explicitCountryPick) {
      const anchorName = (anchor?.name || '').trim();
      if (anchorName) {
        const hit = list.find((c) => c.name === anchorName);
        if (hit) picked = hit;
      }
      if (!picked && anchor && Number.isFinite(anchor.lat) && Number.isFinite(anchor.lng)) {
        let best = null;
        let bestD = Infinity;
        for (const c of list) {
          const d = haversineKm(anchor.lat, anchor.lng, c.lat, c.lng);
          if (d < bestD) { bestD = d; best = c; }
        }
        if (best && bestD <= NEAREST_CITY_MAX_KM) picked = best;
      }
    }
    if (!picked) picked = list[0];   // capital
    setCityPick(picked.name);
    // v0.61.418 / v0.61.422 — when the USER just switched country (the country
    // dropdown set the ref below; boot / server-cache hydration does NOT, so the
    // saved set-location is never overridden), COMMIT the pre-selected capital as
    // the active search location (anchor + map centre + region + persist) but do
    // NOT fire a search.
    // v0.61.422 — operator: "I selected Manila but the location shows Osaka …
    // durian in manila resulted in zero results." The v0.61.418 `cityPreview`
    // only FLEW the map (no commit), so the field + the search stayed on the old
    // country (Osaka/JP, not in the durian belt → 0). Use `noAutoFire` instead:
    // App.onLocationSelect's COMMITTED branch sets the anchor + searchCenter
    // (map re-centres) + the set-location, and its `!noAutoFire` gate keeps the
    // search from firing — so "select country → location IS the capital, map
    // moves there, don't fire yet" all hold.
    if (userChangedCountryRef.current && picked) {
      userChangedCountryRef.current = false;
      // `fly: true` — MapPanel only pans on flyTo, so ask the committed branch to
      // pan the map to the capital (a searchCenter change alone doesn't move it).
      onSelect?.({ lat: picked.lat, lng: picked.lng, label: picked.name, noAutoFire: true, fly: true, silent: true, radiusCapM: cityRadiusCapM(picked, country.code) });
    }
  }, [country.code, anchor?.name, anchor?.lat, anchor?.lng, userClearedCity]);
  // v0.61.268 — reset userClearedCity on country flip so the auto-pick
  // can run again for the newly-selected country. Operator's intent:
  // "Clear" is scoped to the current country pick session.
  useEffect(() => {
    setUserClearedCity(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country.code]);
  // v0.61.268 — revert-to-GPS effect. When the user has explicitly
  // cleared the city AND device GPS is available, emit a revert
  // pick so App.jsx onLocationSelect sees empty coords and clears
  // locationAnchor. The condition also catches the defensive
  // country.code === '__NONE__' sentinel (no UI currently sets it).
  useEffect(() => {
    const isCleared = cityPick === '' && userClearedCity;
    const isNoneCountry = country.code === '__NONE__';
    if (!isCleared && !isNoneCountry) return;
    if (!userLoc || !Number.isFinite(userLoc.lat) || !Number.isFinite(userLoc.lng)) return;
    onSelect?.({
      lat: userLoc.lat,
      lng: userLoc.lng,
      label: '',
      noAutoFire: true
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityPick, userClearedCity, country.code, userLoc?.lat, userLoc?.lng]);
  function onCityPick(name) {
    if (!name) {
      // v0.61.268 — operator #5: "— Clear —" selection. Mark the
      // city as user-cleared so the auto-pick effect above won't
      // re-pick on the next render, and so the revert-to-GPS
      // effect can detect the explicit-clear condition.
      setCityPick('');
      setUserClearedCity(true);
      setQuery('');
      setSuggestions([]);
      setSuggestionsQuery('');
      return;
    }
    setCityPick(name);
    const list = citiesForCountry(country.code);
    const hit = list.find((c) => c.name === name);
    if (!hit) return;
    // v0.61.241 — operator: "you fire search after selecting the city
    // is wrong. It should wait until clicking the search button."
    // Pass noAutoFire so App.jsx.onLocationSelect sets the anchor but
    // skips the v0.61.237 Promise.resolve()→runSearch microtask. The
    // user must press 🔍 to fire.
    // v0.61.328 — OTHER-mode geofence Step 1: stamp the picked city's
    // radius cap (40 km cities / 120 km Johor) onto the pick so the
    // anchor + set-location carry it and the server clamps the OTHER
    // search radius. SG/JB picks never reach this branch.
    // v0.61.354 — city change is a PREVIEW (fly the map; the search anchor
    // stays put until 🔍). `cityPreview` routes App.onLocationSelect to its
    // preview branch. Replaces the v0.61.241 `noAutoFire` (no longer needed —
    // the preview branch never commits/searches).
    onSelect?.({ lat: hit.lat, lng: hit.lng, label: hit.name, cityPreview: true, radiusCapM: cityRadiusCapM(hit, country.code) });
    setQuery(''); setSuggestions([]); setSuggestionsQuery('');
    // v0.61.241 — keep cityPick set so the dropdown shows the picked
    // city code (e.g. "KUL") after collapse instead of reverting to
    // "— —". Previously we reset to '' which made the code disappear.
    setExpanded(false);
  }

  // v0.61.267 — city centroid for autocomplete bias. Mirrors the
  // SG/JB branch's `lat/lng` arguments to placeAutocomplete — except
  // here the bias point is the picked city, not the device GPS.
  // Fall back to the anchor's lat/lng if no city is picked; falls
  // through to undefined which the server treats as "no bias".
  const list = citiesForCountry(country.code);
  const cityHit = cityPick ? list.find((c) => c.name === cityPick) : null;
  const biasLat = cityHit?.lat ?? anchor?.lat ?? null;
  const biasLng = cityHit?.lng ?? anchor?.lng ?? null;

  // v0.61.267 — debounced autocomplete on every keystroke. Mirrors
  // the SG/JB branch's useEffect at the top of the file. The
  // server (v0.61.267 /api/cuisine/place-autocomplete) accepts a
  // 2-letter `countryCode` and uses it for both `regionCode` and
  // `includedRegionCodes`.
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
          input: trimmed,
          lat: biasLat || undefined,
          lng: biasLng || undefined,
          countryCode: country.code,
          // v0.62.x — when a city is picked, tighten the bias to its radius so
          // "IOI City Mall" in Putrajaya outranks "IOI Mall Puchong" near KL.
          radiusM: cityHit ? cityRadiusCapM(cityHit, country.code) : undefined
        });
        setSuggestions(r?.suggestions || []);
        setSuggestionsQuery(trimmed);
      } catch {
        setSuggestions([]);
        setSuggestionsQuery('');
      } finally { setLoading(false); }
    }, 250);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query, biasLat, biasLng, country.code]);

  async function handlePick(s) {
    setQuery('');
    setSuggestions([]);
    setSuggestionsQuery('');
    clearIdleHint();
    setLoading(true);
    try {
      const r = await placeResolve({ placeId: s.placeId });
      if (r?.lat != null && r?.lng != null) {
        // v0.61.265 — never persist 'Unnamed' or a bare country name
        // as the anchor's label.
        const rawLabel = r.name || s.primaryText || '';
        const labelOut = _safeLabel(rawLabel, s.secondaryText, query.trim())
          || 'Pinned location';
        // v0.61.244 — OTHER picks set the anchor but wait for the
        // user to press 🔍 on the compact pill to fire the search.
        // Matches the v0.61.241 city-dropdown semantics.
        onSelect?.({ lat: r.lat, lng: r.lng, label: labelOut, noAutoFire: true });
        setExpanded(false);
      }
    } catch (err) {
      console.warn('[OtherLocationPicker] resolve failed:', err.message);
    } finally { setLoading(false); }
  }

  function handleKey(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (loading) return;
    if (suggestions.length === 0) return;
    // Drop stale suggestions (user typed past the last debounced fetch).
    if (suggestionsQuery !== query.trim()) return;
    handlePick(suggestions[0]);
  }

  // v0.61.265 — operator: "the location field box cannot be a country." The
  // country-name guard now lives in displayLocName (above); the field shows the
  // previewed city / committed anchor, else the i18n placeholder.

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
        <div className="rounded-md border loc-field-surface px-3 py-1.5">
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-tg-accent">📍</span>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="flex-1 min-w-0 text-left text-sm text-tg-text inline-flex items-center gap-1.5"
            >
              <span className="flex-shrink-0" aria-hidden>{country.flag}</span>
              <span className="truncate">{displayLocName}</span>
            </button>
            <button
              type="button"
              onClick={() => onSearch?.()}
              aria-label={tr('loc.searchHere', lang)}
              title={tr('loc.searchHere', lang)}
              /* v0.62.x — operator: selections only set criteria; nothing fires
                 until 🔍. When the criteria are "dirty" (changed since the last
                 search) pulse the 🔍 with an accent ring so the user knows to
                 tap it. The cue clears once a search runs (searchPending←false). */
              className={`text-tg-accent hover:text-tg-text text-sm leading-none flex-shrink-0 px-1 ${searchPending ? 'animate-pulse' : ''}`}
            >🔍</button>
          </div>
          {suffix && suffixVisible && (
            <div className="flex items-center justify-end gap-1 text-[10px] text-tg-hint italic leading-tight mt-0.5">
              <span>{suffix} · {lang === 'fr' ? 'touchez pour changer' : 'tap to change'} 🔝</span>
              {zones.length > 0 && (
                <button
                  type="button"
                  onClick={() => setZonesOpen((v) => !v)}
                  aria-label={zonesOpen
                    ? (lang === 'fr' ? 'Masquer les lieux proches' : 'Hide nearby places')
                    : (lang === 'fr' ? 'Voir les lieux proches' : 'Browse nearby places')}
                  aria-expanded={zonesOpen}
                  className="gia-hit inline-flex items-center justify-center w-4 h-4 rounded-full border border-tg-border text-tg-accent not-italic leading-none"
                >{zonesOpen ? '−' : '+'}</button>
              )}
            </div>
          )}
          {zonesOpen && zones.length > 0 && (
            <div className="mt-1 max-h-60 overflow-y-auto rounded-lg border border-tg-border bg-tg-card/90 backdrop-blur-sm shadow-lg divide-y divide-tg-border/40">
              {zones.map((g, gi) => (
                <div key={gi} className="py-1">
                  <div className="px-2.5 py-1 text-[10px] font-semibold text-tg-hint uppercase tracking-wide flex items-center justify-between">
                    <span>{zoneHeader(g.zone, lang)}</span>
                    <span className="font-normal normal-case">{g.items.length}</span>
                  </div>
                  {g.items.map((it, ii) => (
                    <button
                      key={ii}
                      type="button"
                      onClick={() => {
                        if (Number.isFinite(it.lat) && Number.isFinite(it.lng)) {
                          onSelect?.({ lat: it.lat, lng: it.lng, label: it.street || it.name });
                        }
                        setZonesOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 min-h-[40px] flex items-baseline gap-1.5 hover:bg-tg-bg focus:bg-tg-bg focus:outline-none"
                    >
                      <span className="text-[10px] text-tg-text truncate">{it.street || it.name}</span>
                      {it.street && <span className="text-[10px] truncate nearby-venue">· {it.name}</span>}
                      {Number.isFinite(it.distanceM) && (
                        <span className="ml-auto shrink-0 text-[10px] text-tg-hint tabular-nums">
                          {it.distanceM >= 1000 ? `${(it.distanceM / 1000).toFixed(1)}km` : `${Math.round(it.distanceM)}m`}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
      <div className="relative">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border loc-field-surface">
          {/* v0.61.208 — custom dropdown: closed shows "<flag> <CC>"
              (compact), opened shows "<flag> <Name>" (descriptive).
              Native <select> can't differentiate closed vs open
              text, so we use a button + popover. */}
          {/* v0.61.364 — operator: city flush to the country pill's right
              border. Wrap both pills in a gap-0 group so they butt together,
              while the outer row keeps its gap-1.5 before the input. */}
          <div className="flex items-center flex-shrink-0">
            <CountryDropdown
              value={country.code}
              onChange={(code) => {
                // v0.61.418 — mark this as a USER country change so the auto-pick
                // effect flies the map to the new country's capital.
                userChangedCountryRef.current = true;
                onCountryChange?.(code);
              }}
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
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); onActivity?.(); }}
            onKeyDown={handleKey}
            enterKeyHint="search"
            placeholder={displayLocName || tr('loc.other.placeholder', lang)}
            /* P1-e — placeholder-only field name; the BASE placeholder key
               (not the displayLocName current-value fallback) names it. */
            aria-label={tr('loc.other.placeholder', lang)}
            /* v0.61.372 — min-w-0 so the input can shrink below its
               placeholder's intrinsic width; without it a long city name
               ("Wellington") pushed the trailing ✏️ off-screen. Matches the
               SG/JB branch input (line ~464). */
            className="flex-1 min-w-0 bg-transparent text-[16px] outline-none placeholder:text-tg-hint"
          />
          {loading && <span className="text-tg-hint text-xs">…</span>}
          {/* v0.61.267 — drop the explicit 🔍 search button; OTHER
              now uses JB-style autocomplete-on-keystroke. The ✏️
              icon mirrors the SG/JB expanded state so users know
              they're in edit mode. Tap the compact pill's 🔍 (once
              an anchor is set) to fire the search at the current
              anchor; that path is unchanged. */}
          <span aria-hidden className="text-tg-hint text-xs flex-shrink-0">✏️</span>
        </div>
        {/* v0.61.267 — JB-style autocomplete suggestions dropdown.
            Mirrors the SG/JB branch's suggestion popover above.
            Each row resolves via placeResolve on click. */}
        {suggestions.length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-tg-border bg-tg-card shadow-lg overflow-hidden">
            {suggestions.map((s, i) => {
              const primaryDisplay = _safeLabel(s.primaryText, s.secondaryText, query.trim())
                || s.primaryText;
              return (
                <button
                  key={s.placeId}
                  type="button"
                  aria-selected={i === 0}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(s)}
                  className={`block w-full text-left px-3 py-2 hover:bg-tg-bg border-b border-tg-border last:border-0 ${i === 0 ? 'bg-tg-bg/50' : ''}`}
                >
                  <div className="text-sm">{primaryDisplay}</div>
                  {s.secondaryText && s.secondaryText !== primaryDisplay && (
                    <div className="text-[11px] text-tg-hint truncate">{s.secondaryText}</div>
                  )}
                </button>
              );
            })}
            <div className="px-3 py-1.5 text-[10px] text-tg-hint italic border-t border-tg-border bg-tg-bg/40">
              {tr('loc.enterHint', lang)}
            </div>
          </div>
        )}
        {!loading && query.trim().length >= 2 && suggestions.length === 0 && (
          <div className="absolute left-0 right-0 top-full mt-1 z-20 rounded-md border border-tg-border bg-tg-card shadow-lg px-3 py-2 text-xs text-tg-hint">
            {tr('loc.noMatch', lang)}
          </div>
        )}
        {/* v0.61.244 — 6 s idle reminder, repositioned for the
            v0.61.267 autocomplete UI. Drives the user to keep
            typing or tap a suggestion. */}
        {idleHintActive && suggestions.length === 0 && (
          <div
            aria-hidden="true"
            className="absolute top-full right-2 mt-1.5 select-none pointer-events-none z-10 animate-pulse"
          >
            <div className="relative bg-tg-accent text-tg-bg text-[10px] font-semibold rounded-2xl px-2.5 py-1 whitespace-nowrap shadow-md">
              <span className="absolute right-3 -top-1 w-2 h-2 bg-tg-accent rotate-45" />
              {lang === 'fr' ? 'Tapez pour rechercher' : 'Type to search'}
            </div>
          </div>
        )}
      </div>
      )}
      {/* v0.61.236 — collapse back to compact pill after a city pick. */}
      {/* v0.61.267 — when expanded but the user has an anchor, surface a hint
          row below the form. v0.62.x — the redundant "collapse" link was
          removed (operator: duplicates the pill above; the picker still
          collapses by tapping the pill). The "· N nearby" count stays as
          result feedback. */}
      {!showCompact && anchor?.name && !_isCountryOnly(anchor.name) && anchor.name !== 'Unnamed' && (
        <div className="text-[11px] text-tg-hint truncate px-1">
          📍 {anchor.name}{suffix ? ` · ${suffix}` : ''}
        </div>
      )}
    </div>
  );
}
