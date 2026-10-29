// pcn-i18n.js — v0.62.956. The Park Connector layer's UI strings, shared by the Cuisine, Train and Hawker maps.
//
// Spec: doc/Feature/2026-10-30-park-connector-layer.spec.md (C11, I9). Loop, route and park names are NOT here: they
// are shown as NParks and URA publish them, in every locale, like the park labels already are. Only the controls
// around them are translated.

export const PCN_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const PCN_STRINGS = {
  lock: {
    en: 'Tap to lock this loop', fr: 'Touchez pour verrouiller cette boucle', id: 'Ketuk untuk mengunci loop ini',
    ru: 'Нажмите, чтобы закрепить маршрут', de: 'Tippen, um diese Schleife zu fixieren', zh: '点按锁定此环线',
    ja: 'タップしてこのループを固定', es: 'Toca para fijar este circuito', ko: '탭하여 이 루프 고정'
  },
  unlock: {
    en: 'Tap to unlock', fr: 'Touchez pour déverrouiller', id: 'Ketuk untuk membuka kunci',
    ru: 'Нажмите, чтобы открепить', de: 'Tippen zum Lösen', zh: '点按解除锁定',
    ja: 'タップして固定を解除', es: 'Toca para desbloquear', ko: '탭하여 고정 해제'
  },
  unlockAria: {
    en: 'Unlock loop', fr: 'Déverrouiller la boucle', id: 'Buka kunci loop',
    ru: 'Открепить маршрут', de: 'Schleife lösen', zh: '解除锁定环线',
    ja: 'ループの固定を解除', es: 'Desbloquear circuito', ko: '루프 고정 해제'
  },
  generic: {
    en: 'Park connector', fr: 'Connecteur de parc', id: 'Penghubung taman',
    ru: 'Парковый коннектор', de: 'Parkverbinder', zh: '公园连道',
    ja: 'パークコネクター', es: 'Conector de parques', ko: '공원 연결로'
  },
  heading: {
    en: 'Park connector loops', fr: 'Boucles de connecteurs de parc', id: 'Loop penghubung taman',
    ru: 'Маршруты парковых коннекторов', de: 'Parkverbinder-Schleifen', zh: '公园连道环线',
    ja: 'パークコネクターのループ', es: 'Circuitos de conectores de parques', ko: '공원 연결로 루프'
  },
  showLoops: {
    en: 'Show loops', fr: 'Afficher les boucles', id: 'Tampilkan loop',
    ru: 'Показать маршруты', de: 'Schleifen anzeigen', zh: '显示环线',
    ja: 'ループを表示', es: 'Mostrar circuitos', ko: '루프 보기'
  }
};

// Unknown key → the key itself, so a missing string shows up as an obvious token rather than as nothing.
export function pt(key, lang) {
  const row = PCN_STRINGS[key];
  if (!row) return key;
  return row[lang] || row.en;
}
