import React, { useEffect, useState } from 'react';

// v0.60.219 — live weather chip. Fetches the public, no-PII
// /api/weather/summary endpoint and renders an emoji + temperature
// (e.g. "⛅ 31°C"). Renders nothing until data arrives or if the fetch
// fails — never blocks or errors the header.
// v0.61.380 — operator: weather follows the country expansion. Pass the
// user's lat/lng so the server returns THEIR weather (NEA in SG,
// Open-Meteo elsewhere) instead of a fixed Singapore reading. Re-fetches
// when the location changes.
export default function WeatherBadge({ className = '', lat = null, lng = null }) {
  const [wx, setWx] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const qs = (Number.isFinite(lat) && Number.isFinite(lng)) ? `?lat=${lat}&lng=${lng}` : '';
    fetch(`/api/weather/summary${qs}`)
      .then((r) => r.json())
      .then((d) => { if (cancelled) return; setWx(d && d.ok ? d : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng]);
  if (!wx) return null;
  const temp = Number.isFinite(wx.tempC) ? ` ${wx.tempC}°C` : '';
  return <span className={className} title={wx.condition || ''}>{wx.emoji}{temp}</span>;
}
