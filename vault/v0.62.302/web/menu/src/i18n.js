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
  // v0.60.67 — sub-tagline below the "Solo eat · So let's eat" row.
  // Pitches the breadth of the cuisine catalogue (>50 cuisines) so
  // users discover the picker isn't just chicken-rice + laksa.
  'hero.subtagline':       { en: "Explore Singapore’s 50+ cuisines beyond familiar favourites",
                             fr: "Explorez plus de 50 cuisines singapouriennes au-delà des classiques" },

  // ----- Section headings -----
  'section.eat':           { en: 'Eat',             fr: 'Manger' },
  'section.discover':      { en: 'Discover',        fr: 'Découvrir' },
  'section.plan':          { en: 'Plan',            fr: 'Planifier' },
  // v0.61.125 — own section for the location anchor picker
  // (was a sub-row inside Plan in v0.61.123/124).
  'section.location':      { en: 'Location',        fr: 'Lieu' },

  // ----- Eat tiles -----
  // v0.60.55 — single-word labels per Human Lead 2026-05-09
  // ("half the size"). 3-column grid drops sub-text entirely.
  // v0.60.122 — 'Hawker' → 'Hawker Centre, Food Centre' per operator
  // 2026-05-11 (the only multi-word exception to the v0.60.55 rule).
  // v0.62.226 — operator: each tile gets a clear title + a subtitle saying what
  // you can search. Train/Hawker grouped under a "🇸🇬 Singapore" boxed section.
  'tile.cuisine.label':    { en: 'Cuisine or Local Food Pick', fr: 'Cuisine ou plats locaux' },
  'tile.cuisine.sub':      { en: 'Find where to eat — search 50+ cuisines, a dish or a vibe',
                             fr: 'Où manger — 50+ cuisines, un plat ou une envie' },
  'tile.train.label':      { en: 'Train Lines', fr: 'Lignes de train' },
  'tile.train.sub':        { en: 'Live MRT & LRT status, stations and service alerts',
                             fr: 'État en direct du MRT & LRT, stations et alertes' },
  'tile.hawker.label':     { en: 'Hawker Centre', fr: 'Hawker Centre' },
  'tile.hawker.sub':       { en: 'Singapore’s UNESCO-recognised hawker culture, where everyday food and community meet',
                             fr: 'La culture des hawkers de Singapour, reconnue par l’UNESCO, où la cuisine du quotidien rassemble' },
  'section.sg':            { en: '🇸🇬 Singapore', fr: '🇸🇬 Singapour' },
  'tile.recognised.label': { en: 'Recognised',  fr: 'Reconnus' },

  // ----- Discover tiles -----
  // v0.60.113 — 'tile.buddy.label' removed (Buddy feature retired; the
  // hub tile itself was already dropped in v0.60.67).
  'tile.search.label':     { en: 'Search',      fr: 'Recherche' },
  'tile.weather.label':    { en: 'Weather',     fr: 'Météo' },

  // ----- Plan tiles -----
  'tile.location.label':   { en: 'Location',    fr: 'Lieu' },
  'tile.drive.label':      { en: 'Drive',       fr: 'Conduire' },
  'tile.incidents.label':  { en: 'Incidents',   fr: 'Incidents' },
  // v0.60.62 — direct hub access to /transport bus subcommands
  // (previously only reachable via /transport → bus submenu).
  'tile.busNearest.label': { en: 'Bus stops',   fr: 'Arrêts de bus' },
  'tile.busRoute.label':   { en: 'Plan route',  fr: 'Itinéraire' },

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
  'chip.forgetme':         { en: 'Forget me', fr: 'Oublier' },

  // v0.62.31 — stale-travel hint: when device GPS sits far (>50 km) from a
  // LABELLED pick, the auto-detect no longer moves it (v0.62.30 explicit-pick
  // rule) — this hint is the recovery path (operator: "hint, never auto").
  // {label} is interpolated by the caller.
  'loc.farFromPick':       { en: '📍 You seem far from {label} — tap the location field to update.',
                             fr: '📍 Vous semblez loin de {label} — touchez le champ de lieu pour mettre à jour.' },

  // ----- Footer brand line -----
  'footer.brand':          { en: 'Soleat',    fr: 'Soleat' },
  // v0.60.213 — standardised footer tag line (v0.60.217 — restored full form)
  'footer.tag':            { en: 'Experimental · Singapore', fr: 'Expérimental · Singapour' },

  // ----- FAB labels (v0.60.106 — operator FR audit 2026-05-11) -----
  'btn.fabBack':           { en: 'back',  fr: 'retour' },
  'btn.fabEnd':            { en: 'end',   fr: 'fermer' },
  'btn.fabBackAria':       { en: 'Back',  fr: 'Retour' },
  'btn.fabEndAria':        { en: 'End',   fr: 'Fermer' },
  'btn.fabTop':            { en: '⇡ top', fr: '⇡ haut' },
  'btn.fabDown':           { en: '⇣ down', fr: '⇣ bas' },
  'btn.fabTopAria':        { en: 'Back to top',  fr: 'Retour en haut' },
  'btn.fabDownAria':       { en: 'Scroll down',  fr: 'Défiler vers le bas' },

  // v0.60.54 — interaction hint shown under the tile grid.
  'hint.tap':              { en: 'Tap a tile to begin · swipe down to close',
                             fr: 'Touchez une tuile pour commencer · glissez vers le bas pour fermer' },

  // v0.61.123 — LocationFieldMenu (below Plan heading).
  'location.fieldLabel':   { en: '📍 Search anchor',
                             fr: '📍 Point d’ancrage' },
  'location.currentNone':  { en: 'No anchor set — searches use your shared GPS pin or default to Singapore.',
                             fr: 'Aucun point d’ancrage — les recherches utilisent votre position partagée ou défaut Singapour.' },
  'location.currentSet':   { en: 'Anchored at <b>{label}</b>{cap}.',
                             fr: 'Ancré à <b>{label}</b>{cap}.' },
  'location.capNote':      { en: ' · {km} km cap',
                             fr: ' · plafond {km} km' },
  'location.dropdownLabel':{ en: 'Pick a precinct…',
                             fr: 'Choisir un quartier…' },
  'location.dropdownGroupSg':   { en: 'Singapore — STB precincts', fr: 'Singapour — quartiers STB' },
  'location.dropdownGroupSgReg':{ en: 'Singapore — region', fr: 'Singapour — région' },
  'location.dropdownGroupMy':   { en: 'Malaysia', fr: 'Malaisie' },
  'location.searchPlaceholder': { en: 'or type a place name…', fr: 'ou tapez un nom de lieu…' },
  'location.searchSubmit':      { en: 'Set', fr: 'OK' },
  'location.setOk':             { en: '✅ Anchored at {label}.', fr: '✅ Ancré à {label}.' },
  'location.setErr':            { en: '⚠️ Could not set that location. Try a more specific name.',
                                  fr: '⚠️ Impossible de définir ce lieu. Essayez un nom plus spécifique.' },
  // Tooltip surfaced when the user taps a tile / panel disabled by a
  // Malaysia anchor (Hawker, TrainPanel, Incidents, Bus stops, Weather).
  'tile.disabledMy':       { en: 'Singapore only — switch anchor to use this.',
                             fr: 'Singapour uniquement — changez d’ancrage pour utiliser ceci.' },
  // v0.61.124 — appended to the anchor-summary line when a Malaysia
  // anchor is set, so the user understands WHY tiles are dimmed
  // without having to tap one to see the tooltip.
  'location.disabledList': { en: ' (Hawker, Train, Incidents, Bus stops, Weather disabled)',
                             fr: ' (Hawker, Train, Incidents, Arrêts de bus, Météo désactivés)' },
  // v0.61.192 — OTHER-region picker UI. Mirrors the Cuisine TMA's
  // v0.61.191 country-flag dropdown + free-text + Search button +
  // confirmation list flow. Replaces the precinct dropdown +
  // autocomplete when the active anchor is in the OTHER region
  // (Putrajaya / KL / Penang / Tokyo / Sydney / etc.).
  'loc.other.country':         { en: 'Country', fr: 'Pays' },
  // v0.61.226 — cascading child city dropdown next to the country flag.
  'loc.other.city':            { en: 'City',    fr: 'Ville' },
  'loc.other.placeholder':     { en: 'Type a place + Search',
                                 fr: 'Tapez un lieu + Rechercher' },
  'loc.other.searchBtn':       { en: '🔍 Search', fr: '🔍 Rechercher' },
  'loc.other.searching':       { en: 'Searching {country}…',
                                 fr: 'Recherche {country}…' },
  'loc.other.noMatch':         { en: 'No places found in {country}. Try a different name.',
                                 fr: 'Aucun lieu trouvé en {country}. Essayez un autre nom.' },
  'loc.other.confirmHeader':   { en: 'Found in {flag} {country}:',
                                 fr: 'Trouvé en {flag} {country} :' },
  'loc.other.cancel':          { en: '✕ Cancel · type again',
                                 fr: '✕ Annuler · réessayer' },
  // v0.62.x — operator: returning from ≥2 min idle into the Menu TMA also
  // resets the shared Google-rating floor to Good+ 3.7 and announces it
  // (same copy as the Cuisine TMA's reset pop-up).
  'rating.resetTitle':         { en: 'Rating reset: Good+ ≥ 3.7⭐',
                                 fr: 'Note réinitialisée : Bien+ ≥ 3.7⭐' },
  'rating.resetBody':          { en: 'Showing eateries with generally good Google ratings.',
                                 fr: 'Affiche les restaurants généralement bien notés sur Google.' }
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

// v0.60.62 — flip the active locale from inside the menu hub.
// Mirrors the cuisine TMA's setActiveLocale: writes localStorage,
// fires the gia:locale CustomEvent (so every subscribed useLocale
// re-renders), and best-effort POSTs to /api/cuisine/user-language
// so the chat-side /language preference syncs across sessions.
export function setActiveLocale(lang) {
  if (!SUPPORTED_LOCALES.includes(lang)) return;
  try { window.localStorage.setItem(LOCALE_KEY, lang); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang } }));
  try {
    const initData = window.Telegram?.WebApp?.initData || '';
    if (initData) {
      fetch('/api/cuisine/user-language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, lang })
      }).catch(() => { /* silent — local toggle still works */ });
    }
  } catch { /* noop */ }
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
