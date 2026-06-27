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
const SUPPORTED_LOCALES = ['en', 'fr', 'id', 'ru', 'de'];

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
};

// ----- German (de) overlay — v0.62.311. Compounds abbreviated where tight. -----
const DE_STRINGS = {
  'hero.tagline.line1': 'Allein essen',
  'hero.tagline.line2': 'Also, essen wir',
  'hero.subtagline': 'Entdecke Singapurs 50+ Küchen jenseits der üblichen Favoriten',
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
  'chip.forgetme': 'Vergiss mich',
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
};
for (const k in RU_STRINGS) { if (STRINGS[k] && STRINGS[k].ru == null) STRINGS[k].ru = RU_STRINGS[k]; }
for (const k in DE_STRINGS) { if (STRINGS[k] && STRINGS[k].de == null) STRINGS[k].de = DE_STRINGS[k]; }

export function t(key, lang) {
  const l = SUPPORTED_LOCALES.includes(lang) ? lang : 'en';
  const entry = STRINGS[key];
  if (!entry) return key;
  return entry[l] ?? entry.en ?? key;
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
