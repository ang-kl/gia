// FooterRunButtons.jsx — v0.62.971. Spec: doc/Feature/2026-11-04-run-drawer-and-operating-hours.spec.md, C4.
//
// Two small emoji buttons, 🚇 n and 🚍 n, that sit in each app's existing footer row just before its back button
// while stations or bus stops are listed (operator, 04-11 '26: "the bus emoji and train emoji before the back").
// Each opens the run drawer for its kind; tapping the open one again closes it. They replace the chip row of
// v0.62.969 and v0.62.970, so the footer keeps its height.
import React, { useEffect, useState } from 'react';
import { runButtonsModel } from '../lib/run-state.js';
import RunDrawer from './RunDrawer.jsx';

export default function FooterRunButtons({ trains, stopBuses, lang = 'en' }) {
  const [open, setOpen] = useState(null);
  const m = runButtonsModel({ stations: trains?.stations || [], stops: stopBuses?.stops || [] });
  useEffect(() => { if ((open === 'trains' && !m.train) || (open === 'buses' && !m.bus)) setOpen(null); }, [open, !!m.train, !!m.bus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m.train && !m.bus) return null;
  const btn = { all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, lineHeight: '26px', height: 26, padding: '0 6px', borderRadius: 13, whiteSpace: 'nowrap' };
  const on = { background: 'var(--tg-theme-secondary-bg-color, #eef1f5)' };
  return (
    <>
      {m.train && <button type="button" data-run-button="trains" aria-expanded={open === 'trains'} onClick={() => setOpen((o) => (o === 'trains' ? null : 'trains'))} style={{ ...btn, ...(open === 'trains' ? on : {}) }}>{m.train}</button>}
      {m.bus && <button type="button" data-run-button="buses" aria-expanded={open === 'buses'} onClick={() => setOpen((o) => (o === 'buses' ? null : 'buses'))} style={{ ...btn, ...(open === 'buses' ? on : {}) }}>{m.bus}</button>}
      {open && <RunDrawer kind={open} trains={trains} stopBuses={stopBuses} lang={lang} onClose={() => setOpen(null)} />}
    </>
  );
}
