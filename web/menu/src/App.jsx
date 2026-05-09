import React, { useEffect, useState } from 'react';
import Tile from './components/Tile.jsx';
import TrainPanel from './components/TrainPanel.jsx';
import { tg } from './tg.js';
import { t, useLocale } from './i18n.js';

// v0.60.55 — hub redesign per Human Lead 2026-05-09 ("still big,
// half the size"). Tiles drop sub-text and switch to a 3-column
// grid; section gaps tighten. The Train tile is replaced by an
// always-visible TrainPanel inside the PLAN section that shows the
// cached LTA status and a one-tap shortcut to the MRT map TMA.
//
// Cuisine + Hawker stay 'navigate' (in-webview, no chat round-trip).
// Everything else POSTs to /api/menu-dispatch (v0.60.52) which
// validates initData and re-uses the server-side routeMenuCommand
// (index.js:2050) — same routing path /start <cmd> deep links use.
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

const SECTIONS = [
  {
    id: 'eat',
    titleKey: 'section.eat',
    tiles: [
      { id: 'cuisine',    icon: '🍛', labelKey: 'tile.cuisine.label',    kind: 'navigate', path: '/app/cuisine' },
      { id: 'hawker',     icon: '🥢', labelKey: 'tile.hawker.label',     kind: 'navigate', path: '/app/hawker' },
      { id: 'recognised', icon: '✳️', labelKey: 'tile.recognised.label', kind: 'dispatch' }
    ]
  },
  {
    id: 'discover',
    titleKey: 'section.discover',
    tiles: [
      { id: 'search',  icon: '🔍', labelKey: 'tile.search.label',  kind: 'dispatch' },
      { id: 'buddy',   icon: '🤝', labelKey: 'tile.buddy.label',   kind: 'dispatch' },
      { id: 'weather', icon: '🌇', labelKey: 'tile.weather.label', kind: 'dispatch' }
    ]
  },
  {
    id: 'plan',
    titleKey: 'section.plan',
    // v0.60.55 — train moved out into the inline TrainPanel above
    // these tiles, so the grid here is just Location / Drive /
    // Incidents and stays balanced at 3 columns.
    tiles: [
      { id: 'location',  icon: '📍', labelKey: 'tile.location.label',  kind: 'dispatch' },
      { id: 'drive',     icon: '🚦', labelKey: 'tile.drive.label',     kind: 'dispatch' },
      { id: 'incidents', icon: '🚧', labelKey: 'tile.incidents.label', kind: 'dispatch' }
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
  // v0.60.54 / v0.60.55 — fetch cached LTA train status once on
  // mount. Endpoint reads Redis only, so no extra LTA roundtrip.
  const [live, setLive] = useState({ code: null, updatedAt: null });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/menu/live')
      .then((r) => r.ok ? r.json() : null)
      .then((b) => {
        if (cancelled) return;
        setLive({
          code: b?.train?.code || null,
          updatedAt: b?.train?.updatedAt || null
        });
      })
      .catch(() => { /* silent — panel just shows warmup label */ });
    return () => { cancelled = true; };
  }, []);

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
        minHeight: 'var(--tg-viewport-stable-height, 100vh)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      <div className="px-3 pt-2 pb-1.5 flex items-center gap-2">
        <img src="/app/menu/soleat-icon.png" alt="soleat" width="24" height="24" className="rounded-full flex-shrink-0" />
        <div className="min-w-0 leading-tight">
          <h1 className="text-sm font-semibold">{t('hero.title', lang)}</h1>
          <p className="text-[10px] text-tg-hint">
            {t('hero.tagline.line1', lang)} · {t('hero.tagline.line2', lang)}
          </p>
        </div>
      </div>

      <div className="flex-1 px-3 pb-2 flex flex-col gap-1.5">
        {SECTIONS.map((section) => (
          <section key={section.id} className="flex flex-col gap-1">
            <h2 className="text-[10px] uppercase tracking-wide text-tg-hint pl-1">
              {t(section.titleKey, lang)}
            </h2>
            {section.id === 'plan' && (
              <TrainPanel
                live={live}
                lang={lang}
                onFullStatus={() => dispatchCmd('train')}
              />
            )}
            <div className="grid grid-cols-3 gap-1.5">
              {section.tiles.map((tile) => (
                <Tile
                  key={tile.id}
                  icon={tile.icon}
                  label={t(tile.labelKey, lang)}
                  onClick={() => handle(tile)}
                />
              ))}
            </div>
          </section>
        ))}
        <p className="text-[10px] text-tg-hint text-center pt-0.5 px-2 leading-snug">
          {t('hint.tap', lang)}
        </p>
      </div>

      <div className="px-3 pb-1.5 flex flex-wrap gap-1.5 justify-center">
        {FOOTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => dispatchCmd(chip.id)}
            disabled={busy === chip.id}
            className="text-[10px] px-2 py-0.5 rounded-full bg-tg-card border border-tg-border text-tg-hint active:bg-tg-accent active:text-tg-accent-text transition disabled:opacity-60"
          >
            {t(chip.labelKey, lang)}
          </button>
        ))}
      </div>

      <div className="text-center text-[9px] text-tg-hint pb-2">
        {t('footer.brand', lang)} {BUILD_VERSION} · 2026
      </div>
    </div>
  );
}
