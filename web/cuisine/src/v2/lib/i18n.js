// i18n.js — v0.58.55
//
// Tiny EN/FR localisation layer for the cuisine TMA. Two languages
// only (English + French per Human Lead). No dependency on a big i18n
// runtime — a flat key-table + tiny React hook.
//
// Public surface:
//   t(key, lang?)       — pure string lookup, EN fallback
//   getActiveLocale()   — reads localStorage 'gia.locale' OR
//                         Telegram WebApp language_code OR navigator,
//                         maps to 'en' / 'fr' (default 'en')
//   setActiveLocale(l)  — writes localStorage + dispatches 'gia:locale'
//                         CustomEvent so all subscribed components
//                         re-render
//   useLocale()         — React hook returning [lang, setLang]
//
// Lookup is forgiving: missing keys fall back to the EN string. If the
// EN string is also missing, returns the key itself (so a missing
// translation still ships *some* legible text).

import { useEffect, useState } from 'react';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';

const STRINGS = {
  // ----- TMA chrome -----
  'header.tagline':            { en: '💬 Tell me or 🔍 Search', fr: '💬 Dis-moi ou 🔍 Rechercher' },
  'region.singapore':          { en: 'Singapore', fr: 'Singapour' },
  'region.johor':              { en: 'Johor Bahru', fr: 'Johor Bahru' },
  // v0.60.213 — two-line footer.
  'footer.howto':              { en: '📍 Enter location or 💬 type dish · Tap 🔍 to search',
                                 fr: '📍 Saisir un lieu ou 💬 taper un plat · 🔍 pour rechercher' },
  'footer.experimental':       { en: 'Experimental', fr: 'Expérimental' },

  // ----- Banners (above map) -----
  'banner.locating':           { en: 'Searching nearby', fr: 'Recherche à proximité' },
  'banner.locating.suffix':    { en: 'finding places…', fr: 'recherche de lieux…' },
  'banner.anchor':             { en: 'Anchor set', fr: 'Point d’ancrage défini' },
  'banner.no.match':           { en: 'no places match — try Tell me, or share a fresh pin via /location.', fr: 'aucun lieu ne correspond — essayez Dis-moi, ou partagez une nouvelle position via /location.' },
  'banner.showing':            { en: 'Showing places', fr: 'Lieux affichés' },
  'banner.places.one':         { en: '1 place nearby', fr: '1 lieu à proximité' },
  'banner.places.many':        { en: '{n} places nearby', fr: '{n} lieux à proximité' },

  // ----- Filters -----
  'filter.openNow':            { en: 'Open now', fr: 'Ouvert maintenant' },
  'filter.halal':              { en: 'Halal', fr: 'Halal' },
  'filter.vegetarian':         { en: 'Vegetarian', fr: 'Végétarien' },
  'filter.homeBased':          { en: 'Home-based', fr: 'À domicile' },
  'filter.newlyOpened':        { en: 'Newly opened', fr: 'Récemment ouvert' },
  // v0.60.165 — 🐾 Pet allowed chip. Strict mode shows only Places
  // tagged `allowsDogs=true`; text-query fallback when strict yields
  // < 3 venues. v0.60.166: capital P per operator second-pass review
  // ("Pet allowed", was "pet allowed").
  // v0.60.168: FR tightened from 'Animaux acceptés' (literally
  // "accepted") to 'Animaux autorisés' (literally "allowed") so it
  // tracks the EN "Pet allowed" semantically per operator review.
  // v0.60.182: shortened to "Pet" / "Animaux" (was "Pet allowed" /
  // "Animaux autorisés") — chip promoted to PRIMARY row beside Halal,
  // so the longer copy ate too much horizontal space on phones.
  'filter.petFriendly':        { en: 'Pet', fr: 'Animaux' },
  'filter.price':              { en: 'Price', fr: 'Prix' },
  'filter.openPrice':          { en: 'Open price selector', fr: 'Ouvrir le sélecteur de prix' },
  'filter.closePrice':         { en: 'Close price selector', fr: 'Fermer le sélecteur de prix' },
  'filter.openMore':           { en: 'Open more filters', fr: 'Ouvrir plus de filtres' },
  'filter.closeMore':          { en: 'Close more filters', fr: 'Fermer plus de filtres' },

  // ----- Map overlay layers (v0.61.0) -----
  'layer.parks':               { en: 'Parks', fr: 'Parcs' },
  'layer.attractions':         { en: 'Attractions', fr: 'Attractions' },
  'layer.taxis':               { en: 'Taxis', fr: 'Taxis' },
  'layer.carpark':             { en: 'Carpark', fr: 'Parking' },
  'layer.exits':               { en: 'Exits', fr: 'Sorties' },
  'layer.train':               { en: 'Train', fr: 'Métro' },
  'layer.nearby':              { en: 'Nearby', fr: 'À proximité' },
  'layer.all':                 { en: 'All', fr: 'Tout' },
  'layer.details':             { en: 'Details', fr: 'Détails' },

  // ----- Cuisine drawer -----
  'cuisine.drawerTitle':       { en: 'Cuisines', fr: 'Cuisines' },
  'cuisine.back':              { en: 'Back', fr: 'Retour' },
  'cuisine.done':              { en: 'Done', fr: 'Terminé' },

  // ----- Buttons -----
  'btn.search':                { en: '🔍 Search', fr: '🔍 Rechercher' },
  'btn.searching':             { en: 'Searching…', fr: 'Recherche…' },
  // v0.60.43 — replaces the hardcoded "…" literal in the criteria-card
  // Search pill. Per Human Lead 2026-05-08 — the bare ellipsis read
  // as "broken" rather than "loading"; explicit prose reassures.
  'btn.searchPleaseWait':      { en: 'Please wait …', fr: 'Veuillez patienter …' },
  'btn.searchFull':            { en: '🔍 Search · Show me places to eat', fr: '🔍 Rechercher · Trouvez où manger' },
  'btn.clear':                 { en: 'Clear', fr: 'Effacer' },
  // v0.60.43 — drawer "Clear all" relabel. The criteria-card pill
  // ("Clear") wipes EVERYTHING (cuisines + filters + region); the
  // drawer's button only wipes cuisines. Renaming makes the narrower
  // scope explicit.
  'btn.clearCuisines':         { en: 'Clear cuisines', fr: 'Effacer les cuisines' },
  'btn.copyAll':               { en: '📋 Copy all', fr: '📋 Tout copier' },
  'btn.copied':                { en: '✓ Copied to chat', fr: '✓ Copié vers le chat' },
  'btn.copySyntax':            { en: '🔗 Copy /cuisine command', fr: '🔗 Copier la commande /cuisine' },
  'btn.copyOne':               { en: '📋 Copy', fr: '📋 Copier' },
  'btn.collapse':              { en: 'Collapse ▴', fr: 'Réduire ▴' },
  'btn.editSearch':            { en: 'Edit search ▾', fr: 'Modifier la recherche ▾' },
  'btn.backToTop':             { en: 'Back to top', fr: 'Retour en haut' },
  // v0.60.106 — FAB labels (back / end). Operator FR audit 2026-05-11.
  'btn.fabBack':               { en: 'back',  fr: 'retour' },
  'btn.fabEnd':                { en: 'end',   fr: 'fermer' },
  'btn.fabBackAria':           { en: 'Back',  fr: 'Retour' },
  'btn.fabEndAria':            { en: 'End',   fr: 'Fermer' },
  // v0.60.58 — short-form label for the FAB ("⇡ top" / "⇡ haut").
  // The long-form key above stays as the aria-label for screen readers.
  'btn.topShort':              { en: '⇡ top', fr: '⇡ haut' },
  // v0.60.95 — operator standardised down/top/end labels across TMAs.
  'btn.downShort':             { en: '⇣ down', fr: '⇣ bas' },
  'btn.showLocation':          { en: 'Show your location', fr: 'Afficher votre position' },

  // ----- Result card -----
  'card.open':                 { en: 'Open', fr: 'Ouvert' },
  'card.closed':               { en: 'Closed', fr: 'Fermé' },
  // v0.59.23 / v0.59.24 — "Try ·" line on cuisine ResultCards
  // (mirrors /hidden's signature_dish surface). Per Human Lead
  // 2026-05-07: label trimmed to a tight "Try ·" form, same emoji
  // glyph used at the start of the dish line.
  'card.whatToOrder':          { en: 'Try', fr: 'Essayez' },
  'card.healthierChoice':      { en: 'Healthier Choice', fr: 'Choix santé' },
  'card.insideBuilding':       { en: 'Inside a building complex', fr: 'Dans un complexe immobilier' },

  // ----- End-of-list / dedup exhaustion (v0.60.115/117) -----
  'result.exhausted':          { en: '— You’ve now seen all {n} places I can find for these criteria, across several searches. Add or change a cuisine / filter, or use 💬 Tell me, to widen things — or ',
                                 fr: '— Vous avez vu les {n} établissements que je peux trouver pour ces critères, sur plusieurs recherches. Ajoutez ou modifiez une cuisine / un filtre, ou utilisez 💬 Dites-moi, pour élargir — ou ' },
  'result.exhaustedOne':       { en: '— That’s the only place I can find for these criteria. Add or change a cuisine / filter, or use 💬 Tell me, to find more — or ',
                                 fr: '— C’est le seul établissement que je peux trouver pour ces critères. Ajoutez ou modifiez une cuisine / un filtre, ou utilisez 💬 Dites-moi — ou ' },
  'result.exhaustedNoCount':   { en: '— You’ve now seen everything I can find for these criteria, across several searches. Add or change a cuisine / filter, or use 💬 Tell me, to widen things — or ',
                                 fr: '— Vous avez tout vu pour ces critères, sur plusieurs recherches. Ajoutez ou modifiez une cuisine / un filtre, ou utilisez 💬 Dites-moi, pour élargir — ou ' },
  'result.startOver':          { en: '↺ start over.', fr: '↺ recommencer.' },

  // ----- Zero-results auto-retry CTA (v0.60.157) -----
  'result.noMatchAfterRetry':  { en: 'No matches even after a fresh search. Try widening your criteria above, or tap below to reset filters and try again.',
                                 fr: 'Aucun résultat même après une nouvelle recherche. Essayez d’élargir vos critères ci-dessus, ou touchez ci-dessous pour réinitialiser les filtres et réessayer.' },
  'btn.resetFiltersRetry':     { en: '🔄 Reset filters & retry', fr: '🔄 Réinitialiser et réessayer' },

  // ----- Tell me panel -----
  'tellme.placeholder':        { en: 'What are you craving? e.g. spicy thai', fr: 'Quelle est votre envie ? ex. thaï épicé' },
  'tellme.aria':               { en: 'Tell me what you’re craving', fr: 'Dites-moi ce dont vous avez envie' },
  'tellme.submit':             { en: 'Submit', fr: 'Envoyer' },

  // ----- Location field -----
  'loc.searchLocation':        { en: 'Search location', fr: 'Rechercher un lieu' },
  'loc.clear':                 { en: 'Clear location', fr: 'Effacer le lieu' },

  // ----- MapPanel InfoWindow -----
  'map.expand':                { en: 'Expand map', fr: 'Agrandir la carte' },
  'map.collapse':              { en: 'Collapse map', fr: 'Réduire la carte' },
  'map.zoomIn':                { en: 'Zoom in', fr: 'Zoom avant' },
  'map.zoomOut':               { en: 'Zoom out', fr: 'Zoom arrière' },
  'map.youAreHere':            { en: 'You are here', fr: 'Vous êtes ici' },
  'map.yourAnchor':            { en: 'your search anchor', fr: 'votre point d’ancrage' },
  'map.tapPin':                { en: 'Tap pin → Google Maps', fr: 'Touchez l’épingle → Google Maps' },
  'map.openInMaps':            { en: '📍 Open in Google Maps', fr: '📍 Ouvrir dans Google Maps' },

  // ----- Errors / toasts -----
  'err.copyFailed':            { en: 'Couldn’t send to chat — try again.', fr: 'Impossible d’envoyer au chat — réessayez.' },
  'err.commandFailed':         { en: 'Couldn’t send the command. Try again in a moment.', fr: 'Impossible d’envoyer la commande. Réessayez dans un instant.' },

  // ----- Locale toggle -----
  'locale.switchToEn':         { en: 'Switch to English', fr: 'Passer en anglais' },
  'locale.switchToFr':         { en: 'Switch to French', fr: 'Passer en français' },

  // ----- Location field (v0.59.12) -----
  'loc.enterHint':             { en: '↵ Press Enter to use the top result', fr: '↵ Appuyez sur Entrée pour le premier résultat' },
  'loc.noMatch':               { en: 'No match — try a more specific name', fr: 'Aucun résultat — essayez un nom plus précis' },

  // ----- Cuisine drawer category labels (v0.59.6) -----
  // Server returns canonical EN labels via /api/cuisine/catalogue. The
  // TMA renders via this lookup keyed by category id so the drawer
  // cards flip with the active locale. Keys mirror cuisines-vault.js
  // CATEGORY_META ids.
  'cat.commonHere':            { en: 'Common in Singapore', fr: 'Courant à Singapour' },
  'cat.southeastAsian':        { en: 'Southeast Asian', fr: 'Asie du Sud-Est' },
  'cat.eastAsian':             { en: 'East Asian', fr: 'Asie de l’Est' },
  'cat.chinaRegional':         { en: 'China (Regional)', fr: 'Chine (régional)' },
  'cat.southAsian':            { en: 'South Asian', fr: 'Asie du Sud' },
  'cat.middleEastern':         { en: 'Middle Eastern & Central Asian', fr: 'Moyen-Orient & Asie centrale' },
  'cat.european':              { en: 'European', fr: 'Européenne' },
  'cat.americas':              { en: 'Americas', fr: 'Amériques' },
  'cat.australasia':           { en: 'Australasia', fr: 'Australasie' },
  'cat.african':               { en: 'African', fr: 'Africaine' }
};

export const SUPPORTED_LOCALES = ['en', 'fr'];

export function t(key, lang) {
  const l = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] || entry.en || key;
}

// Substitute {placeholder} tokens in a translated string.
// Only used where pluralisation / dynamic-N is needed.
export function tn(key, lang, vars = {}) {
  const raw = t(key, lang);
  return raw.replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : `{${name}}`));
}

function detectFromTelegram() {
  if (typeof window === 'undefined') return null;
  const tg = window.Telegram?.WebApp;
  const code = tg?.initDataUnsafe?.user?.language_code;
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

export function setActiveLocale(lang) {
  if (!SUPPORTED_LOCALES.includes(lang)) return;
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LOCALE_KEY, lang); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang } }));
  // v0.59.0: best-effort POST to /api/cuisine/user-language so chat
  // replies (deliverPicks, free-text, /hidden) follow the same
  // preference. Lazy-import to avoid a circular dep at module init.
  import('./api.js').then((m) => m.setUserLanguageRemote?.(lang)).catch(() => {});
}

// v0.59.0: track whether we've hydrated from the server's per-user
// preference. Module-level latch so multiple useLocale() calls in
// different components don't each fire a redundant fetch.
let serverHydrated = false;
async function hydrateFromServerOnce() {
  if (serverHydrated) return;
  serverHydrated = true;
  try {
    const m = await import('./api.js');
    const remote = await m.fetchUserLanguage?.();
    if (SUPPORTED_LOCALES.includes(remote)) {
      // Quietly write to localStorage + fire the locale event so
      // every subscribed component re-renders. Skip the POST that
      // setActiveLocale would otherwise make (the value just came
      // from the server — round-tripping is wasteful).
      try { window.localStorage.setItem(LOCALE_KEY, remote); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang: remote } }));
    }
  } catch { /* offline / 401 / 404 — keep local fallback */ }
}

// React hook: returns [lang, setLang]. Re-renders on locale change
// (own setActiveLocale call OR another tab — storage + custom event).
// On first mount, hydrates from the server's stored preference so the
// TMA matches whatever the user last set via /language in chat.
export function useLocale() {
  const [lang, setLangState] = useState(() => getActiveLocale());
  useEffect(() => {
    function onLocale(e) {
      const next = e?.detail?.lang || getActiveLocale();
      setLangState(next);
    }
    function onStorage(e) {
      if (e.key === LOCALE_KEY) setLangState(getActiveLocale());
    }
    window.addEventListener(LOCALE_EVENT, onLocale);
    window.addEventListener('storage', onStorage);
    hydrateFromServerOnce();
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocale);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return [lang, (next) => { setActiveLocale(next); setLangState(next); }];
}
