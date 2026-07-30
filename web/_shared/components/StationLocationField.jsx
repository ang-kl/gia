// StationLocationField.jsx — v0.62.659
//
// Cuisine-style "📍 <current location> / Click to change" row, adapted for
// station search rather than address geocoding. Operator: "have the same
// location (show current location and nearest station) like cuisine TMA...
// allowing user to type on the train station name or train station code with
// auto-fill for the list of 200 live train station operated today. If the
// train station is not operating (aka don't be confuse with future station),
// still allow to type. Apply this to Hawker TMA as well."
//
// Unlike Cuisine's LocationField (Google Places address autocomplete), this
// searches the MRT/LRT station list itself — no external API call per
// keystroke, just a substring filter over the ~209-station dataset already
// served at /api/transport/stations. Future (not-yet-opened) stations stay
// in the list and are still typeable/selectable — they're tagged "opens
// <year>" rather than hidden, per the operator's explicit clarification that
// "not operating" (a live disruption) and "future" (not yet built) are
// different things and neither should block typing.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { startLocationSync } from '../lib/location-sync.js';

const STRINGS = {
  near:        { en: 'You are near', fr: 'Vous êtes près de' },
  locating:    { en: 'Locating…', fr: 'Localisation…' },
  change:      { en: 'Search a station', fr: 'Rechercher une station' },
  placeholder: { en: 'Station name or code (e.g. NS1, EW24)', fr: 'Nom ou code de station (ex. NS1, EW24)' },
  opens:       { en: 'opens', fr: 'ouvre' },
  noMatch:     { en: 'No station matches', fr: 'Aucune station ne correspond' },
};
function tr(key, lang) { return (STRINGS[key] && (STRINGS[key][lang] || STRINGS[key].en)) || key; }

const havM = (a, b) => {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};

export default function StationLocationField({ lang = 'en', onSelectStation = null, className = '' }) {
  const [stations, setStations] = useState([]);
  const [userLoc, setUserLoc] = useState(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const stopRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/transport/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setStations(Array.isArray(d.stations) ? d.stations : []); })
      .catch(() => { /* the search box simply degrades to empty results */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    stopRef.current = startLocationSync({ durationMs: 0, onLocation: (loc) => setUserLoc(loc) });
    return () => { stopRef.current && stopRef.current(); };
  }, []);

  // "Nearest station" only ranks currently-operating stations — a future
  // station can't be the one you're standing next to yet.
  const nearest = useMemo(() => {
    if (!userLoc || !stations.length) return null;
    let best = null, bestM = Infinity;
    for (const s of stations) {
      if (s.status === 'future' || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
      const d = havM(userLoc, s);
      if (d < bestM) { bestM = d; best = s; }
    }
    return best ? { station: best, distM: bestM } : null;
  }, [userLoc, stations]);

  // The search itself covers EVERY station regardless of status — future
  // stations stay typeable, just labelled.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return stations.filter((s) => {
      if (s.name && s.name.toLowerCase().includes(q)) return true;
      return Array.isArray(s.codes) && s.codes.some((c) => String(c).toLowerCase().includes(q));
    }).slice(0, 8);
  }, [query, stations]);

  return (
    <div className={`text-[11px] text-tg-hint text-left leading-tight ${className}`}>
      {!open && (
        <div className="flex items-center gap-2 flex-wrap">
          <span>
            📍 {nearest
              ? `${tr('near', lang)} ${nearest.station.name} (${(nearest.distM / 1000).toFixed(1)} km)`
              : tr('locating', lang)}
          </span>
          <button type="button" onClick={() => setOpen(true)}
            className="underline font-semibold text-[#ef4444] active:scale-95">
            {tr('change', lang)}
          </button>
        </div>
      )}
      {open && (
        <div className="flex flex-col gap-1 mt-0.5">
          <div className="flex items-center gap-1">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr('placeholder', lang)}
              className="flex-1 text-xs px-2 py-1 rounded border border-tg-border bg-tg-bg text-tg-text"
            />
            <button type="button" onClick={() => { setOpen(false); setQuery(''); }}
              aria-label="Close" className="text-tg-hint text-xs px-1 active:scale-90">✕</button>
          </div>
          {query.trim() && (
            results.length ? (
              <div className="flex flex-col rounded-lg border border-tg-border bg-tg-bg overflow-hidden max-h-48 overflow-y-auto">
                {results.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => { onSelectStation && onSelectStation(s); setOpen(false); setQuery(''); }}
                    className="text-left px-2 py-1.5 text-xs border-b border-tg-border last:border-b-0 active:bg-tg-hint/10"
                  >
                    <span className="font-medium text-tg-text">{s.name}</span>{' '}
                    <span className="text-tg-hint">{(s.codes || []).join(' · ')}</span>
                    {s.status === 'future' && (
                      <span className="text-tg-hint"> · {tr('opens', lang)} {s.opensYear || ''}</span>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-tg-hint px-2">{tr('noMatch', lang)}</div>
            )
          )}
        </div>
      )}
    </div>
  );
}
