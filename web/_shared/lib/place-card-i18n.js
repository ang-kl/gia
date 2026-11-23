// place-card-i18n.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Part C.
//
// The fixed wording of the map place card, in the nine languages the three maps speak. Everything else on the card -
// the place's name, its type label, its address, the open or closed line - arrives already in the reader's language,
// from Google or from open-hours.js, and is not repeated here.
//
// PROVENANCE: written for this release and NOT checked by a native speaker (spec assumption A16, confirmed by the
// operator on 23-11 '26). The test place-card-html.test.js holds what can be held mechanically: every key in every
// language, no English left in place, the {d} placeholder kept, and hyphens only.
//
// `probablyClosed` is a GUESS and is worded as one in every language. Operator: "f there isn't opening hours stated in
// the google map, use human-logic like is 10 PM (the chance eatery to be closed is near 99% in Singapore, 11 PM for
// Japan and Korea)".

export const PLACE_CARD_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const PLACE_CARD_KEYS = ['eateriesHere', 'eateriesNear', 'setLocation', 'fromGoogle', 'openMaps', 'probablyClosed', 'distance', 'loading', 'capReached', 'budgetReached', 'unavailable'];

export const PLACE_CARD_STRINGS = {
  en: {
    eateriesHere: 'Eateries here',
    eateriesNear: 'Eateries near here',
    setLocation: 'Set as my location',
    fromGoogle: 'Details from Google',
    openMaps: 'Open in Google Maps',
    probablyClosed: 'Probably closed - no hours on Google',
    distance: '{d} from your set location',
    loading: 'Looking up this place...',
    capReached: "Today's place look-ups are used up. Try again tomorrow.",
    budgetReached: 'Place look-ups are paused until next month.',
    unavailable: 'Could not load this place.',
  },
  fr: {
    eateriesHere: 'Restaurants ici',
    eateriesNear: 'Restaurants à proximité',
    setLocation: 'Définir comme ma position',
    fromGoogle: 'Informations fournies par Google',
    openMaps: 'Ouvrir dans Google Maps',
    probablyClosed: "Probablement fermé - pas d'horaires sur Google",
    distance: 'À {d} de votre position définie',
    loading: 'Recherche de ce lieu...',
    capReached: 'Les recherches de lieux du jour sont épuisées. Réessayez demain.',
    budgetReached: "Les recherches de lieux sont suspendues jusqu'au mois prochain.",
    unavailable: 'Impossible de charger ce lieu.',
  },
  id: {
    eateriesHere: 'Tempat makan di sini',
    eateriesNear: 'Tempat makan di sekitar sini',
    setLocation: 'Jadikan lokasi saya',
    fromGoogle: 'Detail dari Google',
    openMaps: 'Buka di Google Maps',
    probablyClosed: 'Mungkin tutup - tidak ada jam buka di Google',
    distance: '{d} dari lokasi yang Anda tetapkan',
    loading: 'Mencari tempat ini...',
    capReached: 'Pencarian tempat hari ini sudah habis. Coba lagi besok.',
    budgetReached: 'Pencarian tempat dijeda sampai bulan depan.',
    unavailable: 'Tidak dapat memuat tempat ini.',
  },
  ru: {
    eateriesHere: 'Заведения здесь',
    eateriesNear: 'Заведения рядом',
    setLocation: 'Сделать моим местоположением',
    fromGoogle: 'Данные Google',
    openMaps: 'Открыть в Google Картах',
    probablyClosed: 'Вероятно, закрыто - в Google нет часов работы',
    distance: '{d} от выбранного вами места',
    loading: 'Ищем это место...',
    capReached: 'Поиск мест на сегодня исчерпан. Попробуйте завтра.',
    budgetReached: 'Поиск мест приостановлен до следующего месяца.',
    unavailable: 'Не удалось загрузить это место.',
  },
  de: {
    eateriesHere: 'Lokale hier',
    eateriesNear: 'Lokale in der Nähe',
    setLocation: 'Als meinen Standort festlegen',
    fromGoogle: 'Angaben von Google',
    openMaps: 'In Google Maps öffnen',
    probablyClosed: 'Wahrscheinlich geschlossen - keine Öffnungszeiten bei Google',
    distance: '{d} vom festgelegten Standort',
    loading: 'Ort wird gesucht...',
    capReached: 'Die Ortssuchen für heute sind aufgebraucht. Bitte morgen erneut versuchen.',
    budgetReached: 'Ortssuchen sind bis zum nächsten Monat pausiert.',
    unavailable: 'Dieser Ort konnte nicht geladen werden.',
  },
  zh: {
    eateriesHere: '这里的餐饮',
    eateriesNear: '附近的餐饮',
    setLocation: '设为我的位置',
    fromGoogle: '信息来自 Google',
    openMaps: '在 Google 地图中打开',
    probablyClosed: '可能已打烊 - Google 上没有营业时间',
    distance: '距您设定的位置 {d}',
    loading: '正在查询此地点...',
    capReached: '今天的地点查询次数已用完，请明天再试。',
    budgetReached: '地点查询已暂停，下月恢复。',
    unavailable: '无法加载此地点。',
  },
  ja: {
    eateriesHere: 'ここの飲食店',
    eateriesNear: '近くの飲食店',
    setLocation: '自分の場所に設定',
    fromGoogle: '情報提供: Google',
    openMaps: 'Google マップで開く',
    probablyClosed: 'おそらく閉店中 - Google に営業時間の記載なし',
    distance: '設定した場所から {d}',
    loading: 'この場所を検索中...',
    capReached: '本日の場所検索は上限に達しました。明日もう一度お試しください。',
    budgetReached: '場所検索は来月まで停止中です。',
    unavailable: 'この場所を読み込めませんでした。',
  },
  es: {
    eateriesHere: 'Sitios para comer aquí',
    eateriesNear: 'Sitios para comer cerca',
    setLocation: 'Usar como mi ubicación',
    fromGoogle: 'Datos de Google',
    openMaps: 'Abrir en Google Maps',
    probablyClosed: 'Probablemente cerrado - sin horario en Google',
    distance: 'A {d} de tu ubicación fijada',
    loading: 'Buscando este lugar...',
    capReached: 'Las búsquedas de lugares de hoy se han agotado. Inténtalo mañana.',
    budgetReached: 'Las búsquedas de lugares están en pausa hasta el mes que viene.',
    unavailable: 'No se pudo cargar este lugar.',
  },
  ko: {
    eateriesHere: '이곳의 음식점',
    eateriesNear: '근처 음식점',
    setLocation: '내 위치로 설정',
    fromGoogle: 'Google 제공 정보',
    openMaps: 'Google 지도에서 열기',
    probablyClosed: '영업 종료 가능성 높음 - Google에 영업시간 없음',
    distance: '설정한 위치에서 {d}',
    loading: '이 장소를 조회하는 중...',
    capReached: '오늘의 장소 조회 횟수를 모두 사용했습니다. 내일 다시 시도해 주세요.',
    budgetReached: '장소 조회가 다음 달까지 일시 중지되었습니다.',
    unavailable: '이 장소를 불러올 수 없습니다.',
  },
};

// The line for `key` in `lang`, with {name} placeholders filled from `vars`. An unknown language reads as English; an
// unknown key reads as an empty string, so a typo shows nothing instead of the key's own name.
export function pct(key, lang, vars) {
  const two = String(lang || '').slice(0, 2).toLowerCase();
  const table = PLACE_CARD_STRINGS[two] || PLACE_CARD_STRINGS.en;
  let s = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : (Object.prototype.hasOwnProperty.call(PLACE_CARD_STRINGS.en, key) ? PLACE_CARD_STRINGS.en[key] : '');
  if (vars && typeof s === 'string') {
    for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k]));
  }
  return s;
}
