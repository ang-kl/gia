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
const SUPPORTED_LOCALES = ['en', 'fr', 'id'];

const STRINGS = {
  // Map overlay layers (v0.63.0)
  'layer.parks':               { en: 'Park', fr: 'Parc' },
  'layer.attractions':         { en: 'Attractions', fr: 'Attractions' },
  'layer.taxis':               { en: 'Taxi Stand', fr: 'Station de taxi' },
  'layer.clinics':             { en: 'Clinic / Pharmacy', fr: 'Clinique / Pharmacie' },
  'layer.hospitals':           { en: 'Hospital', fr: 'Hôpital' },
  'layer.police':              { en: 'Police', fr: 'Police' },
  'layer.busstop':             { en: 'Bus Stop', fr: 'Arrêt de bus' },
  'layer.hawker':              { en: 'Hawker', fr: 'Hawker' },
  'layer.colour':              { en: 'Colour', fr: 'Couleur' },
  'layer.colour.on':           { en: '☑️ Monochrome', fr: '☑️ Monochrome' },
  'layer.colour.off':          { en: '🎨 Color', fr: '🎨 Couleur' },
  'layer.open24':              { en: '24 hours', fr: '24 heures' },
  'layer.soon':                { en: 'coming soon', fr: 'bientôt' },
  'map.reset':                 { en: 'Reset view', fr: 'Réinitialiser' },
  'map.more':                  { en: 'More layers', fr: 'Plus de couches' },
  'layer.carpark':             { en: 'Carpark', fr: 'Parking' },
  'layer.exits':               { en: 'Station Exits', fr: 'Sorties de station' },
  'layer.train':               { en: 'Train', fr: 'Train' },
  'layer.all':                 { en: 'All', fr: 'Tout' },
  'map.expand':                { en: 'Expand map', fr: 'Agrandir la carte' },
  'map.collapse':              { en: 'Collapse map', fr: 'Réduire la carte' },
  'map.zoomIn':                { en: 'Zoom in', fr: 'Zoom avant' },
  'map.zoomOut':               { en: 'Zoom out', fr: 'Zoom arrière' },

  // Header banner
  'header.title':              { en: '🇸🇬 Train Map & Status', fr: '🇸🇬 Carte et état du métro' },
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
  'fab.downAria':              { en: 'Scroll down', fr: 'Défiler vers le bas' },

  // v0.60.210 (DF-109) — Google-Map panel (MrtMapPanel): the station
  // InfoWindow popup + the panel chrome. Previously hardcoded English.
  'mrt.opens':                 { en: 'Opens {when}', fr: 'Ouverture {when}' },
  'mrt.openInMap':             { en: 'Open 📍 in a map ↗', fr: 'Ouvrir 📍 dans une carte ↗' },
  'mrt.status.delay':          { en: 'Delay',             fr: 'Retard' },
  'mrt.status.disrupted':      { en: 'Service disrupted', fr: 'Service perturbé' },
  'mrt.status.closure':        { en: 'Closure',           fr: 'Fermeture' },
  'mrt.status.normal':         { en: 'Normal service',    fr: 'Service normal' },
  'mrt.status.unknown':        { en: 'Unknown',           fr: 'Inconnu' },
  'mrt.showing':               { en: 'Showing {code} · {n} stations',
                                 fr: 'Affichage : {code} · {n} stations' },
  'mrt.overview':              { en: 'Overview',          fr: 'Vue d’ensemble' },
  'mrt.backToView':            { en: 'Back ↩',            fr: 'Retour ↩' },
  'mrt.carparks':              { en: 'Carparks',          fr: 'Parkings' },
  'mrt.allNormal':             { en: 'All normal',        fr: 'Tout normal' },
  'mrt.stationsCount':         { en: '{n} stations',      fr: '{n} stations' },
  'mrt.selected':              { en: 'Selected',          fr: 'Sélectionnée' },
  'mrt.future':                { en: 'future',            fr: 'à venir' },
  'mrt.crowd.h':               { en: 'Crowded',           fr: 'Bondé' },
  'mrt.crowd.m':               { en: 'Moderate',          fr: 'Modéré' },
  'mrt.crowd.l':               { en: 'Not crowded',       fr: 'Peu fréquenté' },
  'mrt.exits':                 { en: 'Exits',             fr: 'Sorties' },
  'mrt.busStops':              { en: 'Bus stops',         fr: 'Arrêts de bus' },
  'mrt.taxiStand':             { en: 'Taxi stand',        fr: 'Station de taxi' },
  'mrt.taxiPickup':            { en: 'Taxi pick-up / drop-off', fr: 'Dépose-minute taxi' },
  'mrt.counts':                { en: '🚇 {ops} operational · ⬜ {future} future (greyed)',
                                 fr: '🚇 {ops} en service · ⬜ {future} à venir (grisées)' },
  'mrt.err.stations':          { en: '⚠ Could not load stations:',
                                 fr: '⚠ Impossible de charger les stations :' },
  'mrt.err.nokey':             { en: 'Map unavailable (key not configured).',
                                 fr: 'Carte indisponible (clé non configurée).' },
  'mrt.err.mapfail':           { en: '⚠ Map failed to load.',
                                 fr: '⚠ Échec du chargement de la carte.' },
  'mrt.aria.map':              { en: 'Map of MRT and LRT stations in Singapore',
                                 fr: 'Carte des stations MRT et LRT de Singapour' },

  // v0.60.213 — standardised footer tag line (v0.60.217 — restored full form)
  'footer.tag':                { en: 'Experimental · Singapore', fr: 'Expérimental · Singapour' }
};

// ----- Indonesian (id) overlay — v0.62.306 -----
// Machine-drafted Indonesian, operator-reviewed. Flat key→string overlay merged
// into STRINGS below (existing en/fr untouched; unlisted keys degrade to English).
const ID_STRINGS = {
  'layer.parks': 'Taman',
  'layer.attractions': 'Atraksi',
  'layer.taxis': 'Pangkalan Taksi',
  'layer.clinics': 'Klinik / Apotek',
  'layer.hospitals': 'Rumah Sakit',
  'layer.police': 'Polisi',
  'layer.busstop': 'Halte Bus',
  'layer.hawker': 'Hawker',
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
  'map.expand': 'Perbesar peta',
  'map.collapse': 'Perkecil peta',
  'map.zoomIn': 'Perbesar',
  'map.zoomOut': 'Perkecil',
  'header.title': '🇸🇬 Peta & Status Kereta',
  'header.allNormal': '✓ Semua jalur normal',
  'header.linesAffected': '⚠️ {n} jalur terdampak',
  'header.linesAffectedPlural': '⚠️ {n} jalur terdampak',
  'view.tipToGmap': 'Ketuk "Google Map" untuk menjelajahi setiap stasiun →',
  'view.tipZoomIn': 'Tips: perbesar untuk membaca pin (pusat SG padat)',
  'view.btnSchematic': '🗺 Skema',
  'view.btnGoogleMap': '📍 Google Map',
  'loading': 'Memuat status MRT…',
  'error.unreachable': '⚠️ Tidak bisa memuat status MRT:',
  'ticker.title': 'Gulir untuk melihat jalur kereta lain',
  'ticker.allLines': '⇆ Semua jalur',
  'ticker.allNormal': '✓ Semua jalur normal',
  'fab.back': 'kembali',
  'fab.end': 'tutup',
  'fab.backAria': 'Kembali',
  'fab.endAria': 'Tutup',
  'fab.top': '⇡ atas',
  'fab.down': '⇣ bawah',
  'fab.topAria': 'Kembali ke atas',
  'fab.downAria': 'Gulir ke bawah',
  'mrt.opens': 'Buka {when}',
  'mrt.openInMap': 'Buka 📍 di peta ↗',
  'mrt.status.delay': 'Tertunda',
  'mrt.status.disrupted': 'Layanan terganggu',
  'mrt.status.closure': 'Penutupan',
  'mrt.status.normal': 'Layanan normal',
  'mrt.status.unknown': 'Tidak diketahui',
  'mrt.showing': 'Menampilkan {code} · {n} stasiun',
  'mrt.overview': 'Ikhtisar',
  'mrt.backToView': 'Kembali ↩',
  'mrt.carparks': 'Parkir',
  'mrt.allNormal': 'Semua normal',
  'mrt.stationsCount': '{n} stasiun',
  'mrt.selected': 'Dipilih',
  'mrt.future': 'akan datang',
  'mrt.crowd.h': 'Padat',
  'mrt.crowd.m': 'Sedang',
  'mrt.crowd.l': 'Tidak padat',
  'mrt.exits': 'Pintu Keluar',
  'mrt.busStops': 'Halte bus',
  'mrt.taxiStand': 'Pangkalan taksi',
  'mrt.taxiPickup': 'Naik / turun taksi',
  'mrt.counts': '🚇 {ops} beroperasi · ⬜ {future} akan datang (abu-abu)',
  'mrt.err.stations': '⚠ Tidak bisa memuat stasiun:',
  'mrt.err.nokey': 'Peta tidak tersedia (kunci belum dikonfigurasi).',
  'mrt.err.mapfail': '⚠ Peta gagal dimuat.',
  'mrt.aria.map': 'Peta stasiun MRT dan LRT di Singapura',
  'footer.tag': 'Eksperimental · Singapura',
};
for (const k in ID_STRINGS) {
  if (STRINGS[k] && STRINGS[k].id == null) STRINGS[k].id = ID_STRINGS[k];
}

export function t(key, lang) {
  const l = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] ?? entry.en ?? key;
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
