import React, { useEffect, useState } from 'react';
import LineBadge from './LineBadge.jsx';
import { lineStations } from '../data/line-paths.js';

// Hitachi-style left panel — line code badge + name (English),
// direction, status icon (▲ delay / ⛔ closure / ✕ disrupted),
// cause line. Mirrors the Yokohama Line reference card.
const STATUS_ICON = {
  delay:      '⚠️',
  disrupted:  '⛔',
  closure:    '🚧',
  normal:     '✓',
  unknown:    '·'
};

const STATUS_LABEL = {
  delay:      'Delay',
  disrupted:  'Service disrupted',
  closure:    'Closure',
  normal:     'Normal service',
  unknown:    'Status unknown'
};

const STATUS_COLOR = {
  delay:      '#FF9500',
  disrupted:  '#FF3B30',
  closure:    '#FF3B30',
  normal:     '#34C759',
  unknown:    '#8E8E93'
};

export default function LineStatusPanel({ line, status }) {
  // v0.61.9 — station list for the focused line, fetched once. Replaces
  // the old "Showing EWL · 35 stations" banner on the Google Map.
  const [stations, setStations] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/transport/stations')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d) setStations(Array.isArray(d.stations) ? d.stations : []); })
      .catch(() => { /* dropdown simply stays empty */ });
    return () => { cancelled = true; };
  }, []);

  if (!line) return null;
  const s = status?.status || 'normal';
  const colour = STATUS_COLOR[s];
  const lineStops = stations ? lineStations(stations, line.code) : [];
  return (
    // v0.60.97 — shrunk by half (operator 2026-05-11). Was
    // p-3 sm:p-4 + min-h-[200px]; now p-2 + no min-height so the
    // card sizes to its actual content. "Normal service" lines
    // (no cause / direction / time) fit in ~100 px instead of
    // forcing 200.
    <div className="rounded-lg border border-tg-border bg-tg-card p-2 sm:p-3 flex flex-col gap-1.5">
      <div className="flex items-start gap-3">
        <LineBadge code={line.code} hex={line.hex} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold leading-tight truncate">{line.name}</div>
          <div className="text-xs text-tg-hint truncate">For {line.endpoints?.[1] || '?'}</div>
          <div className="text-xs text-tg-hint truncate">{line.endpoints?.[0]} ↔ {line.endpoints?.[1]}</div>
        </div>
      </div>
      <div className="border-t border-tg-border pt-1.5 flex items-start gap-2">
        <span className="text-xl leading-none" style={{ color: colour }}>{STATUS_ICON[s]}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold" style={{ color: colour }}>status: {STATUS_LABEL[s]}</div>
          {status?.cause && (
            <div className="text-xs text-tg-hint mt-0.5">cause: {status.cause}</div>
          )}
          {status?.direction && (
            <div className="text-xs text-tg-hint mt-0.5">section: {status.direction}</div>
          )}
          {status?.time && (
            <div className="text-xs text-tg-hint mt-0.5">since: {status.time}</div>
          )}
        </div>
      </div>
      {status?.raw && s !== 'normal' && (
        <details className="text-xs text-tg-hint">
          <summary className="cursor-pointer">LTA notice</summary>
          <p className="mt-1 leading-snug">{status.raw}</p>
        </details>
      )}
      {lineStops.length > 0 && (
        <details className="text-xs text-tg-hint border-t border-tg-border pt-1.5">
          <summary className="cursor-pointer">{lineStops.length} stations</summary>
          <ul className="mt-1 flex flex-col gap-0.5">
            {lineStops.map((st) => (
              <li key={st.code} className="flex items-baseline gap-1.5">
                <code className="text-[10px] font-semibold text-tg-text">{st.code}</code>
                <span className="truncate">{st.name}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
