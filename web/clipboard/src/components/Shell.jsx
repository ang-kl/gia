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
import LocaleToggle from './LocaleToggle.jsx';
import CuisineGroupPicker from './CuisineGroupPicker.jsx';
import LocalClassicPicker from './LocalClassicPicker.jsx';

// v0.62.423 — version for the footer strip (mirrors Cuisine's __BUILD_VERSION__).
const BUILD_VERSION = typeof __BUILD_VERSION__ !== 'undefined' ? __BUILD_VERSION__ : 'dev';

function SwitchAppRow({ iconSrc, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full text-left bg-tg-card border border-tg-border rounded-2xl p-3 active:scale-[0.99]"
    >
      <img src={iconSrc} alt="" width="40" height="40" className="flex-shrink-0 w-10 h-10 rounded-xl object-contain" aria-hidden />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-bold text-tg-text">{title}</span>
        <span className="block text-[11.5px] text-tg-hint truncate">{sub}</span>
      </span>
      <span className="text-tg-hint text-lg" aria-hidden>›</span>
    </button>
  );
}

// v0.62.427 — line-icons to match the sample footer (stroke = currentColor so
// the active tab goes cobalt, inactive grey).
const SW = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
const TAB_ICON = {
  clipboard: <svg width="20" height="20" viewBox="0 0 24 24" {...SW}><rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9 9h6M9 13h6M9 17h4"/></svg>,
  cabinet:   <svg width="20" height="20" viewBox="0 0 24 24" {...SW}><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 12h16M10 8h4M10 16h4"/></svg>,
  grid:      <svg width="20" height="20" viewBox="0 0 24 24" {...SW}><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>,
  settings:  <svg width="20" height="20" viewBox="0 0 24 24" {...SW}><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></svg>,
};
function FooterTab({ iconKey, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center gap-0.5 py-1 bg-transparent ${active ? 'text-tg-accent' : 'text-tg-hint'}`}
      aria-current={active ? 'page' : undefined}
    >
      <span aria-hidden>{TAB_ICON[iconKey]}</span>
      <span className="text-[10px] font-semibold max-w-[92px] truncate">{label}</span>
    </button>
  );
}

export default function Shell({
  lang = 'en', screen, activeCabinetName = '', footerCabinetLabel,
  onNav, onRefresh, children,
  // v0.62.440 — header chips FILTER the user's saved cards via a FOLIO DROPDOWN
  // (drops down under the chips, like the Cuisine TMA tabs — not a bottom sheet).
  cuisineSel = [], dishFilter = null, catalogue = [], availableSlugs = null, dishOptions = [], plate = null, savedDishSet = null,
  onSetCuisine, onSetDish,
  facets = {}, onSetFacet, onClearFacets,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [drop, setDrop] = useState(null);   // 'cuisine' | 'dish' | null
  const [dishDraft, setDishDraft] = useState(dishFilter || '');
  const cabLabel = footerCabinetLabel || t('nav.cabinets', lang);
  const go = (s) => { haptic('light'); setMenuOpen(false); setDrop(null); onNav?.(s); };
  const switchApp = (path) => { setMenuOpen(false); openMiniApp(path); };

  return (
    <div className="flex flex-col h-screen bg-tg-bg text-tg-text">
      {/* ── HEADER ── */}
      <header className="flex-shrink-0 bg-tg-card px-3 pt-3 pb-2 border-b border-tg-border z-10">
        <div className="flex items-center gap-2">
          <button
            type="button" aria-label="menu"
            onClick={() => { setDrop(null); setMenuOpen(true); }}
            className="flex-shrink-0 w-9 h-9 flex flex-col justify-center gap-1 p-2 bg-transparent"
          >
            <span className="h-0.5 bg-tg-text rounded" />
            <span className="h-0.5 bg-tg-text rounded" />
            <span className="h-0.5 bg-tg-text rounded" />
          </button>
          <img src="soleat-icon.png" alt="soleat" width="30" height="30" className="flex-shrink-0 w-[30px] h-[30px] rounded-full object-contain" />
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-[15px] font-extrabold truncate">
              {t('chrome.brand', lang)}
              {activeCabinetName ? <span className="text-[12px] font-medium text-tg-hint"> · {activeCabinetName}</span> : null}
            </div>
          </div>
          {/* v0.62.511 — locale toggle; was read-only (no setActiveLocale). */}
          <LocaleToggle className="flex-shrink-0" />
          <button
            type="button" aria-label="refresh"
            onClick={() => { haptic('light'); onRefresh?.(); }}
            className="flex-shrink-0 p-1 text-tg-accent"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/></svg>
          </button>
        </div>
        {/* v0.62.440 — chips are FOLIO TABS: tapping drops a panel down right
            below them (not a bottom sheet). Active chip accented; ▾/▴ indicator. */}
        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setDrop((d) => (d === 'cuisine' ? null : 'cuisine')); }}
            className={`flex-1 flex items-center justify-between gap-1 px-2.5 py-1.5 text-[12px] font-medium border rounded-xl ${cuisineSel.length || drop === 'cuisine' ? 'bg-tg-accent/10 border-tg-accent/50 text-tg-text' : 'bg-tg-bg border-tg-border text-tg-text'}`}
          >
            <span className="truncate">{cuisineSel.length ? `🍜 ${cuisineSel.length}` : t('chrome.cuisineFilters', lang)}</span>
            {cuisineSel.length
              ? <span role="button" aria-label="clear" onClick={(e) => { e.stopPropagation(); onSetCuisine?.([]); }} className="text-tg-hint">✕</span>
              : <span className="text-tg-hint">{drop === 'cuisine' ? '▴' : '▾'}</span>}
          </button>
          <button
            type="button"
            onClick={() => { setMenuOpen(false); setDishDraft(dishFilter || ''); setDrop((d) => (d === 'dish' ? null : 'dish')); }}
            className={`flex-1 flex items-center justify-between gap-1 px-2.5 py-1.5 text-[12px] font-medium border rounded-xl ${dishFilter || drop === 'dish' ? 'bg-tg-accent/10 border-tg-accent/50 text-tg-text' : 'bg-tg-bg border-tg-border text-tg-text'}`}
          >
            <span className="truncate">{dishFilter ? `🍲 ${dishFilter}` : t('chrome.pickLocal', lang)}</span>
            {dishFilter
              ? <span role="button" aria-label="clear" onClick={(e) => { e.stopPropagation(); onSetDish?.(null); }} className="text-tg-hint">✕</span>
              : <span className="text-tg-hint">{drop === 'dish' ? '▴' : '▾'}</span>}
          </button>
        </div>

        {/* Folio dropdown panel — opens DOWN, attached to the chips (Cuisine-TMA
            slide effect via .sk-drop). box-border + contained so it never bleeds. */}
        {drop === 'cuisine' && (
          <div className="sk-drop box-border w-full mt-2 border border-tg-border rounded-xl bg-tg-card shadow-lg max-h-[44vh] overflow-y-auto overflow-x-hidden p-2">
            {/* v0.62.451 — grouped cuisine picker ported from the Cuisine TMA;
                groups/cuisines not present in the saved cards are greyed out. */}
            <CuisineGroupPicker catalogue={catalogue} selected={cuisineSel} onChange={onSetCuisine} lang={lang} availableSlugs={availableSlugs} />

            {/* v0.62.441 — richer facets (over the stored venue data). */}
            <div className="border-t border-tg-border mt-1.5 pt-2 px-1.5 space-y-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-tg-hint mb-1">{t('facet.rating', lang)}</div>
                <div className="flex gap-1.5">
                  {[{ v: null, l: t('facet.any', lang) }, { v: 4.0, l: '★4.0+' }, { v: 4.5, l: '★4.5+' }].map((o) => (
                    <button key={String(o.v)} onClick={() => onSetFacet?.('minRating', o.v)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${facets.minRating === o.v ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'border-tg-border text-tg-text'}`}>{o.l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-tg-hint mb-1">{t('facet.price', lang)}</div>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4].map((p) => (
                    <button key={p} onClick={() => onSetFacet?.('price', facets.price === p ? null : p)}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${facets.price === p ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'border-tg-border text-tg-text'}`}>{'$'.repeat(p)}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-tg-hint mb-1">{t('facet.crowd', lang)}</div>
                <div className="flex gap-1.5">
                  {[{ k: 'low', d: '🟢', i: 'card.crowdLow' }, { k: 'medium', d: '🟡', i: 'card.crowdMedium' }, { k: 'high', d: '🔴', i: 'card.crowdHigh' }].map((o) => (
                    <button key={o.k} onClick={() => onSetFacet?.('crowd', facets.crowd === o.k ? null : o.k)}
                      className={`text-[11px] px-2 py-1 rounded-full border ${facets.crowd === o.k ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'border-tg-border text-tg-text'}`}>{o.d} {t(o.i, lang)}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onSetFacet?.('openNow', !facets.openNow)}
                  className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border ${facets.openNow ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'border-tg-border text-tg-text'}`}>{t('facet.open', lang)}</button>
                <button onClick={() => onSetFacet?.('michelin', !facets.michelin)}
                  className={`flex-1 text-[11px] px-2 py-1.5 rounded-lg border ${facets.michelin ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'border-tg-border text-tg-text'}`}>{t('facet.michelin', lang)}</button>
              </div>
              <button onClick={() => { onClearFacets?.(); setDrop(null); }} className="w-full text-[11px] text-tg-hint py-1">{t('facet.clear', lang)}</button>
            </div>
          </div>
        )}
        {drop === 'dish' && (
          <div className="sk-drop box-border w-full mt-2 border border-tg-border rounded-xl bg-tg-card shadow-lg max-h-[44vh] overflow-y-auto overflow-x-hidden p-2">
            {/* v0.62.452 — mirror the Cuisine TMA "Pick local classic": the
                derived city's dishes + classics, greying ones not in saved cards.
                Falls back to the saved-dish chips when the city is unknown. */}
            {plate && Array.isArray(plate.dishes) && plate.dishes.length ? (
              <>
                <LocalClassicPicker plate={plate} savedDishSet={savedDishSet} lang={lang}
                  dishSel={dishFilter} onPick={(d) => { onSetDish?.(d); setDrop(null); }} />
                {dishFilter && (
                  <button type="button" onClick={() => { onSetDish?.(null); setDrop(null); }}
                    className="w-full mt-2 text-[11px] text-tg-hint py-1">{t('filter.all', lang)}</button>
                )}
              </>
            ) : dishOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-tg-hint">{t('filter.noDishes', lang)}</div>
            ) : (
              /* fallback: dish chips derived from the saved cards' "🍲 Try" dishes */
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => { onSetDish?.(null); setDrop(null); }}
                  className={`flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[12px] border ${dishFilter == null ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'border-tg-border text-tg-text'}`}>
                  {t('filter.all', lang)}
                </button>
                {dishOptions.map((o) => (
                  <button key={o.value} type="button" onClick={() => { onSetDish?.(o.value); setDrop(null); }}
                    className={`flex items-center justify-between gap-1 px-2 py-2 rounded-lg text-[12px] border min-w-0 ${dishFilter === o.value ? 'bg-tg-accent text-tg-accent-text border-tg-accent' : 'border-tg-border text-tg-text'}`}>
                    <span className="truncate">🍲 {o.label}</span><span className="text-tg-hint text-[10px] shrink-0">{o.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── MAIN (scroll) ── */}
      <main className="flex-1 overflow-y-auto px-3 py-3 pb-24">{children}</main>

      {/* ── FOOTER (4 tabs) ── */}
      <nav className="flex-shrink-0 fixed bottom-0 inset-x-0 z-20 bg-tg-card/95 backdrop-blur border-t border-tg-border flex flex-col px-1 pt-1 pb-5">
        <div className="flex">
          <FooterTab iconKey="clipboard" label={t('nav.clipboard', lang)} active={screen === 'clipboard'} onClick={() => go('clipboard')} />
          <FooterTab iconKey="cabinet" label={cabLabel} active={screen === 'cabinet'} onClick={() => go('cabinet')} />
          <FooterTab iconKey="grid" label={t('nav.cabinets', lang)} active={screen === 'cabinets'} onClick={() => go('cabinets')} />
          <FooterTab iconKey="settings" label={t('nav.settings', lang)} active={screen === 'settings'} onClick={() => go('settings')} />
        </div>
        {/* v0.62.423 — Cuisine-style version strip. */}
        <div className="text-center text-[9px] text-tg-hint pt-1">{t('chrome.experimental', lang)} · v{BUILD_VERSION}</div>
      </nav>

      {/* ── HAMBURGER ── */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-0 bottom-0 left-0 w-[84%] max-w-[330px] bg-tg-card shadow-2xl flex flex-col">
            <div className="px-4 pt-12 pb-4 text-white" style={{ background: 'linear-gradient(135deg,#2b59c9,#1d3aa0)' }}>
              <div className="flex items-center gap-3">
                <img src="soleat-icon.png" alt="soleat" width="40" height="40" className="flex-shrink-0 w-10 h-10 rounded-xl object-contain" />
                <div className="min-w-0">
                  <div className="text-[10px] opacity-80 tracking-wider font-semibold">SOLEAT · TELEGRAM MINI APPS</div>
                  <div className="text-xl font-extrabold mt-0.5">{t('chrome.brand', lang)}</div>
                </div>
              </div>
              <div className="text-xs opacity-90 mt-2">{t('menu.subtitle', lang)}</div>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <div className="text-[11px] font-bold text-tg-hint tracking-wide px-1.5 py-0.5">{t('menu.switchApp', lang)}</div>
              <SwitchAppRow iconSrc="cuisine-icon-v3.png" title={t('menu.cuisine', lang)} sub={t('menu.cuisineSub', lang)} onClick={() => switchApp('/app/cuisine')} />
              <SwitchAppRow iconSrc="hawker-icon-v3.png" title={t('menu.hawker', lang)} sub={t('menu.hawkerSub', lang)} onClick={() => switchApp('/app/hawker')} />
              <SwitchAppRow iconSrc="train-logo.png" title={t('menu.transport', lang)} sub={t('menu.transportSub', lang)} onClick={() => switchApp('/app/transport')} />
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
