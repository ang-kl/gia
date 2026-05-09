import React from 'react';
import Tile from './components/Tile.jsx';
import { sendData } from './tg.js';
import { t, useLocale } from './i18n.js';

// v0.60.51 — sectioned hub. Per Human Lead 2026-05-09, every
// public slash command (12 total per setMyCommands at index.js
// :5721-5738) should be reachable from the hub. Layout:
//   Eat       — Cuisine, Hawker, Recognised
//   Discover  — Search, Buddy, Weather
//   Plan      — Location, Drive+Carpark, Train, Incidents
//   Footer chips — Language, Privacy, Forget-me   (admin)
// Cuisine + Hawker stay 'navigate' (in-webview, no chat round-trip).
// Everything else dispatches via sendData → routeMenuCommand on the
// server (index.js:2050).
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

const SECTIONS = [
  {
    id: 'eat',
    titleKey: 'section.eat',
    tiles: [
      { id: 'cuisine',    icon: '🍛', labelKey: 'tile.cuisine.label',    subKey: 'tile.cuisine.sub',    kind: 'navigate', path: '/app/cuisine' },
      { id: 'hawker',     icon: '🥢', labelKey: 'tile.hawker.label',     subKey: 'tile.hawker.sub',     kind: 'navigate', path: '/app/hawker' },
      { id: 'recognised', icon: '✳️', labelKey: 'tile.recognised.label', subKey: 'tile.recognised.sub', kind: 'sendData' }
    ]
  },
  {
    id: 'discover',
    titleKey: 'section.discover',
    tiles: [
      { id: 'search',  icon: '🔍', labelKey: 'tile.search.label',  subKey: 'tile.search.sub',  kind: 'sendData' },
      { id: 'buddy',   icon: '🤝', labelKey: 'tile.buddy.label',   subKey: 'tile.buddy.sub',   kind: 'sendData' },
      { id: 'weather', icon: '🌇', labelKey: 'tile.weather.label', subKey: 'tile.weather.sub', kind: 'sendData' }
    ]
  },
  {
    id: 'plan',
    titleKey: 'section.plan',
    tiles: [
      { id: 'location',  icon: '📍', labelKey: 'tile.location.label',  subKey: 'tile.location.sub',  kind: 'sendData' },
      { id: 'drive',     icon: '🚦', labelKey: 'tile.drive.label',     subKey: 'tile.drive.sub',     kind: 'sendData' },
      { id: 'train',     icon: '🚆', labelKey: 'tile.train.label',     subKey: 'tile.train.sub',     kind: 'sendData' },
      { id: 'incidents', icon: '🚧', labelKey: 'tile.incidents.label', subKey: 'tile.incidents.sub', kind: 'sendData' }
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

  const handle = (tile) => {
    if (tile.kind === 'navigate') {
      window.location.href = tile.path + (window.location.search || '');
      return;
    }
    sendData({ cmd: tile.id });
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
            onClick={() => sendData({ cmd: chip.id })}
            className="text-[11px] px-2.5 py-1 rounded-full bg-tg-card border border-tg-border text-tg-hint active:bg-tg-accent active:text-tg-accent-text transition"
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
