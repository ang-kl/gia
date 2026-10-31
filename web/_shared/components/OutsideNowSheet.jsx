import React, { useEffect } from 'react';
import {
  ot, sheetRows, levelKey, rowTone, rowText, hhmm, outlookLabel, outlookDay, outlookTemp, TEMP_UNIT_KEY,
} from '../lib/outside-now-i18n.js';
import useOutlook from '../lib/use-outlook.js';

// OutsideNowSheet.jsx — v0.62.952. Layout B of the "Outside now" spec
// (doc/Feature/2026-10-29-outside-now-alerts.spec.md): the sheet the weather chip opens. One row per feed — heat
// stress, lightning, flood alerts, air, UV — each with its level, its detail, NEA or PUB, and the reading time.
// Cuisine adds the parking row, which names no agency (operator, 29-10 '26). A modal overlay rather than the shared
// BottomSheet, which is the persistent results drawer in these apps.
//
// v0.62.953 — Amendment 1 (operator, 29-10 '26: "APPROVE for items 1 to 5"): each row LEADS with the finding ("No
// flood near you") and line 2 names the row and its source ("Flood alert · PUB 19:11"); parking is one row per
// carpark; and on a wide window (Telegram Desktop) the sheet is capped at 480 px and centred instead of stretching
// edge to edge, which left every level pill stranded at the far right.
//
// v0.62.960 — spec doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md. C4: "Next 4 days" at the bottom,
// NEA's outlook from tomorrow, fetched only while the sheet is open, following the badge's °C / °F switch; it is the
// one block where the Outside-now spec's "no forecast language" (its C9) is lifted. C3: the Singapore Open Data Licence
// notice for the NEA and PUB data above it. The sheet itself stays Singapore-only.

const TONE = {
  red: { bg: '#fde8e8', fg: '#c63b3b' },
  amber: { bg: '#fff4d6', fg: '#a26b00' },
  green: { bg: '#e7f6ee', fg: '#2e7d4f' },
  muted: { bg: 'rgba(127,127,127,.15)', fg: 'inherit' },
};
const ICON = { heat: '🌡️', lightning: '⚡', flood: '🌊', air: '🌫️', uv: '☀️', parking: '🅿️' };
const WIDE_PX = 600;

function Row({ icon, title, line2, pill }) {
  return (
    <div data-row={icon.name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 8, alignItems: 'center', padding: '7px 0', borderTop: '1px solid rgba(127,127,127,.18)' }}>
      <span aria-hidden="true">{icon.glyph}</span>
      <span style={{ minWidth: 0 }}>
        <b style={{ fontWeight: 600, display: 'block' }}>{title}</b>
        <span style={{ display: 'block', fontSize: 11.5, opacity: 0.75 }}>{line2}</span>
      </span>
      {pill || <span />}
    </div>
  );
}

export default function OutsideNowSheet({ open, onClose, data, app = 'default', lang = 'en' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  const outlook = useOutlook(!!(open && data && data.inSg));
  if (!open || !data || !data.inSg || !data.rows) return null;
  let unit = 'C';
  try { unit = localStorage.getItem(TEMP_UNIT_KEY) === 'F' ? 'F' : 'C'; } catch { /* storage unavailable: °C */ }
  const place = data.place?.isDefault ? ot('singapore', lang) : ot('nearYou', lang);
  const wide = typeof window !== 'undefined' && window.innerWidth >= WIDE_PX;
  const rows = [];
  for (const name of sheetRows(app)) {
    if (name === 'parking') {
      for (const c of (data.rows.parking?.carparks || [])) {
        const tx = rowText('parking', c, lang);
        rows.push(<Row key={`p-${c.name}`} icon={{ name: 'parking', glyph: ICON.parking }} title={tx.title} line2={tx.line2} />);
      }
      continue;
    }
    const row = data.rows[name];
    const tx = rowText(name, row, lang);
    const tone = TONE[rowTone(row, name)];
    const pill = (
      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg, whiteSpace: 'nowrap' }}>
        {ot(levelKey(row, name), lang)}
      </span>
    );
    rows.push(<Row key={name} icon={{ name, glyph: ICON[name] }} title={tx.title} line2={tx.line2} pill={pill} />);
  }
  return (
    <div data-outside-sheet style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.32)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ot('title', lang)}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: wide ? 16 : 0, maxWidth: 480, margin: '0 auto',
          maxHeight: '80vh', overflowY: 'auto',
          background: 'var(--tg-bg, var(--tg-theme-bg-color, #fff))', color: 'var(--tg-text, var(--tg-theme-text-color, #111))',
          borderRadius: wide ? 18 : '18px 18px 0 0', boxShadow: '0 -6px 20px rgba(0,0,0,.18)',
          padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))', fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>{ot('title', lang)} · {place}</h3>
          <button type="button" onClick={onClose} aria-label={ot('ui.close', lang)} style={{ all: 'unset', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
        </div>
        {rows}
        {outlook && outlook.days && outlook.days.length > 0 && (
          <div data-outlook style={{ borderTop: '1px solid rgba(127,127,127,.18)', paddingTop: 8, marginTop: 2 }}>
            <b style={{ fontWeight: 600, display: 'block', marginBottom: 2 }}>{ot('outlook.title', lang)}</b>
            {outlook.days.map((d) => (
              <div key={d.date} data-outlook-day={d.date} style={{ display: 'grid', gridTemplateColumns: '44px 24px auto 1fr', gap: 6, alignItems: 'center', padding: '3px 0' }}>
                <span>{outlookDay(d.date, lang)}</span>
                <span aria-hidden="true">{d.emoji}</span>
                <span style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{outlookTemp(d.lowC, d.highC, unit)}</span>
                <span style={{ minWidth: 0, opacity: 0.85 }}>{outlookLabel(d.text, lang)}</span>
              </div>
            ))}
            <span style={{ display: 'block', fontSize: 11.5, opacity: 0.75 }}>{ot('outlook.issued', lang, { t: hhmm(outlook.issuedAt) })}</span>
          </div>
        )}
        <p data-licence style={{ margin: '10px 0 0', fontSize: 10.5, opacity: 0.65, lineHeight: 1.35 }}>
          <a href="https://data.gov.sg/open-data-licence" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{ot('licence.sg', lang)}</a>
        </p>
      </div>
    </div>
  );
}
