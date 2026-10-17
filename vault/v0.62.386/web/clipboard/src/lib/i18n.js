// Clipboard TMA i18n.
//
// 5 supported locales: en (default + fallback), fr, id, ru, de.
// String keys cover: chrome (header, nav, empty states), catch-all,
// cabinet (create/edit/cap), drawer (segments × 11, add, delete), card
// (note, favourite, place, move, delete), share + fork, errors.
//
// Lookup helper: t('cabinet.create', 'fr'). Unknown lang falls back to
// en; unknown key falls back to the key itself (visible in dev so we
// catch typos).

const STRINGS = {
  // ── chrome ────────────────────────────────────────────────────────
  'chrome.title':           { en: 'Clipboard',          fr: 'Presse-papiers',   id: 'Papan klip',     ru: 'Буфер',          de: 'Zwischenablage' },
  'chrome.back':            { en: 'Back',               fr: 'Retour',           id: 'Kembali',        ru: 'Назад',          de: 'Zurück' },
  'chrome.close':           { en: 'Close',              fr: 'Fermer',           id: 'Tutup',          ru: 'Закрыть',        de: 'Schließen' },
  'chrome.save':            { en: 'Save',               fr: 'Enregistrer',      id: 'Simpan',         ru: 'Сохранить',      de: 'Speichern' },
  'chrome.cancel':          { en: 'Cancel',             fr: 'Annuler',          id: 'Batal',          ru: 'Отмена',         de: 'Abbrechen' },
  'chrome.delete':          { en: 'Delete',             fr: 'Supprimer',        id: 'Hapus',          ru: 'Удалить',        de: 'Löschen' },
  'chrome.loading':         { en: 'Loading…',           fr: 'Chargement…',      id: 'Memuat…',        ru: 'Загрузка…',      de: 'Lädt…' },

  // ── root ──────────────────────────────────────────────────────────
  'root.catchAll':          { en: 'Catch-all',          fr: 'Tiroir d’accueil', id: 'Tampung',   ru: 'Общая',          de: 'Sammelfach' },
  'root.catchAllHint':      { en: 'Long-press a card to drag into a cabinet.', fr: 'Appuyez longuement pour glisser vers un classeur.', id: 'Tahan kartu untuk seret ke kabinet.', ru: 'Удерживайте карточку, чтобы перетащить.', de: 'Karte halten, um sie in ein Cabinet zu ziehen.' },
  'root.catchAllEmpty':     { en: 'Tap Copy in the cuisine picker to fill this.', fr: 'Touchez Copier dans le sélecteur pour remplir.', id: 'Tekan Salin di pemilih untuk mengisinya.', ru: 'Нажмите «Копировать» в поисковике.', de: 'Tippe «Kopieren» im Cuisine-Picker.' },
  'root.cabinets':          { en: 'Cabinets',           fr: 'Classeurs',        id: 'Kabinet',        ru: 'Папки',          de: 'Cabinets' },
  'root.newCabinet':        { en: '＋ New cabinet',     fr: '＋ Nouveau classeur', id: '＋ Kabinet baru', ru: '＋ Новая папка', de: '＋ Neues Cabinet' },
  'root.capCabinets':       { en: 'Cabinet cap reached ({cap}). Delete one first.', fr: 'Limite de classeurs atteinte ({cap}). Supprimez-en un.', id: 'Batas kabinet tercapai ({cap}). Hapus salah satu.', ru: 'Лимит папок ({cap}). Удалите одну.', de: 'Cabinet-Limit erreicht ({cap}). Lösche zuerst eines.' },

  // ── cabinet create / edit ─────────────────────────────────────────
  'cabinet.create.title':   { en: 'New cabinet',        fr: 'Nouveau classeur', id: 'Kabinet baru',   ru: 'Новая папка',     de: 'Neues Cabinet' },
  'cabinet.field.name':     { en: 'Name (e.g. Trip to Tokyo)', fr: 'Nom (ex. Tokyo)', id: 'Nama (mis. Tokyo)', ru: 'Название', de: 'Name' },
  'cabinet.field.emoji':    { en: 'Emoji (optional)',   fr: 'Emoji (option)',   id: 'Emoji',          ru: 'Эмодзи',         de: 'Emoji' },
  'cabinet.field.location': { en: 'Location (optional)', fr: 'Lieu (option)',  id: 'Lokasi',         ru: 'Место',          de: 'Ort' },
  'cabinet.field.dates':    { en: 'Dates (optional)',   fr: 'Dates (option)',   id: 'Tanggal',        ru: 'Даты',           de: 'Datum' },
  'cabinet.drawers':        { en: '{n} of {cap} drawers', fr: '{n} sur {cap} tiroirs', id: '{n} dari {cap} laci', ru: '{n} из {cap} ящиков', de: '{n} von {cap} Fächern' },
  'cabinet.addDrawer':      { en: '＋ Add drawer',      fr: '＋ Ajouter un tiroir', id: '＋ Tambah laci', ru: '＋ Добавить ящик', de: '＋ Fach hinzufügen' },
  'cabinet.deleteConfirm':  { en: 'Delete this cabinet? Cards inside follow the favourite + multi-placed rules.', fr: 'Supprimer ce classeur ?', id: 'Hapus kabinet ini?', ru: 'Удалить эту папку?', de: 'Dieses Cabinet löschen?' },
  'cabinet.empty':          { en: 'No drawers yet. Add one to start planning a meal.', fr: 'Aucun tiroir. Ajoutez-en un pour commencer.', id: 'Belum ada laci. Tambahkan satu.', ru: 'Пока нет ящиков.', de: 'Noch keine Fächer.' },

  // ── drawer add / edit ─────────────────────────────────────────────
  'drawer.add.title':       { en: 'Add drawer',         fr: 'Ajouter un tiroir', id: 'Tambah laci',   ru: 'Добавить ящик',   de: 'Fach hinzufügen' },
  'drawer.field.segment':   { en: 'Time slot',          fr: 'Créneau horaire',  id: 'Waktu',          ru: 'Время',          de: 'Zeitfenster' },
  'drawer.field.dayTag':    { en: 'Day tag (optional, e.g. Day 1)', fr: 'Étiquette jour (ex. Jour 1)', id: 'Hari (mis. Hari 1)', ru: 'Метка дня', de: 'Tag (z.B. Tag 1)' },
  'drawer.field.location':  { en: 'Location (optional)', fr: 'Lieu (option)',  id: 'Lokasi',         ru: 'Место',          de: 'Ort' },
  'drawer.capReached':      { en: 'Drawer cap reached ({cap}).', fr: 'Limite atteinte ({cap}).', id: 'Batas laci ({cap}).', ru: 'Лимит ящиков ({cap}).', de: 'Limit erreicht ({cap}).' },
  'drawer.empty':           { en: 'Empty — drag a card here.', fr: 'Vide — glissez une carte.', id: 'Kosong — seret kartu.', ru: 'Пусто — перетащите карточку.', de: 'Leer — Karte hierher ziehen.' },
  'drawer.deleteConfirm':   { en: 'Delete this drawer? Cards follow the favourite + multi-placed rules.', fr: 'Supprimer ce tiroir ?', id: 'Hapus laci ini?', ru: 'Удалить этот ящик?', de: 'Dieses Fach löschen?' },

  // ── card amend ────────────────────────────────────────────────────
  'card.amend.title':       { en: 'Amend card',         fr: 'Modifier la carte', id: 'Ubah kartu',    ru: 'Изменить карту',  de: 'Karte bearbeiten' },
  'card.field.name':        { en: 'Display name',       fr: 'Nom affiché',      id: 'Nama tampilan',  ru: 'Имя',            de: 'Anzeigename' },
  'card.field.note':        { en: 'Note (max 990 chars)', fr: 'Note (990 max)', id: 'Catatan (maks 990)', ru: 'Заметка (990)', de: 'Notiz (max 990)' },
  'card.field.favourite':   { en: '⭐ Favourite (never expires)', fr: '⭐ Favori (jamais expiré)', id: '⭐ Favorit (tidak kedaluwarsa)', ru: '⭐ Избранное', de: '⭐ Favorit' },
  'card.moveTo':            { en: 'Move to…',           fr: 'Déplacer vers…',   id: 'Pindah ke…',     ru: 'Переместить…',    de: 'Verschieben…' },
  'card.placeInDrawer':     { en: 'Place in drawer',    fr: 'Placer dans un tiroir', id: 'Tempatkan',  ru: 'Поместить',       de: 'Einsortieren' },

  // ── share / fork ──────────────────────────────────────────────────
  'share.button':           { en: '🔗 Share drawer',    fr: '🔗 Partager',      id: '🔗 Bagikan',     ru: '🔗 Поделиться',  de: '🔗 Teilen' },
  'share.linkReady':        { en: 'Link copied — share via Telegram:', fr: 'Lien prêt — partager via Telegram :', id: 'Tautan siap — bagikan via Telegram:', ru: 'Ссылка готова:', de: 'Link bereit — über Telegram teilen:' },
  'share.shareToTelegram':  { en: '📲 Share to Telegram', fr: '📲 Partager dans Telegram', id: '📲 Bagikan ke Telegram', ru: '📲 Поделиться в Telegram', de: '📲 In Telegram teilen' },
  'fork.title':             { en: 'Fork to my Clipboard', fr: 'Forker vers mon presse-papiers', id: 'Fork ke Klip saya', ru: 'Сохранить в свой буфер', de: 'In meine Zwischenablage' },
  'fork.intoCabinet':       { en: 'Add to which cabinet?', fr: 'Dans quel classeur ?', id: 'Ke kabinet mana?', ru: 'В какую папку?', de: 'In welches Cabinet?' },
  'fork.catchAll':          { en: 'Just catch-all (no cabinet)', fr: 'Tiroir d’accueil seulement', id: 'Tampung saja', ru: 'Только в общую', de: 'Nur Sammelfach' },
  'fork.confirm':           { en: 'Fork',               fr: 'Forker',           id: 'Fork',           ru: 'Скопировать',    de: 'Übernehmen' },
  'fork.done':              { en: '✅ Forked {n} cards.', fr: '✅ {n} cartes copiées.', id: '✅ {n} kartu di-fork.', ru: '✅ Скопировано: {n}.', de: '✅ {n} Karten übernommen.' },
  'shared.expired':         { en: 'This shared drawer has expired.', fr: 'Ce tiroir partagé a expiré.', id: 'Tautan kedaluwarsa.', ru: 'Ссылка устарела.', de: 'Dieser Link ist abgelaufen.' },
  'shared.from':            { en: 'Shared trip',         fr: 'Voyage partagé',  id: 'Trip dibagikan', ru: 'Общий маршрут',  de: 'Geteilter Trip' },

  // ── segment display labels (used by Add Drawer sheet + headers) ──
  'seg.dayBreak':           { en: 'Day Break',          fr: 'Aube',             id: 'Subuh',          ru: 'Рассвет',        de: 'Tagesbeginn' },
  'seg.breakfast':          { en: 'Breakfast',          fr: 'Petit-déjeuner',   id: 'Sarapan',        ru: 'Завтрак',        de: 'Frühstück' },
  'seg.brunch':             { en: 'Brunch',             fr: 'Brunch',           id: 'Brunch',         ru: 'Поздний завтрак', de: 'Brunch' },
  'seg.lunch':              { en: 'Lunch',              fr: 'Déjeuner',         id: 'Makan siang',    ru: 'Обед',           de: 'Mittagessen' },
  'seg.lateLunch':          { en: 'Late Lunch',         fr: 'Déjeuner tardif',  id: 'Makan siang lambat', ru: 'Поздний обед', de: 'Spätes Mittag' },
  'seg.teaBreak':           { en: 'Tea Break',          fr: 'Goûter',           id: 'Sore',           ru: 'Полдник',        de: 'Teepause' },
  'seg.earlyDinner':        { en: 'Early Dinner',       fr: 'Dîner tôt',        id: 'Makan malam awal', ru: 'Ранний ужин',  de: 'Frühes Abendessen' },
  'seg.dinner':             { en: 'Dinner',             fr: 'Dîner',            id: 'Makan malam',    ru: 'Ужин',           de: 'Abendessen' },
  'seg.supper':             { en: 'Supper',             fr: 'Souper',           id: 'Sup malam',      ru: 'Поздний ужин',   de: 'Mitternachts­mahl' },
  'seg.nightSnack':         { en: 'Night Snack',        fr: 'Encas de nuit',    id: 'Camilan malam',  ru: 'Ночной перекус', de: 'Mitternachts­snack' },
  'seg.wholeDay':           { en: 'Whole Day · 24/7',   fr: 'Toute la journée', id: 'Sepanjang hari', ru: 'Целый день',     de: 'Ganztägig' }
};

const SUPPORTED = new Set(['en', 'fr', 'id', 'ru', 'de']);

export function t(key, lang = 'en', vars = null) {
  const entry = STRINGS[key];
  if (!entry) return key;
  const l = SUPPORTED.has(lang) ? lang : 'en';
  let s = entry[l] ?? entry.en ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return s;
}

export const SUPPORTED_LOCALES = ['en', 'fr', 'id', 'ru', 'de'];
