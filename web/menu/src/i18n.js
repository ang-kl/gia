// i18n.js — v0.60.51
//
// Minimal EN/FR localisation for the Menu TMA hub. Mirrors the
// shape of web/cuisine/src/v2/lib/i18n.js but trims the server
// hydration path: the menu hub has no live UI to change locale
// (that's done via the /language chat command), so it just reads
// the active locale and renders. The 'gia.locale' localStorage
// key is shared across all TMAs, so a user who flipped the
// cuisine TMA to FR sees a FR menu hub on the next mount.

import { useEffect, useState } from 'react';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';
const SUPPORTED_LOCALES = ['en', 'fr'];

const STRINGS = {
  // ----- Hero -----
  'hero.title':            { en: 'Soleat Menu',     fr: 'Soleat Menu' },
  'hero.tagline.line1':    { en: 'Solo eat',        fr: 'Manger seul' },
  'hero.tagline.line2':    { en: "So let’s eat", fr: "Alors, mangeons" },

  // ----- Section headings -----
  'section.eat':           { en: 'Eat',             fr: 'Manger' },
  'section.discover':      { en: 'Discover',        fr: 'Découvrir' },
  'section.plan':          { en: 'Plan',            fr: 'Planifier' },

  // ----- Eat tiles -----
  // v0.60.55 — single-word labels per Human Lead 2026-05-09
  // ("half the size"). 3-column grid drops sub-text entirely.
  'tile.cuisine.label':    { en: 'Cuisine',     fr: 'Cuisine' },
  'tile.hawker.label':     { en: 'Hawker',      fr: 'Hawker' },
  'tile.recognised.label': { en: 'Recognised',  fr: 'Reconnus' },

  // ----- Discover tiles -----
  'tile.search.label':     { en: 'Search',      fr: 'Recherche' },
  'tile.buddy.label':      { en: 'Buddy',       fr: 'Buddy' },
  'tile.weather.label':    { en: 'Weather',     fr: 'Météo' },

  // ----- Plan tiles -----
  'tile.location.label':   { en: 'Location',    fr: 'Lieu' },
  'tile.drive.label':      { en: 'Drive',       fr: 'Conduire' },
  'tile.incidents.label':  { en: 'Incidents',   fr: 'Incidents' },

  // ----- Always-visible Train panel (v0.60.55) -----
  // Replaced the v0.60.54 Train tile. Status fetched at hub mount
  // from /api/menu/live (Redis-only — no extra LTA call).
  'panel.train.title':     { en: 'Train',       fr: 'Train' },
  'panel.train.map':       { en: 'MRT map',     fr: 'Carte MRT' },
  'panel.train.more':      { en: 'Full status', fr: 'État complet' },
  'tile.train.live.healthy':    { en: '🟢 All lines normal',          fr: '🟢 Toutes les lignes normales' },
  'tile.train.live.disruption': { en: '🔴 Disruption — tap for details', fr: '🔴 Perturbation — touchez pour voir' },
  'tile.train.live.offline':    { en: '🟡 LTA sensor offline',         fr: '🟡 Capteur LTA hors ligne' },
  'tile.train.live.warmup':     { en: 'Warming up…',                    fr: 'Initialisation…' },

  // ----- Footer chips (admin) -----
  'chip.language':         { en: 'Language',  fr: 'Langue' },
  'chip.privacy':          { en: 'Privacy',   fr: 'Confidentialité' },
  'chip.forgetme':         { en: 'Forget me', fr: 'Oublier mes données' },

  // ----- Footer brand line -----
  'footer.brand':          { en: 'Soleat',    fr: 'Soleat' },

  // v0.60.54 — interaction hint shown under the tile grid.
  'hint.tap':              { en: 'Tap a tile to begin · swipe down to close',
                             fr: 'Touchez une tuile pour commencer · glissez vers le bas pour fermer' }
};

export function t(key, lang) {
  const l = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] || entry.en || key;
}

function detectFromTelegram() {
  if (typeof window === 'undefined') return null;
  const code = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  if (typeof code !== 'string') return null;
  const two = code.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(two) ? two : null;
}

function detectFromNavigator() {
  if (typeof navigator === 'undefined') return null;
  const code = navigator.language || (navigator.languages && navigator.languages[0]);
  if (typeof code !== 'string') return null;
  const two = code.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(two) ? two : null;
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
