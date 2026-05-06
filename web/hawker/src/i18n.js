// hawker TMA i18n — v0.59.15
//
// Standalone EN/FR module for the hawker mini-app. Mirrors the
// cuisine TMA's lib/i18n.js shape (same localStorage key 'gia.locale'
// + same 'gia:locale' CustomEvent) so the user's locale flips here
// when they toggle it in the cuisine TMA or via /language in chat.
//
// Why duplicate instead of share: the cuisine TMA lives at
// web/cuisine/src/v2/lib/i18n.js — Vite-built per-app, no shared
// node-modules linkage. v0.60.x can extract a workspaces lib.

import { useEffect, useState } from 'react';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';
const SUPPORTED = ['en', 'fr'];

const STRINGS = {
  // Header
  'header.title':            { en: '🍚 Hawker Centre (2025)', fr: '🍚 Centre de hawker (2025)' },
  'header.versionCount':     { en: 'v{v} · {n} centres', fr: 'v{v} · {n} centres' },
  'header.versionOnly':      { en: 'v{v}', fr: 'v{v}' },

  // Status
  'status.loading':          { en: 'Loading…', fr: 'Chargement…' },

  // Regions — labels for Central/South/East/North/West (API returns EN
  // names; the chip + heading are localised here at render time).
  'region.Central':          { en: 'Central', fr: 'Centre' },
  'region.South':            { en: 'South',   fr: 'Sud' },
  'region.East':             { en: 'East',    fr: 'Est' },
  'region.North':            { en: 'North',   fr: 'Nord' },
  'region.West':             { en: 'West',    fr: 'Ouest' },

  // Active region heading + alphabetical hint. Split into a body
  // suffix so the App can wrap the region name in <strong> at JSX time
  // without parsing markdown.
  'list.headingBody':        { en: ' — {n} hawker centres (alphabetical)',
                               fr: ' — {n} centres de hawker (alphabétique)' },

  // Open-all button
  'btn.openAllOnGoogleMaps': { en: '🗺 Open all {n} on Google Maps',
                               fr: '🗺 Voir les {n} sur Google Maps' },

  // Per-centre Maps deep-link
  'btn.maps':                { en: '📍 Maps', fr: '📍 Carte' }
};

function pickLang(lang) { return SUPPORTED.includes(lang) ? lang : 'en'; }

export function t(key, lang) {
  const l = pickLang(lang);
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] || entry.en || key;
}

export function tn(key, lang, vars = {}) {
  const raw = t(key, lang);
  return raw.replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : `{${name}}`));
}

// Read the active locale from the same sources the cuisine TMA uses
// (localStorage > Telegram language_code > navigator > 'en').
export function getActiveLocale() {
  try {
    const stored = window.localStorage?.getItem(LOCALE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
  } catch { /* SSR / private browsing */ }
  try {
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    const two = String(tgLang || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(two)) return two;
  } catch { /* not in Telegram WebApp */ }
  try {
    const nav = (navigator?.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(nav)) return nav;
  } catch { /* no navigator */ }
  return 'en';
}

// React hook: returns current lang, re-renders on cross-tab + same-tab
// locale change (same 'gia:locale' CustomEvent pattern as cuisine TMA).
export function useLocale() {
  const [lang, setLang] = useState(() => getActiveLocale());
  useEffect(() => {
    function onLocale(e) {
      const next = e?.detail?.lang || getActiveLocale();
      setLang(next);
    }
    function onStorage(e) {
      if (e.key === LOCALE_KEY) setLang(getActiveLocale());
    }
    window.addEventListener(LOCALE_EVENT, onLocale);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocale);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return lang;
}
