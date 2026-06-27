import React, { useEffect, useState } from 'react';

// v0.60.219 — live Singapore weather chip. Fetches the public,
// no-PII /api/weather/summary endpoint once on mount and renders an
// emoji + temperature (e.g. "⛅ 31°C"). Renders nothing until data
// arrives or if the fetch fails — never blocks or errors the header.
export default function WeatherBadge({ className = '' }) {
  const [wx, setWx] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/weather/summary')
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d && d.ok) setWx(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!wx) return null;
  const temp = Number.isFinite(wx.tempC) ? ` ${wx.tempC}°C` : '';
  return <span className={className} title={wx.condition || ''}>{wx.emoji}{temp}</span>;
}
