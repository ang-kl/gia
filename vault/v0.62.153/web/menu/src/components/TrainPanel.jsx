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
  // v0.62.137 — operator: "the train area looks awful." Rebuilt as a
  // neo-skeuomorphic card matching the Cuisine TMA language: a raised frosted
  // surface (.skeuo-card), the live status recessed into a debossed inset
  // strip (.skeuo-inset), and the Map/More actions as raised glass pills
  // (.skeuo-pill) that press in on tap. The deliberate 2-row layout (status
  // full-width on top, buttons below — v0.60.58) is preserved so the status
  // line never truncates on phone widths.
  return (
    <div className="skeuo-card rounded-xl border border-tg-border/60 p-2.5 flex flex-col gap-2">
      <div className="flex items-center gap-2 leading-tight">
        <span className="text-lg flex-shrink-0" aria-hidden>🚆</span>
        <span className="text-[13px] font-semibold">{t('panel.train.title', lang)}</span>
      </div>
      <div className="skeuo-inset rounded-lg px-2.5 py-1.5 text-[11px] text-tg-hint leading-tight">
        {t(statusKey, lang)}
        {updatedAt ? ` · ${updatedAt}` : ''}
      </div>
      <div className="flex gap-2">
        <a
          href="/app/transport"
          className="skeuo-pill flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-tg-border/60 text-tg-text text-center transition"
        >
          🗺 {t('panel.train.map', lang)}
        </a>
        <button
          type="button"
          onClick={onFullStatus}
          className="skeuo-pill flex-1 text-[12px] px-2 py-1.5 rounded-lg border border-tg-border/60 text-tg-text text-center transition"
        >
          💬 {t('panel.train.more', lang)}
        </button>
      </div>
    </div>
  );
}
