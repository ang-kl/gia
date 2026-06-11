import React from 'react';
import { t } from '../i18n.js';

// v0.60.55 — always-visible compact train panel at top of the PLAN
// section. Status text + timestamp come from /api/menu/live
// (Redis-only, no extra LTA call).
//
// v0.60.58 — 2-row layout per Human Lead 2026-05-09 ("Train status
// is hidden in the menu"). Previously the panel was a single
// horizontal row holding 🚆 + title + status + 2 buttons; on phone
// widths the buttons consumed the right half and the status row
// was truncated to "🟢 All lines normal · 9:…". Splitting status
// (top row) and buttons (bottom row) gives the status full width
// and lets the timestamp render in full.
export default function TrainPanel({ live, lang, onFullStatus }) {
  const code = live?.code || null;
  const updatedAt = live?.updatedAt || null;
  const statusKey = code ? `tile.train.live.${code}` : 'tile.train.live.warmup';
  return (
    <div className="rounded-md bg-tg-card border border-tg-border p-2 flex flex-col gap-1.5">
      <div className="flex items-center gap-2 leading-tight">
        <div className="text-lg flex-shrink-0">🚆</div>
        <div className="text-[13px] font-semibold flex-shrink-0">{t('panel.train.title', lang)}</div>
        <div className="text-[11px] text-tg-hint truncate min-w-0">
          {t(statusKey, lang)}
          {updatedAt ? ` · ${updatedAt}` : ''}
        </div>
      </div>
      <div className="flex gap-1.5">
        <a
          href="/app/transport"
          className="flex-1 text-[12px] px-2 py-1 rounded-t-md rounded-b-[12px] border border-tg-border bg-tg-bg text-center active:bg-tg-accent active:text-tg-accent-text transition"
        >
          🗺 {t('panel.train.map', lang)}
        </a>
        <button
          type="button"
          onClick={onFullStatus}
          className="flex-1 text-[12px] px-2 py-1 rounded-t-md rounded-b-[12px] border border-tg-border bg-tg-bg text-center active:bg-tg-accent active:text-tg-accent-text transition"
        >
          💬 {t('panel.train.more', lang)}
        </button>
      </div>
    </div>
  );
}
