// SocialButtons.jsx — v0.61.225
//
// Renders a row of up-to-3 brand-glyph buttons (Instagram, TikTok,
// Facebook, X, YouTube, Threads) under each Cuisine TMA ResultCard.
// Priority order: IG → TikTok → Facebook → X → YouTube → Threads.
// Each button opens the profile URL via Telegram.WebApp.openLink so
// the system browser (and the installed brand app's universal-link
// handler, if present) takes over from the in-app WebView.

import React from 'react';
import { tg } from '../../api/tg.js';

// Hand-rolled minimal monochrome SVG glyphs (~14px). Recognisable
// without depending on an icon library — keeps the TMA bundle slim.
const ICONS = {
  instagram: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M7 2C4.243 2 2 4.243 2 7v10c0 2.757 2.243 5 5 5h10c2.757 0 5-2.243 5-5V7c0-2.757-2.243-5-5-5H7zm10 2c1.654 0 3 1.346 3 3v10c0 1.654-1.346 3-3 3H7c-1.654 0-3-1.346-3-3V7c0-1.654 1.346-3 3-3h10zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6zm5-1.5a1 1 0 100 2 1 1 0 000-2z"/>
    </svg>
  ),
  tiktok: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M16 2v3.5a4.5 4.5 0 003.5 4.4V13a7.5 7.5 0 01-3.5-1V16a6 6 0 11-6-6h.5v3.5H10a2.5 2.5 0 102.5 2.5V2H16z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M14 4h3V1h-3c-2.21 0-4 1.79-4 4v3H7v3h3v10h3V11h3l1-3h-4V5c0-.55.45-1 1-1z"/>
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M17.53 3H21l-7.39 8.44L22 21h-6.84l-5.36-6.6L3.66 21H0l8.07-9.23L0 3h7.05l4.84 6.18L17.53 3z"/>
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M21.58 7.19a2.51 2.51 0 00-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42a2.51 2.51 0 00-1.77 1.77A26.18 26.18 0 002 12a26.18 26.18 0 00.42 4.81 2.51 2.51 0 001.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.51 2.51 0 001.77-1.77A26.18 26.18 0 0022 12a26.18 26.18 0 00-.42-4.81zM10 15V9l5 3-5 3z"/>
    </svg>
  ),
  threads: (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm.5-13a4 4 0 014 4v2h-2v-2a2 2 0 00-2-2h-1a3 3 0 100 6h.5v2H11a5 5 0 010-10h1.5z"/>
    </svg>
  )
};

const LABELS = {
  instagram: 'Instagram',
  tiktok:    'TikTok',
  facebook:  'Facebook',
  x:         'X',
  youtube:   'YouTube',
  threads:   'Threads'
};

// Priority + max-3 cap. Operator spec: "Max. 3 buttons (priority is
// IG, Tiktok, Facebook, then others)".
const PRIORITY = ['instagram', 'tiktok', 'facebook', 'x', 'youtube', 'threads'];
const MAX_BUTTONS = 3;

// v0.62.x — `bare`: when set, return just the brand buttons (no wrapper
// <div>) so the parent can place them on the SAME row as the Maps/Copy
// buttons (operator). Default keeps the standalone row for back-compat.
export default function SocialButtons({ profiles, bare = false }) {
  if (!profiles || typeof profiles !== 'object') return null;
  const picks = [];
  for (const key of PRIORITY) {
    if (profiles[key]) picks.push({ network: key, url: profiles[key] });
    if (picks.length >= MAX_BUTTONS) break;
  }
  if (!picks.length) return null;

  function open(e, url) {
    e.preventDefault();
    e.stopPropagation();
    const w = tg();
    if (w && typeof w.openLink === 'function') {
      w.openLink(url, { try_instant_view: false });
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  const buttons = picks.map(({ network, url }) => (
    <button
      key={network}
      type="button"
      onClick={(e) => open(e, url)}
      aria-label={LABELS[network]}
      title={LABELS[network]}
      className="text-[11px] px-2 py-0.5 rounded border border-tg-border bg-tg-bg flex items-center justify-center"
    >
      {ICONS[network]}
    </button>
  ));

  if (bare) return <>{buttons}</>;
  return <div className="flex gap-1.5 mt-1">{buttons}</div>;
}
