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

  // ── chrome: header + footer + hamburger (v0.62.417) ────────────────
  'chrome.brand':           { en: 'Sketchbook',         fr: 'Sketchbook',       id: 'Sketchbook',     ru: 'Sketchbook',     de: 'Sketchbook' },
  'chrome.experimental':    { en: 'Experimental · Singapore', fr: 'Expérimental · Singapour', id: 'Eksperimental · Singapura', ru: 'Экспериментально · Сингапур', de: 'Experimentell · Singapur' },
  'chrome.setLocation':     { en: 'Set location is:',   fr: 'Lieu défini :',    id: 'Lokasi:',        ru: 'Местоположение:', de: 'Ort:' },
  'chrome.clickToChange':   { en: 'Click to change',    fr: 'Modifier',         id: 'Ubah',           ru: 'Изменить',       de: 'Ändern' },
  'chrome.cuisineFilters':  { en: '🍜 Cuisine & filters', fr: '🍜 Cuisine & filtres', id: '🍜 Masakan & filter', ru: '🍜 Кухня и фильтры', de: '🍜 Küche & Filter' },
  'chrome.pickLocal':       { en: '📍 Pick local classic', fr: '📍 Classique local', id: '📍 Pilih klasik lokal', ru: '📍 Местная классика', de: '📍 Lokaler Klassiker' },
  'nav.clipboard':          { en: 'Clipboard',          fr: 'Presse-papiers',   id: 'Papan klip',     ru: 'Буфер',          de: 'Ablage' },
  'nav.cabinets':           { en: 'Cabinets',           fr: 'Classeurs',        id: 'Kabinet',        ru: 'Папки',          de: 'Cabinets' },
  'nav.settings':           { en: 'Settings',           fr: 'Réglages',         id: 'Pengaturan',     ru: 'Настройки',      de: 'Einstellungen' },
  'menu.subtitle':          { en: 'Save & organise your eateries', fr: 'Enregistrez vos adresses', id: 'Simpan & atur tempat makan', ru: 'Сохраняйте свои места', de: 'Lokale speichern & ordnen' },
  'menu.switchApp':         { en: 'SWITCH APP',         fr: 'CHANGER D’APP',    id: 'GANTI APLIKASI', ru: 'СМЕНИТЬ ПРИЛОЖЕНИЕ', de: 'APP WECHSELN' },
  'menu.cuisine':           { en: 'Cuisine',            fr: 'Cuisine',          id: 'Masakan',        ru: 'Кухня',          de: 'Cuisine' },
  'menu.cuisineSub':        { en: 'Find a quiet, good meal', fr: 'Un bon repas au calme', id: 'Cari makan enak & tenang', ru: 'Найти спокойное место', de: 'Ruhig & gut essen' },
  'menu.hawker':            { en: 'Hawker',             fr: 'Hawker',           id: 'Hawker',         ru: 'Hawker',         de: 'Hawker' },
  'menu.hawkerSub':         { en: 'Hawker centres near you', fr: 'Hawker centres à proximité', id: 'Pusat jajan terdekat', ru: 'Фуд-центры рядом', de: 'Hawker-Zentren in der Nähe' },
  'menu.transport':         { en: 'Transport',          fr: 'Transport',        id: 'Transportasi',   ru: 'Транспорт',      de: 'Transport' },
  'menu.transportSub':      { en: 'Bus · MRT · walk · drive', fr: 'Bus · MRT · marche', id: 'Bus · MRT · jalan', ru: 'Автобус · метро · пешком', de: 'Bus · MRT · zu Fuß' },
  'settings.soon':          { en: 'Settings — coming soon.', fr: 'Réglages — bientôt.', id: 'Pengaturan — segera.', ru: 'Настройки — скоро.', de: 'Einstellungen — bald.' },
  'filter.all':             { en: 'All',                fr: 'Tout',             id: 'Semua',          ru: 'Все',            de: 'Alle' },
  'filter.none':            { en: 'No saved cards to filter yet.', fr: 'Aucune carte à filtrer.', id: 'Belum ada kartu.', ru: 'Нет карточек.', de: 'Noch keine Karten.' },
  'filter.cuisineTitle':    { en: 'Filter by cuisine',  fr: 'Filtrer par cuisine', id: 'Saring per masakan', ru: 'Фильтр по кухне', de: 'Nach Küche filtern' },
  'filter.dishTitle':       { en: 'Filter by dish',     fr: 'Filtrer par plat', id: 'Saring per hidangan', ru: 'Фильтр по блюду', de: 'Nach Gericht filtern' },
  'filter.dishPlaceholder': { en: 'Dish or food, e.g. laksa', fr: 'Plat, ex. laksa', id: 'Hidangan, mis. laksa', ru: 'Блюдо, напр. laksa', de: 'Gericht, z.B. Laksa' },
  'card.copy':              { en: '📋 Copy',             fr: '📋 Copier',        id: '📋 Salin',       ru: '📋 Копировать',  de: '📋 Kopieren' },
  'card.copied':           { en: '✓ Copied',           fr: '✓ Copié',          id: '✓ Tersalin',     ru: '✓ Скопировано',  de: '✓ Kopiert' },
  'card.edit':              { en: '✎ Edit',             fr: '✎ Modifier',       id: '✎ Ubah',         ru: '✎ Изменить',     de: '✎ Bearbeiten' },
  'card.file':              { en: '＋ File',            fr: '＋ Classer',       id: '＋ Arsip',       ru: '＋ В папку',      de: '＋ Ablegen' },
  'card.remove':            { en: '✕ Remove',           fr: '✕ Retirer',        id: '✕ Hapus',        ru: '✕ Убрать',       de: '✕ Entfernen' },
  'file.title':             { en: 'File card',          fr: 'Classer la carte', id: 'Arsipkan kartu', ru: 'В папку',         de: 'Karte ablegen' },
  'file.pickCabinet':       { en: 'Pick a cabinet',     fr: 'Choisir un classeur', id: 'Pilih kabinet', ru: 'Выберите папку', de: 'Cabinet wählen' },
  'file.newCabinet':        { en: '＋ New cabinet',     fr: '＋ Nouveau classeur', id: '＋ Kabinet baru', ru: '＋ Новая папка', de: '＋ Neues Cabinet' },
  'file.pickDrawer':        { en: 'Pick a drawer, or add one',  fr: 'Choisir un tiroir, ou en ajouter', id: 'Pilih laci, atau tambah', ru: 'Выберите ящик или добавьте', de: 'Fach wählen oder hinzufügen' },
  'file.newDrawer':         { en: 'New drawer',         fr: 'Nouveau tiroir',   id: 'Laci baru',      ru: 'Новый ящик',      de: 'Neues Fach' },
  'file.back':              { en: '‹ Back',             fr: '‹ Retour',         id: '‹ Kembali',      ru: '‹ Назад',        de: '‹ Zurück' },
  'file.filed':             { en: '✓ Filed',            fr: '✓ Classé',         id: '✓ Diarsipkan',   ru: '✓ Готово',       de: '✓ Abgelegt' },
  'chrome.edit':            { en: '✎ Edit',             fr: '✎ Modifier',       id: '✎ Ubah',         ru: '✎ Изм.',         de: '✎ Bearb.' },
  'chrome.duplicate':       { en: '⧉ Duplicate',        fr: '⧉ Dupliquer',      id: '⧉ Duplikat',     ru: '⧉ Дубликат',     de: '⧉ Duplizieren' },
  'cabinet.setDefault':     { en: 'Set as default',     fr: 'Par défaut',       id: 'Jadikan default', ru: 'По умолчанию',  de: 'Als Standard' },
  'cabinet.isDefault':      { en: 'Default cabinet',    fr: 'Classeur par défaut', id: 'Kabinet default', ru: 'Папка по умолчанию', de: 'Standard-Cabinet' },
  'set.sketchbook':         { en: 'Sketchbook',         fr: 'Sketchbook',       id: 'Sketchbook',     ru: 'Sketchbook',     de: 'Sketchbook' },
  'set.clipLimit':          { en: 'Clipboard',          fr: 'Presse-papiers',   id: 'Papan klip',     ru: 'Буфер',          de: 'Ablage' },
  'set.clipLimitVal':       { en: '50 cards · 30-day keep', fr: '50 cartes · 30 jours', id: '50 kartu · 30 hari', ru: '50 карт · 30 дней', de: '50 Karten · 30 Tage' },
  'set.cabLimit':           { en: 'Cabinets',           fr: 'Classeurs',        id: 'Kabinet',        ru: 'Папки',          de: 'Cabinets' },
  'set.cabLimitVal':        { en: '12 max · 1-year keep', fr: '12 max · 1 an',   id: 'maks 12 · 1 tahun', ru: 'до 12 · 1 год',  de: 'max 12 · 1 Jahr' },
  'set.drawerLimit':        { en: 'Drawers',            fr: 'Tiroirs',          id: 'Laci',           ru: 'Ящики',          de: 'Fächer' },
  'set.drawerLimitVal':     { en: '20 per cabinet',     fr: '20 par classeur',  id: '20 per kabinet', ru: '20 на папку',    de: '20 pro Cabinet' },
  'set.region':             { en: 'Region & language',  fr: 'Région & langue',  id: 'Wilayah & bahasa', ru: 'Регион и язык', de: 'Region & Sprache' },
  'set.language':           { en: 'Language',           fr: 'Langue',           id: 'Bahasa',         ru: 'Язык',           de: 'Sprache' },
  'set.privacy':            { en: 'Privacy',            fr: 'Confidentialité',  id: 'Privasi',        ru: 'Конфиденциальность', de: 'Datenschutz' },
  'set.privacyNote':        { en: 'Your cabinets and cards are stored against your Telegram account only, and expire per the limits above.', fr: 'Vos classeurs et cartes sont liés à votre compte Telegram et expirent selon les limites ci-dessus.', id: 'Kabinet & kartu Anda tersimpan untuk akun Telegram Anda saja, dan kedaluwarsa sesuai batas di atas.', ru: 'Ваши папки и карточки хранятся только для вашего аккаунта Telegram и истекают по лимитам выше.', de: 'Cabinets und Karten sind nur mit deinem Telegram-Konto gespeichert und verfallen gemäß den Limits oben.' },
  'set.about':              { en: 'About',              fr: 'À propos',         id: 'Tentang',        ru: 'О приложении',   de: 'Über' },
  'set.savedLocation':      { en: 'Saved location',     fr: 'Lieu enregistré',  id: 'Lokasi tersimpan', ru: 'Сохранённое место', de: 'Gespeicherter Ort' },
  'set.display':            { en: 'Display',            fr: 'Affichage',        id: 'Tampilan',       ru: 'Отображение',    de: 'Anzeige' },
  'set.secondaryCurrency':  { en: 'Show secondary currency', fr: 'Devise secondaire', id: 'Mata uang sekunder', ru: 'Вторая валюта', de: 'Zweitwährung anzeigen' },
  'set.quietSort':          { en: 'Quiet-spot first sort', fr: 'Trier les endroits calmes', id: 'Urut tempat sepi dulu', ru: 'Сначала тихие места', de: 'Ruhige zuerst sortieren' },
  'set.whatsStored':        { en: "What's stored",      fr: 'Données stockées',  id: 'Yang disimpan',  ru: 'Что хранится',   de: 'Was gespeichert wird' },
  'set.forgetMe':           { en: 'Forget me',          fr: 'M’oublier',        id: 'Lupakan saya',   ru: 'Забыть меня',    de: 'Mich vergessen' },
  'set.forgetMeValue':      { en: 'wipe all data',      fr: 'tout effacer',     id: 'hapus semua',    ru: 'удалить всё',    de: 'alles löschen' },
  'set.forgetMeConfirm':    { en: 'Wipe ALL your cabinets and clipboard cards? This cannot be undone.', fr: 'Effacer TOUS vos classeurs et cartes ? Irréversible.', id: 'Hapus SEMUA kabinet & kartu? Tak bisa dibatalkan.', ru: 'Удалить ВСЕ папки и карточки? Необратимо.', de: 'ALLE Cabinets & Karten löschen? Unwiderruflich.' },
  'drawer.pickSegment':     { en: 'Pick a time-segment', fr: 'Choisir un créneau', id: 'Pilih waktu',   ru: 'Выберите время', de: 'Zeitfenster wählen' },

  // ── root ──────────────────────────────────────────────────────────
  'root.catchAll':          { en: 'Catch-all',          fr: 'Tiroir d’accueil', id: 'Tampung',   ru: 'Общая',          de: 'Sammelfach' },
  'root.catchAllHint':      { en: 'Long-press a card to drag into a cabinet.', fr: 'Appuyez longuement pour glisser vers un classeur.', id: 'Tahan kartu untuk seret ke kabinet.', ru: 'Удерживайте карточку, чтобы перетащить.', de: 'Karte halten, um sie in ein Cabinet zu ziehen.' },
  'root.catchAllEmpty':     { en: 'Tap Copy in the cuisine picker to fill this.', fr: 'Touchez Copier dans le sélecteur pour remplir.', id: 'Tekan Salin di pemilih untuk mengisinya.', ru: 'Нажмите «Копировать» в поисковике.', de: 'Tippe «Kopieren» im Cuisine-Picker.' },
  'root.cabinets':          { en: 'Cabinets',           fr: 'Classeurs',        id: 'Kabinet',        ru: 'Папки',          de: 'Cabinets' },
  'root.cabinetsSub':       { en: 'Trips & events you’ve filed · 1-year TTL on touch', fr: 'Voyages & évènements classés · TTL 1 an au contact', id: 'Trip & acara yang Anda arsipkan · TTL 1 tahun', ru: 'Поездки и события · хранится 1 год', de: 'Abgelegte Trips & Events · 1 Jahr ab Nutzung' },
  'cab.default':            { en: 'DEFAULT',            fr: 'DÉFAUT',           id: 'DEFAULT',        ru: 'ОСНОВНАЯ',       de: 'STANDARD' },
  'cab.open':               { en: 'OPEN',               fr: 'OUVERT',           id: 'BUKA',           ru: 'ОТКРЫТО',        de: 'OFFEN' },
  'cab.counts':             { en: '{d} drawers · {e} eateries', fr: '{d} tiroirs · {e} adresses', id: '{d} laci · {e} tempat', ru: '{d} ящ. · {e} мест', de: '{d} Fächer · {e} Lokale' },
  'cab.ttl':                { en: '1-year TTL',         fr: 'TTL 1 an',         id: 'TTL 1 tahun',    ru: 'хранится 1 год', de: '1 Jahr TTL' },
  'cab.touchedNow':         { en: 'touched today',      fr: 'modifié aujourd’hui', id: 'disentuh hari ini', ru: 'сегодня',     de: 'heute genutzt' },
  'cab.touchedDays':        { en: 'touched {n}d ago',   fr: 'il y a {n}j',      id: '{n}h lalu',      ru: '{n}д назад',     de: 'vor {n}T' },
  'cab.touchedWeeks':       { en: 'touched {n}w ago',   fr: 'il y a {n}sem',    id: '{n}mgg lalu',    ru: '{n}нед назад',   de: 'vor {n}W' },
  'root.newCabinet':        { en: '＋ New cabinet',     fr: '＋ Nouveau classeur', id: '＋ Kabinet baru', ru: '＋ Новая папка', de: '＋ Neues Cabinet' },
  'root.capCabinets':       { en: 'Cabinet cap reached ({cap}). Delete one first.', fr: 'Limite de classeurs atteinte ({cap}). Supprimez-en un.', id: 'Batas kabinet tercapai ({cap}). Hapus salah satu.', ru: 'Лимит папок ({cap}). Удалите одну.', de: 'Cabinet-Limit erreicht ({cap}). Lösche zuerst eines.' },

  // ── cabinet create / edit ─────────────────────────────────────────
  'cabinet.create.title':   { en: 'New cabinet',        fr: 'Nouveau classeur', id: 'Kabinet baru',   ru: 'Новая папка',     de: 'Neues Cabinet' },
  'cabinet.firstName':      { en: 'My 1st Cabinet',     fr: 'Mon 1er classeur', id: 'Kabinet ke-1 saya', ru: 'Моя 1-я папка', de: 'Mein 1. Cabinet' },
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
