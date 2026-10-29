import React, { useEffect, useState } from 'react';
import { DOT_COLOURS, tempText, TEMP_UNIT_KEY } from '../lib/outside-now-i18n.js';

// v0.60.219 — live Singapore weather chip. Fetches the public,
// no-PII /api/weather/summary endpoint once on mount and renders an
// emoji + temperature (e.g. "⛅ 31°C"). Renders nothing until data
// arrives or if the fetch fails — never blocks or errors the header.
// v0.62.952 — "Outside now" (spec doc/Feature/2026-10-29-outside-now-alerts.spec.md, layout B): an optional `dot`
// colour (the worst outdoor condition, from /api/weather/outside) and `onClick`, which turns the chip into the button
// that opens the sheet. Without either it renders exactly as before.
export default function WeatherBadge({ className = '', dot = null, onClick = null, ariaLabel = '' }) {
  const [wx, setWx] = useState(null);
  // v0.62.953 — Amendment 1, item 5: tapping the unit flips °C / °F, remembered on this device (a per-viewer
  // convenience, so localStorage; it may be unavailable, hence the try/catch). Tapping the number opens the sheet.
  const [unit, setUnit] = useState(() => { try { return localStorage.getItem(TEMP_UNIT_KEY) === 'F' ? 'F' : 'C'; } catch { return 'C'; } });
  const flipUnit = () => setUnit((u) => {
    const next = u === 'F' ? 'C' : 'F';
    try { localStorage.setItem(TEMP_UNIT_KEY, next); } catch { /* storage unavailable: keep it for this view only */ }
    return next;
  });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/weather/summary')
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d && d.ok) setWx(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!wx) return null;
  const tt = tempText(wx, unit);
  const dotEl = dot && DOT_COLOURS[dot]
    ? <span data-outside-dot={dot} aria-hidden="true" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: DOT_COLOURS[dot], verticalAlign: 'middle' }} />
    : null;
  const plain = { all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' };
  const value = <>{wx.emoji}{tt ? ` ${tt.value}` : ''}</>;
  return (
    <span className={className} title={wx.condition || ''} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {onClick
        ? <button type="button" onClick={onClick} aria-label={ariaLabel || undefined} style={plain}>{value}</button>
        : value}
      {tt && <button type="button" onClick={flipUnit} data-temp-unit={unit} aria-label={unit === 'F' ? '°C' : '°F'} style={plain}>{tt.unit}</button>}
      {dotEl}
    </span>
  );
}
