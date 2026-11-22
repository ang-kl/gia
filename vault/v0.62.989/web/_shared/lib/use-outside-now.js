// use-outside-now.js — v0.62.952. Fetches GET /api/weather/outside for a point and refreshes it every 5 minutes
// while the Mini App is open (spec doc/Feature/2026-10-29-outside-now-alerts.spec.md, C1 and C7).
//
// Returns the route's payload, or null until it arrives / if it fails. Nothing here ever throws into a header.
import { useEffect, useState } from 'react';

const REFRESH_MS = 5 * 60 * 1000;

export default function useOutsideNow({ lat = null, lng = null, parking = false } = {}) {
  const [data, setData] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (Number.isFinite(lat) && Number.isFinite(lng)) { params.set('lat', String(lat)); params.set('lng', String(lng)); }
    if (parking) params.set('parking', '1');
    const qs = params.toString() ? `?${params}` : '';
    const load = () => {
      fetch(`/api/weather/outside${qs}`)
        .then((r) => r.json())
        .then((d) => { if (!cancelled) setData(d && d.ok ? d : null); })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [lat, lng, parking]);
  return data;
}
