// ResumeStrip.jsx — v0.62.971. Spec: doc/Feature/2026-11-04-run-drawer-and-operating-hours.spec.md, C6-C8.
//
// The header alert band line for every listed train line or bus operator that is not running, in the operator's
// wording: "NSL Normal train operations will resume at 05:30" and "SBS Transit operations will resume at 05:45", with
// the date when it is not today. Its ✕ hides it until the set of lines changes.
import React, { useEffect, useState } from 'react';
import { ot } from '../lib/outside-now-i18n.js';

export default function ResumeStrip({ lines = [], lang = 'en', className = '' }) {
  const key = lines.join('|');
  const [hiddenFor, setHiddenFor] = useState(null);
  useEffect(() => { if (hiddenFor !== null && hiddenFor !== key) setHiddenFor(null); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!lines.length || hiddenFor === key) return null;
  return (
    <div role="status" data-resume-strip={lines.length} className={className}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '6px 8px 0', padding: '7px 10px', borderRadius: 10, fontSize: 12, lineHeight: 1.35, background: '#fff4d6', color: '#7a5200' }}>
      <span aria-hidden="true">🕔</span>
      <span style={{ flex: 1, minWidth: 0 }}>{lines.map((l) => <span key={l} style={{ display: 'block' }}>{l}</span>)}</span>
      <button type="button" aria-label={ot('ui.dismiss', lang)} onClick={() => setHiddenFor(key)} style={{ all: 'unset', cursor: 'pointer', padding: '0 2px 0 4px', fontSize: 14, opacity: 0.7 }}>✕</button>
    </div>
  );
}
