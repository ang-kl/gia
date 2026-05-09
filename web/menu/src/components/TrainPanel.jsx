import React from 'react';
import { t } from '../i18n.js';

// v0.60.55 — always-visible compact train panel at top of the PLAN
// section. Replaces the v0.60.54 Train tile-with-extra-line so users
// see status + reach MRT map without leaving the hub. Status text +
// timestamp come from /api/menu/live (Redis-only, no extra LTA call).
export default function TrainPanel({ live, lang, onFullStatus }) {
  const code = live?.code || null;
  const updatedAt = live?.updatedAt || null;
  const statusKey = code ? `tile.train.live.${code}` : 'tile.train.live.warmup';
  return (
    <div className="rounded-md bg-tg-card border border-tg-border p-2 flex items-center gap-2">
      <div className="text-xl leading-none flex-shrink-0">🚆</div>
      <div className="flex-1 min-w-0 leading-tight">
        <div className="text-[12px] font-semibold">{t('panel.train.title', lang)}</div>
        <div className="text-[10px] text-tg-hint truncate">
          {t(statusKey, lang)}
          {updatedAt ? ` · ${updatedAt}` : ''}
        </div>
      </div>
      <a
        href="/app/transport"
        className="text-[11px] px-2 py-1 rounded border border-tg-border bg-tg-bg active:bg-tg-accent active:text-tg-accent-text transition whitespace-nowrap"
      >
        🗺 {t('panel.train.map', lang)}
      </a>
      <button
        type="button"
        onClick={onFullStatus}
        className="text-[11px] px-2 py-1 rounded border border-tg-border bg-tg-bg active:bg-tg-accent active:text-tg-accent-text transition whitespace-nowrap"
      >
        💬 {t('panel.train.more', lang)}
      </button>
    </div>
  );
}
