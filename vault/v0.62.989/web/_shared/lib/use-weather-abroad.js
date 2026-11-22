// use-weather-abroad.js — v0.62.962. Fetches GET /api/weather/abroad for a point outside Singapore: MET Norway's
// reading and four days, and JMA's warnings for Japan's 11 cities (spec doc/Feature/2026-11-01-local-weather-every-
// city.spec.md, C3, C5, C7).
//
// `enabled` is true only once /api/weather/outside has said the point is NOT in Singapore, so a Singapore reader never
// asks. It refreshes every 10 minutes while open: the server caches MET per 0.1° cell until MET's Expires and reads
// JMA's feed at most every 5 minutes, so a refresh costs neither upstream anything extra. Returns the payload, or null
// until it arrives or if it fails; nothing here throws into a header.
import { useEffect, useState } from 'react';

const REFRESH_MS = 10 * 60 * 1000;

export default function useWeatherAbroad({ lat = null, lng = null, enabled = false } = {}) {
  const [data, setData] = useState(null);
  useEffect(() => {
    setData(null);
    if (!enabled || !Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
    let cancelled = false;
    const load = () => {
      fetch(`/api/weather/abroad?lat=${lat}&lng=${lng}`)
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setData(d && d.ok && !d.inSg ? d : null); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [lat, lng, enabled]);
  return data;
}
