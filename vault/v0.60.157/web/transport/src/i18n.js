// i18n.js — v0.60.106 (transport TMA)
//
// Minimal EN/FR strings for the transport TMA. Mirrors web/menu/src/i18n.js
// in shape (localStorage 'gia.locale' + 'gia:locale' CustomEvent) so the
// user's chosen locale flips transport text as soon as they re-mount.
// Operator 2026-05-11: "ensure FR is also change based on yesterday and
// today PR" — these strings were previously hardcoded English in
// App.jsx + AffectedTicker.jsx + MrtMapPanel.jsx.

import { useEffect, useState } from 'react';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';
const SUPPORTED_LOCALES = ['en', 'fr'];

const STRINGS = {
  // Header banner
  'header.title':              { en: '🇸🇬 Singapore Train Map and Status', fr: '🇸🇬 Carte et état du métro de Singapour' },
  'header.allNormal':          { en: '✓ All lines normal',     fr: '✓ Toutes les lignes normales' },
  'header.linesAffected':      { en: '⚠️ {n} line affected',   fr: '⚠️ {n} ligne touchée' },
  'header.linesAffectedPlural':{ en: '⚠️ {n} lines affected',  fr: '⚠️ {n} lignes touchées' },

  // View toggle (PNG schematic vs Google Map)
  'view.tipToGmap':            { en: 'Tap "Google Map" to explore each station →',
                                 fr: 'Touchez "Carte Google" pour explorer chaque station →' },
  'view.tipZoomIn':            { en: 'Tip: zoom in to read the pins (central SG is dense)',
                                 fr: 'Astuce : zoomez pour lire les épingles (le centre de SG est dense)' },
  'view.btnSchematic':         { en: '🗺 Schematic',           fr: '🗺 Schéma' },
  'view.btnGoogleMap':         { en: '📍 Google Map',          fr: '📍 Carte Google' },

  // Loading / error states
  'loading':                   { en: 'Loading MRT status…',     fr: 'Chargement de l’état du métro…' },
  'error.unreachable':         { en: '⚠️ Could not load MRT status:', fr: '⚠️ Impossible de charger l’état du métro :' },

  // Ticker (AffectedTicker)
  'ticker.title':              { en: 'Scroll to view another train line', fr: 'Faites défiler pour voir une autre ligne' },
  'ticker.allLines':           { en: '⇆ All lines',            fr: '⇆ Toutes les lignes' },
  'ticker.allNormal':          { en: '✓ All lines normal',     fr: '✓ Toutes les lignes normales' },

  // FAB labels (BackFab + scroll FAB)
  'fab.back':                  { en: 'back', fr: 'retour' },
  'fab.end':                   { en: 'end',  fr: 'fermer' },
  'fab.backAria':              { en: 'Back', fr: 'Retour' },
  'fab.endAria':               { en: 'End',  fr: 'Fermer' },
  'fab.top':                   { en: '⇡ top',  fr: '⇡ haut' },
  'fab.down':                  { en: '⇣ down', fr: '⇣ bas' },
  'fab.topAria':               { en: 'Back to top', fr: 'Retour en haut' },
  'fab.downAria':              { en: 'Scroll down', fr: 'Défiler vers le bas' }
};

export function t(key, lang) {
  const l = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] || entry.en || key;
}

export function tn(key, lang, params = {}) {
  let out = t(key, lang);
  for (const [k, v] of Object.entries(params)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
  }
  return out;
}

function detectFromTelegram() {
  const w = typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
  const lang = w?.initDataUnsafe?.user?.language_code;
  if (typeof lang === 'string' && SUPPORTED_LOCALES.includes(lang.slice(0, 2).toLowerCase())) {
    return lang.slice(0, 2).toLowerCase();
  }
  return null;
}

function detectFromNavigator() {
  if (typeof navigator === 'undefined' || !navigator.language) return null;
  const code = navigator.language.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(code) ? code : null;
}

export function getActiveLocale() {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LOCALE_KEY);
      if (SUPPORTED_LOCALES.includes(stored)) return stored;
    } catch { /* private mode / quota — fall through */ }
  }
  return detectFromTelegram() || detectFromNavigator() || 'en';
}

export function useLocale() {
  const [lang, setLang] = useState(() => getActiveLocale());
  useEffect(() => {
    function onLocale(e) { setLang(e?.detail?.lang || getActiveLocale()); }
    function onStorage(e) { if (e.key === LOCALE_KEY) setLang(getActiveLocale()); }
    window.addEventListener(LOCALE_EVENT, onLocale);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocale);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return lang;
}
