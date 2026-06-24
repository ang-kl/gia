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
const SUPPORTED = ['en', 'fr', 'id', 'ru', 'de'];

const STRINGS = {
  // Header
  'header.title':            { en: '🍚 Hawker Centre (2025)', fr: '🍚 Centre de hawker (2025)' },
  'header.versionCount':     { en: 'v{v} · {n} centres', fr: 'v{v} · {n} centres' },
  'header.versionOnly':      { en: 'v{v}', fr: 'v{v}' },

  // Status
  'status.loading':          { en: 'Loading…', fr: 'Chargement…' },

  // Map overlay layers (v0.61.0)
  'layer.parks':             { en: 'Park', fr: 'Parc' },
  'layer.attractions':       { en: 'Attractions', fr: 'Attractions' },
  'layer.taxis':             { en: 'Taxi Stand', fr: 'Station de taxi' },
  'layer.clinics':           { en: 'Clinic / Pharmacy', fr: 'Clinique / Pharmacie' },
  'layer.hospitals':         { en: 'Hospital', fr: 'Hôpital' },
  'layer.police':            { en: 'Police', fr: 'Police' },
  'layer.busstop':           { en: 'Bus Stop', fr: 'Arrêt de bus' },
  'layer.colour':            { en: 'Colour', fr: 'Couleur' },
  'layer.colour.on':         { en: '☑️ Monochrome', fr: '☑️ Monochrome' },
  'layer.colour.off':        { en: '🎨 Color', fr: '🎨 Couleur' },
  'layer.open24':            { en: '24 hours', fr: '24 heures' },
  'layer.soon':              { en: 'coming soon', fr: 'bientôt' },
  'map.reset':               { en: 'Reset view', fr: 'Réinitialiser' },
  'map.more':                { en: 'More layers', fr: 'Plus de couches' },
  'layer.carpark':           { en: 'Carpark', fr: 'Parking' },
  'layer.exits':             { en: 'Station Exits', fr: 'Sorties de station' },
  'layer.train':             { en: 'Train', fr: 'Train' },
  'layer.all':               { en: 'All', fr: 'Tout' },

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
  // v0.60.66 — unified label pattern across the four region-map
  // buttons: "## 📍 in a map ↗" (where ## is "Full" or a pin range).
  // Replaces the cut-off "🗺 Fullscreen map ↗" label that overflowed
  // when the 4-button row landed on a 27-pin region.
  'btn.openFullscreenMap':   { en: 'Full 📍 in a map ↗',
                               fr: 'Plein 📍 dans une carte ↗' },
  'btn.viewAllOnMap':        { en: '🗺 View {n} Hawker Centres on the map',
                               fr: '🗺 Voir {n} centres sur la carte' },
  'btn.openAllOnGoogleMaps': { en: '🗺 Open all {n} on Google Maps',
                               fr: '🗺 Voir les {n} sur Google Maps' },
  // v0.60.56 — external "tour" URL pinning every centre with coords.
  'btn.openTourGoogleMaps':  { en: '🌐 {n} pins in Google Maps',
                               fr: '🌐 {n} épingles sur Google Maps' },
  // v0.60.61 — paginated tour-URL chunks. v0.60.62 — bumped to 3
  // chunks (covers regions with 23–33 centres). v0.60.66 — label
  // unified with the fullscreen button as "## 📍 in a map ↗" so
  // every button in the row reads the same way. Layout switches to
  // 2x2 (grid-cols-2) when 4 buttons are present, so the longer
  // text fits.
  'btn.openTourGoogleMapsRange': { en: '{from}–{to} 📍 in a map ↗',
                                   fr: '{from}–{to} 📍 dans une carte ↗' },
  'map.mappedRatio':         { en: '📍 {mapped}/{total} centres mapped',
                               fr: '📍 {mapped}/{total} centres cartographiés' },

  // v0.60.41 — embedded HawkerMapPanel strings.
  'map.expand':              { en: 'Expand map', fr: 'Agrandir la carte' },
  'map.collapse':            { en: 'Collapse map', fr: 'Réduire la carte' },
  'map.zoomIn':              { en: 'Zoom in', fr: 'Zoom avant' },
  'map.zoomOut':             { en: 'Zoom out', fr: 'Zoom arrière' },
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
  // v0.60.106 — FAB labels (back / end / top / down) for the bottom-
  // left BackFab + bottom-right scroll FAB. Operator FR audit 2026-05-11.
  'btn.fabBack':             { en: 'back',  fr: 'retour' },
  'btn.fabEnd':              { en: 'end',   fr: 'fermer' },
  'btn.fabBackAria':         { en: 'Back',  fr: 'Retour' },
  'btn.fabEndAria':          { en: 'End',   fr: 'Fermer' },
  'btn.fabTop':              { en: '⇡ top', fr: '⇡ haut' },
  'btn.fabDown':             { en: '⇣ down', fr: '⇣ bas' },
  'btn.fabTopAria':          { en: 'Back to top',  fr: 'Retour en haut' },
  'btn.fabDownAria':         { en: 'Scroll down',  fr: 'Défiler vers le bas' },
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
  'stalls.status.existing':              { en: 'Operating',          fr: 'Opérationnel' },
  'stalls.status.existing_new':          { en: 'New',                fr: 'Nouveau' },
  'stalls.status.existing_replacement':  { en: 'Replaced',           fr: 'Reconstruit' },
  'stalls.status.interim_centre':        { en: 'Interim',            fr: 'Centre temporaire' },
  'stalls.status.under_construction':    { en: 'Under construction', fr: 'En construction' },
  'stalls.status.proposed':              { en: 'Proposed',           fr: 'Proposé' },

  // v0.60.213 — standardised footer tag line (v0.60.217 — restored full form)
  'footer.tag':                          { en: 'Experimental · Singapore', fr: 'Expérimental · Singapour' }
};

// ----- Indonesian (id) overlay — v0.62.306 -----
// Machine-drafted Indonesian, operator-reviewed. Flat key→string overlay merged
// into STRINGS below (existing en/fr untouched; t()'s `entry[l] || entry.en`
// degrades any unlisted key to English). Hawker "hawker centre" → "pusat jajan".
const ID_STRINGS = {
  'header.title': '🍚 Pusat Jajan (2025)',
  'header.versionCount': 'v{v} · {n} pusat',
  'header.versionOnly': 'v{v}',
  'status.loading': 'Memuat…',
  'layer.parks': 'Taman',
  'layer.attractions': 'Atraksi',
  'layer.taxis': 'Pangkalan Taksi',
  'layer.clinics': 'Klinik / Apotek',
  'layer.hospitals': 'Rumah Sakit',
  'layer.police': 'Polisi',
  'layer.busstop': 'Halte Bus',
  'layer.colour': 'Warna',
  'layer.colour.on': '☑️ Monokrom',
  'layer.colour.off': '🎨 Warna',
  'layer.open24': '24 jam',
  'layer.soon': 'segera hadir',
  'map.reset': 'Atur ulang tampilan',
  'map.more': 'Lapisan lainnya',
  'layer.carpark': 'Parkir',
  'layer.exits': 'Pintu Keluar Stasiun',
  'layer.train': 'Kereta',
  'layer.all': 'Semua',
  'region.Central': 'Tengah',
  'region.South': 'Selatan',
  'region.East': 'Timur',
  'region.North': 'Utara',
  'region.West': 'Barat',
  'list.headingBody': ' — {n} pusat jajan (menurut abjad)',
  'btn.openFullscreenMap': 'Penuh 📍 di peta ↗',
  'btn.viewAllOnMap': '🗺 Lihat {n} Pusat Jajan di peta',
  'btn.openAllOnGoogleMaps': '🗺 Buka semua {n} di Google Maps',
  'btn.openTourGoogleMaps': '🌐 {n} pin di Google Maps',
  'btn.openTourGoogleMapsRange': '{from}–{to} 📍 di peta ↗',
  'map.mappedRatio': '📍 {mapped}/{total} pusat dipetakan',
  'map.expand': 'Perbesar peta',
  'map.collapse': 'Perkecil peta',
  'map.zoomIn': 'Perbesar',
  'map.zoomOut': 'Perkecil',
  'map.loading': 'Memuat peta…',
  'map.nokey': 'Peta tidak tersedia (kunci belum dikonfigurasi).',
  'map.noCoords': 'Koordinat pusat jajan belum dimuat — gunakan daftar di bawah.',
  'map.openInGoogleMaps': '📍 Buka di Google Maps',
  'map.aria': 'Peta pusat jajan di wilayah aktif',
  'btn.maps': '📍 Peta',
  'btn.fabBack': 'kembali',
  'btn.fabEnd': 'tutup',
  'btn.fabBackAria': 'Kembali',
  'btn.fabEndAria': 'Tutup',
  'btn.fabTop': '⇡ atas',
  'btn.fabDown': '⇣ bawah',
  'btn.fabTopAria': 'Kembali ke atas',
  'btn.fabDownAria': 'Gulir ke bawah',
  'btn.saveToChat': '📤 Simpan ke chat',
  'btn.saving': 'Mengirim…',
  'msg.savedClose': 'Terkirim ke chat. Anda bisa menutup tampilan ini.',
  'msg.saveFailed': 'Tidak bisa mengirim ke chat — silakan coba lagi.',
  'stalls.count': '🍳 {n} kios',
  'stalls.status.existing': 'Beroperasi',
  'stalls.status.existing_new': 'Baru',
  'stalls.status.existing_replacement': 'Dibangun ulang',
  'stalls.status.interim_centre': 'Sementara',
  'stalls.status.under_construction': 'Dalam pembangunan',
  'stalls.status.proposed': 'Diusulkan',
  'footer.tag': 'Eksperimental · Singapura',
};
for (const k in ID_STRINGS) {
  if (STRINGS[k] && STRINGS[k].id == null) STRINGS[k].id = ID_STRINGS[k];
}

function pickLang(lang) { return SUPPORTED.includes(lang) ? lang : 'en'; }

export function t(key, lang) {
  const l = pickLang(lang);
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] ?? entry.en ?? key;
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
