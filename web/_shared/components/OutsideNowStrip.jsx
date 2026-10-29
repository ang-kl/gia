import React, { useState } from 'react';
import { topWarning, stripText, dismissKey, ot, ROW_SOURCE, hhmm } from '../lib/outside-now-i18n.js';

// OutsideNowStrip.jsx — v0.62.952. Layout A of the "Outside now" spec
// (doc/Feature/2026-10-29-outside-now-alerts.spec.md): one line under the header, shown ONLY while a warning is
// active, carrying the single most urgent one (C3). Tapping it opens the sheet; ✕ hides it until the warning's kind
// or level changes (C7). Renders nothing outside Singapore (I3).

// Dismissals live for the app session, shared by every strip instance in the page.
const dismissed = new Set();

const TONES = {
  lightning: { bg: '#eee9ff', fg: '#5b3fd0', icon: '⚡' },
  flood: { bg: '#e3f0fb', fg: '#1f6fb8', icon: '🌊' },
  haze: { bg: '#fff4d6', fg: '#8a5b00', icon: '🌫️' },
  heat: { bg: '#fde8e8', fg: '#b42f2f', icon: '🌡️' },
  uv: { bg: '#fff4d6', fg: '#8a5b00', icon: '☀️' },
};
const ROW_OF = { lightning: 'lightning', flood: 'flood', haze: 'air', heat: 'heat', uv: 'uv' };

export default function OutsideNowStrip({ data, app = 'default', lang = 'en', onOpen, className = '' }) {
  const [, force] = useState(0);
  const kind = topWarning(data, app);
  if (!kind) return null;
  const key = dismissKey(kind, data);
  if (dismissed.has(key)) return null;
  const tone = TONES[kind];
  const row = data.rows[ROW_OF[kind]] || {};
  return (
    <div
      role="status"
      data-outside-strip={kind}
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 8px 0', padding: '7px 10px', borderRadius: 10, fontSize: 12, lineHeight: 1.3, background: tone.bg, color: tone.fg }}
    >
      <button
        type="button"
        onClick={onOpen}
        style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}
      >
        <span aria-hidden="true">{tone.icon}</span>
        <span style={{ flex: 1, minWidth: 0, fontWeight: 600 }}>{stripText(kind, data, app, lang)}</span>
        <span style={{ fontSize: 11, opacity: 0.8, whiteSpace: 'nowrap' }}>{ROW_SOURCE[ROW_OF[kind]]} {hhmm(row.at)} ›</span>
      </button>
      <button
        type="button"
        aria-label={ot('ui.dismiss', lang)}
        onClick={() => { dismissed.add(key); force((n) => n + 1); }}
        style={{ all: 'unset', cursor: 'pointer', padding: '0 2px 0 4px', fontSize: 14, opacity: 0.7 }}
      >✕</button>
    </div>
  );
}
