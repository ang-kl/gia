// Shell.jsx — v0.62.417 (Sketchbook P2 chrome)
//
// The sticky header + fixed 4-tab footer + hamburger "Switch app" drawer that
// frame every non-shared screen. Ported from UI/sketchbook/Sketchbook.dc.html
// but using the repo's Telegram theme tokens (tg-*) per HANDOFF §2–3 (prefer
// theme vars in prod) so it follows the user's light/dark theme.
//
// The prototype's static weather + device-location readouts are intentionally
// omitted here (no real data source yet — avoid fabricating "30.9°C"); they can
// land in a later phase once wired to a source. Filter chips deep-link to the
// Cuisine TMA (operator decision).

import React, { useState } from 'react';
import { t } from '../lib/i18n.js';
import { openMiniApp, haptic } from '../lib/tg.js';

const BRAND_GRADIENT = { background: 'linear-gradient(135deg,#3a8dff,#34d3a6)' };

function SwitchAppRow({ icon, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left bg-tg-card border border-tg-border rounded-2xl p-3 active:scale-[0.99]"
    >
      <span className="flex-shrink-0 w-10 h-10 rounded-xl bg-tg-bg flex items-center justify-center text-xl" aria-hidden>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-tg-text">{title}</span>
        <span className="block text-[11.5px] text-tg-hint truncate">{sub}</span>
      </span>
      <span className="text-tg-hint text-lg" aria-hidden>›</span>
    </button>
  );
}

function FooterTab({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-1 bg-transparent ${active ? 'text-tg-accent' : 'text-tg-hint'}`}
      aria-current={active ? 'page' : undefined}
    >
      <span className="text-base leading-none" aria-hidden>{icon}</span>
      <span className="text-[10px] font-semibold max-w-[92px] truncate">{label}</span>
    </button>
  );
}

export default function Shell({
  lang = 'en', screen, activeCabinetName = '', footerCabinetLabel,
  onNav, onRefresh, children,
  // v0.62.418 — header chips FILTER the user's saved cards (cuisine / dish).
  cuisineFilter = null, dishFilter = null,
  onOpenCuisineFilter, onOpenDishFilter, onClearCuisine, onClearDish,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const cabLabel = footerCabinetLabel || t('nav.cabinets', lang);
  const go = (s) => { haptic('light'); setMenuOpen(false); onNav?.(s); };
  const switchApp = (path) => { setMenuOpen(false); openMiniApp(path); };

  return (
    <div className="flex flex-col h-screen bg-tg-bg text-tg-text">
      {/* ── HEADER ── */}
      <header className="flex-shrink-0 bg-tg-card border-b border-tg-border px-3 pt-3 pb-2 z-10">
        <div className="flex items-center gap-2">
          <button
            type="button" aria-label="menu"
            onClick={() => setMenuOpen(true)}
            className="flex-shrink-0 w-9 h-9 flex flex-col justify-center gap-1 p-2 bg-transparent"
          >
            <span className="h-0.5 bg-tg-text rounded" />
            <span className="h-0.5 bg-tg-text rounded" />
            <span className="h-0.5 bg-tg-text rounded" />
          </button>
          <span className="flex-shrink-0 w-[30px] h-[30px] rounded-xl flex items-center justify-center text-white text-lg shadow" style={BRAND_GRADIENT} aria-hidden>☼</span>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[15px] font-extrabold truncate">
              {t('chrome.brand', lang)}
              {activeCabinetName ? <span className="text-[12px] font-medium text-tg-hint"> · {activeCabinetName}</span> : null}
            </div>
          </div>
          <button
            type="button" aria-label="refresh"
            onClick={() => { haptic('light'); onRefresh?.(); }}
            className="flex-shrink-0 p-1 text-tg-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/></svg>
          </button>
        </div>
        {/* v0.62.418 — chips FILTER the user's saved eatery cards (operator:
            "search for the eatery cards with the cuisine or food dish, not new
            eateries"). Active chip is accented + shows a ✕ to clear. */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onOpenCuisineFilter}
            className={`flex-1 flex items-center justify-between gap-1 rounded-xl px-2.5 py-1.5 text-[12px] font-medium border ${cuisineFilter ? 'bg-tg-accent/10 border-tg-accent/50 text-tg-text' : 'bg-tg-bg border-tg-border text-tg-text'}`}
          >
            <span className="truncate">{cuisineFilter ? `🍜 ${cuisineFilter}` : t('chrome.cuisineFilters', lang)}</span>
            {cuisineFilter
              ? <span role="button" aria-label="clear" onClick={(e) => { e.stopPropagation(); onClearCuisine?.(); }} className="text-tg-hint">✕</span>
              : <span className="text-tg-hint">▾</span>}
          </button>
          <button
            type="button"
            onClick={onOpenDishFilter}
            className={`flex-1 flex items-center justify-between gap-1 rounded-xl px-2.5 py-1.5 text-[12px] font-medium border ${dishFilter ? 'bg-tg-accent/10 border-tg-accent/50 text-tg-text' : 'bg-tg-bg border-tg-border text-tg-text'}`}
          >
            <span className="truncate">{dishFilter ? `📍 ${dishFilter}` : t('chrome.pickLocal', lang)}</span>
            {dishFilter
              ? <span role="button" aria-label="clear" onClick={(e) => { e.stopPropagation(); onClearDish?.(); }} className="text-tg-hint">✕</span>
              : <span className="text-tg-hint">▾</span>}
          </button>
        </div>
      </header>

      {/* ── MAIN (scroll) ── */}
      <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">{children}</main>

      {/* ── FOOTER (4 tabs) ── */}
      <nav className="flex-shrink-0 fixed bottom-0 inset-x-0 z-20 bg-tg-card/95 backdrop-blur border-t border-tg-border flex px-1 pt-2 pb-6">
        <FooterTab icon="📋" label={t('nav.clipboard', lang)} active={screen === 'clipboard'} onClick={() => go('clipboard')} />
        <FooterTab icon="🗄️" label={cabLabel} active={screen === 'cabinet'} onClick={() => go('cabinet')} />
        <FooterTab icon="🗂️" label={t('nav.cabinets', lang)} active={screen === 'cabinets'} onClick={() => go('cabinets')} />
        <FooterTab icon="⚙️" label={t('nav.settings', lang)} active={screen === 'settings'} onClick={() => go('settings')} />
      </nav>

      {/* ── HAMBURGER ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 bottom-0 left-0 w-[84%] max-w-[330px] bg-tg-card shadow-2xl flex flex-col">
            <div className="px-4 pt-12 pb-4 text-white" style={{ background: 'linear-gradient(135deg,#2b59c9,#1d3aa0)' }}>
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-2xl text-white" style={BRAND_GRADIENT} aria-hidden>☼</span>
                <div className="min-w-0">
                  <div className="text-[10px] opacity-80 tracking-wider font-semibold">SOLEAT · TELEGRAM MINI APPS</div>
                  <div className="text-xl font-extrabold mt-0.5">{t('chrome.brand', lang)}</div>
                </div>
              </div>
              <div className="text-xs opacity-90 mt-2">{t('menu.subtitle', lang)}</div>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold text-tg-hint tracking-wide px-1.5 py-0.5">{t('menu.switchApp', lang)}</div>
              <SwitchAppRow icon="🍜" title={t('menu.cuisine', lang)} sub={t('menu.cuisineSub', lang)} onClick={() => switchApp('/app/cuisine')} />
              <SwitchAppRow icon="🍢" title={t('menu.hawker', lang)} sub={t('menu.hawkerSub', lang)} onClick={() => switchApp('/app/hawker')} />
              <SwitchAppRow icon="🚆" title={t('menu.transport', lang)} sub={t('menu.transportSub', lang)} onClick={() => switchApp('/app/transport')} />
            </div>
            <div className="mt-auto px-4 py-4 border-t border-tg-border text-tg-hint text-[11px]">
              {t('chrome.brand', lang)} · @soleat_bot
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
