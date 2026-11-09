// mrt-lines-i18n.local.generated.js — v0.62.888
//
// The line name IN THE READER'S LANGUAGE, for the bracketed second line under
// the official one. Operator: "MRT stays English or Chinese or Malay or Tamil
// but second line has the translated words in bracket and one font size
// smaller."
//
// PROVENANCE, STATED HONESTLY. mrt-lines-i18n.generated.js is the government
// register (translatedterms.gov.sg) and it publishes TWO of the twelve lines,
// in zh / ms / ta only. This file is NOT that. Ten of these twelve rows are
// hand-authored and no register vouches for them.
//
// What can be offered instead: the twelve were written WITHOUT consulting the
// register, and then compared against it. All four overlapping cells agree
// byte for byte — 东西线, 南北线, Laluan Timur-Barat, Laluan Utara-Selatan.
// __tests__/mrt-lines-local-i18n.test.js asserts that agreement, so the day a
// row here drifts from the official one it fails. That is evidence about the
// other ten, not proof, and the difference is why this comment exists.
//
// The Chinese and Korean forms are the ones LTA prints on station signage
// (东北线, 环线, 滨海市区线, 汤申-东海岸线 …), not translations invented here.
//
// The three LRT rows expand the acronym in fr / es / de — "Métro léger de
// Sengkang", not "LRT de Sengkang". A bracket whose whole job is to translate
// should not leave LRT untranslated; id and ja keep it because those languages
// use it. That change also removed a real collision: fr and es had come out
// byte-identical on all three.
//
// KEY: the line code from mrt-lines.js, the same key the register uses.
export const SG_LINE_NAMES_LOCAL = {
  EWL: { fr: "Ligne Est-Ouest", id: "Laluan Timur-Barat", ru: "Линия Восток-Запад", de: "Ost-West-Linie", zh: "东西线", ja: "東西線", es: "Línea Este-Oeste", ko: "동서선" },
  CGL: { fr: "Branche de l'aéroport de Changi", id: "Cabang Bandara Changi", ru: "Ветка аэропорта Чанги", de: "Changi-Flughafen-Zweig", zh: "樟宜机场支线", ja: "チャンギ空港支線", es: "Ramal del Aeropuerto de Changi", ko: "창이공항 지선" },
  NSL: { fr: "Ligne Nord-Sud", id: "Laluan Utara-Selatan", ru: "Линия Север-Юг", de: "Nord-Süd-Linie", zh: "南北线", ja: "南北線", es: "Línea Norte-Sur", ko: "남북선" },
  NEL: { fr: "Ligne Nord-Est", id: "Jalur Timur Laut", ru: "Северо-Восточная линия", de: "Nordost-Linie", zh: "东北线", ja: "北東線", es: "Línea Noreste", ko: "북동선" },
  CCL: { fr: "Ligne circulaire", id: "Jalur Lingkar", ru: "Кольцевая линия", de: "Ringlinie", zh: "环线", ja: "サークル線", es: "Línea Circular", ko: "순환선" },
  DTL: { fr: "Ligne du centre-ville", id: "Jalur Pusat Kota", ru: "Даунтаун-линия", de: "Downtown-Linie", zh: "滨海市区线", ja: "ダウンタウン線", es: "Línea del Centro", ko: "다운타운선" },
  TEL: { fr: "Ligne Thomson–Côte Est", id: "Jalur Thomson–Pesisir Timur", ru: "Линия Томсон — Восточное побережье", de: "Thomson-Ostküsten-Linie", zh: "汤申-东海岸线", ja: "トムソン・イーストコースト線", es: "Línea Thomson–Costa Este", ko: "톰슨-이스트코스트선" },
  BPL: { fr: "Métro léger de Bukit Panjang", id: "LRT Bukit Panjang", ru: "Лёгкое метро Букит-Панджанг", de: "Stadtbahn Bukit Panjang", zh: "武吉班让轻轨", ja: "ブキパンジャンLRT", es: "Metro ligero de Bukit Panjang", ko: "부킷판장 경전철" },
  SLRT: { fr: "Métro léger de Sengkang", id: "LRT Sengkang", ru: "Лёгкое метро Сенгканг", de: "Stadtbahn Sengkang", zh: "盛港轻轨", ja: "センカンLRT", es: "Metro ligero de Sengkang", ko: "셍캉 경전철" },
  PLRT: { fr: "Métro léger de Punggol", id: "LRT Punggol", ru: "Лёгкое метро Пунггол", de: "Stadtbahn Punggol", zh: "榜鹅轻轨", ja: "プンゴルLRT", es: "Metro ligero de Punggol", ko: "풍골 경전철" },
  JRL: { fr: "Ligne de la région de Jurong", id: "Jalur Kawasan Jurong", ru: "Линия региона Джуронг", de: "Jurong-Regionallinie", zh: "裕廊区域线", ja: "ジュロン地域線", es: "Línea Regional de Jurong", ko: "주롱 지역선" },
  CRL: { fr: "Ligne transinsulaire", id: "Jalur Lintas Pulau", ru: "Трансостровная линия", de: "Cross-Island-Linie", zh: "跨岛线", ja: "クロスアイランド線", es: "Línea Transinsular", ko: "크로스아일랜드선" },
};

/** The reader's-language line name, or null when there is none for that locale. */
export function lineNameLocal(code, lang) {
  const row = SG_LINE_NAMES_LOCAL[code];
  const v = row && row[lang];
  return (typeof v === 'string' && v.trim()) ? v : null;
}
