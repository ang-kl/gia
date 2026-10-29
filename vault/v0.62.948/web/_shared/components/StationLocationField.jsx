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
//
// v0.62.690 — ROADS AND ADDRESSES TOO. Operator: "when type in the road or
// train … place a temporary location". v0.62.689 built the train half; this adds
// the road half, as a SECOND section under the stations rather than a separate
// field, so one box answers "where do I want to look?" however the user phrases
// it. The two halves behave differently on purpose:
//
//   • Stations — local substring filter over an already-loaded array. Instant,
//     offline, zero network per keystroke. Unchanged.
//   • Roads / addresses — debounced 250 ms against /api/geo/road-search
//     (OneMap, server-side, Redis-cached 24 h). Networked, so it can be slow or
//     absent.
//
// Stations are listed FIRST and never wait on the network: if OneMap is down or
// slow, typing "Bishan" still resolves the station immediately. The address
// section simply doesn't appear. That ordering is the whole failure plan.
//
// Both selections call the SAME `onSelectStation` callback, carrying a `kind` of
// 'station' or 'address'. Hosts that only need coordinates (Hawker) can ignore
// `kind` entirely; hosts that render station-specific UI (Transport) branch on it.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { startLocationSync } from '../lib/location-sync.js';

// v0.62.662 — full 8-locale coverage (was en/fr only), matching the 8 locales
// every host app (Cuisine/Hawker/Transport) already supports.
const STRINGS = {
  near:        { en: 'You are near', fr: 'Vous êtes près de', id: 'Anda berada dekat', ru: 'Вы рядом с', de: 'Sie sind in der Nähe von', zh: '您在附近', ja: '最寄り駅', es: 'Estás cerca de' },
  locating:    { en: 'Locating…', fr: 'Localisation…', id: 'Mencari lokasi…', ru: 'Определение местоположения…', de: 'Standort wird ermittelt…', zh: '定位中…', ja: '位置情報を取得中…', es: 'Localizando…' },
  // v0.62.690 — the copy widens from stations-only to "station or road", in all
  // 8 locales, because the field now answers both.
  change:      { en: 'Search a station or road', fr: 'Rechercher une station ou une rue', id: 'Cari stasiun atau jalan', ru: 'Найти станцию или улицу', de: 'Station oder Straße suchen', zh: '搜索车站或道路', ja: '駅または道路を検索', es: 'Buscar una estación o calle' },
  placeholder: { en: 'Station, code or road (e.g. NS1, Orchard Rd)', fr: 'Station, code ou rue (ex. NS1, Orchard Rd)', id: 'Stasiun, kode, atau jalan (mis. NS1, Orchard Rd)', ru: 'Станция, код или улица (напр. NS1, Orchard Rd)', de: 'Station, Code oder Straße (z. B. NS1, Orchard Rd)', zh: '车站、代码或道路（如 NS1、Orchard Rd）', ja: '駅・コード・道路（例: NS1, Orchard Rd）', es: 'Estación, código o calle (ej. NS1, Orchard Rd)' },
  opens:       { en: 'opens', fr: 'ouvre', id: 'buka', ru: 'открывается', de: 'öffnet', zh: '开通', ja: '開業', es: 'abre' },
  noMatch:     { en: 'No station or address matches', fr: 'Aucune station ni adresse ne correspond', id: 'Tidak ada stasiun atau alamat yang cocok', ru: 'Станции и адреса не найдены', de: 'Keine passende Station oder Adresse', zh: '没有匹配的车站或地址', ja: '一致する駅・住所がありません', es: 'Ninguna estación o dirección coincide' },
  secStations: { en: 'Stations', fr: 'Stations', id: 'Stasiun', ru: 'Станции', de: 'Stationen', zh: '车站', ja: '駅', es: 'Estaciones' },
  secPlaces:   { en: 'Roads & addresses', fr: 'Rues et adresses', id: 'Jalan & alamat', ru: 'Улицы и адреса', de: 'Straßen & Adressen', zh: '道路与地址', ja: '道路・住所', es: 'Calles y direcciones' },
  searching:   { en: 'Searching addresses…', fr: 'Recherche d’adresses…', id: 'Mencari alamat…', ru: 'Поиск адресов…', de: 'Adressen werden gesucht…', zh: '正在搜索地址…', ja: '住所を検索中…', es: 'Buscando direcciones…' },
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
  // v0.62.690 — the networked half. `addrQuery` records WHICH query produced the
  // current batch: without it a slow response for "orc" can land after a fast one
  // for "orchard" and repaint stale rows under the newer text. Same stale-guard
  // Cuisine's LocationField carries (added there after Codex review #216).
  const [addrResults, setAddrResults] = useState([]);
  const [addrQuery, setAddrQuery] = useState('');
  const [addrLoading, setAddrLoading] = useState(false);
  const debounceRef = useRef(null);

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

  // v0.62.690 — road/address lookup, debounced 250 ms (the interval Cuisine's
  // LocationField settled on) and gated at 3 characters, which is also the
  // server's floor. Deliberately fires INDEPENDENTLY of the station filter, so a
  // query that matches a station still searches addresses too — "Bishan" is both
  // a station and a road, and the operator should get both.
  useEffect(() => {
    const q = query.trim();
    if (!open || q.length < 3) {
      setAddrResults([]); setAddrQuery(''); setAddrLoading(false);
      return undefined;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    let cancelled = false;
    debounceRef.current = setTimeout(() => {
      setAddrLoading(true);
      fetch(`/api/geo/road-search?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled) return;
          setAddrResults(Array.isArray(d?.results) ? d.results : []);
          setAddrQuery(q);
        })
        // OneMap unreachable, offline, 429 — the station half above is local and
        // keeps working, so this degrades to "no address matches", never an error.
        .catch(() => { if (!cancelled) { setAddrResults([]); setAddrQuery(q); } })
        .finally(() => { if (!cancelled) setAddrLoading(false); });
    }, 250);
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Only paint rows that belong to the text currently in the box.
  const addrFresh = addrQuery === query.trim() ? addrResults : [];

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
              aria-label={tr('placeholder', lang)}
              /* v0.62.698 — operator: "when I tap 'Search a station or road' it
                 should not zoom in and make the whole TMA looks zoom in". That
                 is iOS auto-zoom-on-focus, which fires for any input whose
                 font-size is under 16px. Each app's styles.css already carries
                 the guard `input, textarea, select { font-size: 16px }` — but a
                 bare element selector is specificity (0,0,1) and Tailwind's
                 `text-xs` is a class at (0,1,0), so the class won and the input
                 rendered at 12px. This is the standing O-104 finding, now
                 reported from a device. Setting the size HERE (16px, the iOS
                 threshold) is what actually reaches the element; the guard stays
                 as the backstop for inputs that set no size at all. */
              className="flex-1 text-[16px] px-2 py-1 rounded border border-tg-border bg-tg-bg text-tg-text"
            />
            <button type="button" onClick={() => { setOpen(false); setQuery(''); }}
              aria-label="Close" className="text-tg-hint text-xs px-1 active:scale-90">✕</button>
          </div>
          {query.trim() && (
            (results.length || addrFresh.length || addrLoading) ? (
              <div className="flex flex-col rounded-lg border border-tg-border bg-tg-bg overflow-hidden max-h-48 overflow-y-auto">
                {/* Stations first, and never gated on the network — if OneMap is
                    slow or down, typing a station name still resolves instantly.
                    The section headers only appear when BOTH kinds are present;
                    a station-only result set reads exactly as it did before. */}
                {!!results.length && !!(addrFresh.length || addrLoading) && (
                  <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-tg-hint/80">
                    {tr('secStations', lang)}
                  </div>
                )}
                {results.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      onSelectStation && onSelectStation({ ...s, kind: 'station' });
                      setOpen(false); setQuery('');
                    }}
                    className="text-left px-2 py-1.5 text-xs border-b border-tg-border last:border-b-0 active:bg-tg-hint/10"
                  >
                    <span className="font-medium text-tg-text">{s.name}</span>{' '}
                    <span className="text-tg-hint">{(s.codes || []).join(' · ')}</span>
                    {s.status === 'future' && (
                      <span className="text-tg-hint"> · {tr('opens', lang)} {s.opensYear || ''}</span>
                    )}
                  </button>
                ))}
                {!!(addrFresh.length || addrLoading) && (
                  <div className="px-2 pt-1 pb-0.5 text-[10px] uppercase tracking-wide text-tg-hint/80 border-t border-tg-border">
                    {tr('secPlaces', lang)}
                  </div>
                )}
                {addrLoading && !addrFresh.length && (
                  <div className="px-2 py-1.5 text-[11px] text-tg-hint">{tr('searching', lang)}</div>
                )}
                {addrFresh.map((a) => (
                  <button
                    key={`${a.name}|${a.lat}|${a.lng}`}
                    type="button"
                    onClick={() => {
                      // Same callback, same coordinate contract as a station —
                      // `kind` is what lets a host tell them apart.
                      onSelectStation && onSelectStation({
                        kind: 'address', name: a.name, sub: a.sub, lat: a.lat, lng: a.lng
                      });
                      setOpen(false); setQuery('');
                    }}
                    className="text-left px-2 py-1.5 text-xs border-b border-tg-border last:border-b-0 active:bg-tg-hint/10"
                  >
                    <span className="font-medium text-tg-text">{a.name}</span>
                    {a.sub && <span className="block text-[10px] text-tg-hint">{a.sub}</span>}
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
