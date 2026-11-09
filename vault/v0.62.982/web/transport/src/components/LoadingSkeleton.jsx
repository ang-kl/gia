// LoadingSkeleton.jsx — v0.62.636 (UI professionalisation, Phase C1)
//
// A skeleton screen shown while /api/transport/status is in flight, replacing the
// bare "Loading…" line. It mirrors the real app shell — header card, a row of
// line-pill placeholders, the big map area, and a couple of station-card
// placeholders — so the layout doesn't jump when data lands. All shimmer blocks
// use the shared `.gia-skeleton` class (styles.css), which self-disables under
// prefers-reduced-motion.
import React from 'react';

const fixedShellStyle = {
  paddingTop: 'var(--tg-content-safe-area-inset-top, env(safe-area-inset-top, 0px))',
  paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))'
};

export default function LoadingSkeleton() {
  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-tg-bg text-tg-text"
      style={fixedShellStyle}
      role="status"
      aria-label="Loading"
    >
      {/* Header card */}
      <div className="px-3 pt-2 shrink-0">
        <div className="skeuo-card rounded-2xl px-3 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="gia-skeleton h-4 w-40" />
            <div className="gia-skeleton h-3 w-16" />
          </div>
          <div className="gia-skeleton h-3 w-28" />
          {/* line pills */}
          <div className="flex gap-2 overflow-hidden pt-0.5">
            {[72, 132, 156, 120].map((w, i) => (
              <div key={i} className="gia-skeleton h-8 rounded-xl shrink-0" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
      {/* Map area */}
      <div className="flex-1 min-h-0 px-3 pt-2 pb-1">
        <div className="gia-skeleton h-full w-full rounded-2xl" />
      </div>
      {/* Bottom card placeholders (mirrors the floating carousel) */}
      <div className="px-3 pb-2 flex gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="gia-skeleton h-16 rounded-xl flex-1" style={{ opacity: 1 - i * 0.25 }} />
        ))}
      </div>
    </div>
  );
}
