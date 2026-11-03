// FooterRunChips.jsx — v0.62.970. Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-hawker-cuisine.spec.md,
// C5. The Train app's footer run chips (v0.62.969), shared with Hawker and Cuisine: a 🚆 chip while simulated trains
// run and a 🚌 chip while a stop view runs, each opening a short list above the footer with a ✕ per line or service
// and Stop all. The Train app keeps its own copy this release (C6).
import React, { useEffect, useState } from 'react';
import { simFooterModel } from '../lib/train-sim.js';
import { stopFooterModel } from '../lib/stop-buses.js';
import { ot } from '../lib/outside-now-i18n.js';

export default function FooterRunChips({ trains, stopBuses, lang = 'en' }) {
  const [open, setOpen] = useState(null);
  const tm = trains ? simFooterModel({ lines: trains.lines, lang }) : null;
  const bm = stopBuses ? stopFooterModel({ ...stopBuses, lang }) : null;
  useEffect(() => { if ((open === 'trains' && !tm) || (open === 'buses' && !bm)) setOpen(null); }, [open, !!tm, !!bm]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!tm && !bm) return null;
  const chip = { all: 'unset', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999, background: 'var(--tg-theme-secondary-bg-color, #eef1f5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, maxWidth: '60%' };
  const x = { all: 'unset', cursor: 'pointer', padding: '0 4px', fontSize: 14, opacity: 0.7 };
  const list = open === 'trains' && tm
    ? { items: tm.items.map((i) => ({ key: i.code, label: i.label, sub: i.reason, remove: () => trains.remove?.(i.code) })), stopAll: () => { trains.stopAll?.(); setOpen(null); }, stopAllText: tm.stopAll }
    : open === 'buses' && bm
      ? { items: bm.items.map((i) => ({ key: i.service, label: `🚌 ${i.label}`, sub: '', remove: () => stopBuses.remove?.(i.service) })), stopAll: () => { stopBuses.stopAll?.(); setOpen(null); }, stopAllText: bm.stopAll }
      : null;
  return (
    <div data-run-chips="" style={{ position: 'relative', display: 'flex', gap: 6, minWidth: 0 }}>
      {tm && <button type="button" data-run-chip="trains" aria-expanded={open === 'trains'} onClick={() => setOpen((o) => (o === 'trains' ? null : 'trains'))} style={chip}>{tm.chip}</button>}
      {bm && <button type="button" data-run-chip="buses" aria-expanded={open === 'buses'} onClick={() => setOpen((o) => (o === 'buses' ? null : 'buses'))} style={chip}>{bm.chip}</button>}
      {list && (
        <div data-run-list={open} role="dialog" style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, minWidth: 190, maxHeight: 260, overflowY: 'auto', background: 'var(--tg-theme-bg-color, #fff)', color: 'var(--tg-theme-text-color, #111)', border: '1px solid rgba(0,0,0,.12)', borderRadius: 10, boxShadow: '0 4px 14px rgba(0,0,0,.18)', padding: 6, fontSize: 12 }}>
          {list.items.map((i) => (
            <div key={i.key} data-run-item={i.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px' }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontWeight: 600 }}>{i.label}</span>
                {i.sub && <span style={{ display: 'block', fontSize: 10, opacity: 0.7 }}>{i.sub}</span>}
              </span>
              <button type="button" aria-label={`${ot('ui.dismiss', lang)} ${i.key}`} onClick={i.remove} style={x}>✕</button>
            </div>
          ))}
          <button type="button" data-run-stop-all="" onClick={list.stopAll} style={{ all: 'unset', cursor: 'pointer', display: 'block', width: '100%', textAlign: 'center', marginTop: 4, padding: '5px 0', borderTop: '1px solid rgba(0,0,0,.08)', fontWeight: 600, color: '#c0392b' }}>{list.stopAllText}</button>
        </div>
      )}
    </div>
  );
}
