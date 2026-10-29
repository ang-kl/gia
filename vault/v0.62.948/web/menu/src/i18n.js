// i18n.js — v0.60.51
//
// Minimal EN/FR localisation for the Menu TMA hub. Mirrors the
// shape of web/cuisine/src/v2/lib/i18n.js but trims the server
// hydration path: the menu hub has no live UI to change locale
// (that's done via the /language chat command), so it just reads
// the active locale and renders. The 'gia.locale' localStorage
// key is shared across all TMAs, so a user who flipped the
// cuisine TMA to FR sees a FR menu hub on the next mount.
//
// v0.62.884 — THE PARAGRAPH ABOVE WAS WRONG ON BOTH COUNTS, and it is kept
// rather than rewritten because it is the reason the bug existed. The hub DOES
// have a live locale UI (LocaleToggle, v0.60.62), and "that's done via the
// /language chat command" describes exactly the preference this file had no way
// to read: trimming the hydration path left the sync one-way, so /language ko
// in chat could not reach the hub at all. hydrateFromServerOnce() below is the
// missing half, ported from web/hawker/src/i18n.js.

import { useEffect, useState } from 'react';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';
const SUPPORTED_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

const STRINGS = {
  // ----- Hero -----
  'hero.title':            { en: 'Soleat Menu',     fr: 'Soleat Menu' },
  'ui.refresh': { en: 'Refresh', fr: 'Actualiser' },
  'country.SG': { en: 'Singapore', fr: 'Singapour' },
  'country.MY': { en: 'Malaysia', fr: 'Malaisie' },
  'coh.title': { en: 'Location mismatch', fr: 'Conflit de localisation' },
  'coh.body': { en: 'You set your location to {saved} previously, but your device is now in {device}.', fr: 'Vous aviez choisi {saved} précédemment, mais votre appareil est actuellement ici : {device}.' },
  'coh.use': { en: 'Use {country}', fr: 'Utiliser {country}' },
  'coh.keep': { en: 'Keep {country}', fr: 'Garder {country}' },
  'loc.tapToChange': { en: 'tap to change', fr: 'touchez pour changer' },
  'loc.collapse': { en: '↩︎ Collapse', fr: '↩︎ Replier' },
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
  'tile.sketchbook.label': { en: 'Sketchbook', fr: 'Sketchbook' },
  'tile.sketchbook.sub':   { en: 'Save & organise your eateries into cabinets',
                             fr: 'Enregistrez et classez vos adresses en classeurs' },
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

// ----- Indonesian (id) overlay — v0.62.306 -----
// Machine-drafted Indonesian, operator-reviewed. Flat key→string overlay merged
// into STRINGS below (existing en/fr untouched; unlisted keys degrade to English).
// Brand words (Soleat) kept verbatim.
const ID_STRINGS = {
  'hero.tagline.line1': 'Makan sendiri',
  'hero.tagline.line2': 'Ayo makan',
  'hero.subtagline': 'Jelajahi 50+ masakan Singapura di luar favorit yang biasa',
  'section.eat': 'Makan',
  'section.discover': 'Jelajahi',
  'section.plan': 'Rencanakan',
  'section.location': 'Lokasi',
  'tile.cuisine.label': 'Pilihan Masakan atau Makanan Lokal',
  'tile.cuisine.sub': 'Cari tempat makan — 50+ masakan, hidangan, atau suasana',
  'tile.train.label': 'Jalur Kereta',
  'tile.train.sub': 'Status MRT & LRT langsung, stasiun, dan peringatan layanan',
  'tile.hawker.label': 'Pusat Jajan',
  'tile.hawker.sub': 'Budaya hawker Singapura yang diakui UNESCO, tempat makanan sehari-hari dan komunitas bertemu',
  'section.sg': '🇸🇬 Singapura',
  'tile.recognised.label': 'Diakui',
  'tile.search.label': 'Cari',
  'tile.weather.label': 'Cuaca',
  'tile.location.label': 'Lokasi',
  'tile.drive.label': 'Berkendara',
  'tile.incidents.label': 'Insiden',
  'tile.busNearest.label': 'Halte bus',
  'tile.busRoute.label': 'Rencana rute',
  'panel.train.title': 'Kereta',
  'panel.train.map': 'Peta MRT',
  'panel.train.more': 'Status lengkap',
  'tile.train.live.healthy': '🟢 Semua jalur normal',
  'tile.train.live.disruption': '🔴 Gangguan — ketuk untuk detail',
  'tile.train.live.offline': '🟡 Sensor LTA offline',
  'tile.train.live.warmup': 'Menyiapkan…',
  'chip.language': 'Bahasa',
  'chip.privacy': 'Privasi',
  'chip.forgetme': 'Lupakan saya',
  'loc.farFromPick': '📍 Anda tampak jauh dari {label} — ketuk kolom lokasi untuk memperbarui.',
  'footer.tag': 'Eksperimental · Singapura',
  'btn.fabBack': 'kembali',
  'btn.fabEnd': 'tutup',
  'btn.fabBackAria': 'Kembali',
  'btn.fabEndAria': 'Tutup',
  'btn.fabTop': '⇡ atas',
  'btn.fabDown': '⇣ bawah',
  'btn.fabTopAria': 'Kembali ke atas',
  'btn.fabDownAria': 'Gulir ke bawah',
  'hint.tap': 'Ketuk ubin untuk mulai · geser ke bawah untuk menutup',
  'location.fieldLabel': '📍 Jangkar pencarian',
  'location.currentNone': 'Belum ada jangkar — pencarian memakai pin GPS Anda atau default Singapura.',
  'location.currentSet': 'Berjangkar di <b>{label}</b>{cap}.',
  'location.capNote': ' · batas {km} km',
  'location.dropdownLabel': 'Pilih kawasan…',
  'location.dropdownGroupSg': 'Singapura — kawasan STB',
  'location.dropdownGroupSgReg': 'Singapura — wilayah',
  'location.dropdownGroupMy': 'Malaysia',
  'location.searchPlaceholder': 'atau ketik nama tempat…',
  'location.searchSubmit': 'Atur',
  'location.setOk': '✅ Berjangkar di {label}.',
  'location.setErr': '⚠️ Tidak bisa menetapkan lokasi itu. Coba nama yang lebih spesifik.',
  'tile.disabledMy': 'Hanya Singapura — ganti jangkar untuk memakai ini.',
  'location.disabledList': ' (Hawker, Kereta, Insiden, Halte bus, Cuaca dinonaktifkan)',
  'loc.other.country': 'Negara',
  'loc.other.city': 'Kota',
  'loc.other.placeholder': 'Ketik tempat + Cari',
  'loc.other.searchBtn': '🔍 Cari',
  'loc.other.searching': 'Mencari {country}…',
  'loc.other.noMatch': 'Tidak ada tempat ditemukan di {country}. Coba nama lain.',
  'loc.other.confirmHeader': 'Ditemukan di {flag} {country}:',
  'loc.other.cancel': '✕ Batal · ketik lagi',
  'rating.resetTitle': 'Rating disetel ulang: Bagus+ ≥ 3,7⭐',
  'rating.resetBody': 'Menampilkan tempat makan dengan rating Google yang umumnya bagus.',
  'hero.title': 'Menu Soleat',
  'ui.refresh': 'Muat ulang',
  'country.SG': 'Singapura',
  'country.MY': 'Malaysia',
  'coh.title': 'Lokasi tidak cocok',
  'coh.body': 'Sebelumnya Anda menetapkan lokasi ke {saved}, tetapi perangkat Anda sekarang di {device}.',
  'coh.use': 'Gunakan {country}',
  'coh.keep': 'Tetap {country}',
  'loc.tapToChange': 'ketuk untuk mengubah',
  'loc.collapse': '↩︎ Tutup',
  'tile.sketchbook.sub': 'Simpan & atur tempat makan Anda ke dalam lemari',
};
for (const k in ID_STRINGS) {
  if (STRINGS[k] && STRINGS[k].id == null) STRINGS[k].id = ID_STRINGS[k];
}

// ----- Russian (ru) overlay — v0.62.311. Controls kept tight to fit EN. -----
const RU_STRINGS = {
  'hero.tagline.line1': 'Едим в одиночку',
  'hero.tagline.line2': 'Так давайте поедим',
  'hero.subtagline': 'Откройте 50+ кухонь Сингапура помимо привычных любимцев',
  'section.eat': 'Еда',
  'section.discover': 'Открыть',
  'section.plan': 'План',
  'section.location': 'Место',
  'tile.cuisine.label': 'Кухня или местная еда',
  'tile.cuisine.sub': 'Где поесть — 50+ кухонь, блюдо или атмосфера',
  'tile.train.label': 'Линии метро',
  'tile.train.sub': 'Статус MRT и LRT в реальном времени, станции и оповещения',
  'tile.hawker.label': 'Хокер-центр',
  'tile.hawker.sub': 'Культура хокеров Сингапура, признанная ЮНЕСКО, где встречаются повседневная еда и сообщество',
  'section.sg': '🇸🇬 Сингапур',
  'tile.recognised.label': 'Признано',
  'tile.search.label': 'Поиск',
  'tile.weather.label': 'Погода',
  'tile.location.label': 'Место',
  'tile.drive.label': 'Авто',
  'tile.incidents.label': 'Инциденты',
  'tile.busNearest.label': 'Остановки',
  'tile.busRoute.label': 'Маршрут',
  'panel.train.title': 'Метро',
  'panel.train.map': 'Карта MRT',
  'panel.train.more': 'Полный статус',
  'tile.train.live.healthy': '🟢 Все линии в норме',
  'tile.train.live.disruption': '🔴 Сбой — нажмите для деталей',
  'tile.train.live.offline': '🟡 Датчик LTA офлайн',
  'tile.train.live.warmup': 'Подготовка…',
  'chip.language': 'Язык',
  'chip.privacy': 'Конфиденц.',
  'chip.forgetme': 'Забыть меня',
  'loc.farFromPick': '📍 Вы, похоже, далеко от {label} — нажмите поле локации, чтобы обновить.',
  'footer.tag': 'Экспериментально · Сингапур',
  'btn.fabBack': 'назад',
  'btn.fabEnd': 'закрыть',
  'btn.fabBackAria': 'Назад',
  'btn.fabEndAria': 'Закрыть',
  'btn.fabTop': '⇡ вверх',
  'btn.fabDown': '⇣ вниз',
  'btn.fabTopAria': 'Наверх',
  'btn.fabDownAria': 'Вниз',
  'hint.tap': 'Нажмите плитку, чтобы начать · смахните вниз, чтобы закрыть',
  'location.fieldLabel': '📍 Точка поиска',
  'location.currentNone': 'Точка не задана — поиск использует ваш GPS или Сингапур по умолчанию.',
  'location.currentSet': 'Привязано к <b>{label}</b>{cap}.',
  'location.capNote': ' · радиус {km} км',
  'location.dropdownLabel': 'Выберите район…',
  'location.dropdownGroupSg': 'Сингапур — районы STB',
  'location.dropdownGroupSgReg': 'Сингапур — регион',
  'location.dropdownGroupMy': 'Малайзия',
  'location.searchPlaceholder': 'или введите название места…',
  'location.searchSubmit': 'ОК',
  'location.setOk': '✅ Привязано к {label}.',
  'location.setErr': '⚠️ Не удалось задать это место. Попробуйте более точное название.',
  'tile.disabledMy': 'Только Сингапур — смените точку, чтобы использовать.',
  'location.disabledList': ' (Хокер, Метро, Инциденты, Остановки, Погода отключены)',
  'loc.other.country': 'Страна',
  'loc.other.city': 'Город',
  'loc.other.placeholder': 'Введите место + Поиск',
  'loc.other.searchBtn': '🔍 Поиск',
  'loc.other.searching': 'Поиск в {country}…',
  'loc.other.noMatch': 'В {country} ничего не найдено. Попробуйте другое название.',
  'loc.other.confirmHeader': 'Найдено в {flag} {country}:',
  'loc.other.cancel': '✕ Отмена · ввести снова',
  'rating.resetTitle': 'Рейтинг сброшен: Хорошо+ ≥ 3,7⭐',
  'rating.resetBody': 'Показаны заведения с в целом хорошими оценками Google.',
  'hero.title': 'Меню Soleat',
  'ui.refresh': 'Обновить',
  'country.SG': 'Сингапур',
  'country.MY': 'Малайзия',
  'coh.title': 'Несоответствие местоположения',
  'coh.body': 'Ранее вы выбрали {saved}, но ваше устройство сейчас здесь: {device}.',
  'coh.use': 'Использовать: {country}',
  'coh.keep': 'Оставить: {country}',
  'loc.tapToChange': 'нажмите, чтобы изменить',
  'loc.collapse': '↩︎ Свернуть',
  'tile.sketchbook.sub': 'Сохраняйте и раскладывайте заведения по шкафчикам',
};

// ----- German (de) overlay — v0.62.311. Compounds abbreviated where tight. -----
const DE_STRINGS = {
  'hero.tagline.line1': 'Allein essen',
  'hero.tagline.line2': 'Also, essen wir',
  'hero.subtagline': 'Entdecken Sie Singapurs 50+ Küchen jenseits der üblichen Favoriten',
  'section.eat': 'Essen',
  'section.discover': 'Entdecken',
  'section.plan': 'Planen',
  'section.location': 'Ort',
  'tile.cuisine.label': 'Küche oder lokales Essen',
  'tile.cuisine.sub': 'Wo essen — 50+ Küchen, ein Gericht oder eine Stimmung',
  'tile.train.label': 'Bahnlinien',
  'tile.train.sub': 'MRT- & LRT-Status live, Stationen und Service-Hinweise',
  'tile.hawker.label': 'Hawker-Zentrum',
  'tile.hawker.sub': 'Singapurs UNESCO-anerkannte Hawker-Kultur, wo Alltagsessen und Gemeinschaft zusammenkommen',
  'section.sg': '🇸🇬 Singapur',
  'tile.recognised.label': 'Anerkannt',
  'tile.search.label': 'Suche',
  'tile.weather.label': 'Wetter',
  'tile.location.label': 'Ort',
  'tile.drive.label': 'Fahren',
  'tile.incidents.label': 'Vorfälle',
  'tile.busNearest.label': 'Haltestellen',
  'tile.busRoute.label': 'Route',
  'panel.train.title': 'Bahn',
  'panel.train.map': 'MRT-Karte',
  'panel.train.more': 'Voller Status',
  'tile.train.live.healthy': '🟢 Alle Linien normal',
  'tile.train.live.disruption': '🔴 Störung — tippen für Details',
  'tile.train.live.offline': '🟡 LTA-Sensor offline',
  'tile.train.live.warmup': 'Aufwärmen…',
  'chip.language': 'Sprache',
  'chip.privacy': 'Datenschutz',
  'chip.forgetme': 'Mich vergessen',
  'loc.farFromPick': '📍 Sie scheinen weit von {label} entfernt — tippen Sie auf das Ortsfeld zum Aktualisieren.',
  'footer.tag': 'Experimentell · Singapur',
  'btn.fabBack': 'zurück',
  'btn.fabEnd': 'schließen',
  'btn.fabBackAria': 'Zurück',
  'btn.fabEndAria': 'Schließen',
  'btn.fabTop': '⇡ oben',
  'btn.fabDown': '⇣ unten',
  'btn.fabTopAria': 'Nach oben',
  'btn.fabDownAria': 'Nach unten',
  'hint.tap': 'Kachel tippen zum Starten · nach unten wischen zum Schließen',
  'location.fieldLabel': '📍 Suchpunkt',
  'location.currentNone': 'Kein Punkt gesetzt — die Suche nutzt Ihren GPS-Pin oder standardmäßig Singapur.',
  'location.currentSet': 'Verankert bei <b>{label}</b>{cap}.',
  'location.capNote': ' · Umkreis {km} km',
  'location.dropdownLabel': 'Viertel wählen…',
  'location.dropdownGroupSg': 'Singapur — STB-Viertel',
  'location.dropdownGroupSgReg': 'Singapur — Region',
  'location.dropdownGroupMy': 'Malaysia',
  'location.searchPlaceholder': 'oder einen Ortsnamen eingeben…',
  'location.searchSubmit': 'OK',
  'location.setOk': '✅ Verankert bei {label}.',
  'location.setErr': '⚠️ Ort konnte nicht gesetzt werden. Versuchen Sie einen genaueren Namen.',
  'tile.disabledMy': 'Nur Singapur — Punkt wechseln, um dies zu nutzen.',
  'location.disabledList': ' (Hawker, Bahn, Vorfälle, Bushaltestellen, Wetter deaktiviert)',
  'loc.other.country': 'Land',
  'loc.other.city': 'Stadt',
  'loc.other.placeholder': 'Ort eingeben + Suche',
  'loc.other.searchBtn': '🔍 Suche',
  'loc.other.searching': 'Suche in {country}…',
  'loc.other.noMatch': 'In {country} nichts gefunden. Anderer Name?',
  'loc.other.confirmHeader': 'Gefunden in {flag} {country}:',
  'loc.other.cancel': '✕ Abbrechen · erneut',
  'rating.resetTitle': 'Bewertung zurückgesetzt: Gut+ ≥ 3,7⭐',
  'rating.resetBody': 'Zeigt Lokale mit allgemein guten Google-Bewertungen.',
  'hero.title': 'Soleat Menü',
  'ui.refresh': 'Aktualisieren',
  'country.SG': 'Singapur',
  'country.MY': 'Malaysia',
  'coh.title': 'Standortkonflikt',
  'coh.body': 'Sie hatten zuvor {saved} gewählt, aber Ihr Gerät ist jetzt hier: {device}.',
  'coh.use': '{country} verwenden',
  'coh.keep': '{country} behalten',
  'loc.tapToChange': 'zum Ändern tippen',
  'loc.collapse': '↩︎ Einklappen',
  'tile.sketchbook.sub': 'Speichern und ordnen Sie Ihre Lokale in Schränken',
};
for (const k in RU_STRINGS) { if (STRINGS[k] && STRINGS[k].ru == null) STRINGS[k].ru = RU_STRINGS[k]; }
for (const k in DE_STRINGS) { if (STRINGS[k] && STRINGS[k].de == null) STRINGS[k].de = DE_STRINGS[k]; }

// ----- Chinese (zh) overlay — v0.62.490. Agent-drafted, reuses Cuisine zh for
// shared keys (loc.other.*, FABs). Control/tile labels tight; flowing text fuller. -----
const ZH_STRINGS = {
  'hero.tagline.line1': '独自用餐',
  'hero.tagline.line2': '那就开吃吧',
  'hero.subtagline': '探索新加坡 50+ 种美食，跳出熟悉的最爱',
  'section.eat': '用餐',
  'section.discover': '发现',
  'section.plan': '规划',
  'section.location': '位置',
  'tile.cuisine.label': '美食或本地菜精选',
  'tile.cuisine.sub': '找地方吃 — 搜索 50+ 种美食、菜品或心情',
  'tile.train.label': '地铁线',
  'tile.train.sub': 'MRT 和 LRT 实时状态、车站及服务提醒',
  'tile.hawker.label': '小贩中心',
  'tile.hawker.sub': '新加坡获 UNESCO 认可的小贩文化，日常美食与社区在此交汇',
  'section.sg': '🇸🇬 新加坡',
  'tile.recognised.label': '获认可',
  'tile.search.label': '搜索',
  'tile.weather.label': '天气',
  'tile.location.label': '位置',
  'tile.drive.label': '驾车',
  'tile.incidents.label': '路况',
  'tile.busNearest.label': '巴士站',
  'tile.busRoute.label': '规划路线',
  'panel.train.title': '地铁',
  'panel.train.map': 'MRT 地图',
  'panel.train.more': '完整状态',
  'tile.train.live.healthy': '🟢 所有线路正常',
  'tile.train.live.disruption': '🔴 服务中断 — 点按查看详情',
  'tile.train.live.offline': '🟡 LTA 传感器离线',
  'tile.train.live.warmup': '正在加载…',
  'chip.language': '语言',
  'chip.privacy': '隐私',
  'chip.forgetme': '忘记我',
  'loc.farFromPick': '📍 您似乎离 {label} 很远 — 点按位置栏更新。',
  'footer.tag': '试验版 · 新加坡',
  'btn.fabBack': '返回',
  'btn.fabEnd': '关闭',
  'btn.fabBackAria': '返回',
  'btn.fabEndAria': '关闭',
  'btn.fabTop': '⇡ 顶部',
  'btn.fabDown': '⇣ 底部',
  'btn.fabTopAria': '回到顶部',
  'btn.fabDownAria': '向下滚动',
  'hint.tap': '点按图块开始 · 向下滑动关闭',
  'location.fieldLabel': '📍 搜索定位',
  'location.currentNone': '未设定位 — 搜索将使用您分享的 GPS 定位，或默认新加坡。',
  'location.currentSet': '已定位于 <b>{label}</b>{cap}。',
  'location.capNote': ' · {km} 公里上限',
  'location.dropdownLabel': '选择一个区域…',
  'location.dropdownGroupSg': '新加坡 — STB 区域',
  'location.dropdownGroupSgReg': '新加坡 — 地区',
  'location.dropdownGroupMy': '马来西亚',
  'location.searchPlaceholder': '或输入地点名称…',
  'location.searchSubmit': '设定',
  'location.setOk': '✅ 已定位于 {label}。',
  'location.setErr': '⚠️ 无法设定该位置。请输入更具体的名称。',
  'tile.disabledMy': '仅限新加坡 — 切换定位后可使用。',
  'location.disabledList': '（小贩中心、地铁、路况、巴士站、天气已停用）',
  'loc.other.country': '国家',
  'loc.other.city': '城市',
  'loc.other.placeholder': '输入地点名称 + 搜索',
  'loc.other.searchBtn': '🔍 搜索',
  'loc.other.searching': '正在搜索 {country}…',
  'loc.other.noMatch': '在{country}找不到地点，请换个名称试试。',
  'loc.other.confirmHeader': '在 {flag} {country} 找到：',
  'loc.other.cancel': '✕ 取消 · 重新输入',
  'rating.resetTitle': '评分已重置：优良+ ≥ 3.7⭐',
  'rating.resetBody': '显示 Google 评分总体良好的餐馆。',
  'hero.title': 'Soleat 菜单',
  'ui.refresh': '刷新',
  'country.SG': '新加坡',
  'country.MY': '马来西亚',
  'coh.title': '位置不一致',
  'coh.body': '您之前将位置设为{saved}，但您的设备现在位于{device}。',
  'coh.use': '使用{country}',
  'coh.keep': '保留{country}',
  'loc.tapToChange': '点击更改',
  'loc.collapse': '↩︎ 收起',
  'tile.sketchbook.sub': '把你收藏的餐馆整理到柜子里',
};
for (const k in ZH_STRINGS) { if (STRINGS[k] && STRINGS[k].zh == null) STRINGS[k].zh = ZH_STRINGS[k]; }

// ----- Japanese (ja) overlay — v0.62.490. Agent-drafted, reuses Cuisine ja for
// shared keys (loc.other.*, FABs). Control/tile labels tight; flowing text fuller. -----
const JA_STRINGS = {
  'hero.tagline.line1': 'ひとりで食べる',
  'hero.tagline.line2': 'さあ、食べよう',
  'hero.subtagline': '定番の先へ。シンガポールの50+の料理を発見',
  'section.eat': '食べる',
  'section.discover': '見つける',
  'section.plan': '計画する',
  'section.location': '場所',
  'tile.cuisine.label': '料理・ローカルフード',
  'tile.cuisine.sub': 'どこで食べる？ 50+の料理・一品・気分で探す',
  'tile.train.label': '鉄道路線',
  'tile.train.sub': 'MRT・LRTの運行状況、駅、運行情報をリアルタイムで',
  'tile.hawker.label': 'ホーカーセンター',
  'tile.hawker.sub': 'UNESCOに認められたシンガポールのホーカー文化。日常の食と人が集う場所',
  'section.sg': '🇸🇬 シンガポール',
  'tile.recognised.label': '認定店',
  'tile.search.label': '検索',
  'tile.weather.label': '天気',
  'tile.location.label': '場所',
  'tile.drive.label': '運転',
  'tile.incidents.label': '交通情報',
  'tile.busNearest.label': 'バス停',
  'tile.busRoute.label': 'ルート検索',
  'panel.train.title': '鉄道',
  'panel.train.map': 'MRTマップ',
  'panel.train.more': '全運行状況',
  'tile.train.live.healthy': '🟢 全線平常運転',
  'tile.train.live.disruption': '🔴 運行乱れ — タップで詳細',
  'tile.train.live.offline': '🟡 LTAセンサーオフライン',
  'tile.train.live.warmup': '準備中…',
  'chip.language': '言語',
  'chip.privacy': 'プライバシー',
  'chip.forgetme': 'データ削除',
  'loc.farFromPick': '📍 {label}から離れているようです — 場所欄をタップして更新してください。',
  'footer.tag': '試験運用版 · シンガポール',
  'btn.fabBack': '戻る',
  'btn.fabEnd': '閉じる',
  'btn.fabBackAria': '戻る',
  'btn.fabEndAria': '閉じる',
  'btn.fabTop': '⇡ 上へ',
  'btn.fabDown': '⇣ 下へ',
  'btn.fabTopAria': '先頭へ戻る',
  'btn.fabDownAria': '下へスクロール',
  'hint.tap': 'タイルをタップして開始 · 下にスワイプで閉じる',
  'location.fieldLabel': '📍 検索の基準地点',
  'location.currentNone': '基準地点が未設定 — 検索は共有中のGPSピン、または初期設定のシンガポールを使います。',
  'location.currentSet': '<b>{label}</b>{cap}を基準に設定。',
  'location.capNote': ' · {km} km以内',
  'location.dropdownLabel': '地区を選ぶ…',
  'location.dropdownGroupSg': 'シンガポール — STB地区',
  'location.dropdownGroupSgReg': 'シンガポール — 地域',
  'location.dropdownGroupMy': 'マレーシア',
  'location.searchPlaceholder': 'または場所名を入力…',
  'location.searchSubmit': '設定',
  'location.setOk': '✅ {label}を基準に設定しました。',
  'location.setErr': '⚠️ その場所を設定できませんでした。もっと具体的な名前をお試しください。',
  'tile.disabledMy': 'シンガポール限定 — 基準地点を変更すると使えます。',
  'location.disabledList': ' (ホーカー、鉄道、交通情報、バス停、天気は無効)',
  'loc.other.country': '国',
  'loc.other.city': '都市',
  'loc.other.placeholder': '場所を入力 + 検索',
  'loc.other.searchBtn': '🔍 検索',
  'loc.other.searching': '{country}で検索中…',
  'loc.other.noMatch': '{country}で場所が見つかりません。別の名前をお試しください。',
  'loc.other.confirmHeader': '{flag} {country}で見つかりました:',
  'loc.other.cancel': '✕ キャンセル · 再入力',
  'rating.resetTitle': '評価をリセット: 高評価+ ≥ 3.7⭐',
  'rating.resetBody': 'Googleで概ね高評価の飲食店を表示します。',
  'hero.title': 'Soleat メニュー',
  'ui.refresh': '更新',
  'country.SG': 'シンガポール',
  'country.MY': 'マレーシア',
  'coh.title': '位置情報の不一致',
  'coh.body': '以前は{saved}を設定していましたが、現在デバイスは{device}にあります。',
  'coh.use': '{country}を使う',
  'coh.keep': '{country}のままにする',
  'loc.tapToChange': 'タップで変更',
  'loc.collapse': '↩︎ 折りたたむ',
  'tile.sketchbook.sub': 'お気に入りの飲食店を保存してキャビネットに整理',
};
for (const k in JA_STRINGS) { if (STRINGS[k] && STRINGS[k].ja == null) STRINGS[k].ja = JA_STRINGS[k]; }

// ----- Spanish (es) overlay — v0.62.490. Agent-drafted, reuses Cuisine es for
// shared keys (loc.other.*, FABs). Control/tile labels tight; flowing text fuller. -----
const ES_STRINGS = {
  'hero.tagline.line1': 'Comer solo',
  'hero.tagline.line2': 'Así que comamos',
  'hero.subtagline': 'Explora las 50+ cocinas de Singapur más allá de los clásicos',
  'section.eat': 'Comer',
  'section.discover': 'Descubrir',
  'section.plan': 'Planificar',
  'section.location': 'Ubicación',
  'tile.cuisine.label': 'Cocina o comida local',
  'tile.cuisine.sub': 'Dónde comer — 50+ cocinas, un plato o un ambiente',
  'tile.train.label': 'Líneas de tren',
  'tile.train.sub': 'Estado del MRT y LRT en vivo, estaciones y alertas de servicio',
  'tile.hawker.label': 'Centro de hawkers',
  'tile.hawker.sub': 'La cultura hawker de Singapur, reconocida por la UNESCO, donde se encuentran la comida diaria y la comunidad',
  'section.sg': '🇸🇬 Singapur',
  'tile.recognised.label': 'Reconocidos',
  'tile.search.label': 'Buscar',
  'tile.weather.label': 'Clima',
  'tile.location.label': 'Ubicación',
  'tile.drive.label': 'Conducir',
  'tile.incidents.label': 'Incidentes',
  'tile.busNearest.label': 'Paradas de bus',
  'tile.busRoute.label': 'Planear ruta',
  'panel.train.title': 'Tren',
  'panel.train.map': 'Mapa MRT',
  'panel.train.more': 'Estado completo',
  'tile.train.live.healthy': '🟢 Todas las líneas normales',
  'tile.train.live.disruption': '🔴 Interrupción — toca para ver detalles',
  'tile.train.live.offline': '🟡 Sensor LTA sin conexión',
  'tile.train.live.warmup': 'Iniciando…',
  'chip.language': 'Idioma',
  'chip.privacy': 'Privacidad',
  'chip.forgetme': 'Olvidarme',
  'loc.farFromPick': '📍 Pareces estar lejos de {label} — toca el campo de ubicación para actualizar.',
  'footer.tag': 'Experimental · Singapur',
  'btn.fabBack': 'atrás',
  'btn.fabEnd': 'cerrar',
  'btn.fabBackAria': 'Atrás',
  'btn.fabEndAria': 'Cerrar',
  'btn.fabTop': '⇡ arriba',
  'btn.fabDown': '⇣ abajo',
  'btn.fabTopAria': 'Volver arriba',
  'btn.fabDownAria': 'Bajar',
  'hint.tap': 'Toca una casilla para comenzar · desliza hacia abajo para cerrar',
  'location.fieldLabel': '📍 Punto de búsqueda',
  'location.currentNone': 'Sin punto fijado — las búsquedas usan tu pin GPS compartido o Singapur por defecto.',
  'location.currentSet': 'Anclado en <b>{label}</b>{cap}.',
  'location.capNote': ' · límite {km} km',
  'location.dropdownLabel': 'Elige un barrio…',
  'location.dropdownGroupSg': 'Singapur — barrios STB',
  'location.dropdownGroupSgReg': 'Singapur — región',
  'location.dropdownGroupMy': 'Malasia',
  'location.searchPlaceholder': 'o escribe un nombre de lugar…',
  'location.searchSubmit': 'OK',
  'location.setOk': '✅ Anclado en {label}.',
  'location.setErr': '⚠️ No se pudo fijar esa ubicación. Prueba un nombre más específico.',
  'tile.disabledMy': 'Solo Singapur — cambia el ancla para usar esto.',
  'location.disabledList': ' (Hawker, Tren, Incidentes, Paradas de bus, Clima desactivados)',
  'loc.other.country': 'País',
  'loc.other.city': 'Ciudad',
  'loc.other.placeholder': 'Escribe un lugar + 🔍',
  'loc.other.searchBtn': '🔍 Buscar',
  'loc.other.searching': 'Buscando en {country}…',
  'loc.other.noMatch': 'No se encontraron lugares en {country}. Prueba otro nombre.',
  'loc.other.confirmHeader': 'Encontrado en {flag} {country}:',
  'loc.other.cancel': '✕ Cancelar · reintentar',
  'rating.resetTitle': 'Valoración reajustada: Bueno+ ≥ 3.7⭐',
  'rating.resetBody': 'Muestra restaurantes con valoraciones de Google generalmente buenas.',
  'hero.title': 'Menú Soleat',
  'ui.refresh': 'Actualizar',
  'country.SG': 'Singapur',
  'country.MY': 'Malasia',
  'coh.title': 'Discrepancia de ubicación',
  'coh.body': 'Antes fijaste tu ubicación en {saved}, pero tu dispositivo está ahora en {device}.',
  'coh.use': 'Usar {country}',
  'coh.keep': 'Mantener {country}',
  'loc.tapToChange': 'toca para cambiar',
  'loc.collapse': '↩︎ Contraer',
  'tile.sketchbook.sub': 'Guarda y organiza tus locales en armarios',
};
for (const k in ES_STRINGS) { if (STRINGS[k] && STRINGS[k].es == null) STRINGS[k].es = ES_STRINGS[k]; }

// ----- Korean (ko) overlay — v0.62.879. Hand-written; no paid translation API, per
// the operator's standing instruction. `ko` is NOT in SUPPORTED yet, so this block is inert:
// the merge below writes a column nothing reads until the K6 flip adds 'ko' to the list.
const KO_STRINGS = {
  "hero.title": "Soleat 메뉴",
  "ui.refresh": "새로고침",
  "country.SG": "싱가포르",
  "country.MY": "말레이시아",
  "coh.title": "위치가 일치하지 않습니다",
  "coh.body": "이전에 위치를 {saved}(으)로 설정하셨지만, 기기는 현재 {device}에 있습니다.",
  "coh.use": "{country} 사용",
  "coh.keep": "{country} 유지",
  "loc.tapToChange": "눌러서 변경",
  "loc.collapse": "↩︎ 접기",
  "hero.tagline.line1": "혼자 먹어도",
  "hero.tagline.line2": "함께 먹어도",
  "hero.subtagline": "익숙한 맛을 넘어 싱가포르의 50가지 넘는 요리를 만나보세요",
  "section.eat": "먹기",
  "section.discover": "둘러보기",
  "section.plan": "계획하기",
  "section.location": "위치",
  "tile.cuisine.label": "요리 · 로컬 음식 고르기",
  "tile.cuisine.sub": "어디서 먹을지 찾아보세요 — 50가지 넘는 요리, 음식 이름, 분위기로 검색",
  "tile.train.label": "지하철 노선",
  "tile.train.sub": "MRT·LRT 실시간 운행 상황, 역 정보, 운행 알림",
  "tile.hawker.label": "호커센터",
  "tile.hawker.sub": "일상의 음식과 사람이 만나는, 유네스코가 인정한 싱가포르의 호커 문화",
  "tile.sketchbook.sub": "마음에 든 식당을 캐비닛에 저장하고 정리하세요",
  "section.sg": "🇸🇬 싱가포르",
  "tile.recognised.label": "수상·선정",
  "tile.search.label": "검색",
  "tile.weather.label": "날씨",
  "tile.location.label": "위치",
  "tile.drive.label": "운전",
  "tile.incidents.label": "교통 상황",
  "tile.busNearest.label": "버스 정류장",
  "tile.busRoute.label": "경로 계획",
  "panel.train.title": "지하철",
  "panel.train.map": "MRT 노선도",
  "panel.train.more": "전체 운행 상황",
  "tile.train.live.healthy": "🟢 전 노선 정상",
  "tile.train.live.disruption": "🔴 운행 장애 — 눌러서 자세히 보기",
  "tile.train.live.offline": "🟡 LTA 센서 오프라인",
  "tile.train.live.warmup": "준비 중…",
  "chip.language": "언어",
  "chip.privacy": "개인정보",
  "chip.forgetme": "내 정보 삭제",
  "loc.farFromPick": "📍 {label}에서 멀리 계신 것 같습니다 — 위치 항목을 눌러 변경하세요.",
  "footer.tag": "실험 중 · 싱가포르",
  "btn.fabBack": "뒤로",
  "btn.fabEnd": "종료",
  "btn.fabBackAria": "뒤로",
  "btn.fabEndAria": "종료",
  "btn.fabTop": "⇡ 맨 위",
  "btn.fabDown": "⇣ 아래로",
  "btn.fabTopAria": "맨 위로",
  "btn.fabDownAria": "아래로 스크롤",
  "hint.tap": "타일을 눌러 시작하세요 · 아래로 쓸어내리면 닫힙니다",
  "location.fieldLabel": "📍 검색 기준점",
  "location.currentNone": "기준점이 없습니다 — 공유된 GPS 위치를 쓰거나 싱가포르를 기본값으로 합니다.",
  "location.currentSet": "<b>{label}</b> 기준입니다{cap}.",
  "location.capNote": " · 반경 {km}km 제한",
  "location.dropdownLabel": "지역을 고르세요…",
  "location.dropdownGroupSg": "싱가포르 — STB 관광 구역",
  "location.dropdownGroupSgReg": "싱가포르 — 권역",
  "location.dropdownGroupMy": "말레이시아",
  "location.searchPlaceholder": "또는 장소 이름을 입력하세요…",
  "location.searchSubmit": "설정",
  "location.setOk": "✅ {label} 기준으로 설정했습니다.",
  "location.setErr": "⚠️ 해당 위치를 설정하지 못했습니다. 더 구체적인 이름으로 시도해 보세요.",
  "tile.disabledMy": "싱가포르 전용 — 기준점을 싱가포르로 바꾸면 사용할 수 있습니다.",
  "location.disabledList": " (호커센터, 지하철, 교통 상황, 버스 정류장, 날씨를 사용할 수 없습니다)",
  "loc.other.country": "국가",
  "loc.other.city": "도시",
  "loc.other.placeholder": "장소를 입력하고 검색",
  "loc.other.searchBtn": "🔍 검색",
  "loc.other.searching": "{country} 검색 중…",
  "loc.other.noMatch": "{country}에서 장소를 찾지 못했습니다. 다른 이름으로 시도해 보세요.",
  "loc.other.confirmHeader": "{flag} {country}에서 찾았습니다:",
  "loc.other.cancel": "✕ 취소 · 다시 입력",
  "rating.resetTitle": "평점 초기화: 좋음 이상 3.7⭐ 이상",
  "rating.resetBody": "구글 평점이 대체로 좋은 식당을 표시합니다.",
};
for (const k in KO_STRINGS) { if (STRINGS[k] && STRINGS[k].ko == null) STRINGS[k].ko = KO_STRINGS[k]; }

export function t(key, lang) {
  const l = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] ?? entry.en ?? key;
}

// v0.62.837 — interpolating variant, mirroring cuisine/hawker/transport's `tn`.
// Added because the location-mismatch dialog's strings carry {saved}/{device}
// slots; before this they were a four-locale ternary chain (en/fr/ru/de), so
// Indonesian, Chinese, Japanese and Spanish readers got the English arm.
export function tn(key, lang, vars = null) {
  let s = t(key, lang);
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.split(`{${k}}`).join(String(v));
    }
  }
  return s;
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
  // v0.62.501 — prefer the DEVICE locale (navigator.language) over the
  // Telegram APP locale (language_code). language_code reflects the Telegram
  // client UI language, a weak signal for the user's real language; a French
  // phone running an English Telegram was resolving to 'en'. detectFromNavigator
  // returns null when the device locale is unsupported, so we still fall back to
  // the Telegram hint, then 'en'.
  return detectFromNavigator() || detectFromTelegram() || 'en';
}

// v0.60.62 — flip the active locale from inside the menu hub.
// Mirrors the cuisine TMA's setActiveLocale: writes localStorage,
// fires the gia:locale CustomEvent (so every subscribed useLocale
// re-renders), and best-effort POSTs to /api/cuisine/user-language
// so the chat-side /language preference syncs across sessions.
// v0.62.884 — module latches for the server-hydration read below. Declared
// here rather than beside hydrateFromServerOnce() so that setActiveLocale's
// assignment is not reading a binding declared further down the file.
let serverHydrated = false;
let localeChosenInApp = false;

export function setActiveLocale(lang) {
  localeChosenInApp = true;   // v0.62.884 — outranks a hydration still in flight
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

// v0.62.884 — READ the chat-side /language preference, not just write it.
// This file had only the POST in setActiveLocale, so the sync was one-way:
// a user who set /language ko in chat and then opened the Menu TMA got
// English, because getActiveLocale() falls through localStorage →
// navigator.language → Telegram's app locale and never asks the server that
// actually holds the preference. Reported by the operator against the Menu
// hub; transport and clipboard carried the identical defect and are fixed in
// the same pass rather than left to be reported one at a time.
//
// Ported from web/hawker/src/i18n.js, which has had this since v0.59.15.
// Overwriting localStorage matters as much as the event: a stale 'en' pinned
// there by an earlier flag-pill tap in ANY TMA (the key is shared across all
// five) outranks every other signal, and nothing else can dislodge it.
async function hydrateFromServerOnce() {
  if (serverHydrated) return;
  serverHydrated = true;
  try {
    const res = await fetch('/api/cuisine/user-language', {
      headers: { 'X-Telegram-Init-Data': window.Telegram?.WebApp?.initData || '' },
    });
    if (!res.ok) return;
    const remote = (await res.json())?.lang;
    // If the reader tapped the locale pill while this was in flight, their
    // choice is newer than the server's answer and must not be undone.
    if (localeChosenInApp) return;
    if (SUPPORTED_LOCALES.includes(remote)) {
      try { window.localStorage.setItem(LOCALE_KEY, remote); } catch { /* private mode */ }
      window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: { lang: remote } }));
    }
  } catch { /* offline / 401 / 404 — keep the local fallback */ }
}

export function useLocale() {
  const [lang, setLang] = useState(() => getActiveLocale());
  useEffect(() => {
    function onLocale(e) { setLang(e?.detail?.lang || getActiveLocale()); }
    function onStorage(e) { if (e.key === LOCALE_KEY) setLang(getActiveLocale()); }
    window.addEventListener(LOCALE_EVENT, onLocale);
    window.addEventListener('storage', onStorage);
    hydrateFromServerOnce();   // v0.62.884 — the read half of the sync
    return () => {
      window.removeEventListener(LOCALE_EVENT, onLocale);
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return lang;
}
