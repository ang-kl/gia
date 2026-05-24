import React, { useEffect, useState } from 'react';
import Tile from './components/Tile.jsx';
import TrainPanel from './components/TrainPanel.jsx';
import BackFab from './components/BackFab.jsx';
import LocaleToggle from './components/LocaleToggle.jsx';
import LocationFieldMenu from './components/LocationFieldMenu.jsx';
import { tg } from './tg.js';
import { t, useLocale } from './i18n.js';

// v0.61.123 — tiles that don't work outside Singapore. When the user
// has anchored to JB or IOI Resort City Putrajaya (region 'JB' or
// 'MY-PUT'), App.jsx flips these to disabled with the
// `tile.disabledMy` tooltip.
const SG_ONLY_TILES = new Set(['hawker', 'incidents', 'busnearest', 'weather']);

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

// v0.60.67 — operator slim: Buddy / Recognised / Location / Drive /
// Plan-route tiles dropped (still reachable via slash commands; the
// hub focuses on the most-used surfaces). Each section now renders
// 2 tiles in a grid-cols-2 layout.
const SECTIONS = [
  {
    id: 'eat',
    titleKey: 'section.eat',
    tiles: [
      { id: 'cuisine', icon: '🍛', iconImage: '/app/menu/cuisine-icon.png', labelKey: 'tile.cuisine.label', kind: 'navigate', path: '/app/cuisine' },
      { id: 'hawker',  icon: '🥢', iconImage: '/app/menu/hawker-icon.png',  labelKey: 'tile.hawker.label',  kind: 'navigate', path: '/app/hawker' }
    ]
  },
  {
    id: 'discover',
    titleKey: 'section.discover',
    tiles: [
      { id: 'search',  icon: '🔍', iconImage: '/app/menu/search-icon.png', labelKey: 'tile.search.label',  kind: 'dispatch' },
      { id: 'weather', icon: '🌇', labelKey: 'tile.weather.label', kind: 'dispatch' }
    ]
  },
  {
    id: 'plan',
    titleKey: 'section.plan',
    tiles: [
      { id: 'incidents',  icon: '🚧', labelKey: 'tile.incidents.label',  kind: 'dispatch' },
      { id: 'busnearest', icon: '🚏', iconImage: '/app/menu/bus-icon.png', labelKey: 'tile.busNearest.label', kind: 'dispatch' }
    ]
  }
];

// v0.60.62 — `language` chip removed; replaced by inline LocaleToggle
// (the chip dispatched a `language` cmd that routeMenuCommand never
// handled, so it was a silent no-op).
const FOOTER_CHIPS = [
  { id: 'privacy',  labelKey: 'chip.privacy' },
  { id: 'forgetme', labelKey: 'chip.forgetme' }
];

export default function App() {
  const lang = useLocale();
  // v0.60.60 — track at-bottom for the scroll FAB navigation
  // standardised across all four TMAs.
  const [atBottom, setAtBottom] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      const reached = (window.scrollY || 0) + window.innerHeight;
      const fullH = document.documentElement.scrollHeight;
      setAtBottom(reached >= fullH - 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
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

  // v0.61.123 — cached user-location anchor (region + radiusCapM +
  // label) for the LocationFieldMenu summary line + disabled-tile
  // logic. Reuses /api/cuisine/user-location (existing initData-gated
  // read). Null when unset / stale.
  const [anchor, setAnchor] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const w = tg();
    if (!w) return;
    fetch('/api/cuisine/user-location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: w.initData || '' })
    })
      .then((r) => r.ok ? r.json() : null)
      .then((b) => {
        if (cancelled || !b) return;
        if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) {
          setAnchor({
            label: b.label || null,
            lat: b.lat,
            lng: b.lng,
            region: b.region || 'SG',
            radiusCapM: b.radiusCapM || null
          });
        }
      })
      .catch(() => { /* silent — anchor stays null */ });
    return () => { cancelled = true; };
  }, []);

  const isMy = anchor && (anchor.region === 'JB' || anchor.region === 'MY-PUT');

  // v0.60.67 — fire-and-forget. Per Human Lead 2026-05-10, the TMA
  // wasn't closing immediately after a dispatch tap (Incidents,
  // Location, …). Root cause: prior implementation awaited the fetch
  // before calling w.close(), so any sluggish round-trip kept the
  // hub visible. The /api/menu-dispatch endpoint already returns 202
  // synchronously and runs the actual command in the background
  // (the bot delivers output via sendMessage, not the HTTP body) —
  // so we can fire the request and close the WebApp on the same
  // tick. Errors surface server-side via console + bot fallback
  // sendMessage; the user sees them in chat after the TMA collapses.
  //
  // v0.60.69 — keepalive:true so Telegram's webview tear-down on
  // close() doesn't abort the request before bytes hit the wire
  // (Codex review 2026-05-10). The 64 KB keepalive cap is not a
  // concern — payload is initData + cmd, well under 1 KB.
  const dispatchCmd = (cmd) => {
    const w = tg();
    if (!w) {
      alert('This menu only works inside Telegram.');
      return;
    }
    fetch('/api/menu-dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: w.initData || '', cmd }),
      keepalive: true
    }).catch(() => { /* logged server-side; user sees fallback in chat */ });
    if (typeof w.close === 'function') w.close();
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
      {/* v0.60.67 — hero rework: LocaleToggle moved out of the footer
          and lives at the right end of the subtitle row, so the
          language flip is reachable without scrolling to the bottom.
          A new sub-tagline ("Explore Singapore's 50+ cuisines beyond
          familiar favourites") sits below the existing "Solo eat ·
          So let's eat" line to pitch the catalogue breadth. */}
      <div className="px-3 pt-2 pb-1.5 flex items-start gap-2">
        <img src="/app/menu/soleat-icon.png" alt="soleat" width="24" height="24" className="rounded-full flex-shrink-0 mt-0.5" />
        <div className="min-w-0 leading-tight flex-1">
          <h1 className="text-sm font-semibold">{t('hero.title', lang)}</h1>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-tg-hint truncate">
              {t('hero.tagline.line1', lang)} · {t('hero.tagline.line2', lang)}
            </p>
            <LocaleToggle />
          </div>
          <p className="text-[10px] text-tg-hint leading-snug pt-0.5">
            {t('hero.subtagline', lang)}
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
              <>
                {/* v0.61.123 — location anchor picker, sits ABOVE the
                    TrainPanel inside the Plan section so the user sees
                    "what's my search anchored to" before the SG-only
                    live status. */}
                <LocationFieldMenu
                  lang={lang}
                  currentAnchor={anchor}
                  onAnchorChange={setAnchor}
                />
                {/* TrainPanel is SG-only — grey it out when a Malaysia
                    anchor is set. Done via an opacity wrapper since
                    TrainPanel takes no disabled prop. */}
                <div
                  style={isMy ? { opacity: 0.4, pointerEvents: 'none' } : {}}
                  title={isMy ? t('tile.disabledMy', lang) : undefined}
                >
                  <TrainPanel
                    live={live}
                    lang={lang}
                    onFullStatus={() => dispatchCmd('train')}
                  />
                </div>
              </>
            )}
            {/* v0.60.67 — each section now carries 2 tiles after the
                operator slim, so grid drops from 3 cols to 2 cols
                (each tile gets ~170 px on a 375 px phone).
                v0.61.123 — SG-only tiles flip to disabled when a
                Malaysia anchor is set. */}
            <div className="grid grid-cols-2 gap-1.5">
              {section.tiles.map((tile) => {
                const disabled = isMy && SG_ONLY_TILES.has(tile.id);
                return (
                  <Tile
                    key={tile.id}
                    icon={tile.icon}
                    iconImage={tile.iconImage}
                    label={t(tile.labelKey, lang)}
                    onClick={() => handle(tile)}
                    disabled={disabled}
                    disabledTooltip={disabled ? t('tile.disabledMy', lang) : ''}
                  />
                );
              })}
            </div>
          </section>
        ))}
        <p className="text-[10px] text-tg-hint text-center pt-0.5 px-2 leading-snug">
          {t('hint.tap', lang)}
        </p>
      </div>

      {/* v0.60.67 — LocaleToggle moved to the hero subtitle row, so
          the footer trims down to just Privacy + Forget me chips. */}
      <div className="px-3 pb-1.5 flex flex-wrap gap-1.5 justify-center items-center">
        {FOOTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            onClick={() => dispatchCmd(chip.id)}
            className="text-[10px] px-2 py-0.5 rounded-full bg-tg-card border border-tg-border text-tg-hint active:bg-tg-accent active:text-tg-accent-text transition"
          >
            {t(chip.labelKey, lang)}
          </button>
        ))}
      </div>

      {/* v0.60.213 — standardised "Experimental · Singapore · v<build>"
          tag line. v0.60.217 — no border; font +1pt.
          v0.60.222 — operator: dropped the "Soleat <v> · 2026" brand
          line; the tag line is the whole footer now. */}
      <div className="mx-2 mb-2 mt-1 px-3 py-2 text-center text-[9px] text-tg-hint leading-tight">
        <div>{t('footer.tag', lang)} · v{BUILD_VERSION}</div>
      </div>

      <BackFab />

      {/* v0.60.96 — scroll FAB. Standardised across all four TMAs
          per operator: bottom-right, aqua, text label "⇣ down" /
          "⇡ top" toggled by atBottom state. */}
      <button
        type="button"
        onClick={() => window.scrollTo({
          top: atBottom ? 0 : window.scrollY + window.innerHeight,
          behavior: 'smooth'
        })}
        aria-label={atBottom ? t('btn.fabTopAria', lang) : t('btn.fabDownAria', lang)}
        style={{ backgroundColor: '#7FDBDB', color: '#1c1c1f', bottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
        className="fixed right-4 px-1.5 h-7 rounded-t-md rounded-b-[14px] border border-tg-border shadow-md text-[10px] font-semibold flex items-center justify-center gap-1 active:scale-95 z-50 whitespace-nowrap"
      >{atBottom ? t('btn.fabTop', lang) : t('btn.fabDown', lang)}</button>
    </div>
  );
}
