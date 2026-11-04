// SimCaptionStrip.jsx — v0.62.970. Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-hawker-cuisine.spec.md,
// C4. The Train app's header caption (v0.62.966), shared with Hawker and Cuisine: while simulated trains run, the
// header says so, and its own reason line says why nothing is drawn. Its ✕ hides the caption only; it comes back the
// next time trains start. The Train app keeps its own copy this release (C6).
import React, { useEffect, useState } from 'react';
import { simStripModel } from '../lib/train-sim.js';
import { ot } from '../lib/outside-now-i18n.js';

export default function SimCaptionStrip({ on, status, lang = 'en', className = '' }) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => { if (on) setHidden(false); }, [on]);
  if (!on || hidden) return null;
  const m = simStripModel({ status, lang });
  // v0.62.975 — nothing while trains run; one reason line while none do (FR24 spec, amendment 3).
  if (!m) return null;
  return (
    <div role={m.role} data-sim-strip={m['data-sim-strip']} className={className} style={m.style}>
      <span aria-hidden="true">{m.icon}</span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block' }}>{m.lines[0]}</span>
      </span>
      <button type="button" aria-label={ot('ui.dismiss', lang)} onClick={() => setHidden(true)} style={{ all: 'unset', cursor: 'pointer', padding: '0 2px 0 4px', fontSize: 14, opacity: 0.7 }}>✕</button>
    </div>
  );
}
