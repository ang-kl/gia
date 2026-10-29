import React, { useEffect } from 'react';
import { ot, sheetRows, levelKey, rowTone, ROW_SOURCE, hhmm } from '../lib/outside-now-i18n.js';

// OutsideNowSheet.jsx — v0.62.952. Layout B of the "Outside now" spec
// (doc/Feature/2026-10-29-outside-now-alerts.spec.md): the sheet the weather chip opens. One row per feed — heat
// stress, lightning, flood alerts, air, UV — each with its level, its detail, NEA or PUB, and the reading time.
// Cuisine adds the parking row, which names no agency (operator, 29-10 '26). A modal overlay rather than the shared
// BottomSheet, which is the persistent results drawer in these apps.

const TONE = {
  red: { bg: '#fde8e8', fg: '#c63b3b' },
  amber: { bg: '#fff4d6', fg: '#a26b00' },
  green: { bg: '#e7f6ee', fg: '#2e7d4f' },
  muted: { bg: 'rgba(127,127,127,.15)', fg: 'inherit' },
};
const ICON = { heat: '🌡️', lightning: '⚡', flood: '🌊', air: '🌫️', uv: '☀️', parking: '🅿️' };

function detail(name, row, lang) {
  if (!row || row.status !== 'ok') return '';
  if (name === 'heat') return `WBGT ${row.wbgt} °C${row.station ? ` · ${row.station}` : ''}`;
  if (name === 'lightning') return row.count ? ot('d.lightningNear', lang, { n: row.count, km: row.nearestKm }) : ot('d.lightningNone', lang);
  if (name === 'flood') {
    if (!row.alerts.length) return ot('d.floodNone', lang);
    return row.alerts.map((a) => (a.km == null ? a.text : `${a.text} (${a.km} km)`)).join(' · ');
  }
  if (name === 'air') return `PSI ${row.psi}${row.pm25 != null ? ` · PM2.5 ${row.pm25}` : ''}`;
  if (name === 'uv') return `UV ${row.index}`;
  return '';
}

export default function OutsideNowSheet({ open, onClose, data, app = 'default', lang = 'en' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open || !data || !data.inSg || !data.rows) return null;
  const place = data.place?.isDefault ? ot('singapore', lang) : ot('nearYou', lang);
  const rows = sheetRows(app).filter((name) => name !== 'parking' || data.rows.parking);
  return (
    <div data-outside-sheet style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.32)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ot('title', lang)}
        style={{
          position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '80vh', overflowY: 'auto',
          background: 'var(--tg-bg, var(--tg-theme-bg-color, #fff))', color: 'var(--tg-text, var(--tg-theme-text-color, #111))',
          borderRadius: '18px 18px 0 0', boxShadow: '0 -6px 20px rgba(0,0,0,.18)',
          padding: '10px 16px calc(14px + env(safe-area-inset-bottom, 0px))', fontSize: 13,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, flex: 1 }}>{ot('title', lang)} · {place}</h3>
          <button type="button" onClick={onClose} aria-label={ot('ui.close', lang)} style={{ all: 'unset', cursor: 'pointer', fontSize: 16, padding: 4 }}>✕</button>
        </div>
        {rows.map((name) => {
          const row = data.rows[name];
          if (name === 'parking') {
            return (
              <div key={name} data-row={name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr', gap: 6, padding: '7px 0', borderTop: '1px solid rgba(127,127,127,.18)' }}>
                <span aria-hidden="true">{ICON.parking}</span>
                <span>
                  <b style={{ fontWeight: 600 }}>{ot('row.parking', lang)}</b>
                  {row.carparks.map((c) => (
                    <span key={c.name} style={{ display: 'block', fontSize: 12, opacity: 0.85 }}>{c.name} · {ot('d.lots', lang, { lots: c.lots, m: c.m })}</span>
                  ))}
                </span>
              </div>
            );
          }
          const tone = TONE[rowTone(row, name)];
          const at = row && row.status === 'ok' ? hhmm(row.at) : '';
          return (
            <div key={name} data-row={name} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: 6, alignItems: 'center', padding: '7px 0', borderTop: '1px solid rgba(127,127,127,.18)' }}>
              <span aria-hidden="true">{ICON[name]}</span>
              <span style={{ minWidth: 0 }}>
                <b style={{ fontWeight: 600 }}>{ot(`row.${name}`, lang)}</b>
                <span style={{ display: 'block', fontSize: 11.5, opacity: 0.75 }}>
                  {detail(name, row, lang)}{at ? `${detail(name, row, lang) ? ' · ' : ''}${ROW_SOURCE[name]} ${at}` : ''}
                </span>
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: tone.bg, color: tone.fg, whiteSpace: 'nowrap' }}>
                {ot(levelKey(row, name), lang)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
