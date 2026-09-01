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
const SUPPORTED = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

const STRINGS = {
  // Header
  'header.title':            { en: '🍚 Hawker Centre (2026)', fr: '🍚 Centre de hawker (2026)' },
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
  'ui.refresh': { en: 'Refresh', fr: 'Actualiser' },
  'ui.centreMap': { en: 'Centre map', fr: 'Centrer la carte' },
  'hawker.centres': { en: 'centres', fr: 'centres' },
  'hawker.closedCleaning': { en: 'Closed for cleaning till {till}', fr: 'Fermé pour nettoyage jusqu\'au {till}' },
  'hawker.redevelopment': { en: 'Redevelopment till {till}', fr: 'Réaménagement jusqu\'au {till}' },
  'hawker.renovation': { en: 'Under Renovation till {till}', fr: 'En rénovation jusqu\'au {till}' },
  'link.googleMap': { en: 'Google Map ↗', fr: 'Google Maps ↗' },
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
  // v0.62.547 — tablet map/cards toggle (operator): hide the card carousel to
  // reveal the full-bleed map, tap again to bring the cards back. "Map" reveals
  // the map (cards currently shown); "Cards" brings the card carousel back (map
  // currently full). v0.62.554 — operator: the collapsed content is the CARD
  // carousel, so the label is "Cards", not "List".
  'btn.showMap':             { en: 'Map',   fr: 'Carte' },
  'btn.showList':            { en: 'Cards', fr: 'Cartes' },
  // v0.62.648 — the carousel ⇄ list-drawer toggle (Transport parity: the label
  // names the view you'll switch TO).
  'layout.list':             { en: '⊿ List', fr: '⊿ Liste' },
  'layout.map':              { en: '◸ Map',  fr: '◸ Carte' },
  // v0.60.53 — copy-to-chat companion button per centre.
  // v0.62.677 — operator: relabel to match Cuisine TMA's "📋 Copy" wording
  // (btn.copyOne) for terminology consistency across TMAs. Key name and
  // underlying save-pick mechanism are UNCHANGED — this is a label-only fix.
  'btn.saveToChat':          { en: '📋 Copy', fr: '📋 Copier' },
  'btn.saving':              { en: 'Sending…', fr: 'Envoi…' },
  // v0.62.679 — O-95 (operator): "Copy" now stays open (no more tg().close()),
  // matching Cuisine's copy() flow exactly, incl. its post-success confirmation
  // wording (Cuisine's card.sent — same key name, same EN/FR text).
  'card.sent':               { en: '✓ Sent', fr: '✓ Envoyé' },
  // v0.62.678 — collapse/expand toggle, parity with Cuisine's card.detailsMore/
  // detailsLess and Train's mrt.detailsMore/detailsLess (operator's typography/
  // card-height audit). Simpler wording than Cuisine's ("details, review &
  // links") since a Hawker card has no review content behind the toggle —
  // matches Train's plain "details"/"less".
  'btn.detailsMore':         { en: 'details', fr: 'détails' },
  'btn.detailsLess':         { en: 'less', fr: 'moins' },
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
  'footer.tag':                          { en: 'Experimental · Singapore', fr: 'Expérimental · Singapour' },

  // P1-e — accessible names: bottom-sheet drag handle, the footer NEA ↗ link,
  // and the LocaleToggle menu. EN+FR here; id/ru/de/zh/ja/es in the overlays.
  'sheet.dragHandle':                    { en: 'Drag to resize the list', fr: 'Faites glisser pour redimensionner la liste' },
  'link.neaAria':                        { en: 'Open the NEA website', fr: 'Ouvrir le site de la NEA' },
  'localeToggle.language':               { en: 'Language', fr: 'Langue' },
  'localeToggle.close':                  { en: 'Close', fr: 'Fermer' }
};

// ----- Indonesian (id) overlay — v0.62.306 -----
// Machine-drafted Indonesian, operator-reviewed. Flat key→string overlay merged
// into STRINGS below (existing en/fr untouched; t()'s `entry[l] || entry.en`
// degrades any unlisted key to English). Hawker "hawker centre" → "pusat jajan".
const ID_STRINGS = {
  'header.title': '🍚 Pusat Jajan (2026)',
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
  'ui.refresh': 'Muat ulang',
  'ui.centreMap': 'Pusatkan peta',
  'hawker.centres': 'pusat',
  'hawker.closedCleaning': 'Tutup untuk pembersihan hingga {till}',
  'hawker.redevelopment': 'Pembangunan ulang hingga {till}',
  'hawker.renovation': 'Sedang direnovasi hingga {till}',
  'link.googleMap': 'Google Maps ↗',
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
  'btn.saveToChat': '📋 Salin',
  'btn.saving': 'Mengirim…',
  'btn.detailsMore': 'detail',
  'btn.detailsLess': 'ringkas',
  'card.sent': '✓ Terkirim',
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

  "btn.showMap": "Peta",
  "btn.showList": "Kartu",
  "layout.list": "⊿ Daftar",
  "layout.map": "◸ Peta",
  "sheet.dragHandle": "Seret untuk mengubah ukuran daftar",
  "link.neaAria": "Buka situs NEA",
  "localeToggle.language": "Bahasa",
  "localeToggle.close": "Tutup",
};
for (const k in ID_STRINGS) {
  if (STRINGS[k] && STRINGS[k].id == null) STRINGS[k].id = ID_STRINGS[k];
}

// ----- Russian (ru) overlay — v0.62.310. Control labels kept tight to fit EN pills. -----
const RU_STRINGS = {
  'header.title': '🍚 Хокер-центр (2026)',
  'header.versionCount': 'v{v} · {n} центров',
  'header.versionOnly': 'v{v}',
  'status.loading': 'Загрузка…',
  'layer.parks': 'Парк',
  'layer.attractions': 'Достопримеч.',
  'layer.taxis': 'Стоянка такси',
  'layer.clinics': 'Клиника / Аптека',
  'layer.hospitals': 'Больница',
  'layer.police': 'Полиция',
  'layer.busstop': 'Остановка',
  'ui.refresh': 'Обновить',
  'ui.centreMap': 'Центрировать карту',
  'hawker.centres': 'центров',
  'hawker.closedCleaning': 'Закрыто на уборку до {till}',
  'hawker.redevelopment': 'Реконструкция до {till}',
  'hawker.renovation': 'На ремонте до {till}',
  'link.googleMap': 'Google Карты ↗',
  'layer.colour': 'Цвет',
  'layer.colour.on': '☑️ Моно',
  'layer.colour.off': '🎨 Цвет',
  'layer.open24': '24 часа',
  'layer.soon': 'скоро',
  'map.reset': 'Сбросить вид',
  'map.more': 'Ещё слои',
  'layer.carpark': 'Парковка',
  'layer.exits': 'Выходы',
  'layer.train': 'Поезд',
  'layer.all': 'Все',
  'region.Central': 'Центр',
  'region.South': 'Юг',
  'region.East': 'Восток',
  'region.North': 'Север',
  'region.West': 'Запад',
  'list.headingBody': ' — {n} хокер-центров (по алфавиту)',
  'btn.openFullscreenMap': 'Всё 📍 на карте ↗',
  'btn.viewAllOnMap': '🗺 Показать {n} хокер-центров на карте',
  'btn.openAllOnGoogleMaps': '🗺 Открыть все {n} в Google Maps',
  'btn.openTourGoogleMaps': '🌐 {n} меток в Google Maps',
  'btn.openTourGoogleMapsRange': '{from}–{to} 📍 на карте ↗',
  'map.mappedRatio': '📍 {mapped}/{total} центров на карте',
  'map.expand': 'Развернуть карту',
  'map.collapse': 'Свернуть карту',
  'map.zoomIn': 'Приблизить',
  'map.zoomOut': 'Отдалить',
  'map.loading': 'Загрузка карты…',
  'map.nokey': 'Карта недоступна (ключ не настроен).',
  'map.noCoords': 'Координаты хокер-центров ещё не загружены — см. список ниже.',
  'map.openInGoogleMaps': '📍 Открыть в Google Maps',
  'map.aria': 'Карта хокер-центров в активном регионе',
  'btn.maps': '📍 Карта',
  'btn.fabBack': 'назад',
  'btn.fabEnd': 'закрыть',
  'btn.fabBackAria': 'Назад',
  'btn.fabEndAria': 'Закрыть',
  'btn.fabTop': '⇡ вверх',
  'btn.fabDown': '⇣ вниз',
  'btn.fabTopAria': 'Наверх',
  'btn.fabDownAria': 'Вниз',
  'btn.saveToChat': '📋 Копировать',
  'btn.saving': 'Отправка…',
  'btn.detailsMore': 'детали',
  'btn.detailsLess': 'меньше',
  'card.sent': '✓ Отправлено',
  'msg.savedClose': 'Отправлено в чат. Можно закрыть это окно.',
  'msg.saveFailed': 'Не удалось отправить в чат — попробуйте ещё раз.',
  'stalls.count': '🍳 {n} прилавков',
  'stalls.status.existing': 'Работает',
  'stalls.status.existing_new': 'Новый',
  'stalls.status.existing_replacement': 'Заменён',
  'stalls.status.interim_centre': 'Временный',
  'stalls.status.under_construction': 'Строится',
  'stalls.status.proposed': 'Планируется',
  'footer.tag': 'Экспериментально · Сингапур',

  "btn.showMap": "Карта",
  "btn.showList": "Карточки",
  "layout.list": "⊿ Список",
  "layout.map": "◸ Карта",
  "sheet.dragHandle": "Перетащите, чтобы изменить размер списка",
  "link.neaAria": "Открыть сайт NEA",
  "localeToggle.language": "Язык",
  "localeToggle.close": "Закрыть",
};

// ----- German (de) overlay — v0.62.310. Compounds abbreviated where chips are tight. -----
const DE_STRINGS = {
  'header.title': '🍚 Hawker-Zentrum (2026)',
  'header.versionCount': 'v{v} · {n} Zentren',
  'header.versionOnly': 'v{v}',
  'status.loading': 'Lädt…',
  'layer.parks': 'Park',
  'layer.attractions': 'Sehensw.',
  'layer.taxis': 'Taxistand',
  'layer.clinics': 'Klinik / Apotheke',
  'layer.hospitals': 'Krankenh.',
  'layer.police': 'Polizei',
  'layer.busstop': 'Bushalt.',
  'ui.refresh': 'Aktualisieren',
  'ui.centreMap': 'Karte zentrieren',
  'hawker.centres': 'Zentren',
  'hawker.closedCleaning': 'Wegen Reinigung geschlossen bis {till}',
  'hawker.redevelopment': 'Umbau bis {till}',
  'hawker.renovation': 'Renovierung bis {till}',
  'link.googleMap': 'Google Maps ↗',
  'layer.colour': 'Farbe',
  'layer.colour.on': '☑️ S/W',
  'layer.colour.off': '🎨 Farbe',
  'layer.open24': '24 Std.',
  'layer.soon': 'bald',
  'map.reset': 'Zurücksetzen',
  'map.more': 'Mehr Ebenen',
  'layer.carpark': 'Parkplatz',
  'layer.exits': 'Ausgänge',
  'layer.train': 'Bahn',
  'layer.all': 'Alle',
  'region.Central': 'Zentrum',
  'region.South': 'Süd',
  'region.East': 'Ost',
  'region.North': 'Nord',
  'region.West': 'West',
  'list.headingBody': ' — {n} Hawker-Zentren (alphabetisch)',
  'btn.openFullscreenMap': 'Voll 📍 in Karte ↗',
  'btn.viewAllOnMap': '🗺 {n} Hawker-Zentren auf der Karte',
  'btn.openAllOnGoogleMaps': '🗺 Alle {n} in Google Maps öffnen',
  'btn.openTourGoogleMaps': '🌐 {n} Pins in Google Maps',
  'btn.openTourGoogleMapsRange': '{from}–{to} 📍 in Karte ↗',
  'map.mappedRatio': '📍 {mapped}/{total} Zentren kartiert',
  'map.expand': 'Karte vergrößern',
  'map.collapse': 'Karte verkleinern',
  'map.zoomIn': 'Vergrößern',
  'map.zoomOut': 'Verkleinern',
  'map.loading': 'Karte lädt…',
  'map.nokey': 'Karte nicht verfügbar (Schlüssel fehlt).',
  'map.noCoords': 'Koordinaten noch nicht geladen — siehe Liste unten.',
  'map.openInGoogleMaps': '📍 In Google Maps öffnen',
  'map.aria': 'Karte der Hawker-Zentren in der aktiven Region',
  'btn.maps': '📍 Karte',
  'btn.fabBack': 'zurück',
  'btn.fabEnd': 'schließen',
  'btn.fabBackAria': 'Zurück',
  'btn.fabEndAria': 'Schließen',
  'btn.fabTop': '⇡ oben',
  'btn.fabDown': '⇣ unten',
  'btn.fabTopAria': 'Nach oben',
  'btn.fabDownAria': 'Nach unten',
  'btn.saveToChat': '📋 Kopieren',
  'btn.saving': 'Senden…',
  'btn.detailsMore': 'Details',
  'btn.detailsLess': 'weniger',
  'card.sent': '✓ Gesendet',
  'msg.savedClose': 'An Chat gesendet. Sie können diese Ansicht schließen.',
  'msg.saveFailed': 'Senden an Chat fehlgeschlagen — bitte erneut versuchen.',
  'stalls.count': '🍳 {n} Stände',
  'stalls.status.existing': 'In Betrieb',
  'stalls.status.existing_new': 'Neu',
  'stalls.status.existing_replacement': 'Ersetzt',
  'stalls.status.interim_centre': 'Vorläufig',
  'stalls.status.under_construction': 'Im Bau',
  'stalls.status.proposed': 'Geplant',
  'footer.tag': 'Experimentell · Singapur',

  "btn.showMap": "Karte",
  "btn.showList": "Karten",
  "layout.list": "⊿ Liste",
  "layout.map": "◸ Karte",
  "sheet.dragHandle": "Liste durch Ziehen vergrößern oder verkleinern",
  "link.neaAria": "NEA-Website öffnen",
  "localeToggle.language": "Sprache",
  "localeToggle.close": "Schließen",
};
for (const k in RU_STRINGS) { if (STRINGS[k] && STRINGS[k].ru == null) STRINGS[k].ru = RU_STRINGS[k]; }
for (const k in DE_STRINGS) { if (STRINGS[k] && STRINGS[k].de == null) STRINGS[k].de = DE_STRINGS[k]; }

// ----- Chinese (zh) overlay — v0.62.491. Agent-drafted; SG terms (小贩中心/德士站). Control labels tight. -----
const ZH_STRINGS = {
  'header.title': '🍚 小贩中心 (2026)',
  'header.versionCount': 'v{v} · {n} 家中心',
  'header.versionOnly': 'v{v}',
  'status.loading': '加载中…',
  'layer.parks': '公园',
  'layer.attractions': '景点',
  'layer.taxis': '德士站',
  'layer.clinics': '诊所 / 药房',
  'layer.hospitals': '医院',
  'layer.police': '警察',
  'layer.busstop': '巴士站',
  'ui.refresh': '刷新',
  'ui.centreMap': '地图居中',
  'hawker.centres': '中心',
  'hawker.closedCleaning': '清洁休市至 {till}',
  'hawker.redevelopment': '重建至 {till}',
  'hawker.renovation': '装修至 {till}',
  'link.googleMap': '谷歌地图 ↗',
  'layer.colour': '颜色',
  'layer.colour.on': '☑️ 单色',
  'layer.colour.off': '🎨 彩色',
  'layer.open24': '24 小时',
  'layer.soon': '即将推出',
  'map.reset': '重置视图',
  'map.more': '更多图层',
  'layer.carpark': '停车场',
  'layer.exits': '地铁出口',
  'layer.train': '列车',
  'layer.all': '全部',
  'region.Central': '中部',
  'region.South': '南部',
  'region.East': '东部',
  'region.North': '北部',
  'region.West': '西部',
  'list.headingBody': ' — {n} 家小贩中心（按字母排序）',
  'btn.openFullscreenMap': '全部 📍 于地图 ↗',
  'btn.viewAllOnMap': '🗺 在地图上查看 {n} 家小贩中心',
  'btn.openAllOnGoogleMaps': '🗺 在 Google Maps 打开全部 {n} 家',
  'btn.openTourGoogleMaps': '🌐 在 Google Maps 显示 {n} 个标记',
  'btn.openTourGoogleMapsRange': '{from}–{to} 📍 于地图 ↗',
  'map.mappedRatio': '📍 已标注 {mapped}/{total} 家中心',
  'map.expand': '放大地图',
  'map.collapse': '收起地图',
  'map.zoomIn': '放大',
  'map.zoomOut': '缩小',
  'map.loading': '地图加载中…',
  'map.nokey': '地图不可用（密钥未配置）。',
  'map.noCoords': '小贩中心坐标尚未加载 — 请使用下方列表。',
  'map.openInGoogleMaps': '📍 在 Google Maps 打开',
  'map.aria': '当前区域内小贩中心的地图',
  'btn.maps': '📍 地图',
  'btn.fabBack': '返回',
  'btn.fabEnd': '关闭',
  'btn.fabBackAria': '返回',
  'btn.fabEndAria': '关闭',
  'btn.fabTop': '⇡ 顶部',
  'btn.fabDown': '⇣ 底部',
  'btn.fabTopAria': '返回顶部',
  'btn.fabDownAria': '向下滚动',
  'btn.saveToChat': '📋 复制',
  'btn.saving': '发送中…',
  'btn.detailsMore': '详情',
  'btn.detailsLess': '收起',
  'card.sent': '✓ 已发送',
  'msg.savedClose': '已发送到聊天。您可以关闭此视图。',
  'msg.saveFailed': '无法发送到聊天 — 请重试。',
  'stalls.count': '🍳 {n} 个摊位',
  'stalls.status.existing': '营业中',
  'stalls.status.existing_new': '新增',
  'stalls.status.existing_replacement': '重建',
  'stalls.status.interim_centre': '临时',
  'stalls.status.under_construction': '建设中',
  'stalls.status.proposed': '拟建',
  'footer.tag': '试验版 · 新加坡',

  "btn.showMap": "地图",
  "btn.showList": "卡片",
  "layout.list": "⊿ 列表",
  "layout.map": "◸ 地图",
  "sheet.dragHandle": "拖动以调整列表大小",
  "link.neaAria": "打开 NEA 网站",
  "localeToggle.language": "语言",
  "localeToggle.close": "关闭",
};
for (const k in ZH_STRINGS) { if (STRINGS[k] && STRINGS[k].zh == null) STRINGS[k].zh = ZH_STRINGS[k]; }

// ----- Japanese (ja) overlay — v0.62.491. Agent-drafted; verified Japanese (no Korean). Control labels tight. -----
const JA_STRINGS = {
  'header.title': '🍚 ホーカーセンター (2026)',
  'header.versionCount': 'v{v} · {n} 施設',
  'header.versionOnly': 'v{v}',
  'status.loading': '読み込み中…',
  'layer.parks': '公園',
  'layer.attractions': '観光スポット',
  'layer.taxis': 'タクシー乗り場',
  'layer.clinics': '診療所 / 薬局',
  'layer.hospitals': '病院',
  'layer.police': '警察',
  'layer.busstop': 'バス停',
  'ui.refresh': '更新',
  'ui.centreMap': '地図を中央に',
  'hawker.centres': 'センター',
  'hawker.closedCleaning': '清掃のため{till}まで休業',
  'hawker.redevelopment': '再開発のため{till}まで',
  'hawker.renovation': '改装のため{till}まで',
  'link.googleMap': 'Google マップ ↗',
  'layer.colour': '色',
  'layer.colour.on': '☑️ モノクロ',
  'layer.colour.off': '🎨 カラー',
  'layer.open24': '24時間',
  'layer.soon': '近日公開',
  'map.reset': '表示をリセット',
  'map.more': '他のレイヤー',
  'layer.carpark': '駐車場',
  'layer.exits': '駅出口',
  'layer.train': '電車',
  'layer.all': 'すべて',
  'region.Central': '中部',
  'region.South': '南部',
  'region.East': '東部',
  'region.North': '北部',
  'region.West': '西部',
  'list.headingBody': ' — {n} 軒のホーカーセンター（五十音順）',
  'btn.openFullscreenMap': '全件 📍 を地図で ↗',
  'btn.viewAllOnMap': '🗺 {n} 軒のホーカーセンターを地図で表示',
  'btn.openAllOnGoogleMaps': '🗺 全 {n} 件を Google Maps で開く',
  'btn.openTourGoogleMaps': '🌐 {n} 件のピンを Google Maps で',
  'btn.openTourGoogleMapsRange': '{from}–{to} 📍 を地図で ↗',
  'map.mappedRatio': '📍 {mapped}/{total} 件を地図に表示',
  'map.expand': '地図を拡大',
  'map.collapse': '地図を縮小',
  'map.zoomIn': 'ズームイン',
  'map.zoomOut': 'ズームアウト',
  'map.loading': '地図を読み込み中…',
  'map.nokey': '地図を利用できません（キーが未設定です）。',
  'map.noCoords': 'ホーカーセンターの座標がまだ読み込まれていません — 下のリストをご利用ください。',
  'map.openInGoogleMaps': '📍 Google Maps で開く',
  'map.aria': 'アクティブな地域のホーカーセンターの地図',
  'btn.maps': '📍 地図',
  'btn.fabBack': '戻る',
  'btn.fabEnd': '閉じる',
  'btn.fabBackAria': '戻る',
  'btn.fabEndAria': '閉じる',
  'btn.fabTop': '⇡ 上へ',
  'btn.fabDown': '⇣ 下へ',
  'btn.fabTopAria': '先頭に戻る',
  'btn.fabDownAria': '下にスクロール',
  'btn.saveToChat': '📋 コピー',
  'btn.saving': '送信中…',
  'btn.detailsMore': '詳細',
  'btn.detailsLess': '閉じる',
  'card.sent': '✓ 送信済み',
  'msg.savedClose': 'チャットに送信しました。この画面を閉じてかまいません。',
  'msg.saveFailed': 'チャットに送信できませんでした — もう一度お試しください。',
  'stalls.count': '🍳 {n} 店舗',
  'stalls.status.existing': '営業中',
  'stalls.status.existing_new': '新規',
  'stalls.status.existing_replacement': '建て替え',
  'stalls.status.interim_centre': '仮設',
  'stalls.status.under_construction': '建設中',
  'stalls.status.proposed': '計画中',
  'footer.tag': '試験運用版 · シンガポール',

  "btn.showMap": "地図",
  "btn.showList": "カード",
  "layout.list": "⊿ リスト",
  "layout.map": "◸ 地図",
  "sheet.dragHandle": "ドラッグしてリストのサイズを変更",
  "link.neaAria": "NEAのサイトを開く",
  "localeToggle.language": "言語",
  "localeToggle.close": "閉じる",
};
for (const k in JA_STRINGS) { if (STRINGS[k] && STRINGS[k].ja == null) STRINGS[k].ja = JA_STRINGS[k]; }

// ----- Spanish (es) overlay — v0.62.491. Agent-drafted; no apostrophes. Control labels tight. -----
const ES_STRINGS = {
  'header.title': '🍚 Centro de hawkers (2026)',
  'header.versionCount': 'v{v} · {n} centros',
  'header.versionOnly': 'v{v}',
  'status.loading': 'Cargando…',
  'layer.parks': 'Parque',
  'layer.attractions': 'Atracciones',
  'layer.taxis': 'Parada de taxis',
  'layer.clinics': 'Clínica / Farmacia',
  'layer.hospitals': 'Hospital',
  'layer.police': 'Policía',
  'layer.busstop': 'Parada de bus',
  'ui.refresh': 'Actualizar',
  'ui.centreMap': 'Centrar el mapa',
  'hawker.centres': 'centros',
  'hawker.closedCleaning': 'Cerrado por limpieza hasta {till}',
  'hawker.redevelopment': 'Remodelación hasta {till}',
  'hawker.renovation': 'En reforma hasta {till}',
  'link.googleMap': 'Google Maps ↗',
  'layer.colour': 'Color',
  'layer.colour.on': '☑️ Monocromo',
  'layer.colour.off': '🎨 Color',
  'layer.open24': '24 horas',
  'layer.soon': 'próximamente',
  'map.reset': 'Restablecer vista',
  'map.more': 'Más capas',
  'layer.carpark': 'Aparcamiento',
  'layer.exits': 'Salidas de estación',
  'layer.train': 'Tren',
  'layer.all': 'Todo',
  'region.Central': 'Centro',
  'region.South': 'Sur',
  'region.East': 'Este',
  'region.North': 'Norte',
  'region.West': 'Oeste',
  'list.headingBody': ' — {n} centros de hawkers (por orden alfabético)',
  'btn.openFullscreenMap': 'Todo 📍 en un mapa ↗',
  'btn.viewAllOnMap': '🗺 Ver {n} centros de hawkers en el mapa',
  'btn.openAllOnGoogleMaps': '🗺 Abrir los {n} en Google Maps',
  'btn.openTourGoogleMaps': '🌐 {n} marcadores en Google Maps',
  'btn.openTourGoogleMapsRange': '{from}–{to} 📍 en un mapa ↗',
  'map.mappedRatio': '📍 {mapped}/{total} centros en el mapa',
  'map.expand': 'Ampliar mapa',
  'map.collapse': 'Reducir mapa',
  'map.zoomIn': 'Acercar',
  'map.zoomOut': 'Alejar',
  'map.loading': 'Cargando mapa…',
  'map.nokey': 'Mapa no disponible (clave no configurada).',
  'map.noCoords': 'Las coordenadas de los centros aún no se han cargado — usa la lista de abajo.',
  'map.openInGoogleMaps': '📍 Abrir en Google Maps',
  'map.aria': 'Mapa de los centros de hawkers en la región activa',
  'btn.maps': '📍 Mapa',
  'btn.fabBack': 'atrás',
  'btn.fabEnd': 'cerrar',
  'btn.fabBackAria': 'Atrás',
  'btn.fabEndAria': 'Cerrar',
  'btn.fabTop': '⇡ arriba',
  'btn.fabDown': '⇣ abajo',
  'btn.fabTopAria': 'Volver arriba',
  'btn.fabDownAria': 'Bajar',
  'btn.saveToChat': '📋 Copiar',
  'btn.saving': 'Enviando…',
  'btn.detailsMore': 'detalles',
  'btn.detailsLess': 'menos',
  'card.sent': '✓ Enviado',
  'msg.savedClose': 'Enviado al chat. Puedes cerrar esta vista.',
  'msg.saveFailed': 'No se pudo enviar al chat — inténtalo de nuevo.',
  'stalls.count': '🍳 {n} puestos',
  'stalls.status.existing': 'En funcionamiento',
  'stalls.status.existing_new': 'Nuevo',
  'stalls.status.existing_replacement': 'Reconstruido',
  'stalls.status.interim_centre': 'Provisional',
  'stalls.status.under_construction': 'En construcción',
  'stalls.status.proposed': 'Propuesto',
  'footer.tag': 'Experimental · Singapur',

  "btn.showMap": "Mapa",
  "btn.showList": "Tarjetas",
  "layout.list": "⊿ Lista",
  "layout.map": "◸ Mapa",
  "sheet.dragHandle": "Arrastra para cambiar el tamaño de la lista",
  "link.neaAria": "Abrir el sitio de la NEA",
  "localeToggle.language": "Idioma",
  "localeToggle.close": "Cerrar",
};
for (const k in ES_STRINGS) { if (STRINGS[k] && STRINGS[k].es == null) STRINGS[k].es = ES_STRINGS[k]; }

// ----- Korean (ko) overlay — v0.62.879. Hand-written; no paid translation API, per
// the operator's standing instruction. `ko` is NOT in SUPPORTED yet, so this block is inert:
// the merge below writes a column nothing reads until the K6 flip adds 'ko' to the list.
const KO_STRINGS = {
  "header.title": "🍚 호커센터 (2026)",
  "header.versionCount": "v{v} · {n}곳",
  "header.versionOnly": "v{v}",
  "status.loading": "불러오는 중…",
  "layer.parks": "공원",
  "layer.attractions": "명소",
  "layer.taxis": "택시 승강장",
  "layer.clinics": "병원 / 약국",
  "layer.hospitals": "종합병원",
  "layer.police": "경찰",
  "layer.busstop": "버스 정류장",
  "ui.refresh": "새로고침",
  "ui.centreMap": "센터 지도",
  "hawker.centres": "곳",
  "hawker.closedCleaning": "청소로 {till}까지 휴업",
  "hawker.redevelopment": "{till}까지 재개발 중",
  "hawker.renovation": "{till}까지 보수 공사 중",
  "link.googleMap": "구글 지도 ↗",
  "layer.colour": "색상",
  "layer.colour.on": "☑️ 흑백",
  "layer.colour.off": "🎨 컬러",
  "layer.open24": "24시간",
  "layer.soon": "준비 중",
  "map.reset": "화면 초기화",
  "map.more": "레이어 더 보기",
  "layer.carpark": "주차장",
  "layer.exits": "역 출구",
  "layer.train": "지하철",
  "layer.all": "전체",
  "region.Central": "중부",
  "region.South": "남부",
  "region.East": "동부",
  "region.North": "북부",
  "region.West": "서부",
  "list.headingBody": " — 호커센터 {n}곳 (가나다순)",
  "btn.openFullscreenMap": "📍 전체 지도로 보기 ↗",
  "btn.viewAllOnMap": "🗺 호커센터 {n}곳을 지도에서 보기",
  "btn.openAllOnGoogleMaps": "🗺 {n}곳 모두 구글 지도에서 열기",
  "btn.openTourGoogleMaps": "🌐 구글 지도에 핀 {n}개",
  "btn.openTourGoogleMapsRange": "{from}–{to} 📍 지도로 보기 ↗",
  "map.mappedRatio": "📍 전체 {total}곳 중 {mapped}곳 지도 표시",
  "map.expand": "지도 넓게 보기",
  "map.collapse": "지도 접기",
  "map.zoomIn": "확대",
  "map.zoomOut": "축소",
  "map.loading": "지도를 불러오는 중…",
  "map.nokey": "지도를 사용할 수 없습니다 (키가 설정되지 않았습니다).",
  "map.noCoords": "호커센터 좌표를 아직 불러오지 못했습니다 — 아래 목록을 이용하세요.",
  "map.openInGoogleMaps": "📍 구글 지도에서 열기",
  "map.aria": "선택한 권역의 호커센터 지도",
  "btn.maps": "📍 지도",
  "btn.fabBack": "뒤로",
  "btn.fabEnd": "종료",
  "btn.fabBackAria": "뒤로",
  "btn.fabEndAria": "종료",
  "btn.fabTop": "⇡ 맨 위",
  "btn.fabDown": "⇣ 아래로",
  "btn.fabTopAria": "맨 위로",
  "btn.fabDownAria": "아래로 스크롤",
  "btn.showMap": "지도",
  "btn.showList": "카드",
  "layout.list": "⊿ 목록",
  "layout.map": "◸ 지도",
  "btn.saveToChat": "📋 복사",
  "btn.saving": "보내는 중…",
  "card.sent": "✓ 보냄",
  "btn.detailsMore": "자세히",
  "btn.detailsLess": "간단히",
  "msg.savedClose": "대화로 보냈습니다. 이 화면을 닫으셔도 됩니다.",
  "msg.saveFailed": "대화로 보내지 못했습니다 — 다시 시도해 주세요.",
  "stalls.count": "🍳 점포 {n}곳",
  "stalls.status.existing": "영업 중",
  "stalls.status.existing_new": "신규",
  "stalls.status.existing_replacement": "교체됨",
  "stalls.status.interim_centre": "임시",
  "stalls.status.under_construction": "공사 중",
  "stalls.status.proposed": "예정",
  "footer.tag": "실험 중 · 싱가포르",
  "sheet.dragHandle": "끌어서 목록 크기 조절",
  "link.neaAria": "NEA 웹사이트 열기",
  "localeToggle.language": "언어",
  "localeToggle.close": "닫기",
};
for (const k in KO_STRINGS) { if (STRINGS[k] && STRINGS[k].ko == null) STRINGS[k].ko = KO_STRINGS[k]; }

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
  // v0.62.501 — DEVICE locale (navigator) BEFORE the Telegram APP locale
  // (language_code): a French phone running an English Telegram was resolving
  // to 'en'. Fall through to the Telegram hint only when the device locale is
  // unsupported, then 'en'.
  try {
    const nav = (navigator?.language || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(nav)) return nav;
  } catch { /* no navigator */ }
  try {
    const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
    const two = String(tgLang || '').slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(two)) return two;
  } catch { /* not in Telegram WebApp */ }
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
// v0.62.312 — manual locale switch (for the in-app LocaleToggle). Writes the
// shared localStorage key + fires the 'gia:locale' event so every useLocale()
// here AND in the other TMAs (same key/event) re-renders.
export function setActiveLocale(lang) {
  if (!SUPPORTED.includes(lang)) return;
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(LOCALE_KEY, lang); } catch { /* noop */ }
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang } }));
  // v0.62.315 — persist to the shared server pref so the choice syncs to the
  // other TMAs + chat (mirrors cuisine/menu's POST). Best-effort, fire-and-forget.
  try {
    fetch('/api/cuisine/user-language', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang, initData: initData() || '' }),
      keepalive: true,
    }).catch(() => {});
  } catch { /* noop */ }
}

// On first mount, hydrates from the server so the TMA matches whatever
// the user last set via /language in chat.
// v0.62.668 — keep the document's language metadata in sync with the active
// locale. index.html ships a static lang="en"; without this, screen readers
// keep English phonetics (and the browser keeps English hyphenation/font
// rules) after the user switches locale. A module-level listener covers every
// path that changes the locale: setActiveLocale's CustomEvent and the
// cross-tab storage event.
function syncDocumentLang(lang) {
  try { document.documentElement.lang = lang; } catch { /* non-DOM (tests) */ }
}
if (typeof window !== 'undefined') {
  syncDocumentLang(getActiveLocale());
  window.addEventListener(LOCALE_EVENT, (e) => syncDocumentLang(e?.detail?.lang || getActiveLocale()));
  window.addEventListener('storage', (e) => { if (e.key === LOCALE_KEY) syncDocumentLang(getActiveLocale()); });
}

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
