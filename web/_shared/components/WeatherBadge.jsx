import React, { useEffect, useState } from 'react';
import { DOT_COLOURS, tempText, TEMP_UNIT_KEY, ot, outlookLabel } from '../lib/outside-now-i18n.js';

// v0.60.219 — live Singapore weather chip. Fetches the public,
// no-PII /api/weather/summary endpoint once on mount and renders an
// emoji + temperature (e.g. "⛅ 31°C"). Renders nothing until data
// arrives or if the fetch fails — never blocks or errors the header.
// v0.62.952 — "Outside now" (spec doc/Feature/2026-10-29-outside-now-alerts.spec.md, layout B): an optional `dot`
// colour (the worst outdoor condition, from /api/weather/outside) and `onClick`, which turns the chip into the button
// that opens the sheet. Without either it renders exactly as before.
// v0.62.960 — spec doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md. C1: the chip takes the reader's
// `lat`/`lng`, as Cuisine's copy already did, so Train and Hawker in Tokyo show Tokyo, not the Singapore centroid.
// C2: abroad (an Open-Meteo reading) with no `onClick` passed, tapping the number opens a small card with the
// condition, humidity, a Singapore-only note and Open-Meteo's required credit; the apps pass `onClick` only in Singapore.
export default function WeatherBadge({ className = '', lat = null, lng = null, dot = null, onClick = null, ariaLabel = '', lang = 'en' }) {
  const [wx, setWx] = useState(null);
  const [cardOpen, setCardOpen] = useState(false);
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
    const qs = (Number.isFinite(lat) && Number.isFinite(lng)) ? `?lat=${lat}&lng=${lng}` : '';
    fetch(`/api/weather/summary${qs}`)
      .then((r) => r.json())
      .then((d) => { if (cancelled) return; setWx(d && d.ok ? d : null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lat, lng]);
  if (!wx) return null;
  const tt = tempText(wx, unit);
  const abroad = wx.source === 'open-meteo';
  const dotEl = dot && DOT_COLOURS[dot]
    ? <span data-outside-dot={dot} aria-hidden="true" style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', marginLeft: 4, background: DOT_COLOURS[dot], verticalAlign: 'middle' }} />
    : null;
  const plain = { all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' };
  const value = <>{wx.emoji}{tt ? ` ${tt.value}` : ''}</>;
  const tap = onClick || (abroad ? () => setCardOpen((o) => !o) : null);
  return (
    <span className={className} title={wx.condition || ''} style={{ display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
      {tap
        ? <button type="button" onClick={tap} aria-label={ariaLabel || undefined} aria-expanded={onClick ? undefined : cardOpen} style={plain}>{value}</button>
        : value}
      {tt && <button type="button" onClick={flipUnit} data-temp-unit={unit} aria-label={unit === 'F' ? '°C' : '°F'} style={plain}>{tt.unit}</button>}
      {dotEl}
      {cardOpen && abroad && !onClick && (
        <span
          data-weather-card
          role="dialog"
          style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 1000, width: 220, padding: '8px 10px',
            borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,.2)', fontSize: 12, lineHeight: 1.35, whiteSpace: 'normal',
            background: 'var(--tg-bg, var(--tg-theme-bg-color, #fff))', color: 'var(--tg-text, var(--tg-theme-text-color, #111))',
            display: 'block', textAlign: 'left',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <b style={{ flex: 1, fontWeight: 600 }}>{wx.emoji} {outlookLabel(wx.condition, lang)}{tt ? ` · ${tt.value}${tt.unit}` : ''}</b>
            <button type="button" onClick={() => setCardOpen(false)} aria-label={ot('ui.close', lang)} style={{ ...plain, padding: '0 2px' }}>✕</button>
          </span>
          {Number.isFinite(wx.humidityPct) && <span style={{ display: 'block' }}>{ot('abroad.humidity', lang, { pct: wx.humidityPct })}</span>}
          <span style={{ display: 'block', marginTop: 4, opacity: 0.8 }}>{ot('abroad.note', lang)}</span>
          <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 4, fontSize: 11, color: 'inherit', opacity: 0.75 }}>{ot('abroad.credit', lang)}</a>
        </span>
      )}
    </span>
  );
}
