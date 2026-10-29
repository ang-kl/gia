import React, { useEffect, useState } from 'react';
import { DOT_COLOURS } from '../lib/outside-now-i18n.js';

// v0.60.219 — live Singapore weather chip. Fetches the public,
// no-PII /api/weather/summary endpoint once on mount and renders an
// emoji + temperature (e.g. "⛅ 31°C"). Renders nothing until data
// arrives or if the fetch fails — never blocks or errors the header.
// v0.62.952 — "Outside now" (spec doc/Feature/2026-10-29-outside-now-alerts.spec.md, layout B): an optional `dot`
// colour (the worst outdoor condition, from /api/weather/outside) and `onClick`, which turns the chip into the button
// that opens the sheet. Without either it renders exactly as before.
export default function WeatherBadge({ className = '', dot = null, onClick = null, ariaLabel = '' }) {
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
