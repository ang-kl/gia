// Clipboard TMA i18n.
//
// 8 supported locales: en (default + fallback), fr, id, ru, de, zh, ja, es.
// (This comment said "5" long after zh/ja/es were added — corrected v0.62.704.)
// String keys cover: chrome (header, nav, empty states), catch-all,
// cabinet (create/edit/cap), drawer (segments × 11, add, delete), card
// (note, favourite, place, move, delete), share + fork, errors.
//
// Lookup helper: t('cabinet.create', 'fr'). Unknown lang falls back to
// en; unknown key falls back to the key itself (visible in dev so we
// catch typos).

const STRINGS = {
  // ── chrome ────────────────────────────────────────────────────────
  'chrome.title':           { en: 'Clipboard',          fr: 'Presse-papiers',   id: 'Papan klip',     ru: 'Буфер',          de: 'Zwischenablage' , zh: '剪贴板', ja: 'クリップボード', es: 'Portapapeles' },
  'chrome.back':            { en: 'Back',               fr: 'Retour',           id: 'Kembali',        ru: 'Назад',          de: 'Zurück' , zh: '返回', ja: '戻る', es: 'Volver' },
  'chrome.close':           { en: 'Close',              fr: 'Fermer',           id: 'Tutup',          ru: 'Закрыть',        de: 'Schließen' , zh: '关闭', ja: '閉じる', es: 'Cerrar' },
  'chrome.save':            { en: 'Save',               fr: 'Enregistrer',      id: 'Simpan',         ru: 'Сохранить',      de: 'Speichern' , zh: '保存', ja: '保存', es: 'Guardar' },
  'chrome.cancel':          { en: 'Cancel',             fr: 'Annuler',          id: 'Batal',          ru: 'Отмена',         de: 'Abbrechen' , zh: '取消', ja: 'キャンセル', es: 'Cancelar' },
  'chrome.delete':          { en: 'Delete',             fr: 'Supprimer',        id: 'Hapus',          ru: 'Удалить',        de: 'Löschen' , zh: '删除', ja: '削除', es: 'Eliminar' },
  'chrome.loading':         { en: 'Loading…',           fr: 'Chargement…',      id: 'Memuat…',        ru: 'Загрузка…',      de: 'Lädt…' , zh: '加载中…', ja: '読み込み中…', es: 'Cargando…' },

  // ── chrome: header + footer + hamburger (v0.62.417) ────────────────
  'chrome.brand':           { en: 'Sketchbook',         fr: 'Sketchbook',       id: 'Sketchbook',     ru: 'Sketchbook',     de: 'Sketchbook' , zh: 'Sketchbook', ja: 'Sketchbook', es: 'Sketchbook' },
  'chrome.experimental':    { en: 'Experimental · Singapore', fr: 'Expérimental · Singapour', id: 'Eksperimental · Singapura', ru: 'Экспериментально · Сингапур', de: 'Experimentell · Singapur' , zh: '实验版 · 新加坡', ja: '実験版 · シンガポール', es: 'Experimental · Singapur' },
  'chrome.setLocation':     { en: 'Set location is:',   fr: 'Lieu défini :',    id: 'Lokasi:',        ru: 'Местоположение:', de: 'Ort:' , zh: '设定位置为：', ja: '現在地の設定：', es: 'La ubicacion fijada es:' },
  'chrome.clickToChange':   { en: 'Click to change',    fr: 'Modifier',         id: 'Ubah',           ru: 'Изменить',       de: 'Ändern' , zh: '点击更改', ja: 'タップして変更', es: 'Pulsa para cambiar' },
  'chrome.cuisineFilters':  { en: '🍜 Cuisine & Filter', fr: '🍜 Cuisine & filtre', id: '🍜 Masakan & filter', ru: '🍜 Кухня и фильтр', de: '🍜 Küche & Filter' , zh: '🍜 菜系与筛选', ja: '🍜 料理＆フィルター', es: '🍜 Cocina y filtro' },
  'nav.clipboard':          { en: 'Clipboard',          fr: 'Presse-papiers',   id: 'Papan klip',     ru: 'Буфер',          de: 'Ablage' , zh: '剪贴板', ja: 'クリップボード', es: 'Portapapeles' },
  'nav.cabinets':           { en: 'Cabinets',           fr: 'Classeurs',        id: 'Kabinet',        ru: 'Папки',          de: 'Cabinets' , zh: '柜子', ja: 'キャビネット', es: 'Armarios' },
  'nav.settings':           { en: 'Settings',           fr: 'Réglages',         id: 'Pengaturan',     ru: 'Настройки',      de: 'Einstellungen' , zh: '设置', ja: '設定', es: 'Ajustes' },
  'menu.subtitle':          { en: 'Save & organise your eateries', fr: 'Enregistrez vos adresses', id: 'Simpan & atur tempat makan', ru: 'Сохраняйте свои места', de: 'Lokale speichern & ordnen' , zh: '收藏并整理你的餐馆', ja: 'お店を保存して整理', es: 'Guarda y organiza tus locales' },
  'menu.switchApp':         { en: 'SWITCH APP',         fr: 'CHANGER D’APP',    id: 'GANTI APLIKASI', ru: 'СМЕНИТЬ ПРИЛОЖЕНИЕ', de: 'APP WECHSELN' , zh: '切换应用', ja: 'アプリを切替', es: 'CAMBIAR DE APP' },
  'menu.cuisine':           { en: 'Cuisine',            fr: 'Cuisine',          id: 'Masakan',        ru: 'Кухня',          de: 'Cuisine' , zh: '菜系', ja: '料理', es: 'Cocina' },
  'menu.cuisineSub':        { en: 'Find a quiet, good meal', fr: 'Un bon repas au calme', id: 'Cari makan enak & tenang', ru: 'Найти спокойное место', de: 'Ruhig & gut essen' , zh: '找个安静又好吃的一餐', ja: '静かで美味しい一食を', es: 'Encuentra una comida tranquila y buena' },
  'menu.hawker':            { en: 'Hawker',             fr: 'Hawker',           id: 'Hawker',         ru: 'Hawker',         de: 'Hawker' , zh: '小贩', ja: 'ホーカー', es: 'Hawker' },
  'menu.hawkerSub':         { en: 'Hawker centres near you', fr: 'Hawker centres à proximité', id: 'Pusat jajan terdekat', ru: 'Фуд-центры рядом', de: 'Hawker-Zentren in der Nähe' , zh: '你附近的小贩中心', ja: '近くのホーカーセンター', es: 'Centros Hawker cerca de ti' },
  'menu.transport':         { en: 'Transport',          fr: 'Transport',        id: 'Transportasi',   ru: 'Транспорт',      de: 'Transport' , zh: '交通', ja: '交通', es: 'Transporte' },
  'menu.transportSub':      { en: 'Bus · MRT · walk · drive', fr: 'Bus · MRT · marche', id: 'Bus · MRT · jalan', ru: 'Автобус · метро · пешком', de: 'Bus · MRT · zu Fuß' , zh: '巴士 · 地铁 · 步行 · 驾车', ja: 'バス · MRT · 徒歩 · 車', es: 'Bus · MRT · caminar · conducir' },
  'settings.soon':          { en: 'Settings — coming soon.', fr: 'Réglages — bientôt.', id: 'Pengaturan — segera.', ru: 'Настройки — скоро.', de: 'Einstellungen — bald.' , zh: '设置 — 即将推出。', ja: '設定 — 近日公開。', es: 'Ajustes — proximamente.' },
  'filter.all':             { en: 'All',                fr: 'Tout',             id: 'Semua',          ru: 'Все',            de: 'Alle' , zh: '全部', ja: 'すべて', es: 'Todos' },
  'filter.none':            { en: 'No saved cards to filter yet.', fr: 'Aucune carte à filtrer.', id: 'Belum ada kartu.', ru: 'Нет карточек.', de: 'Noch keine Karten.' , zh: '还没有可筛选的收藏卡片。', ja: 'フィルターできる保存カードがまだありません。', es: 'Aun no hay tarjetas guardadas para filtrar.' },
  'filter.cuisineTitle':    { en: 'Filter by cuisine',  fr: 'Filtrer par cuisine', id: 'Saring per masakan', ru: 'Фильтр по кухне', de: 'Nach Küche filtern' , zh: '按菜系筛选', ja: '料理で絞り込み', es: 'Filtrar por cocina' },
  'filter.dishTitle':       { en: 'Filter Local Dish',  fr: 'Filtrer plat local', id: 'Saring hidangan lokal', ru: 'Фильтр: местное блюдо', de: 'Lokales Gericht filtern' , zh: '筛选本地美食', ja: 'ローカル料理で絞り込み', es: 'Filtrar plato local' },
  'filter.dishPlaceholder': { en: 'Dish or food, e.g. laksa', fr: 'Plat, ex. laksa', id: 'Hidangan, mis. laksa', ru: 'Блюдо, напр. laksa', de: 'Gericht, z.B. Laksa' , zh: '菜品或食物，例如叻沙', ja: '料理や食べ物、例：ラクサ', es: 'Plato o comida, p. ej. laksa' },
  // ── cuisine category cards (v0.62.x) ──────────────────────────────
  // Ported from the Cuisine TMA i18n so the Sketchbook picker localises its
  // category tiles + drill-down header instead of showing the raw English
  // server-catalogue label while the rest of the shell is translated. Region
  // keys carry en/fr/id (ru/de fall back to en, matching the Cuisine TMA);
  // the generic tiles carry all five.
  'cat.commonHere':         { en: 'Common in Singapore', fr: 'Courant à Singapour', id: 'Umum di Singapura', ru: 'Популярно в Сингапуре', de: 'In Singapur verbreitet' , zh: '新加坡常见', ja: 'シンガポールで定番', es: 'Comun en Singapur' },
  'cat.southeastAsian':     { en: 'Southeast Asian', fr: 'Asie du Sud-Est', id: 'Asia Tenggara', ru: 'Юго-Восточная Азия', de: 'Südostasiatisch' , zh: '东南亚', ja: '東南アジア', es: 'Sudeste asiatico' },
  'cat.eastAsian':          { en: 'East Asian', fr: 'Asie de l’Est', id: 'Asia Timur', ru: 'Восточная Азия', de: 'Ostasiatisch' , zh: '东亚', ja: '東アジア', es: 'Este asiatico' },
  'cat.southAsian':         { en: 'South Asian', fr: 'Asie du Sud', id: 'Asia Selatan', ru: 'Южная Азия', de: 'Südasiatisch' , zh: '南亚', ja: '南アジア', es: 'Sur de Asia' },
  'cat.middleEastern':      { en: 'Middle East & Africa', fr: 'Moyen-Orient & Afrique', id: 'Timur Tengah & Afrika', ru: 'Ближний Восток и Африка', de: 'Naher Osten & Afrika' , zh: '中东与非洲', ja: '中東＆アフリカ', es: 'Oriente Medio y Africa' },
  'cat.european':           { en: 'European', fr: 'Européenne', id: 'Eropa', ru: 'Европейская', de: 'Europäisch' , zh: '欧洲', ja: 'ヨーロッパ', es: 'Europea' },
  'cat.americas':           { en: 'Americas & Oceania', fr: 'Amériques & Océanie', id: 'Amerika & Oseania', ru: 'Америка и Океания', de: 'Amerika & Ozeanien' , zh: '美洲与大洋洲', ja: '南北アメリカ＆オセアニア', es: 'America y Oceania' },
  'cat.sweetsFusion':       { en: 'Sweets & Fusion', fr: 'Desserts & Fusion', id: 'Manis & Fusion', ru: 'Десерты и фьюжн', de: 'Süßes & Fusion' , zh: '甜点与融合', ja: 'スイーツ＆フュージョン', es: 'Dulces y fusion' },
  'cat.michelinBib':        { en: 'Michelin · Bib Gourmand', fr: 'Michelin · Bib Gourmand', id: 'Michelin · Bib Gourmand', ru: 'Мишлен · Биб Гурман', de: 'Michelin · Bib Gourmand' , zh: '米其林 · 必比登', ja: 'Michelin · Bib Gourmand', es: 'Michelin · Bib Gourmand' },
  'cat.setMeal':            { en: 'Set Meal (Beta)', fr: 'Menu fixe (bêta)', id: 'Set Meal (Beta)', ru: 'Комплексное меню (бета)', de: 'Set-Menü (Beta)' , zh: '套餐 (Beta)', ja: 'セットメニュー（Beta）', es: 'Menu fijo (Beta)' },
  'cat.dishes':             { en: 'Dishes', fr: 'Plats', id: 'Hidangan', ru: 'Блюда', de: 'Gerichte' , zh: '菜品', ja: '料理', es: 'Platos' },
  'card.copy':              { en: '📋 Copy',             fr: '📋 Copier',        id: '📋 Salin',       ru: '📋 Копировать',  de: '📋 Kopieren' , zh: '📋 复制', ja: '📋 コピー', es: '📋 Copiar' },
  'card.copied':           { en: '✓ Copied',           fr: '✓ Copié',          id: '✓ Tersalin',     ru: '✓ Скопировано',  de: '✓ Kopiert' , zh: '✓ 已复制', ja: '✓ コピー済み', es: '✓ Copiado' },
  'card.edit':              { en: '✏️ Edit',             fr: '✎ Modifier',       id: '✎ Ubah',         ru: '✎ Изменить',     de: '✎ Bearbeiten' , zh: '✏️ 编辑', ja: '✏️ 編集', es: '✏️ Editar' },
  'card.file':              { en: '＋ File',            fr: '＋ Classer',       id: '＋ Arsip',       ru: '＋ В папку',      de: '＋ Ablegen' , zh: '＋ 归档', ja: '＋ 整理', es: '＋ Archivar' },
  'card.remove':            { en: '✕ Remove',           fr: '✕ Retirer',        id: '✕ Hapus',        ru: '✕ Убрать',       de: '✕ Entfernen' , zh: '✕ 移除', ja: '✕ 削除', es: '✕ Quitar' },
  'card.try':               { en: 'Try',                fr: 'Essayez',          id: 'Coba',           ru: 'Попробуйте',     de: 'Probieren' , zh: '试试', ja: 'おすすめ', es: 'Prueba' },
  'card.open':              { en: 'Open',               fr: 'Ouvert',           id: 'Buka',           ru: 'Открыто',        de: 'Offen' , zh: '营业中', ja: '営業中', es: 'Abierto' },
  'card.closed':            { en: 'Closed',             fr: 'Fermé',            id: 'Tutup',          ru: 'Закрыто',        de: 'Geschlossen' , zh: '已打烊', ja: '閉店', es: 'Cerrado' },
  'card.distAway':          {
    en: ' away',
    fr: '',
    id: ' dari sini',
    ru: ' от вас',
    de: ' entfernt',
    zh: ' 外',
    ja: ' 先',
    es: ' de distancia'
  },
  'card.crowdLow':          { en: 'quiet',              fr: 'calme',            id: 'sepi',           ru: 'тихо',           de: 'ruhig' , zh: '清静', ja: '空いている', es: 'tranquilo' },
  'card.crowdMedium':       { en: 'moderate',           fr: 'modéré',           id: 'sedang',         ru: 'умеренно',       de: 'mäßig' , zh: '适中', ja: 'やや混雑', es: 'moderado' },
  'card.crowdHigh':         { en: 'busy',               fr: 'animé',            id: 'ramai',          ru: 'занято',         de: 'voll' , zh: '繁忙', ja: '混雑', es: 'concurrido' },
  'card.duplicate':         { en: 'duplicate',          fr: 'doublon',          id: 'duplikat',       ru: 'дубликат',       de: 'Duplikat' , zh: '副本', ja: '重複', es: 'duplicado' },
  'sort.by':                { en: 'Sort',               fr: 'Trier',            id: 'Urut',           ru: 'Сорт.',          de: 'Sort.' , zh: '排序', ja: '並べ替え', es: 'Ordenar' },
  'sort.title':             { en: 'Title',              fr: 'Titre',            id: 'Judul',          ru: 'Назв.',          de: 'Titel' , zh: '名称', ja: '名称', es: 'Titulo' },
  'sort.country':           { en: 'Country',            fr: 'Pays',             id: 'Negara',         ru: 'Страна',         de: 'Land' , zh: '国家', ja: '国', es: 'Pais' },
  'sort.city':              { en: 'City',               fr: 'Ville',            id: 'Kota',           ru: 'Город',          de: 'Stadt' , zh: '城市', ja: '都市', es: 'Ciudad' },
  'sort.cuisine':           { en: 'Cuisine',            fr: 'Cuisine',          id: 'Masakan',        ru: 'Кухня',          de: 'Küche' , zh: '菜系', ja: '料理', es: 'Cocina' },
  'sort.date':              { en: 'Date',               fr: 'Date',             id: 'Tanggal',        ru: 'Дата',           de: 'Datum' , zh: '日期', ja: '日付', es: 'Fecha' },
  // ── a11y (P1-e) — screen-reader-only labels, no visible copy ──────
  'sort.asc':               { en: 'Ascending',          fr: 'Croissant',        id: 'Menaik',         ru: 'По возрастанию', de: 'Aufsteigend' , zh: '升序', ja: '昇順', es: 'Ascendente' },
  'sort.desc':              { en: 'Descending',         fr: 'Décroissant',      id: 'Menurun',        ru: 'По убыванию',    de: 'Absteigend' , zh: '降序', ja: '降順', es: 'Descendente' },
  'a11y.expand':            { en: 'Expand',             fr: 'Développer',       id: 'Perluas',        ru: 'Развернуть',     de: 'Ausklappen' , zh: '展开', ja: '展開', es: 'Expandir' },
  'chrome.menu':            { en: 'Menu',               fr: 'Menu',             id: 'Menu',           ru: 'Меню',           de: 'Menü' , zh: '菜单', ja: 'メニュー', es: 'Menú' },
  'chrome.refresh':         { en: 'Refresh',            fr: 'Actualiser',       id: 'Muat ulang',     ru: 'Обновить',       de: 'Aktualisieren' , zh: '刷新', ja: '更新', es: 'Actualizar' },
  'cabinet.field.dateEnd':  { en: 'End date',           fr: 'Date de fin',      id: 'Tanggal selesai', ru: 'Дата окончания', de: 'Enddatum' , zh: '结束日期', ja: '終了日', es: 'Fecha de fin' },
  'loc.all':                { en: 'All locations',      fr: 'Tous les lieux',   id: 'Semua lokasi',   ru: 'Все места',      de: 'Alle Orte' , zh: '所有地点', ja: 'すべての場所', es: 'Todas las ubicaciones' },
  'loc.title':              { en: 'Saved locations',    fr: 'Lieux enregistrés', id: 'Lokasi tersimpan', ru: 'Сохранённые места', de: 'Gespeicherte Orte' , zh: '已保存地点', ja: '保存した場所', es: 'Ubicaciones guardadas' },
  'loc.none':               { en: 'No saved-card locations yet.', fr: 'Aucun lieu enregistré.', id: 'Belum ada lokasi.', ru: 'Пока нет мест.', de: 'Noch keine Orte.' , zh: '还没有收藏卡片的地点。', ja: '保存カードの場所がまだありません。', es: 'Aun no hay ubicaciones de tarjetas guardadas.' },
  'facet.rating':           { en: 'Rating',             fr: 'Note',             id: 'Rating',         ru: 'Рейтинг',        de: 'Bewertung' , zh: '评分', ja: '評価', es: 'Valoracion' },
  'facet.price':            { en: 'Price',              fr: 'Prix',             id: 'Harga',          ru: 'Цена',           de: 'Preis' , zh: '价位', ja: '価格', es: 'Precio' },
  'facet.open':             { en: '🟢 Open now',        fr: '🟢 Ouvert',        id: '🟢 Buka',        ru: '🟢 Открыто',     de: '🟢 Offen' , zh: '🟢 现在营业', ja: '🟢 現在営業中', es: '🟢 Abierto ahora' },
  'facet.crowd':            { en: 'Crowd',              fr: 'Affluence',        id: 'Keramaian',      ru: 'Загруж.',        de: 'Andrang' , zh: '人流', ja: '混雑度', es: 'Afluencia' },
  'facet.michelin':         { en: '✳️ Michelin',        fr: '✳️ Michelin',      id: '✳️ Michelin',    ru: '✳️ Michelin',    de: '✳️ Michelin' , zh: '✳️ 米其林', ja: '✳️ Michelin', es: '✳️ Michelin' },
  'facet.any':              { en: 'Any',                fr: 'Tous',             id: 'Semua',          ru: 'Любой',          de: 'Alle' , zh: '任意', ja: '指定なし', es: 'Cualquiera' },
  'facet.clear':            { en: 'Clear filters',      fr: 'Effacer',          id: 'Hapus filter',   ru: 'Сбросить',       de: 'Filter löschen' , zh: '清除筛选', ja: 'フィルターを解除', es: 'Borrar filtros' },

  // ── QuickFilters chips + rating panel (v0.62.516) ─────────────────
  // Ported VERBATIM from web/cuisine/src/v2/lib/i18n.js so the Sketchbook
  // "Cuisine & Filter" folio (the QuickFilters port) localises identically
  // to the Cuisine TMA. Missing langs fall back to en via t() — mirroring
  // the Cuisine source, where zh/ja/es carry filter.* but fall back to en
  // for rating.*, and recommend is en/fr/id only.
  'filter.newlyOpened':     {
    en: 'Newly opened',
    fr: 'Récemment ouvert',
    id: 'Baru buka',
    ru: 'Недавно открылось',
    de: 'Neu eröffnet',
    zh: '新开张',
    ja: '新規開店',
    es: 'Nuevo'
  },
  'filter.halal':           {
    en: 'Halal',
    fr: 'Halal',
    id: 'Halal',
    ru: 'Халяль',
    de: 'Halal',
    zh: '清真',
    ja: 'ハラール',
    es: 'Halal'
  },
  'filter.petFriendly':     {
    en: 'Pet',
    fr: 'Animaux',
    id: 'Hewan',
    ru: 'С питомцем',
    de: 'Haustiere',
    zh: '宠物',
    ja: 'ペット可',
    es: 'Mascotas'
  },
  'filter.openNow':         {
    en: 'Open now',
    fr: 'Ouvert',
    id: 'Buka sekarang',
    ru: 'Открыто',
    de: 'Geöffnet',
    zh: '正在营业',
    ja: '営業中',
    es: 'Abierto'
  },
  'filter.vegetarian':      {
    en: 'Vegetarian',
    fr: 'Végétarien',
    id: 'Vegetarian',
    ru: 'Вегетарианское',
    de: 'Vegetarisch',
    zh: '素食',
    ja: 'ベジタリアン',
    es: 'Vegetariano'
  },
  'filter.recommend':       {
    en: 'Recommend',
    fr: 'Recommander',
    id: 'Rekomendasi',
    ru: 'Рекомендовать',
    de: 'Empfehlen',
    zh: '推荐',
    ja: 'おすすめ',
    es: 'Recomendar'
  },
  'filter.homeBased':       {
    en: 'Home-based',
    fr: 'À domicile',
    id: 'Rumahan',
    ru: 'Домашняя кухня',
    de: 'Hausküche',
    zh: '家庭厨房',
    ja: '自宅営業',
    es: 'Casero'
  },
  'filter.price':           {
    en: 'Price',
    fr: 'Prix',
    id: 'Harga',
    ru: 'Цена',
    de: 'Preis',
    zh: '价格',
    ja: '価格',
    es: 'Precio'
  },
  'filter.openMore':        {
    en: 'Open more filters',
    fr: 'Ouvrir plus de filtres',
    id: 'Buka filter lainnya',
    ru: 'Больше фильтров',
    de: 'Mehr Filter',
    zh: '打开更多筛选',
    ja: 'フィルターを増やす',
    es: 'Abrir más filtros'
  },
  'filter.closeMore':       {
    en: 'Close more filters',
    fr: 'Fermer plus de filtres',
    id: 'Tutup filter lainnya',
    ru: 'Скрыть фильтры',
    de: 'Filter ausblenden',
    zh: '关闭更多筛选',
    ja: 'フィルターを閉じる',
    es: 'Cerrar más filtros'
  },
  'rating.title':           {
    en: 'Minimum rating',
    fr: 'Note minimale',
    id: 'Rating minimum',
    ru: 'Минимальный рейтинг',
    de: 'Mindestbewertung',
    zh: '最低评分',
    ja: '最低評価',
    es: 'Valoración mínima'
  },
  'rating.refineHeader':    {
    en: 'Refine Google Rating',
    fr: 'Affiner la note Google',
    id: 'Saring Rating Google',
    ru: 'Уточнить рейтинг Google',
    de: 'Google-Bewertung eingrenzen',
    zh: '细化 Google 评分',
    ja: 'Google評価を絞り込む',
    es: 'Filtrar la valoración de Google'
  },
  'rating.openPanel':       {
    en: 'Open rating options',
    fr: 'Ouvrir les options de note',
    id: 'Buka opsi rating',
    ru: 'Открыть настройки рейтинга',
    de: 'Bewertungsoptionen öffnen',
    zh: '打开评分选项',
    ja: '評価オプションを開く',
    es: 'Abrir opciones de valoración'
  },
  'rating.closePanel':      {
    en: 'Close rating options',
    fr: 'Fermer les options de note',
    id: 'Tutup opsi rating',
    ru: 'Закрыть настройки рейтинга',
    de: 'Bewertungsoptionen schließen',
    zh: '关闭评分选项',
    ja: '評価オプションを閉じる',
    es: 'Cerrar opciones de valoración'
  },
  'rating.noRating':        {
    en: 'Unrated',
    fr: 'Non noté',
    id: 'Tanpa rating',
    ru: 'Без оценки',
    de: 'Ohne Bewertung',
    zh: '无评分',
    ja: '評価なし',
    es: 'Sin valorar'
  },
  'rating.noRatingHint':    {
    en: 'New or no reviews yet',
    fr: 'Nouveau ou sans avis',
    id: 'Baru atau belum ada ulasan',
    ru: 'Новое или пока без отзывов',
    de: 'Neu oder noch ohne Bewertungen',
    zh: '新店或暂无评价',
    ja: '新規、またはレビューなし',
    es: 'Nuevo o aún sin reseñas'
  },
  'rating.anyRating':       {
    en: 'Any rating',
    fr: 'Toutes les notes',
    id: 'Semua rating',
    ru: 'Любой рейтинг',
    de: 'Jede Bewertung',
    zh: '任意评分',
    ja: 'すべての評価',
    es: 'Cualquier valoración'
  },
  'rating.anyRatingHint':   {
    en: 'No minimum',
    fr: 'Aucun minimum',
    id: 'Tanpa minimum',
    ru: 'Без минимума',
    de: 'Kein Minimum',
    zh: '无下限',
    ja: '下限なし',
    es: 'Sin mínimo'
  },
  'rating.goodPlus':        {
    en: 'Good+',
    fr: 'Bien+',
    id: 'Bagus+',
    ru: 'Хорошо+',
    de: 'Gut+',
    zh: '良好+',
    ja: '良い+',
    es: 'Bien+'
  },
  'rating.setRating':       {
    en: 'Set as',
    fr: 'Définir',
    id: 'Tetapkan',
    ru: 'Задать',
    de: 'Festlegen',
    zh: '设为',
    ja: '設定',
    es: 'Definir'
  },
  'rating.customHint':      {
    en: '1.0 to 5.0',
    fr: '1.0 à 5.0',
    id: '1,0 hingga 5,0',
    ru: 'от 1,0 до 5,0',
    de: '1,0 bis 5,0',
    zh: '1.0 至 5.0',
    ja: '1.0〜5.0',
    es: 'de 1,0 a 5,0'
  },
  'rating.save':            {
    en: 'Save',
    fr: 'Valider',
    id: 'Simpan',
    ru: 'Сохранить',
    de: 'Speichern',
    zh: '保存',
    ja: '保存',
    es: 'Guardar'
  },
  'rating.saved':           {
    en: 'Saved',
    fr: 'Validé',
    id: 'Tersimpan',
    ru: 'Сохранено',
    de: 'Gespeichert',
    zh: '已保存',
    ja: '保存しました',
    es: 'Guardado'
  },
  'rating.pillNoRating':    {
    en: 'Unrated',
    fr: 'Non noté',
    id: 'Tanpa rating',
    ru: 'Без оценки',
    de: 'Ohne Bewertung',
    zh: '无评分',
    ja: '評価なし',
    es: 'Sin valorar'
  },
  'rating.pillAny':         {
    en: 'Any',
    fr: 'Toutes',
    id: 'Semua',
    ru: 'Любые',
    de: 'Alle',
    zh: '全部',
    ja: 'すべて',
    es: 'Todas'
  },

  // ── Free-text search composer (TellMePanel port, v0.62.517) ───────
  // The component is a VERBATIM port of the Cuisine TMA's TellMePanel, but the
  // COPY is honest to what it does here: it filters the user's SAVED cards
  // client-side, it does NOT discover new places. So the placeholder is
  // "Search saved cards…", not Cuisine's "What are you craving?" (which would
  // promise a live world-search). tellme.aria/submit mirror that intent.
  'tellme.placeholder':     { en: 'Search saved cards… e.g. satay', fr: 'Rechercher vos cartes… ex. satay', id: 'Cari kartu tersimpan… mis. satay', ru: 'Поиск по сохранённым… напр. сатай', de: 'Gespeicherte Karten suchen… z. B. Satay', zh: '搜索已存卡片…例如 沙嗲', ja: '保存カードを検索… 例: サテ', es: 'Buscar tarjetas guardadas… ej. satay' },
  'tellme.aria':            { en: 'Search your saved cards', fr: 'Rechercher vos cartes enregistrées', id: 'Cari kartu tersimpan Anda', ru: 'Поиск по вашим сохранённым карточкам', de: 'Ihre gespeicherten Karten durchsuchen', zh: '搜索您已保存的卡片', ja: '保存したカードを検索', es: 'Busca en tus tarjetas guardadas' },
  'tellme.submit':          { en: 'Search', fr: 'Rechercher', id: 'Cari', ru: 'Поиск', de: 'Suchen', zh: '搜索', ja: '検索', es: 'Buscar' },
  'tellme.open':            { en: 'Search saved cards', fr: 'Rechercher les cartes', id: 'Cari kartu tersimpan', ru: 'Поиск по сохранённым', de: 'Gespeicherte Karten suchen', zh: '搜索已存卡片', ja: '保存カードを検索', es: 'Buscar tarjetas guardadas' },

  'catchAll.newCard':       { en: '＋ New card',        fr: '＋ Nouvelle carte', id: '＋ Kartu baru',  ru: '＋ Карточка',     de: '＋ Neue Karte' , zh: '＋ 新卡片', ja: '＋ 新規カード', es: '＋ Nueva tarjeta' },
  'catchAll.clearAll':      { en: '🗑 Clear all',       fr: '🗑 Tout vider',    id: '🗑 Hapus semua', ru: '🗑 Очистить',    de: '🗑 Alle leeren' , zh: '🗑 清空', ja: '🗑 すべて消去', es: '🗑 Borrar todo' },
  'catchAll.restore':       { en: '↩ Restore ({n})',   fr: '↩ Restaurer ({n})', id: '↩ Pulihkan ({n})', ru: '↩ Вернуть ({n})', de: '↩ Wiederherstellen ({n})' , zh: '↩ 恢复 ({n})', ja: '↩ 復元（{n}）', es: '↩ Restaurar ({n})' },
  'catchAll.archiveConfirm':{ en: 'Archive all {n} cards? They’re restorable for 30 days.', fr: 'Archiver les {n} cartes ? Restaurables 30 jours.', id: 'Arsipkan {n} kartu? Bisa dipulihkan 30 hari.', ru: 'Архивировать {n} карт? Можно вернуть 30 дней.', de: 'Alle {n} Karten archivieren? 30 Tage wiederherstellbar.' , zh: '归档全部 {n} 张卡片？可在 30 天内恢复。', ja: '{n}枚のカードをすべてアーカイブしますか？30日間は復元できます。', es: '¿Archivar las {n} tarjetas? Se pueden restaurar durante 30 dias.' },
  'card.copiedOn':          { en: 'Copied',             fr: 'Copié',            id: 'Disalin',        ru: 'Скопировано',    de: 'Kopiert' , zh: '已复制', ja: 'コピー済み', es: 'Copiado' },
  'file.title':             { en: 'File card',          fr: 'Classer la carte', id: 'Arsipkan kartu', ru: 'В папку',         de: 'Karte ablegen' , zh: '归档卡片', ja: 'カードを整理', es: 'Archivar tarjeta' },
  'file.pickCabinet':       { en: 'Pick a cabinet',     fr: 'Choisir un classeur', id: 'Pilih kabinet', ru: 'Выберите папку', de: 'Cabinet wählen' , zh: '选择柜子', ja: 'キャビネットを選択', es: 'Elige un armario' },
  'file.newCabinet':        { en: '＋ New cabinet',     fr: '＋ Nouveau classeur', id: '＋ Kabinet baru', ru: '＋ Новая папка', de: '＋ Neues Cabinet' , zh: '＋ 新柜子', ja: '＋ 新規キャビネット', es: '＋ Nuevo armario' },
  'file.pickDrawer':        { en: 'Pick a drawer, or add one',  fr: 'Choisir un tiroir, ou en ajouter', id: 'Pilih laci, atau tambah', ru: 'Выберите ящик или добавьте', de: 'Fach wählen oder hinzufügen' , zh: '选择抽屉，或新增一个', ja: 'ドロワーを選ぶか追加', es: 'Elige un cajon o anade uno' },
  'file.pickCabinetFirst':  { en: 'Pick a cabinet on the left', fr: 'Choisir un classeur à gauche', id: 'Pilih kabinet di kiri', ru: 'Выберите папку слева', de: 'Cabinet links wählen' , zh: '先在左侧选择柜子', ja: '左でキャビネットを選択', es: 'Elige un armario a la izquierda' },
  'file.newDrawer':         { en: 'New drawer',         fr: 'Nouveau tiroir',   id: 'Laci baru',      ru: 'Новый ящик',      de: 'Neues Fach' , zh: '新抽屉', ja: '新規ドロワー', es: 'Nuevo cajon' },
  'file.back':              { en: '‹ Back',             fr: '‹ Retour',         id: '‹ Kembali',      ru: '‹ Назад',        de: '‹ Zurück' , zh: '‹ 返回', ja: '‹ 戻る', es: '‹ Volver' },
  'file.filed':             { en: '✓ Filed',            fr: '✓ Classé',         id: '✓ Diarsipkan',   ru: '✓ Готово',       de: '✓ Abgelegt' , zh: '✓ 已归档', ja: '✓ 整理済み', es: '✓ Archivado' },
  'chrome.edit':            { en: '✏️ Edit',             fr: '✎ Modifier',       id: '✎ Ubah',         ru: '✎ Изм.',         de: '✎ Bearb.' , zh: '✏️ 编辑', ja: '✏️ 編集', es: '✏️ Editar' },
  'chrome.duplicate':       { en: '⧉ Duplicate',        fr: '⧉ Dupliquer',      id: '⧉ Duplikat',     ru: '⧉ Дубликат',     de: '⧉ Duplizieren' , zh: '⧉ 复制', ja: '⧉ 複製', es: '⧉ Duplicar' },
  'cabinet.setDefault':     { en: 'Set as default',     fr: 'Par défaut',       id: 'Jadikan default', ru: 'По умолчанию',  de: 'Als Standard' , zh: '设为默认', ja: 'デフォルトに設定', es: 'Fijar como predeterminado' },
  'cabinet.isDefault':      { en: 'Default cabinet',    fr: 'Classeur par défaut', id: 'Kabinet default', ru: 'Папка по умолчанию', de: 'Standard-Cabinet' , zh: '默认柜子', ja: 'デフォルトのキャビネット', es: 'Armario predeterminado' },
  'set.sketchbook':         { en: 'Sketchbook',         fr: 'Sketchbook',       id: 'Sketchbook',     ru: 'Sketchbook',     de: 'Sketchbook' , zh: 'Sketchbook', ja: 'Sketchbook', es: 'Sketchbook' },
  'set.clipLimit':          { en: 'Clipboard',          fr: 'Presse-papiers',   id: 'Papan klip',     ru: 'Буфер',          de: 'Ablage' , zh: '剪贴板', ja: 'クリップボード', es: 'Portapapeles' },
  'set.clipLimitVal':       { en: '50 cards · 30-day keep', fr: '50 cartes · 30 jours', id: '50 kartu · 30 hari', ru: '50 карт · 30 дней', de: '50 Karten · 30 Tage' , zh: '50 张卡片 · 保留 30 天', ja: '50枚 · 30日間保持', es: '50 tarjetas · 30 dias de guardado' },
  'set.cabLimit':           { en: 'Cabinets',           fr: 'Classeurs',        id: 'Kabinet',        ru: 'Папки',          de: 'Cabinets' , zh: '柜子', ja: 'キャビネット', es: 'Armarios' },
  'set.cabLimitVal':        { en: '12 max · 1-year keep', fr: '12 max · 1 an',   id: 'maks 12 · 1 tahun', ru: 'до 12 · 1 год',  de: 'max 12 · 1 Jahr' , zh: '最多 12 个 · 保留 1 年', ja: '最大12個 · 1年間保持', es: '12 max · 1 ano de guardado' },
  'set.drawerLimit':        { en: 'Drawers',            fr: 'Tiroirs',          id: 'Laci',           ru: 'Ящики',          de: 'Fächer' , zh: '抽屉', ja: 'ドロワー', es: 'Cajones' },
  'set.drawerLimitVal':     { en: '20 per cabinet',     fr: '20 par classeur',  id: '20 per kabinet', ru: '20 на папку',    de: '20 pro Cabinet' , zh: '每个柜子 20 个', ja: 'キャビネットごとに20個', es: '20 por armario' },
  'set.region':             { en: 'Region & language',  fr: 'Région & langue',  id: 'Wilayah & bahasa', ru: 'Регион и язык', de: 'Region & Sprache' , zh: '地区与语言', ja: '地域と言語', es: 'Region e idioma' },
  'set.language':           { en: 'Language',           fr: 'Langue',           id: 'Bahasa',         ru: 'Язык',           de: 'Sprache' , zh: '语言', ja: '言語', es: 'Idioma' },
  'set.privacy':            { en: 'Privacy',            fr: 'Confidentialité',  id: 'Privasi',        ru: 'Конфиденциальность', de: 'Datenschutz' , zh: '隐私', ja: 'プライバシー', es: 'Privacidad' },
  'set.privacyNote':        { en: 'Your cabinets and cards are stored against your Telegram account only, and expire per the limits above.', fr: 'Vos classeurs et cartes sont liés à votre compte Telegram et expirent selon les limites ci-dessus.', id: 'Kabinet & kartu Anda tersimpan untuk akun Telegram Anda saja, dan kedaluwarsa sesuai batas di atas.', ru: 'Ваши папки и карточки хранятся только для вашего аккаунта Telegram и истекают по лимитам выше.', de: 'Cabinets und Karten sind nur mit Ihrem Telegram-Konto gespeichert und verfallen gemäß den Limits oben.' , zh: '你的柜子和卡片仅存储在你的 Telegram 账户下，并按上述期限到期。', ja: 'キャビネットとカードはお客様のTelegramアカウントにのみ保存され、上記の制限に従って期限切れになります。', es: 'Tus armarios y tarjetas se guardan solo asociados a tu cuenta de Telegram y caducan segun los limites indicados arriba.' },
  'set.about':              { en: 'About',              fr: 'À propos',         id: 'Tentang',        ru: 'О приложении',   de: 'Über' , zh: '关于', ja: 'アプリについて', es: 'Acerca de' },
  'set.savedLocation':      { en: 'Saved location',     fr: 'Lieu enregistré',  id: 'Lokasi tersimpan', ru: 'Сохранённое место', de: 'Gespeicherter Ort' , zh: '已保存地点', ja: '保存した場所', es: 'Ubicacion guardada' },
  'set.display':            { en: 'Display',            fr: 'Affichage',        id: 'Tampilan',       ru: 'Отображение',    de: 'Anzeige' , zh: '显示', ja: '表示', es: 'Pantalla' },
  'set.secondaryCurrency':  { en: 'Show secondary currency', fr: 'Devise secondaire', id: 'Mata uang sekunder', ru: 'Вторая валюта', de: 'Zweitwährung anzeigen' , zh: '显示第二货币', ja: '副通貨を表示', es: 'Mostrar moneda secundaria' },
  'set.quietSort':          { en: 'Quiet-spot first sort', fr: 'Trier les endroits calmes', id: 'Urut tempat sepi dulu', ru: 'Сначала тихие места', de: 'Ruhige zuerst sortieren' , zh: '清静地点优先排序', ja: '静かな場所を優先して並べ替え', es: 'Orden con lugares tranquilos primero' },
  'set.whatsStored':        { en: "What's stored",      fr: 'Données stockées',  id: 'Yang disimpan',  ru: 'Что хранится',   de: 'Was gespeichert wird' , zh: '存储了什么', ja: '保存される情報', es: 'Que se guarda' },
  'set.forgetMe':           { en: 'Forget me',          fr: 'M’oublier',        id: 'Lupakan saya',   ru: 'Забыть меня',    de: 'Mich vergessen' , zh: '忘记我', ja: 'データを消去', es: 'Olvidarme' },
  'set.forgetMeValue':      { en: 'wipe all data',      fr: 'tout effacer',     id: 'hapus semua',    ru: 'удалить всё',    de: 'alles löschen' , zh: '清除所有数据', ja: 'すべてのデータを消去', es: 'borrar todos los datos' },
  'set.forgetMeConfirm':    { en: 'Wipe ALL your cabinets and clipboard cards? This cannot be undone.', fr: 'Effacer TOUS vos classeurs et cartes ? Irréversible.', id: 'Hapus SEMUA kabinet & kartu? Tak bisa dibatalkan.', ru: 'Удалить ВСЕ папки и карточки? Необратимо.', de: 'ALLE Cabinets & Karten löschen? Unwiderruflich.' , zh: '清除你所有的柜子和剪贴板卡片？此操作无法撤销。', ja: 'すべてのキャビネットとクリップボードのカードを消去しますか？この操作は取り消せません。', es: '¿Borrar TODOS tus armarios y tarjetas del portapapeles? Esto no se puede deshacer.' },
  'drawer.pickSegment':     { en: 'Pick a time-segment', fr: 'Choisir un créneau', id: 'Pilih waktu',   ru: 'Выберите время', de: 'Zeitfenster wählen' , zh: '选择时段', ja: '時間帯を選択', es: 'Elige una franja horaria' },

  // ── root ──────────────────────────────────────────────────────────
  'root.catchAll':          { en: 'Catch-all',          fr: 'Tiroir d’accueil', id: 'Tampung',   ru: 'Общая',          de: 'Sammelfach' , zh: '临时收纳', ja: 'キャッチオール', es: 'Cajon general' },
  'root.catchAllHint':      { en: 'Long-press a card to drag into a cabinet.', fr: 'Appuyez longuement pour glisser vers un classeur.', id: 'Tahan kartu untuk seret ke kabinet.', ru: 'Удерживайте карточку, чтобы перетащить.', de: 'Karte halten, um sie in ein Cabinet zu ziehen.' , zh: '长按卡片可拖入柜子。', ja: 'カードを長押ししてキャビネットにドラッグ。', es: 'Manten pulsada una tarjeta para arrastrarla a un armario.' },
  'root.catchAllEmpty':     { en: 'Tap Copy in the cuisine picker to fill this.', fr: 'Touchez Copier dans le sélecteur pour remplir.', id: 'Tekan Salin di pemilih untuk mengisinya.', ru: 'Нажмите «Копировать» в поисковике.', de: 'Tippen Sie «Kopieren» im Cuisine-Picker.' , zh: '在菜系选择器中点复制即可填入这里。', ja: '料理ピッカーでコピーをタップして追加。', es: 'Pulsa Copiar en el selector de cocina para llenar esto.' },
  'root.cabinets':          { en: 'Cabinets',           fr: 'Classeurs',        id: 'Kabinet',        ru: 'Папки',          de: 'Cabinets' , zh: '柜子', ja: 'キャビネット', es: 'Armarios' },
  'root.cabinetsSub':       { en: 'Trips & events you’ve filed · 1-year TTL on touch', fr: 'Voyages & évènements classés · TTL 1 an au contact', id: 'Trip & acara yang Anda arsipkan · TTL 1 tahun', ru: 'Поездки и события · хранится 1 год', de: 'Abgelegte Trips & Events · 1 Jahr ab Nutzung' , zh: '你归档的行程与活动 · 触碰后 1 年到期', ja: '整理した旅行やイベント · 操作から1年で期限切れ', es: 'Viajes y eventos que has archivado · 1 ano de TTL al usarlos' },
  'cab.default':            { en: 'DEFAULT',            fr: 'DÉFAUT',           id: 'DEFAULT',        ru: 'ОСНОВНАЯ',       de: 'STANDARD' , zh: '默认', ja: 'デフォルト', es: 'PREDETERMINADO' },
  'cab.open':               { en: 'OPEN',               fr: 'OUVERT',           id: 'BUKA',           ru: 'ОТКРЫТО',        de: 'OFFEN' , zh: '打开', ja: '開く', es: 'ABRIR' },
  'cab.counts':             { en: '{d} drawers · {e} eateries', fr: '{d} tiroirs · {e} adresses', id: '{d} laci · {e} tempat', ru: '{d} ящ. · {e} мест', de: '{d} Fächer · {e} Lokale' , zh: '{d} 个抽屉 · {e} 家餐馆', ja: '{d}個のドロワー · {e}軒のお店', es: '{d} cajones · {e} locales' },
  'cab.ttl':                { en: '1-year TTL',         fr: 'TTL 1 an',         id: 'TTL 1 tahun',    ru: 'хранится 1 год', de: '1 Jahr TTL' , zh: '1 年到期', ja: '1年で期限切れ', es: 'TTL de 1 ano' },
  'cab.touchedNow':         { en: 'touched today',      fr: 'modifié aujourd’hui', id: 'disentuh hari ini', ru: 'сегодня',     de: 'heute genutzt' , zh: '今天触碰', ja: '今日操作', es: 'usado hoy' },
  'cab.touchedDays':        { en: 'touched {n}d ago',   fr: 'il y a {n}j',      id: '{n}h lalu',      ru: '{n}д назад',     de: 'vor {n}T' , zh: '{n} 天前触碰', ja: '{n}日前に操作', es: 'usado hace {n}d' },
  'cab.touchedWeeks':       { en: 'touched {n}w ago',   fr: 'il y a {n}sem',    id: '{n}mgg lalu',    ru: '{n}нед назад',   de: 'vor {n}W' , zh: '{n} 周前触碰', ja: '{n}週前に操作', es: 'usado hace {n}sem' },
  'root.newCabinet':        { en: '＋ New cabinet',     fr: '＋ Nouveau classeur', id: '＋ Kabinet baru', ru: '＋ Новая папка', de: '＋ Neues Cabinet' , zh: '＋ 新柜子', ja: '＋ 新規キャビネット', es: '＋ Nuevo armario' },
  'root.capCabinets':       { en: 'Cabinet cap reached ({cap}). Delete one first.', fr: 'Limite de classeurs atteinte ({cap}). Supprimez-en un.', id: 'Batas kabinet tercapai ({cap}). Hapus salah satu.', ru: 'Лимит папок ({cap}). Удалите одну.', de: 'Cabinet-Limit erreicht ({cap}). Löschen Sie zuerst eines.' , zh: '已达柜子上限 ({cap})。请先删除一个。', ja: 'キャビネットの上限に達しました（{cap}）。まず1つ削除してください。', es: 'Limite de armarios alcanzado ({cap}). Elimina uno primero.' },

  // ── cabinet create / edit ─────────────────────────────────────────
  'cabinet.create.title':   { en: 'New cabinet',        fr: 'Nouveau classeur', id: 'Kabinet baru',   ru: 'Новая папка',     de: 'Neues Cabinet' , zh: '新柜子', ja: '新規キャビネット', es: 'Nuevo armario' },
  'cabinet.firstName':      { en: 'My 1st Cabinet',     fr: 'Mon 1er classeur', id: 'Kabinet ke-1 saya', ru: 'Моя 1-я папка', de: 'Mein 1. Cabinet' , zh: '我的第 1 个柜子', ja: '最初のキャビネット', es: 'Mi 1er armario' },
  'cabinet.field.name':     { en: 'Name (e.g. Trip to Tokyo)', fr: 'Nom (ex. Tokyo)', id: 'Nama (mis. Tokyo)', ru: 'Название', de: 'Name' , zh: '名称（例如 东京之旅）', ja: '名称（例：東京旅行）', es: 'Nombre (p. ej. Viaje a Tokio)' },
  'cabinet.field.emoji':    { en: 'Emoji (optional)',   fr: 'Emoji (option)',   id: 'Emoji',          ru: 'Эмодзи',         de: 'Emoji' , zh: '表情（可选）', ja: '絵文字（任意）', es: 'Emoji (opcional)' },
  'cabinet.field.location': { en: 'Location (optional)', fr: 'Lieu (option)',  id: 'Lokasi',         ru: 'Место',          de: 'Ort' , zh: '地点（可选）', ja: '場所（任意）', es: 'Ubicacion (opcional)' },
  'cabinet.field.dates':    { en: 'Dates (optional)',   fr: 'Dates (option)',   id: 'Tanggal',        ru: 'Даты',           de: 'Datum' , zh: '日期（可选）', ja: '日付（任意）', es: 'Fechas (opcional)' },
  'cabinet.drawers':        { en: '{n} of {cap} drawers', fr: '{n} sur {cap} tiroirs', id: '{n} dari {cap} laci', ru: '{n} из {cap} ящиков', de: '{n} von {cap} Fächern' , zh: '{cap} 个抽屉中的 {n} 个', ja: '{cap}個中{n}個のドロワー', es: '{n} de {cap} cajones' },
  'cabinet.addDrawer':      { en: '＋ Add drawer',      fr: '＋ Ajouter un tiroir', id: '＋ Tambah laci', ru: '＋ Добавить ящик', de: '＋ Fach hinzufügen' , zh: '＋ 添加抽屉', ja: '＋ ドロワーを追加', es: '＋ Anadir cajon' },
  'cabinet.deleteConfirm':  { en: 'Delete this cabinet? Cards inside follow the favourite + multi-placed rules.', fr: 'Supprimer ce classeur ?', id: 'Hapus kabinet ini?', ru: 'Удалить эту папку?', de: 'Dieses Cabinet löschen?' , zh: '删除这个柜子？里面的卡片按收藏 + 多处放置规则处理。', ja: 'このキャビネットを削除しますか？中のカードはお気に入り＋複数配置のルールに従います。', es: '¿Eliminar este armario? Las tarjetas de dentro siguen las reglas de favorito y multiubicacion.' },
  'cabinet.empty':          { en: 'No drawers yet. Add one to start planning a meal.', fr: 'Aucun tiroir. Ajoutez-en un pour commencer.', id: 'Belum ada laci. Tambahkan satu.', ru: 'Пока нет ящиков.', de: 'Noch keine Fächer.' , zh: '还没有抽屉。添加一个开始规划一餐。', ja: 'ドロワーがまだありません。追加して一食の計画を始めましょう。', es: 'Aun no hay cajones. Anade uno para empezar a planear una comida.' },

  // ── drawer add / edit ─────────────────────────────────────────────
  'drawer.add.title':       { en: 'Add drawer',         fr: 'Ajouter un tiroir', id: 'Tambah laci',   ru: 'Добавить ящик',   de: 'Fach hinzufügen' , zh: '添加抽屉', ja: 'ドロワーを追加', es: 'Anadir cajon' },
  'drawer.field.segment':   { en: 'Time slot',          fr: 'Créneau horaire',  id: 'Waktu',          ru: 'Время',          de: 'Zeitfenster' , zh: '时段', ja: '時間帯', es: 'Franja horaria' },
  'drawer.field.dayTag':    { en: 'Day tag (optional, e.g. Day 1)', fr: 'Étiquette jour (ex. Jour 1)', id: 'Hari (mis. Hari 1)', ru: 'Метка дня', de: 'Tag (z.B. Tag 1)' , zh: '日期标签（可选，例如 第 1 天）', ja: '日タグ（任意、例：1日目）', es: 'Etiqueta de dia (opcional, p. ej. Dia 1)' },
  'drawer.field.description': { en: 'Description (optional)', fr: 'Description (option)', id: 'Deskripsi (opsional)', ru: 'Описание (необяз.)', de: 'Beschreibung (optional)' , zh: '描述（可选）', ja: '説明（任意）', es: 'Descripcion (opcional)' },
  'drawer.field.location':  { en: 'Location (optional)', fr: 'Lieu (option)',  id: 'Lokasi',         ru: 'Место',          de: 'Ort' , zh: '地点（可选）', ja: '場所（任意）', es: 'Ubicacion (opcional)' },
  'drawer.capReached':      { en: 'Drawer cap reached ({cap}).', fr: 'Limite atteinte ({cap}).', id: 'Batas laci ({cap}).', ru: 'Лимит ящиков ({cap}).', de: 'Limit erreicht ({cap}).' , zh: '已达抽屉上限 ({cap})。', ja: 'ドロワーの上限に達しました（{cap}）。', es: 'Limite de cajones alcanzado ({cap}).' },
  'drawer.empty':           { en: 'Empty — drag a card here.', fr: 'Vide — glissez une carte.', id: 'Kosong — seret kartu.', ru: 'Пусто — перетащите карточку.', de: 'Leer — Karte hierher ziehen.' , zh: '空的 — 拖一张卡片到这里。', ja: '空です — カードをここにドラッグ。', es: 'Vacio — arrastra una tarjeta aqui.' },
  'drawer.deleteConfirm':   { en: 'Delete this drawer? Cards follow the favourite + multi-placed rules.', fr: 'Supprimer ce tiroir ?', id: 'Hapus laci ini?', ru: 'Удалить этот ящик?', de: 'Dieses Fach löschen?' , zh: '删除这个抽屉？卡片按收藏 + 多处放置规则处理。', ja: 'このドロワーを削除しますか？カードはお気に入り＋複数配置のルールに従います。', es: '¿Eliminar este cajon? Las tarjetas siguen las reglas de favorito y multiubicacion.' },

  // ── card amend ────────────────────────────────────────────────────
  'card.amend.title':       { en: 'Amend card',         fr: 'Modifier la carte', id: 'Ubah kartu',    ru: 'Изменить карту',  de: 'Karte bearbeiten' , zh: '修改卡片', ja: 'カードを編集', es: 'Editar tarjeta' },
  'card.field.name':        { en: 'Display name',       fr: 'Nom affiché',      id: 'Nama tampilan',  ru: 'Имя',            de: 'Anzeigename' , zh: '显示名称', ja: '表示名', es: 'Nombre visible' },
  'card.field.note':        { en: 'Note (max 990 chars)', fr: 'Note (990 max)', id: 'Catatan (maks 990)', ru: 'Заметка (990)', de: 'Notiz (max 990)' , zh: '备注（最多 990 字符）', ja: 'メモ（最大990文字）', es: 'Nota (max 990 caracteres)' },
  'card.field.favourite':   { en: '⭐ Favourite (never expires)', fr: '⭐ Favori (jamais expiré)', id: '⭐ Favorit (tidak kedaluwarsa)', ru: '⭐ Избранное', de: '⭐ Favorit' , zh: '⭐ 收藏（永不到期）', ja: '⭐ お気に入り（期限切れなし）', es: '⭐ Favorito (nunca caduca)' },
  'card.moveTo':            { en: 'Move to…',           fr: 'Déplacer vers…',   id: 'Pindah ke…',     ru: 'Переместить…',    de: 'Verschieben…' , zh: '移动到…', ja: '移動先…', es: 'Mover a…' },
  'card.placeInDrawer':     { en: 'Place in drawer',    fr: 'Placer dans un tiroir', id: 'Tempatkan',  ru: 'Поместить',       de: 'Einsortieren' , zh: '放入抽屉', ja: 'ドロワーに配置', es: 'Colocar en cajon' },

  // ── share / fork ──────────────────────────────────────────────────
  'share.button':           { en: '🔗 Share drawer',    fr: '🔗 Partager',      id: '🔗 Bagikan',     ru: '🔗 Поделиться',  de: '🔗 Teilen' , zh: '🔗 分享抽屉', ja: '🔗 ドロワーを共有', es: '🔗 Compartir cajon' },
  'share.linkReady':        { en: 'Link copied — share via Telegram:', fr: 'Lien prêt — partager via Telegram :', id: 'Tautan siap — bagikan via Telegram:', ru: 'Ссылка готова:', de: 'Link bereit — über Telegram teilen:' , zh: '链接已复制 — 通过 Telegram 分享：', ja: 'リンクをコピーしました — Telegramで共有：', es: 'Enlace copiado — comparte por Telegram:' },
  'share.shareToTelegram':  { en: '📲 Share to Telegram', fr: '📲 Partager dans Telegram', id: '📲 Bagikan ke Telegram', ru: '📲 Поделиться в Telegram', de: '📲 In Telegram teilen' , zh: '📲 分享到 Telegram', ja: '📲 Telegramで共有', es: '📲 Compartir en Telegram' },
  'fork.title':             { en: 'Fork to my Clipboard', fr: 'Forker vers mon presse-papiers', id: 'Fork ke Klip saya', ru: 'Сохранить в свой буфер', de: 'In meine Zwischenablage' , zh: '复刻到我的剪贴板', ja: '自分のクリップボードにフォーク', es: 'Copiar a mi portapapeles' },
  'fork.intoCabinet':       { en: 'Add to which cabinet?', fr: 'Dans quel classeur ?', id: 'Ke kabinet mana?', ru: 'В какую папку?', de: 'In welches Cabinet?' , zh: '添加到哪个柜子？', ja: 'どのキャビネットに追加しますか？', es: '¿A que armario anadir?' },
  'fork.catchAll':          { en: 'Just catch-all (no cabinet)', fr: 'Tiroir d’accueil seulement', id: 'Tampung saja', ru: 'Только в общую', de: 'Nur Sammelfach' , zh: '仅临时收纳（不入柜）', ja: 'キャッチオールのみ（キャビネットなし）', es: 'Solo cajon general (sin armario)' },
  'fork.confirm':           { en: 'Fork',               fr: 'Forker',           id: 'Fork',           ru: 'Скопировать',    de: 'Übernehmen' , zh: '复刻', ja: 'フォーク', es: 'Copiar' },
  'fork.done':              { en: '✅ Forked {n} cards.', fr: '✅ {n} cartes copiées.', id: '✅ {n} kartu di-fork.', ru: '✅ Скопировано: {n}.', de: '✅ {n} Karten übernommen.' , zh: '✅ 已复刻 {n} 张卡片。', ja: '✅ {n}枚のカードをフォークしました。', es: '✅ {n} tarjetas copiadas.' },
  'shared.expired':         { en: 'This shared drawer has expired.', fr: 'Ce tiroir partagé a expiré.', id: 'Tautan kedaluwarsa.', ru: 'Ссылка устарела.', de: 'Dieser Link ist abgelaufen.' , zh: '此分享的抽屉已过期。', ja: 'この共有ドロワーは期限切れです。', es: 'Este cajon compartido ha caducado.' },
  'shared.from':            { en: 'Shared trip',         fr: 'Voyage partagé',  id: 'Trip dibagikan', ru: 'Общий маршрут',  de: 'Geteilter Trip' , zh: '分享的行程', ja: '共有した旅行', es: 'Viaje compartido' },

  // ── segment display labels (used by Add Drawer sheet + headers) ──
  'seg.dayBreak':           { en: 'Day Break',          fr: 'Aube',             id: 'Subuh',          ru: 'Рассвет',        de: 'Tagesbeginn' , zh: '破晓', ja: '夜明け', es: 'Amanecer' },
  'seg.breakfast':          { en: 'Breakfast',          fr: 'Petit-déjeuner',   id: 'Sarapan',        ru: 'Завтрак',        de: 'Frühstück' , zh: '早餐', ja: '朝食', es: 'Desayuno' },
  'seg.brunch':             { en: 'Brunch',             fr: 'Brunch',           id: 'Brunch',         ru: 'Поздний завтрак', de: 'Brunch' , zh: '早午餐', ja: 'ブランチ', es: 'Brunch' },
  'seg.lunch':              { en: 'Lunch',              fr: 'Déjeuner',         id: 'Makan siang',    ru: 'Обед',           de: 'Mittagessen' , zh: '午餐', ja: '昼食', es: 'Almuerzo' },
  'seg.lateLunch':          { en: 'Late Lunch',         fr: 'Déjeuner tardif',  id: 'Makan siang lambat', ru: 'Поздний обед', de: 'Spätes Mittag' , zh: '下午餐', ja: '遅い昼食', es: 'Almuerzo tardio' },
  'seg.teaBreak':           { en: 'Tea Break',          fr: 'Goûter',           id: 'Sore',           ru: 'Полдник',        de: 'Teepause' , zh: '下午茶', ja: 'ティータイム', es: 'Merienda' },
  'seg.earlyDinner':        { en: 'Early Dinner',       fr: 'Dîner tôt',        id: 'Makan malam awal', ru: 'Ранний ужин',  de: 'Frühes Abendessen' , zh: '早晚餐', ja: '早めの夕食', es: 'Cena temprana' },
  'seg.dinner':             { en: 'Dinner',             fr: 'Dîner',            id: 'Makan malam',    ru: 'Ужин',           de: 'Abendessen' , zh: '晚餐', ja: '夕食', es: 'Cena' },
  'seg.supper':             { en: 'Supper',             fr: 'Souper',           id: 'Sup malam',      ru: 'Поздний ужин',   de: 'Mitternachts­mahl' , zh: '宵夜', ja: '夜食', es: 'Cena ligera' },
  'seg.nightSnack':         { en: 'Night Snack',        fr: 'Encas de nuit',    id: 'Camilan malam',  ru: 'Ночной перекус', de: 'Mitternachts­snack' , zh: '夜宵', ja: '深夜の軽食', es: 'Tentempie nocturno' },
  'seg.wholeDay':           { en: 'Whole Day · 24/7',   fr: 'Toute la journée', id: 'Sepanjang hari', ru: 'Целый день',     de: 'Ganztägig' , zh: '全天 · 24/7', ja: '終日 · 24時間', es: 'Todo el dia · 24/7' },

  // ── switch which cabinet footer tab 2 points at (v0.62.705) ────────
  'cabinet.switchTitle':    { en: 'Switch cabinet',        fr: 'Changer de meuble',    id: 'Ganti lemari',      ru: 'Сменить шкаф',        de: 'Schrank wechseln' , zh: '切换柜子', ja: 'キャビネットを切替', es: 'Cambiar de armario' },
  'cabinet.switchHint':     { en: 'Sets the ★ default — the footer tab and the header follow it.', fr: 'Définit le ★ par défaut — l’onglet du bas et l’en-tête le suivent.', id: 'Menetapkan ★ default — tab bawah dan header mengikutinya.', ru: 'Задаёт ★ по умолчанию — нижняя вкладка и заголовок следуют за ним.', de: 'Legt den ★ Standard fest — Fußzeilen-Tab und Kopfzeile folgen ihm.' , zh: '设为 ★ 默认 — 底部标签与标题都会跟随。', ja: '★ 既定に設定します — フッタータブとヘッダーが追従します。', es: 'Define el ★ predeterminado: la pestana inferior y el encabezado lo siguen.' },
  'cabinet.switchEmpty':    { en: 'No cabinets yet.',       fr: 'Aucun meuble pour l’instant.', id: 'Belum ada lemari.', ru: 'Шкафов пока нет.',   de: 'Noch keine Schränke.' , zh: '尚无柜子。', ja: 'まだキャビネットがありません。', es: 'Aun no hay armarios.' },
  'cabinet.switchHold':     { en: 'Hold to switch cabinet', fr: 'Maintenir pour changer de meuble', id: 'Tahan untuk ganti lemari', ru: 'Удерживайте, чтобы сменить шкаф', de: 'Gedrückt halten zum Wechseln' , zh: '长按可切换柜子', ja: '長押しでキャビネットを切替', es: 'Manten pulsado para cambiar de armario' },

  // ── map controls (v0.62.706) — mirror the other three TMAs' clusters ──
  'map.reset':              { en: 'Reset view',            fr: 'Réinitialiser',        id: 'Atur ulang tampilan', ru: 'Сбросить вид',    de: 'Ansicht zurücksetzen' , zh: '重置视图', ja: '表示をリセット', es: 'Restablecer vista' },
  'map.zoomIn':             { en: 'Zoom in',               fr: 'Zoom avant',           id: 'Perbesar',          ru: 'Приблизить',      de: 'Vergrößern' , zh: '放大', ja: '拡大', es: 'Acercar' },
  'map.zoomOut':            { en: 'Zoom out',              fr: 'Zoom arrière',         id: 'Perkecil',          ru: 'Отдалить',        de: 'Verkleinern' , zh: '缩小', ja: '縮小', es: 'Alejar' },
  'map.centre':             { en: 'Centre map',            fr: 'Centrer la carte',     id: 'Pusatkan peta',     ru: 'Центрировать карту', de: 'Karte zentrieren' , zh: '居中地图', ja: '地図を中央に', es: 'Centrar el mapa' },
  'map.expand':             { en: 'Expand map',            fr: 'Agrandir la carte',    id: 'Perbesar peta',     ru: 'Развернуть карту', de: 'Karte vergrößern' , zh: '展开地图', ja: '地図を拡大', es: 'Ampliar el mapa' },
  'map.collapse':           { en: 'Collapse map',          fr: 'Réduire la carte',     id: 'Perkecil peta',     ru: 'Свернуть карту',  de: 'Karte verkleinern' , zh: '收起地图', ja: '地図を縮小', es: 'Reducir el mapa' },
  'map.layers':             { en: 'Layers',                fr: 'Calques',              id: 'Lapisan',           ru: 'Слои',            de: 'Ebenen' , zh: '图层', ja: 'レイヤー', es: 'Capas' },

  // ── itinerary map (v0.62.704) ──────────────────────────────────────
  'itin.open':              { en: 'Itinerary map',      fr: 'Carte de l’itinéraire', id: 'Peta itinerari', ru: 'Карта маршрута', de: 'Reiseroutenkarte' , zh: '行程地图', ja: '旅程マップ', es: 'Mapa del itinerario' },
  'itin.title':             { en: 'Itinerary map',      fr: 'Carte de l’itinéraire', id: 'Peta itinerari', ru: 'Карта маршрута', de: 'Reiseroutenkarte' , zh: '行程地图', ja: '旅程マップ', es: 'Mapa del itinerario' },
  'itin.resize':            { en: 'Drag to resize the itinerary map', fr: 'Glisser pour redimensionner la carte', id: 'Seret untuk mengubah ukuran peta', ru: 'Потяните, чтобы изменить размер карты', de: 'Ziehen, um die Karte zu skalieren' , zh: '拖动以调整地图大小', ja: 'ドラッグしてマップの高さを変更', es: 'Arrastra para redimensionar el mapa' },
  'itin.stopCount':         { en: '{n} mapped',         fr: '{n} sur la carte', id: '{n} dipetakan',  ru: '{n} на карте',   de: '{n} auf der Karte' , zh: '已定位 {n}', ja: '{n} 件を地図表示', es: '{n} en el mapa' },
  'itin.print':             { en: 'Print / PDF',        fr: 'Imprimer / PDF',   id: 'Cetak / PDF',    ru: 'Печать / PDF',   de: 'Drucken / PDF' , zh: '打印 / PDF', ja: '印刷 / PDF', es: 'Imprimir / PDF' },
  'itin.copy':              { en: '📋 Copy',            fr: '📋 Copier',        id: '📋 Salin',       ru: '📋 Копировать',  de: '📋 Kopieren' , zh: '📋 复制', ja: '📋 コピー', es: '📋 Copiar' },
  'itin.copied':            { en: '✓ Copied',           fr: '✓ Copié',          id: '✓ Tersalin',     ru: '✓ Скопировано',  de: '✓ Kopiert' , zh: '✓ 已复制', ja: '✓ コピー済み', es: '✓ Copiado' },
  'itin.showOnMap':         { en: 'Show on map',        fr: 'Afficher sur la carte', id: 'Tampilkan di peta', ru: 'Показать на карте', de: 'Auf der Karte zeigen' , zh: '在地图上显示', ja: '地図に表示', es: 'Mostrar en el mapa' },
  'itin.theDay':            { en: 'The day',            fr: 'La journée',       id: 'Hari ini',       ru: 'День',           de: 'Der Tag' , zh: '行程时段', ja: '一日の流れ', es: 'El dia' },
  'itin.mapLayers':         { en: 'Map layers',         fr: 'Calques',          id: 'Lapisan peta',   ru: 'Слои карты',     de: 'Kartenebenen' , zh: '地图图层', ja: 'マップレイヤー', es: 'Capas del mapa' },
  'itin.layer.zones':       { en: 'Drawer circles',     fr: 'Cercles de tiroir', id: 'Lingkaran laci', ru: 'Круги ящиков',   de: 'Fachkreise' , zh: '抽屉范围圈', ja: 'ドロワー円', es: 'Circulos de cajon' },
  'itin.layer.legs':        { en: 'Travel legs',        fr: 'Trajets',          id: 'Rute perjalanan', ru: 'Переезды',      de: 'Wegstrecken' , zh: '行程路段', ja: '移動区間', es: 'Tramos de viaje' },
  'itin.layer.pins':        { en: 'Stop pins',          fr: 'Épingles',         id: 'Pin perhentian', ru: 'Метки остановок', de: 'Stopp-Nadeln' , zh: '站点标记', ja: '停留ピン', es: 'Pines de parada' },
  'itin.layer.anchors':     { en: 'Anchors',            fr: 'Points d’ancrage', id: 'Jangkar',        ru: 'Опорные точки',  de: 'Ankerpunkte' , zh: '锚点', ja: 'アンカー', es: 'Anclas' },
  'itin.part.morning':      { en: 'Morning',            fr: 'Matin',            id: 'Pagi',           ru: 'Утро',           de: 'Morgen' , zh: '上午', ja: '午前', es: 'Manana' },
  'itin.part.midday':       { en: 'Midday',             fr: 'Midi',             id: 'Siang',          ru: 'Полдень',        de: 'Mittag' , zh: '中午', ja: '昼', es: 'Mediodia' },
  'itin.part.evening':      { en: 'Evening',            fr: 'Soir',             id: 'Sore',           ru: 'Вечер',          de: 'Abend' , zh: '傍晚', ja: '夕方', es: 'Tarde' },
  'itin.part.night':        { en: 'Night',              fr: 'Nuit',             id: 'Malam',          ru: 'Ночь',           de: 'Nacht' , zh: '夜晚', ja: '夜', es: 'Noche' },
  'itin.part.anytime':      { en: 'Anytime',            fr: 'À tout moment',    id: 'Kapan saja',     ru: 'В любое время',  de: 'Jederzeit' , zh: '不限时段', ja: 'いつでも', es: 'En cualquier momento' },
  'itin.countTitle':        { en: '{mapped} mappable, {missing} without coordinates', fr: '{mapped} localisables, {missing} sans coordonnées', id: '{mapped} dapat dipetakan, {missing} tanpa koordinat', ru: '{mapped} с координатами, {missing} без', de: '{mapped} verortbar, {missing} ohne Koordinaten' , zh: '{mapped} 个可定位，{missing} 个无坐标', ja: '{mapped} 件が地図表示可、{missing} 件は座標なし', es: '{mapped} ubicables, {missing} sin coordenadas' },
  'itin.unmappedNote':      { en: '{mapped} of {total} stops mapped · {n} saved before locations were stored, still listed below.', fr: '{mapped} arrêts sur {total} localisés · {n} enregistrés avant le stockage des lieux, toujours listés ci-dessous.', id: '{mapped} dari {total} perhentian dipetakan · {n} disimpan sebelum lokasi dicatat, tetap tercantum di bawah.', ru: 'Отмечено {mapped} из {total} остановок · {n} сохранены до того, как записывались координаты, и перечислены ниже.', de: '{mapped} von {total} Stopps verortet · {n} vor dem Speichern von Orten gesichert, unten weiterhin aufgeführt.' , zh: '{total} 个站点中已定位 {mapped} 个 · {n} 个在开始保存位置前存入，仍列于下方。', ja: '{total} 件中 {mapped} 件を地図表示 · {n} 件は位置情報の保存開始前に保存されたもので、下に一覧表示しています。', es: '{mapped} de {total} paradas ubicadas · {n} guardadas antes de almacenar ubicaciones, siguen listadas abajo.' },
  'itin.noCoords':          { en: 'Saved before locations were stored — no coordinates.', fr: 'Enregistré avant le stockage des lieux — pas de coordonnées.', id: 'Disimpan sebelum lokasi dicatat — tanpa koordinat.', ru: 'Сохранено до записи координат — координат нет.', de: 'Vor dem Speichern von Orten gesichert — keine Koordinaten.' , zh: '在开始保存位置前存入 — 无坐标。', ja: '位置情報の保存開始前に保存 — 座標なし。', es: 'Guardado antes de almacenar ubicaciones — sin coordenadas.' },
  'itin.candidates':        { en: '{n} candidates for this slot — pick one.', fr: '{n} options pour ce créneau — à choisir.', id: '{n} kandidat untuk slot ini — pilih satu.', ru: '{n} вариантов на этот слот — выберите один.', de: '{n} Kandidaten für diesen Slot — einen auswählen.' , zh: '此时段有 {n} 个候选 — 择一。', ja: 'この時間帯の候補 {n} 件 — 1つ選んでください。', es: '{n} candidatos para esta franja — elige uno.' },
  'itin.gap':               { en: '{n} min gap',        fr: '{n} min d’écart',  id: 'jeda {n} mnt',   ru: 'разрыв {n} мин', de: '{n} Min Puffer' , zh: '间隔 {n} 分钟', ja: '{n} 分の空き', es: '{n} min de margen' },
  'itin.noGap':             { en: 'no gap',             fr: 'aucun écart',      id: 'tanpa jeda',     ru: 'без разрыва',    de: 'kein Puffer' , zh: '无间隔', ja: '空きなし', es: 'sin margen' },
  'itin.tight':             { en: 'tight connection',   fr: 'correspondance serrée', id: 'koneksi ketat', ru: 'мало времени', de: 'knappe Verbindung' , zh: '衔接紧张', ja: '乗り継ぎ厳しい', es: 'conexion ajustada' },
  'itin.openMaps':          { en: 'Open in Maps →',     fr: 'Ouvrir dans Maps →', id: 'Buka di Maps →', ru: 'Открыть в Картах →', de: 'In Maps öffnen →' , zh: '在地图中打开 →', ja: 'マップで開く →', es: 'Abrir en Maps →' },
  'itin.map.loading':       { en: 'Loading map…',       fr: 'Chargement de la carte…', id: 'Memuat peta…', ru: 'Загрузка карты…', de: 'Karte wird geladen…' , zh: '正在加载地图…', ja: 'マップを読み込み中…', es: 'Cargando el mapa…' },
  'itin.map.nokey':         { en: 'Map unavailable — the list, print and copy still work.', fr: 'Carte indisponible — la liste, l’impression et la copie fonctionnent toujours.', id: 'Peta tidak tersedia — daftar, cetak, dan salin tetap berfungsi.', ru: 'Карта недоступна — список, печать и копирование работают.', de: 'Karte nicht verfügbar — Liste, Druck und Kopie funktionieren weiterhin.' , zh: '地图不可用 — 列表、打印与复制仍可使用。', ja: 'マップを利用できません — 一覧・印刷・コピーは使えます。', es: 'Mapa no disponible — la lista, la impresion y la copia siguen funcionando.' },
  'itin.map.error':         { en: 'Map failed to load — the list, print and copy still work.', fr: 'Échec du chargement de la carte — la liste, l’impression et la copie fonctionnent toujours.', id: 'Peta gagal dimuat — daftar, cetak, dan salin tetap berfungsi.', ru: 'Карта не загрузилась — список, печать и копирование работают.', de: 'Karte konnte nicht geladen werden — Liste, Druck und Kopie funktionieren weiterhin.' , zh: '地图加载失败 — 列表、打印与复制仍可使用。', ja: 'マップの読み込みに失敗 — 一覧・印刷・コピーは使えます。', es: 'El mapa no se pudo cargar — la lista, la impresion y la copia siguen funcionando.' },
  'itin.foot':              { en: 'Pin 3.1 = drawer 3, stop 1. A circle is one drawer, sized to how far its candidates sprawl. Legs join drawer to drawer; stops inside a drawer are candidates, not a route. All distances are straight-line.', fr: 'Épingle 3.1 = tiroir 3, arrêt 1. Un cercle représente un tiroir, dimensionné selon l’étalement de ses options. Les trajets relient les tiroirs ; les arrêts d’un même tiroir sont des options, pas un itinéraire. Toutes les distances sont à vol d’oiseau.', id: 'Pin 3.1 = laci 3, perhentian 1. Satu lingkaran adalah satu laci, ukurannya mengikuti sebaran kandidatnya. Rute menghubungkan antar laci; perhentian dalam satu laci adalah kandidat, bukan rute. Semua jarak garis lurus.', ru: 'Метка 3.1 — ящик 3, остановка 1. Круг — это один ящик, его размер отражает разброс вариантов. Переезды соединяют ящики; остановки внутри ящика — варианты, а не маршрут. Все расстояния по прямой.', de: 'Nadel 3.1 = Fach 3, Stopp 1. Ein Kreis ist ein Fach, skaliert nach der Streuung seiner Kandidaten. Strecken verbinden Fächer; Stopps in einem Fach sind Kandidaten, keine Route. Alle Entfernungen sind Luftlinie.' , zh: '标记 3.1 = 第 3 个抽屉的第 1 站。圆圈代表一个抽屉，大小取决于候选点的分散程度。路段连接抽屉之间；同一抽屉内的站点是候选，不是路线。所有距离均为直线距离。', ja: 'ピン 3.1 は「ドロワー3の停留1」。円は1つのドロワーで、候補の広がりに応じた大きさです。区間はドロワー間を結びます。同じドロワー内の停留は候補であり、順路ではありません。距離はすべて直線距離です。', es: 'Pin 3.1 = cajon 3, parada 1. Un circulo es un cajon, dimensionado segun la dispersion de sus candidatos. Los tramos unen cajones; las paradas dentro de un cajon son candidatos, no una ruta. Todas las distancias son en linea recta.' },

  // ── v0.62.837 — strings that were hardcoded `lang === 'fr' ? … : …` in the
  //    Sketchbook's TellMePanel / QuickFilters / CuisineGroupPicker, so every
  //    locale but French read English. ───────────────────────────────────────
  'tell.lastAsked':         { en: 'Last asked', fr: 'Dernière demande', id: 'Terakhir ditanya', ru: 'Последний запрос', de: 'Zuletzt gefragt', zh: '上次询问', ja: '前回のリクエスト', es: 'Última consulta' },
  'tell.replaceWith':       { en: 'Replace the search with «{prompt}»', fr: 'Remplacer la recherche par « {prompt} »', id: 'Ganti pencarian dengan «{prompt}»', ru: 'Заменить поиск на «{prompt}»', de: 'Suche durch «{prompt}» ersetzen', zh: '将搜索替换为“{prompt}”', ja: '検索を「{prompt}」に置き換える', es: 'Reemplazar la búsqueda por «{prompt}»' },
  'tell.replaceNotMerge':   { en: 'Replace instead of merge', fr: 'Remplacer au lieu de fusionner', id: 'Ganti alih-alih gabungkan', ru: 'Заменить, а не объединить', de: 'Ersetzen statt zusammenführen', zh: '替换而非合并', ja: '統合せず置き換える', es: 'Reemplazar en vez de combinar' },
  'tell.collapse':          { en: 'Collapse', fr: 'Réduire', id: 'Tutup', ru: 'Свернуть', de: 'Einklappen', zh: '收起', ja: '折りたたむ', es: 'Contraer' },
  'tell.searchCta':         { en: 'Search · Show me places to eat', fr: 'Rechercher · Trouvez où manger', id: 'Cari · Tunjukkan tempat makan', ru: 'Поиск · Показать, где поесть', de: 'Suchen · Lokale zum Essen anzeigen', zh: '搜索 · 找吃的地方', ja: '検索・食べる場所を見つける', es: 'Buscar · Muéstrame dónde comer' },
  'cgp.notSaved':           { en: 'Not in your saved cards', fr: 'Aucune carte enregistrée', id: 'Tidak ada di kartu tersimpan', ru: 'Нет в сохранённых карточках', de: 'Nicht in Ihren gespeicherten Karten', zh: '不在你保存的卡片中', ja: '保存済みカードにありません', es: 'No está en tus tarjetas guardadas' },
  'qf.new':                 { en: 'New', fr: 'Nouv.', id: 'Baru', ru: 'Новые', de: 'Neu', zh: '新', ja: '新着', es: 'Nuevo' },
  'qf.filters':             { en: 'Filters', fr: 'Filtres', id: 'Filter', ru: 'Фильтры', de: 'Filter', zh: '筛选', ja: 'フィルター', es: 'Filtros' },
};

const SUPPORTED = new Set(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']);

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

export const SUPPORTED_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];

// v0.62.481 — operator bug: "i change the language in MENU TMA to french, but
// sketchbook UI didn't change". ROOT CAUSE: this TMA read its locale from
// getLanguage() (Telegram device language_code only), ignoring the shared app
// locale that the Cuisine + Menu TMAs write to localStorage['gia.locale'] (same
// origin → shared) and to Redis via /api/cuisine/user-language. Mirror the Menu
// TMA's getActiveLocale()/useLocale() verbatim so all TMAs honour one pref.
// getLanguage() stays the last-resort device fallback.
import { useEffect, useState } from 'react';
import { getLanguage } from './tg.js';

const LOCALE_KEY = 'gia.locale';
const LOCALE_EVENT = 'gia:locale';

// Precedence: explicit shared pref (localStorage, written by any TMA's toggle)
// → Telegram device language → 'en'. Only accepts a locale this TMA can render.
export function getActiveLocale() {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(LOCALE_KEY);
      if (SUPPORTED.has(stored)) return stored;
    } catch { /* private mode / quota — fall through */ }
  }
  // v0.62.501 — prefer the DEVICE locale (navigator.language) over the
  // Telegram APP locale: a French phone running an English Telegram was
  // resolving to 'en'. getLanguage() is Telegram-first, so read navigator
  // directly here; fall through to getLanguage() (Telegram hint) then 'en'
  // when the device locale is unsupported.
  try {
    const nav = (typeof navigator !== 'undefined' && navigator.language)
      ? navigator.language.slice(0, 2).toLowerCase() : '';
    if (SUPPORTED.has(nav)) return nav;
  } catch { /* no navigator */ }
  const dev = getLanguage();
  return SUPPORTED.has(dev) ? dev : 'en';
}

// v0.62.511 — write the shared locale pref, mirrors web/menu/src/i18n.js
// setActiveLocale verbatim. Was missing; Clipboard could read but not set.
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

// Reactive locale hook. Re-renders on the in-page gia:locale CustomEvent (a
// toggle in THIS tab) and on the cross-tab 'storage' event (a toggle in another
// TMA sharing the origin). Mirrors web/menu/src/i18n.js useLocale.
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
