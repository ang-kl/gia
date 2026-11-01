// outside-now-i18n.js — v0.62.952. Strings and pure helpers for the "Outside now" chip dot, sheet and strip
// shared by the Cuisine, Train and Hawker Mini Apps.
//
// Spec: doc/Feature/2026-10-29-outside-now-alerts.spec.md. No React here, so the node test suite can import it.
//
// Wording rules (spec C9 and the operator, 29-10 '26: *"no need to state "LTA" but keeps "NEA" or "PUB""*): weather
// rows name NEA or PUB with the reading time, and the parking row names no agency. No forecast language, and nothing
// about sheltered exits or air-conditioning — no data source says either.
//
// v0.62.960 lifts "no forecast language" for the 4-day block only (spec doc/Feature/2026-10-30-weather-fixes-and-4-day-
// forecast.spec.md): its labels name NEA's own condition classes, and NEA's prose summary is never shown.

export const OUTSIDE_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const OUTSIDE_STRINGS = {
  title: { en: 'Outside now', fr: 'Dehors maintenant', id: 'Di luar sekarang', ru: 'Сейчас на улице', de: 'Draußen jetzt', zh: '户外现况', ja: '今の屋外', es: 'Afuera ahora', ko: '지금 바깥' },
  nearYou: { en: 'near you', fr: 'près de vous', id: 'di dekat Anda', ru: 'рядом с вами', de: 'in Ihrer Nähe', zh: '您附近', ja: '現在地付近', es: 'cerca de ti', ko: '내 주변' },
  singapore: { en: 'Singapore', fr: 'Singapour', id: 'Singapura', ru: 'Сингапур', de: 'Singapur', zh: '新加坡', ja: 'シンガポール', es: 'Singapur', ko: '싱가포르' },
  'row.heat': { en: 'Heat stress', fr: 'Stress thermique', id: 'Stres panas', ru: 'Тепловой стресс', de: 'Hitzestress', zh: '热压力', ja: '暑さストレス', es: 'Estrés térmico', ko: '열 스트레스' },
  'row.lightning': { en: 'Lightning', fr: 'Foudre', id: 'Petir', ru: 'Молнии', de: 'Blitze', zh: '闪电', ja: '雷', es: 'Rayos', ko: '낙뢰' },
  'row.flood': { en: 'Flood alert', fr: 'Alerte inondation', id: 'Peringatan banjir', ru: 'Подтопление', de: 'Überflutungswarnung', zh: '水浸警报', ja: '冠水警報', es: 'Alerta de inundación', ko: '침수 경보' },
  'row.air': { en: 'Air quality', fr: "Qualité de l'air", id: 'Kualitas udara', ru: 'Качество воздуха', de: 'Luftqualität', zh: '空气质量', ja: '大気の質', es: 'Calidad del aire', ko: '대기질' },
  'row.uv': { en: 'UV', fr: 'UV', id: 'UV', ru: 'УФ-индекс', de: 'UV-Index', zh: '紫外线', ja: '紫外線', es: 'UV', ko: '자외선' },
  'row.parking': { en: 'Parking', fr: 'Stationnement', id: 'Parkir', ru: 'Парковка', de: 'Parken', zh: '停车', ja: '駐車場', es: 'Estacionamiento', ko: '주차' },
  'lvl.low': { en: 'Low', fr: 'Faible', id: 'Rendah', ru: 'Низкий', de: 'Niedrig', zh: '低', ja: '低い', es: 'Bajo', ko: '낮음' },
  'lvl.moderate': { en: 'Moderate', fr: 'Modéré', id: 'Sedang', ru: 'Умеренный', de: 'Mäßig', zh: '中等', ja: '中程度', es: 'Moderado', ko: '보통' },
  'lvl.high': { en: 'High', fr: 'Élevé', id: 'Tinggi', ru: 'Высокий', de: 'Hoch', zh: '高', ja: '高い', es: 'Alto', ko: '높음' },
  'lvl.veryHigh': { en: 'Very high', fr: 'Très élevé', id: 'Sangat tinggi', ru: 'Очень высокий', de: 'Sehr hoch', zh: '很高', ja: '非常に高い', es: 'Muy alto', ko: '매우 높음' },
  'lvl.extreme': { en: 'Extreme', fr: 'Extrême', id: 'Ekstrem', ru: 'Экстремальный', de: 'Extrem', zh: '极高', ja: '極端に高い', es: 'Extremo', ko: '위험' },
  'lvl.good': { en: 'Good', fr: 'Bon', id: 'Baik', ru: 'Хорошее', de: 'Gut', zh: '良好', ja: '良好', es: 'Buena', ko: '좋음' },
  'lvl.unhealthy': { en: 'Unhealthy', fr: 'Mauvais', id: 'Tidak sehat', ru: 'Вредное', de: 'Ungesund', zh: '不健康', ja: '健康に悪い', es: 'Dañina', ko: '나쁨' },
  'lvl.veryUnhealthy': { en: 'Very unhealthy', fr: 'Très mauvais', id: 'Sangat tidak sehat', ru: 'Очень вредное', de: 'Sehr ungesund', zh: '非常不健康', ja: '非常に健康に悪い', es: 'Muy dañina', ko: '매우 나쁨' },
  'lvl.hazardous': { en: 'Hazardous', fr: 'Dangereux', id: 'Berbahaya', ru: 'Опасное', de: 'Gefährlich', zh: '危险', ja: '危険', es: 'Peligrosa', ko: '위험' },
  'lvl.clear': { en: 'Clear', fr: 'Rien', id: 'Aman', ru: 'Нет', de: 'Keine', zh: '无', ja: 'なし', es: 'Despejado', ko: '없음' },
  'lvl.none': { en: 'None', fr: 'Aucune', id: 'Tidak ada', ru: 'Нет', de: 'Keine', zh: '无', ja: 'なし', es: 'Ninguna', ko: '없음' },
  'lvl.alert': { en: 'Alert', fr: 'Alerte', id: 'Waspada', ru: 'Тревога', de: 'Warnung', zh: '警报', ja: '警報', es: 'Alerta', ko: '경보' },
  // v0.62.954 — operator, 29-10 '26: the UV pill after sunset reads "—" rather than "Low" beside "No UV after sunset".
  'lvl.dash': { en: '—', fr: '—', id: '—', ru: '—', de: '—', zh: '—', ja: '—', es: '—', ko: '—' },
  'lvl.unavailable': { en: 'Unavailable', fr: 'Indisponible', id: 'Tidak tersedia', ru: 'Нет данных', de: 'Nicht verfügbar', zh: '暂无数据', ja: '取得できません', es: 'No disponible', ko: '정보 없음' },
  // Amendment 1 (operator, 29-10 '26: "APPROVE for items 1 to 5"): each sheet row leads with the finding.
  't.floodNone': { en: 'No flood near you', fr: 'Aucune inondation près de vous', id: 'Tidak ada banjir di dekat Anda', ru: 'Подтоплений рядом нет', de: 'Keine Überflutung in Ihrer Nähe', zh: '附近无水浸', ja: '付近に冠水なし', es: 'Sin inundaciones cerca', ko: '주변에 침수 없음' },
  't.flood': { en: 'Flood: {text}', fr: 'Inondation : {text}', id: 'Banjir: {text}', ru: 'Подтопление: {text}', de: 'Überflutung: {text}', zh: '水浸：{text}', ja: '冠水：{text}', es: 'Inundación: {text}', ko: '침수: {text}' },
  't.lightningNone': { en: 'No lightning within 5 km', fr: 'Pas de foudre à moins de 5 km', id: 'Tidak ada petir dalam 5 km', ru: 'Молний в радиусе 5 км нет', de: 'Keine Blitze im Umkreis von 5 km', zh: '5 公里内无闪电', ja: '5 km以内に雷なし', es: 'Sin rayos a menos de 5 km', ko: '5km 이내 낙뢰 없음' },
  't.lightning': { en: 'Lightning {km} km away ({n} strikes)', fr: 'Foudre à {km} km ({n} impacts)', id: 'Petir {km} km dari sini ({n} sambaran)', ru: 'Молния в {km} км ({n} разрядов)', de: 'Blitz {km} km entfernt ({n} Einschläge)', zh: '{km} 公里外有闪电（{n} 次）', ja: '{km} km先で落雷（{n}回）', es: 'Rayos a {km} km ({n} descargas)', ko: '{km}km 거리에 낙뢰 ({n}회)' },
  't.heat.low': { en: 'Low heat stress', fr: 'Stress thermique faible', id: 'Stres panas rendah', ru: 'Тепловой стресс низкий', de: 'Geringer Hitzestress', zh: '热压力低', ja: '暑さストレス 低', es: 'Estrés térmico bajo', ko: '열 스트레스 낮음' },
  't.heat.moderate': { en: 'Moderate heat stress', fr: 'Stress thermique modéré', id: 'Stres panas sedang', ru: 'Тепловой стресс умеренный', de: 'Mäßiger Hitzestress', zh: '热压力中等', ja: '暑さストレス 中', es: 'Estrés térmico moderado', ko: '열 스트레스 보통' },
  't.heat.high': { en: 'High heat stress', fr: 'Stress thermique élevé', id: 'Stres panas tinggi', ru: 'Тепловой стресс высокий', de: 'Hoher Hitzestress', zh: '热压力高', ja: '暑さストレス 高', es: 'Estrés térmico alto', ko: '열 스트레스 높음' },
  't.air.good': { en: 'Good air quality', fr: "Bonne qualité de l'air", id: 'Kualitas udara baik', ru: 'Хороший воздух', de: 'Gute Luftqualität', zh: '空气质量良好', ja: '大気の質は良好', es: 'Calidad del aire buena', ko: '대기질 좋음' },
  't.air.moderate': { en: 'Moderate air quality', fr: "Qualité de l'air moyenne", id: 'Kualitas udara sedang', ru: 'Умеренное качество воздуха', de: 'Mäßige Luftqualität', zh: '空气质量中等', ja: '大気の質は中程度', es: 'Calidad del aire moderada', ko: '대기질 보통' },
  't.air.unhealthy': { en: 'Unhealthy air', fr: 'Air malsain', id: 'Udara tidak sehat', ru: 'Вредный воздух', de: 'Ungesunde Luft', zh: '空气不健康', ja: '健康に悪い大気', es: 'Aire dañino', ko: '대기질 나쁨' },
  't.air.veryUnhealthy': { en: 'Very unhealthy air', fr: 'Air très malsain', id: 'Udara sangat tidak sehat', ru: 'Очень вредный воздух', de: 'Sehr ungesunde Luft', zh: '空气非常不健康', ja: '非常に健康に悪い大気', es: 'Aire muy dañino', ko: '대기질 매우 나쁨' },
  't.air.hazardous': { en: 'Hazardous air', fr: 'Air dangereux', id: 'Udara berbahaya', ru: 'Опасный воздух', de: 'Gefährliche Luft', zh: '空气危险', ja: '危険な大気', es: 'Aire peligroso', ko: '대기질 위험' },
  't.uvNight': { en: 'No UV after sunset', fr: "Pas d'UV après le coucher du soleil", id: 'Tidak ada UV setelah matahari terbenam', ru: 'После заката УФ нет', de: 'Kein UV nach Sonnenuntergang', zh: '日落后无紫外线', ja: '日没後は紫外線なし', es: 'Sin UV tras la puesta de sol', ko: '일몰 후 자외선 없음' },
  't.uvIndoors': { en: 'Indoors', fr: "À l'intérieur", id: 'Di dalam ruangan', ru: 'В помещении', de: 'Drinnen', zh: '室内', ja: '屋内', es: 'En interiores', ko: '실내' },
  't.uv': { en: 'UV {i} · {level}', fr: 'UV {i} · {level}', id: 'UV {i} · {level}', ru: 'УФ {i} · {level}', de: 'UV {i} · {level}', zh: '紫外线 {i} · {level}', ja: '紫外線 {i} · {level}', es: 'UV {i} · {level}', ko: '자외선 {i} · {level}' },
  't.parking': { en: '{name} · {m} m', fr: '{name} · {m} m', id: '{name} · {m} m', ru: '{name} · {m} м', de: '{name} · {m} m', zh: '{name} · {m} 米', ja: '{name} · {m} m', es: '{name} · {m} m', ko: '{name} · {m}m' },
  'l.parking': { en: 'Parking · {lots} lots', fr: 'Stationnement · {lots} places', id: 'Parkir · {lots} slot', ru: 'Парковка · {lots} мест', de: 'Parken · {lots} Plätze', zh: '停车 · {lots} 个车位', ja: '駐車場 · 空き{lots}台', es: 'Estacionamiento · {lots} plazas', ko: '주차 · {lots}면' },
  'strip.lightning': { en: 'Lightning {km} km away · pick somewhere sheltered', fr: 'Foudre à {km} km · choisissez un endroit abrité', id: 'Petir {km} km dari sini · pilih tempat yang terlindung', ru: 'Молния в {km} км · выберите место под крышей', de: 'Blitz {km} km entfernt · lieber einen überdachten Ort wählen', zh: '{km} 公里外有闪电 · 请选择有遮蔽的地方', ja: '{km} km先で落雷 · 屋根のある場所を', es: 'Rayos a {km} km · elige un lugar cubierto', ko: '{km}km 거리에 낙뢰 · 지붕 있는 곳을 고르세요' },
  'strip.flood': { en: 'Flood alert · {text}', fr: 'Alerte inondation · {text}', id: 'Peringatan banjir · {text}', ru: 'Подтопление · {text}', de: 'Überflutungswarnung · {text}', zh: '水浸警报 · {text}', ja: '冠水警報 · {text}', es: 'Alerta de inundación · {text}', ko: '침수 경보 · {text}' },
  'strip.haze': { en: 'Unhealthy air · PSI {psi}', fr: 'Air malsain · PSI {psi}', id: 'Udara tidak sehat · PSI {psi}', ru: 'Вредный воздух · PSI {psi}', de: 'Ungesunde Luft · PSI {psi}', zh: '空气不健康 · PSI {psi}', ja: '大気が健康に悪い · PSI {psi}', es: 'Aire dañino · PSI {psi}', ko: '대기질 나쁨 · PSI {psi}' },
  'strip.heat': { en: 'High heat stress · take it easy outdoors', fr: 'Stress thermique élevé · ménagez-vous dehors', id: 'Stres panas tinggi · jangan terlalu lama di luar', ru: 'Сильный тепловой стресс · берегите себя на улице', de: 'Hoher Hitzestress · draußen langsam machen', zh: '热压力高 · 户外请量力而行', ja: '暑さストレス高 · 屋外では無理をせずに', es: 'Estrés térmico alto · con calma al aire libre', ko: '열 스트레스 높음 · 야외에서 무리하지 마세요' },
  'strip.heatHawker': { en: 'High heat stress · open-air centres are hot now', fr: 'Stress thermique élevé · les centres en plein air sont chauds', id: 'Stres panas tinggi · pusat terbuka sedang panas', ru: 'Сильный тепловой стресс · в открытых центрах сейчас жарко', de: 'Hoher Hitzestress · offene Hawker-Center sind gerade heiß', zh: '热压力高 · 露天小贩中心此刻很热', ja: '暑さストレス高 · 屋外のホーカーは今暑い', es: 'Estrés térmico alto · los centros al aire libre están calurosos', ko: '열 스트레스 높음 · 야외 호커센터가 지금 덥습니다' },
  'strip.uv': { en: 'UV {i} · shade helps', fr: 'UV {i} · cherchez l’ombre', id: 'UV {i} · cari tempat teduh', ru: 'УФ {i} · держитесь в тени', de: 'UV {i} · Schatten suchen', zh: '紫外线 {i} · 请找阴凉处', ja: '紫外線 {i} · 日陰へ', es: 'UV {i} · busca sombra', ko: '자외선 {i} · 그늘을 찾으세요' },
  'ui.close': { en: 'Close', fr: 'Fermer', id: 'Tutup', ru: 'Закрыть', de: 'Schließen', zh: '关闭', ja: '閉じる', es: 'Cerrar', ko: '닫기' },
  'ui.dismiss': { en: 'Dismiss', fr: 'Masquer', id: 'Sembunyikan', ru: 'Скрыть', de: 'Ausblenden', zh: '隐藏', ja: '非表示', es: 'Ocultar', ko: '숨기기' },
  // v0.62.960 — spec doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md. C3: the licence notice for the
  // NEA and PUB rows. C2: the badge's weather card abroad, with Open-Meteo's required credit. C4/C5: the 4-day block.
  'licence.sg': { en: 'Contains information from NEA and PUB via data.gov.sg, under the Singapore Open Data Licence', fr: 'Contient des informations de NEA et PUB via data.gov.sg, sous la Singapore Open Data Licence', id: 'Berisi informasi dari NEA dan PUB melalui data.gov.sg, di bawah Singapore Open Data Licence', ru: 'Содержит информацию NEA и PUB с data.gov.sg по лицензии Singapore Open Data Licence', de: 'Enthält Informationen von NEA und PUB über data.gov.sg, unter der Singapore Open Data Licence', zh: '包含来自 NEA 和 PUB 的信息（经 data.gov.sg），依据新加坡开放数据许可（Singapore Open Data Licence）', ja: 'NEA・PUB の情報を含みます（data.gov.sg 経由、Singapore Open Data Licence に基づく）', es: 'Contiene información de NEA y PUB a través de data.gov.sg, bajo la Singapore Open Data Licence', ko: 'NEA 및 PUB의 정보를 포함합니다 (data.gov.sg 제공, Singapore Open Data Licence 적용)' },
  'abroad.note': { en: 'Heat, lightning, flood, air and UV readings are available in Singapore only', fr: 'Les relevés de chaleur, foudre, inondations, air et UV ne sont disponibles qu’à Singapour', id: 'Data panas, petir, banjir, udara, dan UV hanya tersedia di Singapura', ru: 'Данные о жаре, молниях, подтоплениях, воздухе и УФ доступны только в Сингапуре', de: 'Werte zu Hitze, Blitzen, Überflutung, Luft und UV gibt es nur in Singapur', zh: '高温、闪电、水浸、空气和紫外线读数仅限新加坡', ja: '暑さ・雷・冠水・大気・紫外線の情報はシンガポールのみです', es: 'Los datos de calor, rayos, inundaciones, aire y UV solo están disponibles en Singapur', ko: '열, 낙뢰, 침수, 대기, 자외선 정보는 싱가포르에서만 제공됩니다' },
  'abroad.humidity': { en: 'Humidity {pct}%', fr: 'Humidité {pct} %', id: 'Kelembapan {pct}%', ru: 'Влажность {pct}%', de: 'Luftfeuchte {pct} %', zh: '湿度 {pct}%', ja: '湿度 {pct}%', es: 'Humedad {pct} %', ko: '습도 {pct}%' },
  // v0.62.962 — spec doc/Feature/2026-11-01-local-weather-every-city.spec.md. C2: the credit now names MET Norway
  // (Open-Meteo's free tier is non-commercial). C3: the abroad sheet's rows, the clear-sky UV label (I4) and the
  // Singapore-only line. C7: JMA's block. `abroad.note` above is v0.62.960's card line, kept because
  // weather-outlook.test.js pins it in nine locales; the sheet uses `abroad.sgOnly`, the spec's own wording.
  'abroad.credit': { en: 'Weather data from MET Norway', fr: 'Données météo de MET Norway', id: 'Data cuaca dari MET Norway', ru: 'Данные о погоде: MET Norway', de: 'Wetterdaten von MET Norway', zh: '天气数据来自 MET Norway', ja: '気象データ：MET Norway', es: 'Datos meteorológicos de MET Norway', ko: '날씨 데이터: MET Norway' },
  'abroad.uv': { en: 'UV {i} if the sky is clear', fr: 'UV {i} par ciel dégagé', id: 'UV {i} jika langit cerah', ru: 'УФ {i} при ясном небе', de: 'UV {i} bei klarem Himmel', zh: '晴空时紫外线 {i}', ja: '快晴なら紫外線 {i}', es: 'UV {i} con cielo despejado', ko: '맑은 하늘이면 자외선 {i}' },
  'abroad.sgOnly': { en: 'Heat stress, lightning, flood and air-quality readings are Singapore-only.', fr: 'Les relevés de stress thermique, foudre, inondations et qualité de l’air ne concernent que Singapour.', id: 'Data stres panas, petir, banjir, dan kualitas udara hanya untuk Singapura.', ru: 'Данные о тепловом стрессе, молниях, подтоплениях и качестве воздуха есть только для Сингапура.', de: 'Werte zu Hitzestress, Blitzen, Überflutung und Luftqualität gibt es nur für Singapur.', zh: '热压力、闪电、水浸和空气质量读数仅限新加坡。', ja: '暑さストレス・雷・冠水・大気の質の情報はシンガポールのみです。', es: 'Los datos de estrés térmico, rayos, inundaciones y calidad del aire son solo de Singapur.', ko: '열 스트레스, 낙뢰, 침수, 대기질 정보는 싱가포르에서만 제공됩니다.' },
  'abroad.wind': { en: 'Wind {kmh} km/h from {dir}', fr: 'Vent {kmh} km/h du {dir}', id: 'Angin {kmh} km/j dari {dir}', ru: 'Ветер {kmh} км/ч, {dir}', de: 'Wind {kmh} km/h aus {dir}', zh: '{dir}风 {kmh} 公里/小时', ja: '{dir}の風 {kmh} km/h', es: 'Viento {kmh} km/h del {dir}', ko: '{dir}풍 {kmh}km/h' },
  'abroad.rain': { en: 'Rain next hour {mm} mm', fr: 'Pluie dans l’heure {mm} mm', id: 'Hujan 1 jam ke depan {mm} mm', ru: 'Осадки за час {mm} мм', de: 'Regen nächste Stunde {mm} mm', zh: '未来一小时降雨 {mm} 毫米', ja: '今後1時間の雨量 {mm} mm', es: 'Lluvia próxima hora {mm} mm', ko: '향후 1시간 강수 {mm}mm' },
  'abroad.at': { en: 'Read at {t} local time', fr: 'Relevé à {t} heure locale', id: 'Dibaca pukul {t} waktu setempat', ru: 'Данные на {t} по местному времени', de: 'Stand {t} Ortszeit', zh: '当地时间 {t} 读数', ja: '現地時間 {t} 時点', es: 'Lectura a las {t} hora local', ko: '현지 시각 {t} 기준' },
  'jma.title': { en: 'Warnings · JMA', fr: 'Alertes · JMA', id: 'Peringatan · JMA', ru: 'Предупреждения · JMA', de: 'Warnungen · JMA', zh: '警报 · JMA', ja: '警報・注意報 · 気象庁', es: 'Avisos · JMA', ko: '특보 · JMA' },
  'jma.none': { en: 'No warnings', fr: 'Aucune alerte', id: 'Tidak ada peringatan', ru: 'Предупреждений нет', de: 'Keine Warnungen', zh: '无警报', ja: '発表なし', es: 'Sin avisos', ko: '특보 없음' },
  'jma.noBulletin': { en: 'No JMA bulletin received yet', fr: 'Aucun bulletin de la JMA reçu pour l’instant', id: 'Belum ada buletin JMA yang diterima', ru: 'Бюллетень JMA пока не получен', de: 'Noch kein JMA-Bulletin empfangen', zh: '尚未收到 JMA 公报', ja: '気象庁の発表をまだ受信していません', es: 'Aún no se ha recibido ningún boletín de la JMA', ko: '아직 JMA 발표를 받지 못했습니다' },
  'jma.issued': { en: 'JMA · {t} Japan time', fr: 'JMA · {t} heure du Japon', id: 'JMA · {t} waktu Jepang', ru: 'JMA · {t} по японскому времени', de: 'JMA · {t} japanische Zeit', zh: 'JMA · 日本时间 {t}', ja: '気象庁 · {t} 日本時間', es: 'JMA · {t} hora de Japón', ko: 'JMA · 일본 시각 {t}' },
  'jma.credit': { en: 'Source: Japan Meteorological Agency (JMA), processed by Soleat', fr: 'Source : Agence météorologique du Japon (JMA), traité par Soleat', id: 'Sumber: Badan Meteorologi Jepang (JMA), diolah oleh Soleat', ru: 'Источник: Японское метеорологическое агентство (JMA), обработано Soleat', de: 'Quelle: Japanische Wetterbehörde (JMA), bearbeitet von Soleat', zh: '来源：日本气象厅（JMA），经 Soleat 处理', ja: '出典：気象庁（JMA）、Soleatが加工', es: 'Fuente: Agencia Meteorológica de Japón (JMA), procesado por Soleat', ko: '출처: 일본 기상청(JMA), Soleat 가공' },
  'lvl.jma.emergency': { en: 'Emergency', fr: 'Urgence', id: 'Darurat', ru: 'Экстренно', de: 'Notfall', zh: '特别警报', ja: '特別警報', es: 'Emergencia', ko: '특별경보' },
  'lvl.jma.danger': { en: 'Danger', fr: 'Danger', id: 'Bahaya', ru: 'Опасность', de: 'Gefahr', zh: '危险警报', ja: '危険警報', es: 'Peligro', ko: '위험경보' },
  'lvl.jma.warning': { en: 'Warning', fr: 'Alerte', id: 'Peringatan', ru: 'Предупреждение', de: 'Warnung', zh: '警报', ja: '警報', es: 'Aviso', ko: '경보' },
  'lvl.jma.advisory': { en: 'Advisory', fr: 'Vigilance', id: 'Waspada', ru: 'Внимание', de: 'Hinweis', zh: '注意报', ja: '注意報', es: 'Advertencia', ko: '주의보' },
  'outlook.title': { en: 'Next 4 days', fr: 'Les 4 prochains jours', id: '4 hari ke depan', ru: 'Следующие 4 дня', de: 'Nächste 4 Tage', zh: '未来 4 天', ja: '今後4日間', es: 'Próximos 4 días', ko: '향후 4일' },
  'outlook.issued': { en: 'NEA · issued {t}', fr: 'NEA · émis à {t}', id: 'NEA · terbit {t}', ru: 'NEA · выпущен в {t}', de: 'NEA · ausgegeben {t}', zh: 'NEA · {t} 发布', ja: 'NEA · {t} 発表', es: 'NEA · emitido a las {t}', ko: 'NEA · {t} 발표' },
  'wx.thunder': { en: 'Thundery showers', fr: 'Averses orageuses', id: 'Hujan badai petir', ru: 'Грозовые ливни', de: 'Gewitterschauer', zh: '雷阵雨', ja: '雷雨', es: 'Chubascos tormentosos', ko: '뇌우' },
  'wx.lightning': { en: 'Lightning', fr: 'Éclairs', id: 'Petir', ru: 'Молнии', de: 'Blitze', zh: '闪电', ja: '雷', es: 'Rayos', ko: '번개' },
  'wx.showers': { en: 'Showers', fr: 'Averses', id: 'Hujan lokal', ru: 'Ливни', de: 'Schauer', zh: '阵雨', ja: 'にわか雨', es: 'Chubascos', ko: '소나기' },
  'wx.rain': { en: 'Rain', fr: 'Pluie', id: 'Hujan', ru: 'Дождь', de: 'Regen', zh: '雨', ja: '雨', es: 'Lluvia', ko: '비' },
  'wx.haze': { en: 'Hazy', fr: 'Brumeux', id: 'Berkabut', ru: 'Дымка', de: 'Dunstig', zh: '有霾', ja: 'もや', es: 'Calima', ko: '연무' },
  'wx.windy': { en: 'Windy', fr: 'Venteux', id: 'Berangin', ru: 'Ветрено', de: 'Windig', zh: '有风', ja: '風が強い', es: 'Ventoso', ko: '바람' },
  'wx.overcast': { en: 'Overcast', fr: 'Couvert', id: 'Mendung', ru: 'Пасмурно', de: 'Bedeckt', zh: '阴天', ja: 'どんより曇り', es: 'Cubierto', ko: '흐림' },
  'wx.partlyCloudy': { en: 'Partly cloudy', fr: 'Partiellement nuageux', id: 'Berawan sebagian', ru: 'Переменная облачность', de: 'Teilweise bewölkt', zh: '局部多云', ja: '晴れ時々曇り', es: 'Parcialmente nublado', ko: '구름 조금' },
  'wx.cloudy': { en: 'Cloudy', fr: 'Nuageux', id: 'Berawan', ru: 'Облачно', de: 'Bewölkt', zh: '多云', ja: '曇り', es: 'Nublado', ko: '구름 많음' },
  'wx.fair': { en: 'Fair', fr: 'Beau temps', id: 'Cerah', ru: 'Ясно', de: 'Heiter', zh: '晴', ja: '晴れ', es: 'Despejado', ko: '맑음' },
};

// Source agency per row. Parking deliberately has none.
export const ROW_SOURCE = { heat: 'NEA', lightning: 'NEA', flood: 'PUB', air: 'NEA', uv: 'NEA' };

export function ot(key, lang, vars = {}) {
  const row = OUTSIDE_STRINGS[key];
  if (!row) return key;
  const s = row[lang] || row.en;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

// Spec C3: the strip shows the single most urgent warning. The server already orders warnings as lightning, flood,
// haze, heat, uv; in the Hawker app heat moves ahead of haze because every centre listed there is open-air.
export const STRIP_ORDER = {
  default: ['lightning', 'flood', 'haze', 'heat', 'uv'],
  hawker: ['lightning', 'flood', 'heat', 'haze', 'uv'],
};

// Sheet row order per app: Hawker leads with heat and UV; only Cuisine shows parking (spec C6).
export function sheetRows(app) {
  if (app === 'hawker') return ['heat', 'uv', 'air', 'lightning', 'flood'];
  if (app === 'cuisine') return ['heat', 'lightning', 'flood', 'air', 'uv', 'parking'];
  return ['heat', 'lightning', 'flood', 'air', 'uv'];
}

export function topWarning(data, app) {
  if (!data || !data.inSg || !Array.isArray(data.warnings) || !data.warnings.length) return null;
  const order = STRIP_ORDER[app] || STRIP_ORDER.default;
  return order.find((k) => data.warnings.includes(k)) || null;
}

// The strip's text for a warning kind.
export function stripText(kind, data, app, lang) {
  const r = data.rows || {};
  if (kind === 'lightning') return ot('strip.lightning', lang, { km: r.lightning.nearestKm });
  if (kind === 'flood') {
    const a = (r.flood.alerts || [])[0] || {};
    const text = a.km == null ? a.text : `${a.text} (${a.km} km)`;
    return ot('strip.flood', lang, { text: text || 'PUB' });
  }
  if (kind === 'haze') return ot('strip.haze', lang, { psi: r.air.psi });
  if (kind === 'heat') return ot(app === 'hawker' ? 'strip.heatHawker' : 'strip.heat', lang);
  if (kind === 'uv') return ot('strip.uv', lang, { i: r.uv.index });
  return '';
}

// Spec C7: a dismissed strip stays hidden until the warning's kind or level changes.
export function dismissKey(kind, data) {
  const r = (data && data.rows) || {};
  const sig = {
    lightning: () => 'warn',
    flood: () => (r.flood.alerts || []).map((a) => a.text).join('|'),
    haze: () => r.air.level,
    heat: () => r.heat.level,
    uv: () => r.uv.level,
  }[kind];
  return `${kind}:${sig ? sig() : ''}`;
}

// Spec C7, as a pure step: `dismissed` is the one key the user hid, `current` is the key of the warning showing now
// (null when none). The dismissal holds only while that same warning is current; any transition (cleared, replaced,
// level changed) forgets it, so a later return of the same warning shows again (Codex P2 on #1895).
export function stripDecision(dismissed, current) {
  if (!current) return { show: false, dismissed: null };
  if (dismissed && dismissed === current) return { show: false, dismissed };
  return { show: true, dismissed: null };
}

// The row's level label key.
export function levelKey(row, rowName) {
  if (!row || row.status !== 'ok') return 'lvl.unavailable';
  if (rowName === 'lightning') return row.level === 'warn' ? 'lvl.alert' : 'lvl.clear';
  if (rowName === 'flood') return row.level === 'warn' ? 'lvl.alert' : 'lvl.none';
  if (rowName === 'uv' && row.night) return 'lvl.dash';
  return `lvl.${row.level}`;
}

// Traffic-light tone for a row's pill.
export function rowTone(row, rowName) {
  if (!row || row.status !== 'ok') return 'muted';
  if (rowName === 'lightning' || rowName === 'flood') return row.level === 'warn' ? 'red' : 'green';
  if (rowName === 'heat') return row.level === 'high' ? 'red' : row.level === 'moderate' ? 'amber' : 'green';
  if (rowName === 'air') return row.psi > 100 ? 'red' : row.psi > 50 ? 'amber' : 'green';
  if (rowName === 'uv' && row.night) return 'muted';
  if (rowName === 'uv') return row.warn ? 'red' : row.index >= 6 ? 'amber' : 'green';
  return 'muted';
}

// The reading's local time, "HH:MM". Feeds stamp +08:00, so the wall-clock digits are already SGT.
export function hhmm(iso) {
  const m = /T(\d{2}):(\d{2})/.exec(String(iso || ''));
  return m ? `${m[1]}:${m[2]}` : '';
}

export const DOT_COLOURS = { red: '#d93a3a', amber: '#d39400', green: '#2e9e5b' };

// Amendment 1: one sheet row as { title, line2 }. The title is the finding; line 2 names the row, its detail, and the
// source with the reading time. For parking, `row` is one carpark { name, lots, m } and nothing names an agency.
export function rowText(name, row, lang) {
  if (name === 'parking') {
    return { title: ot('t.parking', lang, { name: row.name, m: row.m }), line2: ot('l.parking', lang, { lots: row.lots }) };
  }
  if (!row || row.status !== 'ok') return { title: ot(`row.${name}`, lang), line2: ot('lvl.unavailable', lang) };
  const src = `${ROW_SOURCE[name]} ${hhmm(row.at)}`;
  const line = (...parts) => [ot(`row.${name}`, lang), ...parts, src].filter(Boolean).join(' · ');
  if (name === 'heat') {
    return { title: ot(`t.heat.${row.level}`, lang), line2: line(`WBGT ${row.wbgt} °C`, row.station) };
  }
  if (name === 'lightning') {
    return { title: row.count ? ot('t.lightning', lang, { km: row.nearestKm, n: row.count }) : ot('t.lightningNone', lang), line2: line() };
  }
  if (name === 'flood') {
    if (!row.alerts.length) return { title: ot('t.floodNone', lang), line2: line() };
    const text = row.alerts.map((a) => (a.km == null ? a.text : `${a.text} (${a.km} km)`)).join(' · ');
    return { title: ot('t.flood', lang, { text }), line2: line() };
  }
  if (name === 'air') {
    return { title: ot(`t.air.${row.level}`, lang), line2: line(`PSI ${row.psi}`, row.pm25 != null ? `PM2.5 ${row.pm25}` : '') };
  }
  if (name === 'uv') {
    const title = row.night ? ot('t.uvNight', lang)
      : row.indoors ? ot('t.uvIndoors', lang)
        : ot('t.uv', lang, { i: row.index, level: ot(`lvl.${row.level}`, lang) });
    return { title, line2: line() };
  }
  return { title: ot(`row.${name}`, lang), line2: src };
}

// Amendment 1, item 5: the chip's temperature in the chosen unit. Uses the server's °F when it sent one.
export function tempText(wx, unit) {
  if (!wx || !Number.isFinite(wx.tempC)) return null;
  if (unit === 'F') {
    const f = Number.isFinite(wx.tempF) ? wx.tempF : Math.round((wx.tempC * 9 / 5 + 32) * 10) / 10;
    return { value: String(f), unit: '°F' };
  }
  return { value: String(wx.tempC), unit: '°C' };
}

export const TEMP_UNIT_KEY = 'gia.tempUnit';

// v0.62.960 — C5. NEA publishes no list of its forecast codes, so a day is labelled from its TEXT, with the same
// ordered patterns weather-emoji.js forecastEmoji() uses: the most specific first, so "Thundery Showers" is thunder and
// "Partly Cloudy (Day)" is not plain cloudy. Text matching none is shown exactly as NEA wrote it, never guessed.
export const OUTLOOK_CLASSES = [
  ['thunder', /thunder/],
  ['lightning', /lightning/],
  ['showers', /shower/],
  ['rain', /rain|drizzle/],
  ['haze', /haz[ey]|mist|\bfog/],
  ['windy', /wind|gust/],
  ['overcast', /overcast/],
  ['partlyCloudy', /partly\s*cloud/],
  ['cloudy', /cloud/],
  ['fair', /fair|sunny|clear|warm|hot/],
];

export function outlookClass(text) {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return null;
  const hit = OUTLOOK_CLASSES.find(([, re]) => re.test(t));
  return hit ? hit[0] : null;
}

export function outlookLabel(text, lang) {
  const c = outlookClass(text);
  return c ? ot(`wx.${c}`, lang) : String(text || '');
}

// C4: the weekday in the reader's own locale, from the browser's Intl names. `date` is NEA's YYYY-MM-DD.
export function outlookDay(date, lang) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return '';
  const d = new Date(`${date}T12:00:00+08:00`);
  try {
    return new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'Asia/Singapore' }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Asia/Singapore' }).format(d);
  }
}

// C4: the day's low-high range, following the badge's °C / °F switch.
// v0.62.962 — below zero a hyphen reads as a minus sign ("-9-1°C" for Harbin, found by calling MET for every city), so
// a negative end switches the separator to " / ". Singapore's ranges never go below zero and keep their form.
export function outlookTemp(lowC, highC, unit) {
  const f = (c) => Math.round(c * 9 / 5 + 32);
  const [lo, hi, u] = unit === 'F' ? [f(lowC), f(highC), '°F'] : [lowC, highC, '°C'];
  return lo < 0 || hi < 0 ? `${lo} / ${hi}${u}` : `${lo}-${hi}${u}`;
}

// ── v0.62.962 — the abroad sheet and JMA (spec doc/Feature/2026-11-01-local-weather-every-city.spec.md) ──────────

// I5 — the badge's dot. Singapore keeps NEA's; abroad there is none, because MET gives forecasts, not warnings;
// except Japan, where it is JMA's worst current level. Nothing else abroad can raise one.
export function badgeDot(outside, abroad) {
  if (outside && outside.inSg) return outside.dot || null;
  const j = abroad && abroad.jma;
  return j && j.status === 'ok' ? (j.dot || null) : null;
}

// C7 — the strip's warning abroad: JMA's worst current one, or nothing.
export function topJma(abroad) {
  const j = abroad && abroad.jma;
  if (!j || j.status !== 'ok' || !Array.isArray(j.warnings) || !j.warnings.length) return null;
  return j.warnings[0];
}

// I12 — the JMA block's one line when there is no warning to list. "No warnings" only with a current bulletin.
export function jmaLineKey(j) {
  if (!j || j.status !== 'ok') return 'jma.noBulletin';
  return Array.isArray(j.warnings) && j.warnings.length ? null : 'jma.none';
}

// C7 / I11 — JMA's warning names in the reader's language, keyed on JMA's Japanese name. A name is the phenomenon
// plus a level suffix; both parts are translated here, but only names in JMA_NAMES are composed, so a name we have
// not listed is shown exactly as JMA wrote it, never guessed. Japanese readers always get JMA's own name.
const JMA_PHENOMENA = {
  大雨: { en: 'heavy rain', fr: 'fortes pluies', id: 'hujan lebat', ru: 'сильный дождь', de: 'Starkregen', zh: '大雨', es: 'lluvias intensas', ko: '호우' },
  洪水: { en: 'flood', fr: 'crue', id: 'banjir', ru: 'наводнение', de: 'Hochwasser', zh: '洪水', es: 'inundación', ko: '홍수' },
  大雪: { en: 'heavy snow', fr: 'fortes chutes de neige', id: 'salju lebat', ru: 'сильный снегопад', de: 'starker Schneefall', zh: '大雪', es: 'nevadas intensas', ko: '대설' },
  暴風: { en: 'storm', fr: 'tempête', id: 'badai', ru: 'шторм', de: 'Sturm', zh: '暴风', es: 'temporal', ko: '폭풍' },
  暴風雪: { en: 'snowstorm', fr: 'tempête de neige', id: 'badai salju', ru: 'снежная буря', de: 'Schneesturm', zh: '暴风雪', es: 'tormenta de nieve', ko: '눈보라' },
  波浪: { en: 'high waves', fr: 'fortes vagues', id: 'gelombang tinggi', ru: 'высокие волны', de: 'hoher Seegang', zh: '波浪', es: 'oleaje alto', ko: '풍랑' },
  高潮: { en: 'storm surge', fr: 'onde de tempête', id: 'gelombang pasang badai', ru: 'штормовой нагон', de: 'Sturmflut', zh: '风暴潮', es: 'marea de tormenta', ko: '폭풍해일' },
  強風: { en: 'strong wind', fr: 'vents forts', id: 'angin kencang', ru: 'сильный ветер', de: 'starker Wind', zh: '强风', es: 'vientos fuertes', ko: '강풍' },
  風雪: { en: 'wind and snow', fr: 'vent et neige', id: 'angin dan salju', ru: 'ветер со снегом', de: 'Wind und Schnee', zh: '风雪', es: 'viento y nieve', ko: '풍설' },
  雷: { en: 'thunderstorm', fr: 'orages', id: 'badai petir', ru: 'грозы', de: 'Gewitter', zh: '雷电', es: 'tormentas eléctricas', ko: '뇌우' },
  融雪: { en: 'snowmelt', fr: 'fonte des neiges', id: 'salju mencair', ru: 'таяние снега', de: 'Schneeschmelze', zh: '融雪', es: 'deshielo', ko: '융설' },
  濃霧: { en: 'dense fog', fr: 'brouillard dense', id: 'kabut tebal', ru: 'густой туман', de: 'dichter Nebel', zh: '浓雾', es: 'niebla densa', ko: '짙은 안개' },
  乾燥: { en: 'dry air', fr: 'air sec', id: 'udara kering', ru: 'сухой воздух', de: 'Trockenheit', zh: '干燥', es: 'aire seco', ko: '건조' },
  なだれ: { en: 'avalanche', fr: 'avalanches', id: 'longsoran salju', ru: 'лавины', de: 'Lawinen', zh: '雪崩', es: 'aludes', ko: '눈사태' },
  低温: { en: 'low temperature', fr: 'basses températures', id: 'suhu rendah', ru: 'низкие температуры', de: 'Kälte', zh: '低温', es: 'bajas temperaturas', ko: '저온' },
  霜: { en: 'frost', fr: 'gel', id: 'embun beku', ru: 'заморозки', de: 'Frost', zh: '霜冻', es: 'heladas', ko: '서리' },
  着氷: { en: 'icing', fr: 'givrage', id: 'lapisan es', ru: 'обледенение', de: 'Vereisung', zh: '积冰', es: 'engelamiento', ko: '착빙' },
  着雪: { en: 'snow accretion', fr: 'dépôt de neige', id: 'penumpukan salju', ru: 'налипание снега', de: 'Schneeanhang', zh: '积雪附着', es: 'acumulación de nieve', ko: '착설' },
  土砂災害: { en: 'landslide', fr: 'glissements de terrain', id: 'tanah longsor', ru: 'оползни', de: 'Erdrutsche', zh: '泥石流灾害', es: 'deslizamientos', ko: '산사태' },
  氾濫: { en: 'river flooding', fr: 'débordement de rivière', id: 'luapan sungai', ru: 'разлив рек', de: 'Flussüberflutung', zh: '河流泛滥', es: 'desbordamiento de ríos', ko: '하천 범람' },
};
const JMA_LEVEL_TEMPLATES = {
  特別警報: { en: '{P} emergency warning', fr: 'Alerte extrême {p}', id: 'Peringatan darurat {p}', ru: 'Экстренное предупреждение: {p}', de: 'Extremwarnung: {p}', zh: '{p}特别警报', es: 'Aviso de emergencia: {p}', ko: '{p} 특별경보' },
  危険警報: { en: '{P} danger warning', fr: 'Alerte danger {p}', id: 'Peringatan bahaya {p}', ru: 'Опасность: {p}', de: 'Gefahrenwarnung: {p}', zh: '{p}危险警报', es: 'Aviso de peligro: {p}', ko: '{p} 위험경보' },
  警報: { en: '{P} warning', fr: 'Alerte {p}', id: 'Peringatan {p}', ru: 'Предупреждение: {p}', de: 'Warnung: {p}', zh: '{p}警报', es: 'Aviso: {p}', ko: '{p} 경보' },
  注意報: { en: '{P} advisory', fr: 'Vigilance {p}', id: 'Waspada {p}', ru: 'Внимание: {p}', de: 'Hinweis: {p}', zh: '{p}注意报', es: 'Advertencia: {p}', ko: '{p} 주의보' },
};
// The current-system names (6 emergency, 7 warning, 16 advisory) and the four danger warnings of JMA's revised
// system, 33 in all.
export const JMA_NAMES = [
  ...['大雨', '大雪', '暴風', '暴風雪', '波浪', '高潮'].map((p) => `${p}特別警報`),
  ...['大雨', '洪水', '大雪', '暴風', '暴風雪', '波浪', '高潮'].map((p) => `${p}警報`),
  ...['大雨', '洪水', '大雪', '強風', '風雪', '波浪', '高潮', '雷', '融雪', '濃霧', '乾燥', 'なだれ', '低温', '霜', '着氷', '着雪'].map((p) => `${p}注意報`),
  ...['大雨', '土砂災害', '氾濫', '高潮'].map((p) => `${p}危険警報`),
];
const JMA_NAME_SET = new Set(JMA_NAMES);

export function jmaName(name, lang) {
  const n = String(name || '');
  if (lang === 'ja' || !JMA_NAME_SET.has(n)) return n;
  const suffix = ['特別警報', '危険警報', '注意報', '警報'].find((s) => n.endsWith(s));
  const p = JMA_PHENOMENA[n.slice(0, n.length - suffix.length)];
  const tpl = JMA_LEVEL_TEMPLATES[suffix];
  const word = (p && (p[lang] || p.en)) || '';
  const t = tpl[lang] || tpl.en;
  return t.replace('{P}', word.charAt(0).toUpperCase() + word.slice(1)).replace('{p}', word);
}

// Wind: km/h and the compass point it blows FROM, in the reader's language.
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const DIR_NAMES = {
  en: DIRS, fr: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], id: ['U', 'TL', 'T', 'TG', 'S', 'BD', 'B', 'BL'],
  ru: ['С', 'СВ', 'В', 'ЮВ', 'Ю', 'ЮЗ', 'З', 'СЗ'], de: ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'],
  zh: ['北', '东北', '东', '东南', '南', '西南', '西', '西北'], ja: ['北', '北東', '東', '南東', '南', '南西', '西', '北西'],
  es: ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'], ko: ['북', '북동', '동', '남동', '남', '남서', '서', '북서'],
};
export function windText(now, lang) {
  if (!now || !Number.isFinite(now.windKmh)) return '';
  const i = DIRS.indexOf(now.windFrom);
  const dir = i >= 0 ? (DIR_NAMES[lang] || DIRS)[i] : '';
  return ot('abroad.wind', lang, { kmh: now.windKmh, dir });
}

// I6 — "HH:MM" in the given zone (the city's own, or Asia/Tokyo for JMA), never the device's or Singapore's.
export function localTime(iso, tz) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('en-GB', { timeZone: tz || 'UTC', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
  } catch {
    return '';
  }
}

// C3 — the four-day row's weekday. The server already dated each day in the city's own zone (I6), so the weekday of
// that calendar date is read at UTC noon and no zone can move it (outlookDay above anchors NEA's dates in Singapore).
export function cityDay(date, lang) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return '';
  const d = new Date(`${date}T12:00:00Z`);
  try {
    return new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'UTC' }).format(d);
  }
}
