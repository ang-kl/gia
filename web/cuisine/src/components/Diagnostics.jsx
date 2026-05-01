import React, { useState } from 'react';

// Collapsible diagnostic panel. Auto-opens whenever the latest entry is
// not OK, otherwise stays collapsed behind a small "🔧 N steps" toggle.

export default function Diagnostics({ entries }) {
  const [open, setOpen] = useState(false);
  if (!entries.length) return null;
  const lastBad = entries.find((e) => e.ok === false);
  const shouldShow = open || !!lastBad;
  const label = lastBad
    ? `🔧 Diagnostics — ${lastBad.code} failed`
    : `🔧 Diagnostics — ${entries.length} steps`;
  return (
    <div className="border border-tg-border rounded-md bg-tg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className={'w-full flex justify-between items-center px-2.5 py-1.5 text-[11px] ' + (lastBad ? 'text-red-400' : 'text-tg-hint')}
      >
        <span>{label}</span>
        <span>{shouldShow ? '▾' : '▸'}</span>
      </button>
      {shouldShow && (
        <div className="px-2.5 pb-2 flex flex-col gap-0.5 max-h-60 overflow-auto">
          {entries.map((e) => (
            <div key={e.seq} className="text-[10px] leading-snug font-mono">
              <span className={e.ok ? 'text-tg-hint' : 'text-red-400'}>
                {e.ok ? '✓' : '✗'} {e.code}
              </span>
              {' '}{e.label}
              {e.detail != null && (
                <span className="text-tg-hint"> · {typeof e.detail === 'string' ? e.detail : JSON.stringify(e.detail)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
