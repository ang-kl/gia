// i18n.js — v0.60.106 (transport TMA)
//
// Minimal EN/FR strings for the transport TMA. Mirrors web/menu/src/i18n.js
// in shape (localStorage 'gia.locale' + 'gia:locale' CustomEvent) so the
// user's chosen locale flips transport text as soon as they re-mount.
// Operator 2026-05-11: "ensure FR is also change based on yesterday and
// today PR" — these strings were previously hardcoded English in
// App.jsx + AffectedTicker.jsx + MrtMapPanel.jsx.

import { useEffect, useState } from 'react';
import { initData } from './tg.js';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';
const SUPPORTED_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];

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
  // v0.62.598 — Transport station card (Google-Maps-style rich info).
  'mrt.firstTrain':            { en: 'First', fr: 'Premier' },
  'mrt.lastTrain':             { en: 'Last',  fr: 'Dernier' },
  'mrt.weekday':               { en: 'Mon–Fri', fr: 'Lun–Ven' },
  'mrt.weekend':               { en: 'Sat–Sun / PH', fr: 'Sam–Dim / fériés' },
  'mrt.sat':                   { en: 'Sat', fr: 'Sam' },
  'mrt.sunPh':                 { en: 'Sun/PH', fr: 'Dim/fériés' },
  'mrt.terminalHere':          { en: 'Terminates here', fr: 'Terminus ici' },
  'mrt.towards':               { en: 'towards', fr: 'vers' },
  'mrt.around':                { en: 'Around the station', fr: 'Autour de la station' },
  'mrt.nearestHawker':         { en: 'Nearest hawker', fr: 'Hawker le plus proche' },
  'mrt.stationInfo':           { en: 'Station info ↗', fr: 'Infos station ↗' },
  'mrt.taxi':                  { en: 'Taxi', fr: 'Taxi' },
  'mrt.dir.northbound':        { en: 'Northbound', fr: 'Direction nord' },
  'mrt.dir.southbound':        { en: 'Southbound', fr: 'Direction sud' },
  'mrt.dir.eastbound':         { en: 'Eastbound', fr: 'Direction est' },
  'mrt.dir.westbound':         { en: 'Westbound', fr: 'Direction ouest' },
  'mrt.dir.clockwise':         { en: 'Clockwise', fr: 'Sens horaire' },
  'mrt.dir.anticlockwise':     { en: 'Anticlockwise', fr: 'Sens antihoraire' },
  'mrt.dir.loop':              { en: 'Loop', fr: 'Boucle' },
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

// ----- Russian (ru) overlay — v0.62.311. Controls kept tight to fit EN pills. -----
const RU_STRINGS = {
  'layer.parks': 'Парк',
  'layer.attractions': 'Достопримеч.',
  'layer.taxis': 'Стоянка такси',
  'layer.clinics': 'Клиника / Аптека',
  'layer.hospitals': 'Больница',
  'layer.police': 'Полиция',
  'layer.busstop': 'Остановка',
  'layer.hawker': 'Хокер',
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
  'map.expand': 'Развернуть карту',
  'map.collapse': 'Свернуть карту',
  'map.zoomIn': 'Приблизить',
  'map.zoomOut': 'Отдалить',
  'header.title': '🇸🇬 Карта и статус метро',
  'header.allNormal': '✓ Все линии в норме',
  'header.linesAffected': '⚠️ {n} линия затронута',
  'header.linesAffectedPlural': '⚠️ затронуто линий: {n}',
  'view.tipToGmap': 'Нажмите «Google Map», чтобы открыть каждую станцию →',
  'view.tipZoomIn': 'Совет: приблизьте, чтобы видеть метки (центр SG плотный)',
  'view.btnSchematic': '🗺 Схема',
  'view.btnGoogleMap': '📍 Google Map',
  'loading': 'Загрузка статуса метро…',
  'error.unreachable': '⚠️ Не удалось загрузить статус метро:',
  'ticker.title': 'Прокрутите, чтобы увидеть другую линию',
  'ticker.allLines': '⇆ Все линии',
  'ticker.allNormal': '✓ Все линии в норме',
  'fab.back': 'назад',
  'fab.end': 'закрыть',
  'fab.backAria': 'Назад',
  'fab.endAria': 'Закрыть',
  'fab.top': '⇡ вверх',
  'fab.down': '⇣ вниз',
  'fab.topAria': 'Наверх',
  'fab.downAria': 'Вниз',
  'mrt.opens': 'Открытие {when}',
  'mrt.openInMap': 'Открыть 📍 на карте ↗',
  'mrt.status.delay': 'Задержка',
  'mrt.status.disrupted': 'Сбой в работе',
  'mrt.status.closure': 'Закрытие',
  'mrt.status.normal': 'Норма',
  'mrt.status.unknown': 'Неизвестно',
  'mrt.showing': 'Показано: {code} · {n} станций',
  'mrt.overview': 'Обзор',
  'mrt.backToView': 'Назад ↩',
  'mrt.carparks': 'Парковки',
  'mrt.allNormal': 'Всё в норме',
  'mrt.stationsCount': '{n} станций',
  'mrt.selected': 'Выбрана',
  'mrt.future': 'будущая',
  'mrt.crowd.h': 'Многолюдно',
  'mrt.crowd.m': 'Умеренно',
  'mrt.crowd.l': 'Свободно',
  'mrt.exits': 'Выходы',
  'mrt.busStops': 'Остановки',
  'mrt.taxiStand': 'Стоянка такси',
  'mrt.taxiPickup': 'Посадка / высадка такси',
  'mrt.counts': '🚇 {ops} работают · ⬜ {future} будущие (серые)',
  'mrt.err.stations': '⚠ Не удалось загрузить станции:',
  'mrt.err.nokey': 'Карта недоступна (ключ не настроен).',
  'mrt.err.mapfail': '⚠ Не удалось загрузить карту.',
  'mrt.aria.map': 'Карта станций MRT и LRT в Сингапуре',
  'footer.tag': 'Экспериментально · Сингапур',
};

// ----- German (de) overlay — v0.62.311. Compounds abbreviated where chips are tight. -----
const DE_STRINGS = {
  'layer.parks': 'Park',
  'layer.attractions': 'Sehensw.',
  'layer.taxis': 'Taxistand',
  'layer.clinics': 'Klinik / Apotheke',
  'layer.hospitals': 'Krankenh.',
  'layer.police': 'Polizei',
  'layer.busstop': 'Bushalt.',
  'layer.hawker': 'Hawker',
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
  'map.expand': 'Karte vergrößern',
  'map.collapse': 'Karte verkleinern',
  'map.zoomIn': 'Vergrößern',
  'map.zoomOut': 'Verkleinern',
  'header.title': '🇸🇬 Bahnkarte & Status',
  'header.allNormal': '✓ Alle Linien normal',
  'header.linesAffected': '⚠️ {n} Linie betroffen',
  'header.linesAffectedPlural': '⚠️ {n} Linien betroffen',
  'view.tipToGmap': 'Tippe "Google Map", um jede Station zu erkunden →',
  'view.tipZoomIn': 'Tipp: heranzoomen, um die Pins zu lesen (Zentrum SG ist dicht)',
  'view.btnSchematic': '🗺 Schema',
  'view.btnGoogleMap': '📍 Google Map',
  'loading': 'MRT-Status wird geladen…',
  'error.unreachable': '⚠️ MRT-Status konnte nicht geladen werden:',
  'ticker.title': 'Scrollen, um eine andere Linie zu sehen',
  'ticker.allLines': '⇆ Alle Linien',
  'ticker.allNormal': '✓ Alle Linien normal',
  'fab.back': 'zurück',
  'fab.end': 'schließen',
  'fab.backAria': 'Zurück',
  'fab.endAria': 'Schließen',
  'fab.top': '⇡ oben',
  'fab.down': '⇣ unten',
  'fab.topAria': 'Nach oben',
  'fab.downAria': 'Nach unten',
  'mrt.opens': 'Öffnet {when}',
  'mrt.openInMap': '📍 In Karte öffnen ↗',
  'mrt.status.delay': 'Verspätung',
  'mrt.status.disrupted': 'Betrieb gestört',
  'mrt.status.closure': 'Sperrung',
  'mrt.status.normal': 'Normalbetrieb',
  'mrt.status.unknown': 'Unbekannt',
  'mrt.showing': 'Anzeige: {code} · {n} Stationen',
  'mrt.overview': 'Übersicht',
  'mrt.backToView': 'Zurück ↩',
  'mrt.carparks': 'Parkplätze',
  'mrt.allNormal': 'Alles normal',
  'mrt.stationsCount': '{n} Stationen',
  'mrt.selected': 'Ausgewählt',
  'mrt.future': 'Geplant',
  'mrt.crowd.h': 'Voll',
  'mrt.crowd.m': 'Mäßig',
  'mrt.crowd.l': 'Gering',
  'mrt.exits': 'Ausgänge',
  'mrt.busStops': 'Haltestellen',
  'mrt.taxiStand': 'Taxistand',
  'mrt.taxiPickup': 'Taxi Ein-/Ausstieg',
  'mrt.counts': '🚇 {ops} in Betrieb · ⬜ {future} künftig (grau)',
  'mrt.err.stations': '⚠ Stationen konnten nicht geladen werden:',
  'mrt.err.nokey': 'Karte nicht verfügbar (Schlüssel fehlt).',
  'mrt.err.mapfail': '⚠ Karte konnte nicht geladen werden.',
  'mrt.aria.map': 'Karte der MRT- und LRT-Stationen in Singapur',
  'footer.tag': 'Experimentell · Singapur',
};
for (const k in RU_STRINGS) { if (STRINGS[k] && STRINGS[k].ru == null) STRINGS[k].ru = RU_STRINGS[k]; }
for (const k in DE_STRINGS) { if (STRINGS[k] && STRINGS[k].de == null) STRINGS[k].de = DE_STRINGS[k]; }

const ZH_STRINGS = {
  'layer.parks': '公园',
  'layer.attractions': '景点',
  'layer.taxis': '德士站',
  'layer.clinics': '诊所 / 药房',
  'layer.hospitals': '医院',
  'layer.police': '警察局',
  'layer.busstop': '巴士站',
  'layer.hawker': '小贩中心',
  'layer.colour': '颜色',
  'layer.colour.on': '☑️ 单色',
  'layer.colour.off': '🎨 彩色',
  'layer.open24': '24 小时',
  'layer.soon': '即将推出',
  'map.reset': '重置视图',
  'map.more': '更多图层',
  'layer.carpark': '停车场',
  'layer.exits': '车站出口',
  'layer.train': '列车',
  'layer.all': '全部',
  'map.expand': '放大地图',
  'map.collapse': '收起地图',
  'map.zoomIn': '放大',
  'map.zoomOut': '缩小',
  'header.title': '🇸🇬 地铁地图与状态',
  'header.allNormal': '✓ 所有线路正常',
  'header.linesAffected': '⚠️ {n} 条线路受影响',
  'header.linesAffectedPlural': '⚠️ {n} 条线路受影响',
  'view.tipToGmap': '点按 "Google Map" 探索各个车站 →',
  'view.tipZoomIn': '提示：放大以查看标记（新加坡市中心很密集）',
  'view.btnSchematic': '🗺 示意图',
  'view.btnGoogleMap': '📍 Google Map',
  'loading': '正在加载 MRT 状态…',
  'error.unreachable': '⚠️ 无法加载 MRT 状态：',
  'ticker.title': '滚动以查看其他地铁线路',
  'ticker.allLines': '⇆ 所有线路',
  'ticker.allNormal': '✓ 所有线路正常',
  'fab.back': '返回',
  'fab.end': '关闭',
  'fab.backAria': '返回',
  'fab.endAria': '关闭',
  'fab.top': '⇡ 顶部',
  'fab.down': '⇣ 底部',
  'fab.topAria': '返回顶部',
  'fab.downAria': '向下滚动',
  'mrt.opens': '{when} 开通',
  'mrt.openInMap': '在地图中打开 📍 ↗',
  'mrt.status.delay': '延误',
  'mrt.status.disrupted': '服务中断',
  'mrt.status.closure': '关闭',
  'mrt.status.normal': '服务正常',
  'mrt.status.unknown': '未知',
  'mrt.showing': '显示：{code} · {n} 个车站',
  'mrt.overview': '概览',
  'mrt.backToView': '返回 ↩',
  'mrt.carparks': '停车场',
  'mrt.allNormal': '全部正常',
  'mrt.stationsCount': '{n} 个车站',
  'mrt.selected': '已选择',
  'mrt.future': '未来',
  'mrt.crowd.h': '拥挤',
  'mrt.crowd.m': '适中',
  'mrt.crowd.l': '不拥挤',
  'mrt.exits': '出口',
  'mrt.busStops': '巴士站',
  'mrt.taxiStand': '德士站',
  'mrt.taxiPickup': '德士上下车点',
  'mrt.counts': '🚇 {ops} 运营中 · ⬜ {future} 未来（灰显）',
  'mrt.err.stations': '⚠ 无法加载车站：',
  'mrt.err.nokey': '地图不可用（密钥未配置）。',
  'mrt.err.mapfail': '⚠ 地图加载失败。',
  'mrt.aria.map': '新加坡 MRT 和 LRT 车站地图',
  'footer.tag': '试验版 · 新加坡',
};

const JA_STRINGS = {
  'layer.parks': '公園',
  'layer.attractions': '観光スポット',
  'layer.taxis': 'タクシー乗り場',
  'layer.clinics': 'クリニック / 薬局',
  'layer.hospitals': '病院',
  'layer.police': '警察',
  'layer.busstop': 'バス停',
  'layer.hawker': 'ホーカー',
  'layer.colour': '色',
  'layer.colour.on': '☑️ モノクロ',
  'layer.colour.off': '🎨 カラー',
  'layer.open24': '24時間',
  'layer.soon': '近日公開',
  'map.reset': '表示をリセット',
  'map.more': 'その他のレイヤー',
  'layer.carpark': '駐車場',
  'layer.exits': '駅の出口',
  'layer.train': '鉄道',
  'layer.all': 'すべて',
  'map.expand': '地図を拡大',
  'map.collapse': '地図を縮小',
  'map.zoomIn': '拡大',
  'map.zoomOut': '縮小',
  'header.title': '🇸🇬 鉄道路線図と運行状況',
  'header.allNormal': '✓ 全路線平常運転',
  'header.linesAffected': '⚠️ {n}路線に影響',
  'header.linesAffectedPlural': '⚠️ {n}路線に影響',
  'view.tipToGmap': '「Google Map」をタップして各駅を見る →',
  'view.tipZoomIn': 'ヒント：ズームインするとピンが見やすくなります（SG中心部は密集）',
  'view.btnSchematic': '🗺 路線図',
  'view.btnGoogleMap': '📍 Google Map',
  'loading': 'MRTの運行状況を読み込み中…',
  'error.unreachable': '⚠️ MRTの運行状況を読み込めませんでした：',
  'ticker.title': 'スクロールして別の路線を表示',
  'ticker.allLines': '⇆ 全路線',
  'ticker.allNormal': '✓ 全路線平常運転',
  'fab.back': '戻る',
  'fab.end': '閉じる',
  'fab.backAria': '戻る',
  'fab.endAria': '閉じる',
  'fab.top': '⇡ 上へ',
  'fab.down': '⇣ 下へ',
  'fab.topAria': '先頭に戻る',
  'fab.downAria': '下にスクロール',
  'mrt.opens': '{when}開業',
  'mrt.openInMap': '📍 を地図で開く ↗',
  'mrt.status.delay': '遅延',
  'mrt.status.disrupted': '運行支障',
  'mrt.status.closure': '運休',
  'mrt.status.normal': '平常運転',
  'mrt.status.unknown': '不明',
  'mrt.showing': '表示中：{code} · {n}駅',
  'mrt.overview': '概要',
  'mrt.backToView': '戻る ↩',
  'mrt.carparks': '駐車場',
  'mrt.allNormal': 'すべて平常',
  'mrt.stationsCount': '{n}駅',
  'mrt.selected': '選択中',
  'mrt.future': '開業予定',
  'mrt.crowd.h': '混雑',
  'mrt.crowd.m': 'やや混雑',
  'mrt.crowd.l': '空いている',
  'mrt.exits': '出口',
  'mrt.busStops': 'バス停',
  'mrt.taxiStand': 'タクシー乗り場',
  'mrt.taxiPickup': 'タクシー乗降場',
  'mrt.counts': '🚇 {ops}運行中 · ⬜ {future}開業予定（グレー表示）',
  'mrt.err.stations': '⚠ 駅を読み込めませんでした：',
  'mrt.err.nokey': '地図を利用できません（キーが未設定です）。',
  'mrt.err.mapfail': '⚠ 地図の読み込みに失敗しました。',
  'mrt.aria.map': 'シンガポールのMRT・LRT駅の地図',
  'footer.tag': '試験運用版 · シンガポール',
};

const ES_STRINGS = {
  'layer.parks': 'Parque',
  'layer.attractions': 'Atracciones',
  'layer.taxis': 'Parada de taxis',
  'layer.clinics': 'Clínica / Farmacia',
  'layer.hospitals': 'Hospital',
  'layer.police': 'Policía',
  'layer.busstop': 'Parada de bus',
  'layer.hawker': 'Hawker',
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
  'map.expand': 'Ampliar mapa',
  'map.collapse': 'Reducir mapa',
  'map.zoomIn': 'Acercar',
  'map.zoomOut': 'Alejar',
  'header.title': '🇸🇬 Mapa y estado del tren',
  'header.allNormal': '✓ Todas las líneas normales',
  'header.linesAffected': '⚠️ {n} línea afectada',
  'header.linesAffectedPlural': '⚠️ {n} líneas afectadas',
  'view.tipToGmap': 'Toca "Google Map" para explorar cada estación →',
  'view.tipZoomIn': 'Consejo: acerca para leer los pines (el centro de SG es denso)',
  'view.btnSchematic': '🗺 Esquema',
  'view.btnGoogleMap': '📍 Google Map',
  'loading': 'Cargando estado del MRT…',
  'error.unreachable': '⚠️ No se pudo cargar el estado del MRT:',
  'ticker.title': 'Desplázate para ver otra línea de tren',
  'ticker.allLines': '⇆ Todas las líneas',
  'ticker.allNormal': '✓ Todas las líneas normales',
  'fab.back': 'atrás',
  'fab.end': 'cerrar',
  'fab.backAria': 'Atrás',
  'fab.endAria': 'Cerrar',
  'fab.top': '⇡ arriba',
  'fab.down': '⇣ abajo',
  'fab.topAria': 'Volver arriba',
  'fab.downAria': 'Desplazar abajo',
  'mrt.opens': 'Apertura {when}',
  'mrt.openInMap': 'Abrir 📍 en un mapa ↗',
  'mrt.status.delay': 'Retraso',
  'mrt.status.disrupted': 'Servicio interrumpido',
  'mrt.status.closure': 'Cierre',
  'mrt.status.normal': 'Servicio normal',
  'mrt.status.unknown': 'Desconocido',
  'mrt.showing': 'Mostrando {code} · {n} estaciones',
  'mrt.overview': 'Resumen',
  'mrt.backToView': 'Atrás ↩',
  'mrt.carparks': 'Aparcamientos',
  'mrt.allNormal': 'Todo normal',
  'mrt.stationsCount': '{n} estaciones',
  'mrt.selected': 'Seleccionada',
  'mrt.future': 'futura',
  'mrt.crowd.h': 'Concurrido',
  'mrt.crowd.m': 'Moderado',
  'mrt.crowd.l': 'Poco concurrido',
  'mrt.exits': 'Salidas',
  'mrt.busStops': 'Paradas de bus',
  'mrt.taxiStand': 'Parada de taxis',
  'mrt.taxiPickup': 'Subida / bajada de taxis',
  'mrt.counts': '🚇 {ops} operativas · ⬜ {future} futuras (en gris)',
  'mrt.err.stations': '⚠ No se pudieron cargar las estaciones:',
  'mrt.err.nokey': 'Mapa no disponible (clave no configurada).',
  'mrt.err.mapfail': '⚠ No se pudo cargar el mapa.',
  'mrt.aria.map': 'Mapa de estaciones MRT y LRT en Singapur',
  'footer.tag': 'Experimental · Singapur',
};

for (const k in ZH_STRINGS) { if (STRINGS[k] && STRINGS[k].zh == null) STRINGS[k].zh = ZH_STRINGS[k]; }
for (const k in JA_STRINGS) { if (STRINGS[k] && STRINGS[k].ja == null) STRINGS[k].ja = JA_STRINGS[k]; }
for (const k in ES_STRINGS) { if (STRINGS[k] && STRINGS[k].es == null) STRINGS[k].es = ES_STRINGS[k]; }


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
  // v0.62.501 — prefer the DEVICE locale (navigator.language) over the
  // Telegram APP locale (language_code). language_code reflects the Telegram
  // client UI language, a weak signal for the user's real language; a French
  // phone running an English Telegram was resolving to 'en'. detectFromNavigator
  // returns null when the device locale is unsupported, so we still fall back to
  // the Telegram hint, then 'en'.
  return detectFromNavigator() || detectFromTelegram() || 'en';
}

// v0.62.312 — manual locale switch (for the in-app LocaleToggle). Writes the
// shared localStorage key + fires the 'gia:locale' event so every useLocale()
// here AND in the other TMAs (same key/event) re-renders.
export function setActiveLocale(lang) {
  if (!SUPPORTED_LOCALES.includes(lang)) return;
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
