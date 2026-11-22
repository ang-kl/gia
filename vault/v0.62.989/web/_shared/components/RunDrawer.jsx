// RunDrawer.jsx — v0.62.971. Spec: doc/Feature/2026-11-04-run-drawer-and-operating-hours.spec.md, C5.
//
// The drawer the 🚇 and 🚍 footer buttons open: it slides up over the map, above the footer, 70% of the screen wide
// (15% left and right, the width of an eatery card), at most 45% of the screen tall, then it scrolls. One row per
// station or stop, newest first, each with a tiny ❌. Tapping outside closes it. It is portalled to <body> because the
// footer's frosted glass (backdrop-filter) would otherwise trap a fixed-position child inside the footer.
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { rt } from '../lib/run-state.js';

export default function RunDrawer({ kind, trains, stopBuses, lang = 'en', onClose }) {
  const [shown, setShown] = useState(false);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(true)); return () => cancelAnimationFrame(id); }, []);
  if (typeof document === 'undefined') return null;
  const rows = kind === 'trains'
    ? (trains?.stations || []).slice().reverse().map((s) => ({ key: s.key, title: s.name || s.key, sub: (s.lines || []).join(' · '), remove: () => trains.remove?.(s.key) }))
    : (stopBuses?.stops || []).slice().reverse().map((s) => ({ key: s.code, title: s.name || s.code, sub: `${s.code}${Number.isFinite(s.count) ? ' · ' + rt('drawer.buses', lang, { n: s.count }) : ''}`, remove: () => stopBuses.remove?.(s.code) }));
  const title = kind === 'trains' ? `🚇 ${rt('drawer.stations', lang)}` : `🚍 ${rt('drawer.stops', lang)}`;
  return createPortal(
    <div data-run-drawer-backdrop="" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60 }}>
      <div
        data-run-drawer={kind}
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', left: '15%', right: '15%',
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
          maxHeight: '45vh', overflowY: 'auto',
          background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #111)',
          border: '1px solid rgba(0,0,0,.12)', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,.22)',
          padding: '8px 8px 6px', fontSize: 13,
          transform: shown ? 'translateY(0)' : 'translateY(24px)', opacity: shown ? 1 : 0,
          transition: 'transform 180ms ease-out, opacity 180ms ease-out',
        }}>
        <div style={{ fontWeight: 700, fontSize: 12, padding: '2px 4px 6px', opacity: 0.8 }}>{title}</div>
        {rows.map((r) => (
          <div key={r.key} data-run-row={r.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', borderTop: '1px solid rgba(0,0,0,.06)' }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</span>
              {r.sub && <span style={{ display: 'block', fontSize: 11, opacity: 0.7 }}>{r.sub}</span>}
            </span>
            <button type="button" aria-label={`${rt('drawer.remove', lang)} ${r.title}`} onClick={r.remove} style={{ all: 'unset', cursor: 'pointer', fontSize: 10, padding: '2px 4px' }}>❌</button>
          </div>
        ))}
      </div>
    </div>,
    document.body,
  );
}
