// FooterRunButtons.jsx — v0.62.971. Spec: doc/Feature/2026-11-04-run-drawer-and-operating-hours.spec.md, C4.
//
// A small emoji button, 🚍 n, that sits in each app's existing footer row just before its back button while bus stops
// are listed (operator, 04-11 '26: "the bus emoji and train emoji before the back"). It opens the run drawer; tapping
// it again closes it. It replaced the chip row of v0.62.969 and v0.62.970, so the footer keeps its height.
// v0.62.990 — spec 2026-11-12-remove-simulate-smooth-buses-shared-route, B1/J6: the 🚇 button went with Simulate.
import React, { useEffect, useState } from 'react';
import { runButtonsModel } from '../lib/run-state.js';
import RunDrawer from './RunDrawer.jsx';

export default function FooterRunButtons({ stopBuses, lang = 'en' }) {
  const [open, setOpen] = useState(false);
  const m = runButtonsModel({ stops: stopBuses?.stops || [] });
  useEffect(() => { if (open && !m.bus) setOpen(false); }, [open, !!m.bus]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!m.bus) return null;
  const btn = { all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, lineHeight: '26px', height: 26, padding: '0 6px', borderRadius: 13, whiteSpace: 'nowrap' };
  const on = { background: 'var(--tg-theme-secondary-bg-color, #eef1f5)' };
  return (
    <>
      <button type="button" data-run-button="buses" aria-expanded={open} onClick={() => setOpen((o) => !o)} style={{ ...btn, ...(open ? on : {}) }}>{m.bus}</button>
      {open && <RunDrawer stopBuses={stopBuses} lang={lang} onClose={() => setOpen(false)} />}
    </>
  );
}
