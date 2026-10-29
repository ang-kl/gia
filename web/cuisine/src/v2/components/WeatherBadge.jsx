import React, { useEffect, useState } from 'react';
import { DOT_COLOURS } from '../../../../_shared/lib/outside-now-i18n.js';

// v0.60.219 — live weather chip. Fetches the public, no-PII
// /api/weather/summary endpoint and renders an emoji + temperature
// (e.g. "⛅ 31°C"). Renders nothing until data arrives or if the fetch
// fails — never blocks or errors the header.
// v0.61.380 — operator: weather follows the country expansion. Pass the
// user's lat/lng so the server returns THEIR weather (NEA in SG,
// Open-Meteo elsewhere) instead of a fixed Singapore reading. Re-fetches
// when the location changes.
// v0.62.952 — "Outside now" (spec doc/Feature/2026-10-29-outside-now-alerts.spec.md, layout B): an optional `dot`
// colour (the worst outdoor condition, from /api/weather/outside) and `onClick`, which turns the chip into the button
// that opens the sheet. Without either it renders exactly as before.
export default function WeatherBadge({ className = '', lat = null, lng = null, dot = null, onClick = null, ariaLabel = '' }) {
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
  const dotEl = dot && DOT_COLOURS[dot]
    ? <span data-outside-dot={dot} aria-hidden="true" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: DOT_COLOURS[dot], verticalAlign: 'middle' }} />
    : null;
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={ariaLabel || undefined} className={className} title={wx.condition || ''}
        style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
        {wx.emoji}{temp}{dotEl}
      </button>
    );
  }
  return <span className={className} title={wx.condition || ''}>{wx.emoji}{temp}{dotEl}</span>;
}
