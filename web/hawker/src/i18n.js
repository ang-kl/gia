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
import { initData } from './tg.js';

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

  // Open-all button — v0.60.40: relabel to "View N Hawker Centres on
  // the map", and route to soleat's multi-pin /app/map when coords
  // are present (Google Maps fallback retained for missing-coord
  // edge cases).
  // v0.60.41: embedded map ships, so the external button is repurposed
  // as a "Fullscreen map ↗" affordance. Old key kept for fallback.
  'btn.openFullscreenMap':   { en: '🗺 Fullscreen map ↗',
                               fr: '🗺 Carte plein écran ↗' },
  'btn.viewAllOnMap':        { en: '🗺 View {n} Hawker Centres on the map',
                               fr: '🗺 Voir les {n} centres de hawker sur la carte' },
  'btn.openAllOnGoogleMaps': { en: '🗺 Open all {n} on Google Maps',
                               fr: '🗺 Voir les {n} sur Google Maps' },
  // v0.60.56 — external "tour" URL pinning every centre with coords.
  'btn.openTourGoogleMaps':  { en: '🌐 {n} pins in Google Maps',
                               fr: '🌐 {n} épingles sur Google Maps' },
  // v0.60.60 — when the region has more centres than Google Maps'
  // 11-stop URL ceiling, the label is honest about the partial view.
  'btn.openTourGoogleMapsPartial': { en: '🌐 {n} of {total} pins in Google Maps',
                                     fr: '🌐 {n} sur {total} épingles sur Google Maps' },
  'map.mappedRatio':         { en: '📍 {mapped}/{total} centres mapped',
                               fr: '📍 {mapped}/{total} centres cartographiés' },

  // v0.60.41 — embedded HawkerMapPanel strings.
  'map.loading':             { en: 'Loading map…',
                               fr: 'Chargement de la carte…' },
  'map.nokey':               { en: 'Map unavailable (key not configured).',
                               fr: 'Carte indisponible (clé non configurée).' },
  'map.noCoords':            { en: 'Hawker centre coordinates not yet loaded — use the list below.',
                               fr: 'Coordonnées des centres non chargées — voir la liste ci-dessous.' },
  'map.openInGoogleMaps':    { en: '📍 Open on Google Maps',
                               fr: '📍 Voir sur Google Maps' },
  'map.aria':                { en: 'Map of hawker centres in the active region',
                               fr: 'Carte des centres de hawker dans la région active' },

  // Per-centre Maps deep-link
  'btn.maps':                { en: '📍 Maps', fr: '📍 Carte' },
  // v0.60.53 — copy-to-chat companion button per centre.
  'btn.saveToChat':          { en: '📤 Save to chat', fr: '📤 Envoyer au chat' },
  'btn.saving':              { en: 'Sending…', fr: 'Envoi…' },
  'msg.savedClose':          { en: 'Sent to chat. You can close this view.',
                               fr: 'Envoyé au chat. Vous pouvez fermer cette vue.' },
  'msg.saveFailed':          { en: 'Could not send to chat — please try again.',
                               fr: 'Échec de l’envoi au chat — réessayez.' },
  // v0.60.59 — stall count + operating status (from data.gov.sg
  // "Hawker Centres (GEOJSON)" via fetch-hawker-stalls.js). Replaces
  // the v0.60.53 closure-tag string (closures dataset retired by NEA).
  'stalls.count':            { en: '🍳 {n} stalls',
                               fr: '🍳 {n} stands' },
  // Status localisations — keyed by lowercased+normalised value from
  // the dataset. Unknown status values fall through to the raw label
  // (the formatStalls helper does the lookup-or-passthrough).
  'stalls.status.existing':           { en: 'Operating',          fr: 'Opérationnel' },
  'stalls.status.under_construction': { en: 'Under construction', fr: 'En construction' },
  'stalls.status.proposed':           { en: 'Proposed',           fr: 'Proposé' }
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

// v0.59.15 (Codex review #219 P1): hydrate the chat-side /language
// preference from Redis on first mount so a user who sets /language fr
// then opens /hawker directly (without first toggling locale in the
// cuisine TMA) gets the right locale. Mirrors cuisine TMA's
// hydrateFromServerOnce. Module-level latch prevents redundant
// fetches when multiple components subscribe to useLocale().
let serverHydrated = false;
async function hydrateFromServerOnce() {
  if (serverHydrated) return;
  serverHydrated = true;
  try {
    const res = await fetch('/api/cuisine/user-language', {
      headers: { 'X-Telegram-Init-Data': initData() || '' }
    });
    if (!res.ok) return;
    const body = await res.json();
    const remote = body?.lang;
    if (SUPPORTED.includes(remote)) {
      try { window.localStorage.setItem(LOCALE_KEY, remote); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang: remote } }));
    }
  } catch { /* offline / 401 / 404 — keep local fallback */ }
}

// React hook: returns current lang, re-renders on cross-tab + same-tab
// locale change (same 'gia:locale' CustomEvent pattern as cuisine TMA).
// On first mount, hydrates from the server so the TMA matches whatever
// the user last set via /language in chat.
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
    hydrateFromServerOnce();
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocale);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return lang;
}
