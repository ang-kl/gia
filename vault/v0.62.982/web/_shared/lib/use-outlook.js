// use-outlook.js — v0.62.960. Fetches GET /api/weather/outlook (NEA's four-day outlook) for the "Outside now" sheet.
//
// Spec doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md, C6: only when the sheet opens, and once per
// open; the server caches it for 30 minutes. Returns the payload, or null until it arrives or if it fails, so the
// block is simply absent.
import { useEffect, useState } from 'react';

export default function useOutlook(enabled) {
  const [data, setData] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    fetch('/api/weather/outlook')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setData(d && d.ok ? d : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [enabled]);
  return data;
}
