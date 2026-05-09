import React, { useState } from 'react';
import Tile from './components/Tile.jsx';
import { tg } from './tg.js';
import { t, useLocale } from './i18n.js';

// v0.60.51 — sectioned hub. Per Human Lead 2026-05-09, every
// public slash command (12 total per setMyCommands at index.js
// :5721-5738) should be reachable from the hub. Layout:
//   Eat       — Cuisine, Hawker, Recognised
//   Discover  — Search, Buddy, Weather
//   Plan      — Location, Drive+Carpark, Train, Incidents
//   Footer chips — Language, Privacy, Forget-me   (admin)
// Cuisine + Hawker stay 'navigate' (in-webview, no chat round-trip).
// Everything else POSTs to /api/menu-dispatch (v0.60.52) which
// validates initData and re-uses the server-side routeMenuCommand
// (index.js:2050) — same routing path /start <cmd> deep links use.
//
// v0.60.52 background: the v0.60.51 dispatch path used tg.sendData,
// which Telegram silently drops when the Mini App is launched via
// the chat menu button. The HTTPS endpoint sidesteps that and works
// on every platform.
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

const SECTIONS = [
  {
    id: 'eat',
    titleKey: 'section.eat',
    tiles: [
      { id: 'cuisine',    icon: '🍛', labelKey: 'tile.cuisine.label',    subKey: 'tile.cuisine.sub',    kind: 'navigate', path: '/app/cuisine' },
      { id: 'hawker',     icon: '🥢', labelKey: 'tile.hawker.label',     subKey: 'tile.hawker.sub',     kind: 'navigate', path: '/app/hawker' },
      { id: 'recognised', icon: '✳️', labelKey: 'tile.recognised.label', subKey: 'tile.recognised.sub', kind: 'dispatch' }
    ]
  },
  {
    id: 'discover',
    titleKey: 'section.discover',
    tiles: [
      { id: 'search',  icon: '🔍', labelKey: 'tile.search.label',  subKey: 'tile.search.sub',  kind: 'dispatch' },
      { id: 'buddy',   icon: '🤝', labelKey: 'tile.buddy.label',   subKey: 'tile.buddy.sub',   kind: 'dispatch' },
      { id: 'weather', icon: '🌇', labelKey: 'tile.weather.label', subKey: 'tile.weather.sub', kind: 'dispatch' }
    ]
  },
  {
    id: 'plan',
    titleKey: 'section.plan',
    tiles: [
      { id: 'location',  icon: '📍', labelKey: 'tile.location.label',  subKey: 'tile.location.sub',  kind: 'dispatch' },
      { id: 'drive',     icon: '🚦', labelKey: 'tile.drive.label',     subKey: 'tile.drive.sub',     kind: 'dispatch' },
      { id: 'train',     icon: '🚆', labelKey: 'tile.train.label',     subKey: 'tile.train.sub',     kind: 'dispatch' },
      { id: 'incidents', icon: '🚧', labelKey: 'tile.incidents.label', subKey: 'tile.incidents.sub', kind: 'dispatch' }
    ]
  }
];

const FOOTER_CHIPS = [
  { id: 'language', labelKey: 'chip.language' },
  { id: 'privacy',  labelKey: 'chip.privacy' },
  { id: 'forgetme', labelKey: 'chip.forgetme' }
];

export default function App() {
  const lang = useLocale();
  const [busy, setBusy] = useState(null);

  const dispatchCmd = async (cmd) => {
    const w = tg();
    if (!w) {
      alert('This menu only works inside Telegram.');
      return;
    }
    setBusy(cmd);
    try {
      const res = await fetch('/api/menu-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: w.initData || '', cmd })
      });
      if (!res.ok) {
        // Server rejected the dispatch — surface a Telegram-native
        // alert so the user knows nothing was sent. The TMA stays
        // open so they can retry.
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || `dispatch failed (${res.status})`;
        if (typeof w.showAlert === 'function') w.showAlert(msg);
        else alert(msg);
        setBusy(null);
        return;
      }
    } catch (err) {
      const msg = `dispatch failed: ${err?.message || 'network error'}`;
      if (typeof w.showAlert === 'function') w.showAlert(msg);
      else alert(msg);
      setBusy(null);
      return;
    }
    // Server accepted the dispatch and the bot will deliver the
    // result in chat. Close the TMA so the user lands directly on
    // the bot's reply rather than staring at a dead hub.
    if (typeof w.close === 'function') w.close();
    else setBusy(null);
  };

  const handle = (tile) => {
    if (tile.kind === 'navigate') {
      window.location.href = tile.path + (window.location.search || '');
      return;
    }
    dispatchCmd(tile.id);
  };

  return (
    <div
      className="flex flex-col"
      style={{
        // v0.59.20: Telegram-stable viewport height (avoids iPad gap).
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      <div className="px-3 pt-3 pb-2 flex items-center gap-2">
        {/* v0.37.0: soleat brand mark inline. Copied from web/cuisine/public/. */}
        <img src="/app/menu/soleat-icon.png" alt="soleat" width="28" height="28" className="rounded-full flex-shrink-0" />
        <div className="min-w-0 leading-tight">
          <h1 className="text-base font-semibold">{t('hero.title', lang)}</h1>
          <p className="text-[11px] text-tg-hint">{t('hero.tagline.line1', lang)}</p>
          <p className="text-[11px] text-tg-hint">{t('hero.tagline.line2', lang)}</p>
        </div>
      </div>

      <div className="flex-1 px-3 pb-2 flex flex-col gap-3">
        {SECTIONS.map((section) => (
          <section key={section.id} className="flex flex-col gap-1.5">
            <h2 className="text-[11px] uppercase tracking-wide text-tg-hint pl-1">
              {t(section.titleKey, lang)}
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {section.tiles.map((tile) => (
                <Tile
                  key={tile.id}
                  icon={tile.icon}
                  label={t(tile.labelKey, lang)}
                  sub={t(tile.subKey, lang)}
                  onClick={() => handle(tile)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="px-3 pb-2 flex flex-wrap gap-1.5 justify-center">
        {FOOTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => dispatchCmd(chip.id)}
            disabled={busy === chip.id}
            className="text-[11px] px-2.5 py-1 rounded-full bg-tg-card border border-tg-border text-tg-hint active:bg-tg-accent active:text-tg-accent-text transition disabled:opacity-60"
          >
            {t(chip.labelKey, lang)}
          </button>
        ))}
      </div>

      <div className="text-center text-[10px] text-tg-hint pb-3">
        {t('footer.brand', lang)} {BUILD_VERSION} · 2026
      </div>
    </div>
  );
}
