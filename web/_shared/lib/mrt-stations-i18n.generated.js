// mrt-stations-i18n.generated.js — GENERATED, do not hand-edit.
//
// Official Singapore Government renderings of MRT/LRT station names in the other three
// official languages, keyed to match `SG_STATIONS[].n` in mrt-stations.generated.js.
//
// SOURCE — Government Terms Translated (gov.sg), category "MRT/LRT Station":
//   site      https://www.translatedterms.gov.sg/
//   endpoint  POST https://www.translatedterms.gov.sg/admin/api/Search
//   params    Page, PageSize (server caps at 100), LanguageFrom=1 (English),
//             LanguageTo, Categories[]=012db1a7-6fd2-4b2a-9393-c3fb42ca8586, SearchTerm
//   language  1=English 2=Chinese 3=Malay 4=Tamil
//   fetched   2026-08-27
//   regenerate  node scripts/fetch-mrt-station-names.mjs
//
// WHY THIS EXISTS RATHER THAN A TRANSLATION CALL. Singapore's four official languages
// do not agree on station names by any rule a translator could apply. The Chinese names
// are historical or phonetic, not derived from the English: Bakau is 码高, Bangkit is
// 万吉, Yew Tee is 油池, Dhoby Ghaut is 多美歌. Machine translation gets these wrong with
// complete confidence. An official register is the only thing that gets them right.
//
// Malay and Tamil ARE rule-shaped by comparison — Malay is uniformly
// "Stesen MRT <name>", Tamil is a transliteration plus a category phrase
// (பெருவிரைவு ரயில் நிலையம் for MRT, இலகு ரயில் நிலையம் for LRT) — but they are stored
// verbatim from the source anyway. Deriving two of the three and fetching the third
// would put a rule and a register in the same table, and the next person could not tell
// which row was which.
//
// COVERAGE, measured rather than assumed: all 183 stations in SG_STATIONS have a row,
// and `__tests__/mrt-stations-i18n.test.js` asserts it. This file carries 193 —
// the extra 10 are stations announced but not yet in SG_STATIONS
// (Bedok South, Hume, Marina South, Mount Pleasant, Sungei Bedok, Xilin), kept so they
// resolve on the day they open.
//
// TWO SOURCE-SIDE THINGS LEFT AS FOUND, NOT CORRECTED:
//   · The category also returns two LINE names — "East-West Line (EWL)" and
//     "North-South Line (EWL)" — which are not stations. Excluded here BY NAME, so the
//     exclusion is visible, rather than by a pattern that could silently drop a real one.
//   · The second of those is mislabelled at source: the North-South Line is abbreviated
//     NSL, not EWL. That is the government register's error to fix, not this repo's, and
//     it is recorded here rather than quietly repaired — a corrected copy of an official
//     source stops being a copy of an official source.
//
// Fields: n = station name matching SG_STATIONS[].n; k = MRT | LRT;
//         zh/ms/ta = the official rendering, HTML entities already decoded.

export const SG_STATION_NAMES_I18N = [
  { n: "Admiralty", k: "MRT", zh: "海军部地铁站", ms: "Stesen MRT Admiralty", ta: "அட்மிரல்ட்டி பெருவிரைவு ரயில் நிலையம்" },
  { n: "Aljunied", k: "MRT", zh: "阿裕尼地铁站", ms: "Stesen MRT Aljunied", ta: "அல்ஜுனிட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Ang Mo Kio", k: "MRT", zh: "宏茂桥地铁站", ms: "Stesen MRT Ang Mo Kio", ta: "அங் மோ கியோ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bakau", k: "LRT", zh: "码高轻轨列车站", ms: "Stesen LRT Bakau", ta: "பக்காவ் இலகு ரயில் நிலையம்" },
  { n: "Bangkit", k: "LRT", zh: "万吉轻轨列车站", ms: "Stesen LRT Bangkit", ta: "பங்கிட் இலகு ரயில் நிலையம்" },
  { n: "Bartley", k: "MRT", zh: "巴特礼地铁站", ms: "Stesen MRT Bartley", ta: "பார்ட்லி பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bayfront", k: "MRT", zh: "海湾舫地铁站", ms: "Stesen MRT Bayfront", ta: "பேஃபிரண்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bayshore", k: "MRT", zh: "碧湾地铁站", ms: "Stesen MRT Bayshore", ta: "பேஷோர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Beauty World", k: "MRT", zh: "美世界地铁站", ms: "Stesen MRT Beauty World", ta: "பியூட்டி வோர்ல்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bedok", k: "MRT", zh: "勿洛地铁站", ms: "Stesen MRT Bedok", ta: "பிடோக் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bedok North", k: "MRT", zh: "勿洛北地铁站", ms: "Stesen MRT Bedok North", ta: "பிடோக் நார்த் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bedok Reservoir", k: "MRT", zh: "勿洛蓄水池地铁站", ms: "Stesen MRT Bedok Reservoir", ta: "பிடோக் ரெசவோர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bedok South", k: "MRT", zh: "勿洛南地铁站", ms: "Stesen MRT Bedok South", ta: "பிடோக் சவுத் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bencoolen", k: "MRT", zh: "明古连地铁站", ms: "Stesen MRT Bencoolen", ta: "பென்கூலன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bendemeer", k: "MRT", zh: "明地迷亚地铁站", ms: "Stesen MRT Bendemeer", ta: "பெண்டிமியர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bishan", k: "MRT", zh: "碧山地铁站", ms: "Stesen MRT Bishan", ta: "பீஷான் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Boon Keng", k: "MRT", zh: "文庆地铁站", ms: "Stesen MRT Boon Keng", ta: "பூன் கெங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Boon Lay", k: "MRT", zh: "文礼地铁站", ms: "Stesen MRT Boon Lay", ta: "பூன் லே பெருவிரைவு ரயில் நிலையம்" },
  { n: "Botanic Gardens", k: "MRT", zh: "植物园地铁站", ms: "Stesen MRT Kebun Bunga", ta: "பூமலை பெருவிரைவு ரயில் நிலையம்" },
  { n: "Braddell", k: "MRT", zh: "布莱德地铁站", ms: "Stesen MRT Braddell", ta: "பிரேடல் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bras Basah", k: "MRT", zh: "百胜地铁站", ms: "Stesen MRT Bras Basah", ta: "பிராஸ் பாசா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bright Hill", k: "MRT", zh: "光明山地铁站", ms: "Stesen MRT Bright Hill", ta: "பிரைட் ஹில் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Buangkok", k: "MRT", zh: "万国地铁站", ms: "Stesen MRT Buangkok", ta: "புவாங்கோக் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bugis", k: "MRT", zh: "武吉士地铁站", ms: "Stesen MRT Bugis", ta: "பூகிஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bukit Batok", k: "MRT", zh: "武吉巴督地铁站", ms: "Stesen MRT Bukit Batok", ta: "புக்கிட் பாத்தோக் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bukit Gombak", k: "MRT", zh: "武吉甘柏地铁站", ms: "Stesen MRT Bukit Gombak", ta: "புக்கிட் கோம்பாக் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Bukit Panjang", k: "LRT", zh: "武吉班让轻轨列车站", ms: "Stesen LRT Bukit Panjang", ta: "புக்கிட் பாஞ்சாங் இலகு ரயில் நிலையம்" },
  { n: "Bukit Panjang", k: "MRT", zh: "武吉班让地铁站", ms: "Stesen MRT Bukit Panjang", ta: "புக்கிட் பாஞ்சாங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Buona Vista", k: "MRT", zh: "波那维斯达地铁站", ms: "Stesen MRT Buona Vista", ta: "புவன விஸ்தா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Caldecott", k: "MRT", zh: "加利谷地铁站", ms: "Stesen MRT Caldecott", ta: "கால்டிகாட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Canberra", k: "MRT", zh: "坎贝拉地铁站", ms: "Stesen MRT Canberra", ta: "கென்பரா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Cantonment", k: "MRT", zh: "广东民地铁站", ms: "Stesen MRT Cantonment", ta: "கெண்டோன்மண்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Cashew", k: "MRT", zh: "凯秀地铁站", ms: "Stesen MRT Cashew", ta: "கேஷ்யூ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Changi Airport", k: "MRT", zh: "樟宜机场地铁站", ms: "Stesen MRT Changi Airport", ta: "சாங்கி விமானநிலையப் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Cheng Lim", k: "LRT", zh: "振林轻轨列车站", ms: "Stesen LRT Cheng Lim", ta: "செங் லிம் இலகு ரயில் நிலையம்" },
  { n: "Chinatown", k: "MRT", zh: "牛车水地铁站", ms: "Stesen MRT Chinatown", ta: "சைனாடவுன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Chinese Garden", k: "MRT", zh: "裕华园地铁站", ms: "Stesen MRT Chinese Garden", ta: "சீனத் தோட்டம் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Choa Chu Kang", k: "LRT", zh: "蔡厝港轻轨列车站", ms: "Stesen LRT Choa Chu Kang", ta: "சுவா சூ காங் இலகு ரயில் நிலையம்" },
  { n: "Choa Chu Kang", k: "MRT", zh: "蔡厝港地铁站", ms: "Stesen MRT Choa Chu Kang", ta: "சுவா சூ காங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "City Hall", k: "MRT", zh: "政府大厦地铁站", ms: "Stesen MRT City Hall", ta: "நகர மண்டபம் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Clarke Quay", k: "MRT", zh: "克拉码头地铁站", ms: "Stesen MRT Clarke Quay", ta: "கிளார்க் கீ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Clementi", k: "MRT", zh: "金文泰地铁站", ms: "Stesen MRT Clementi", ta: "கிளமெண்டி பெருவிரைவு ரயில் நிலையம்" },
  { n: "Commonwealth", k: "MRT", zh: "联邦地铁站", ms: "Stesen MRT Commonwealth", ta: "காமன்வெல்த் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Compassvale", k: "LRT", zh: "康埔桦轻轨列车站", ms: "Stesen LRT Compassvale", ta: "கம்பஸ்வேல் இலகு ரயில் நிலையம்" },
  { n: "Coral Edge", k: "LRT", zh: "珊瑚轻轨列车站", ms: "Stesen LRT Coral Edge", ta: "கோரல் எட்ஜ் இலகு ரயில் நிலையம்" },
  { n: "Cove", k: "LRT", zh: "海湾轻轨列车站", ms: "Stesen LRT Cove", ta: "கோவ் இலகு ரயில் நிலையம்" },
  { n: "Dakota", k: "MRT", zh: "达科达地铁站", ms: "Stesen MRT Dakota", ta: "டகோட்டா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Damai", k: "LRT", zh: "达迈轻轨列车站", ms: "Stesen LRT Damai", ta: "டாமாய் இலகு ரயில் நிலையம்" },
  { n: "Dhoby Ghaut", k: "MRT", zh: "多美歌地铁站", ms: "Stesen MRT Dhoby Ghaut", ta: "டோபி காட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Dover", k: "MRT", zh: "杜弗地铁站", ms: "Stesen MRT Dover", ta: "டோவர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Downtown", k: "MRT", zh: "市中心地铁站", ms: "Stesen MRT Downtown", ta: "டெளண்டவுன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Esplanade", k: "MRT", zh: "滨海中心地铁站", ms: "Stesen MRT Esplanade", ta: "எஸ்பிளனேட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Eunos", k: "MRT", zh: "友诺士地铁站", ms: "Stesen MRT Eunos", ta: "யூனோஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Expo", k: "MRT", zh: "博览地铁站", ms: "Stesen MRT Expo", ta: "எக்ஸ்போ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Fajar", k: "LRT", zh: "法嘉轻轨列车站", ms: "Stesen LRT Fajar", ta: "ஃபஜார் இலகு ரயில் நிலையம்" },
  { n: "Farmway", k: "LRT", zh: "农道轻轨列车站", ms: "Stesen LRT Farmway", ta: "ஃபார்ம்வே இலகு ரயில் நிலையம்" },
  { n: "Farrer Park", k: "MRT", zh: "花拉公园地铁站", ms: "Stesen MRT Farrer Park", ta: "ஃபேரர் பார்க் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Farrer Road", k: "MRT", zh: "花拉路地铁站", ms: "Stesen MRT Farrer Road", ta: "ஃபேரர் ரோடு பெருவிரைவு ரயில் நிலையம்" },
  { n: "Fernvale", k: "LRT", zh: "芬薇轻轨列车站", ms: "Stesen LRT Fernvale", ta: "ஃபெர்ன்வேல் இலகு ரயில் நிலையம்" },
  { n: "Fort Canning", k: "MRT", zh: "福康宁地铁站", ms: "Stesen MRT Fort Canning", ta: "ஃபோர்ட் கெனிங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Gardens by the Bay", k: "MRT", zh: "滨海湾花园地铁站", ms: "Stesen MRT Taman di Persisiran", ta: "கரையோரப் பூந்தோட்டம் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Geylang Bahru", k: "MRT", zh: "芽笼峇鲁地铁站", ms: "Stesen MRT Geylang Bahru", ta: "கேலாங் பாரு பெருவிரைவு ரயில் நிலையம்" },
  { n: "Great World", k: "MRT", zh: "大世界地铁站", ms: "Stesen MRT Great World", ta: "கிரேட் வோர்ல்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Gul Circle", k: "MRT", zh: "卡尔圈地铁站", ms: "Stesen MRT Gul Circle", ta: "கல் சர்க்கல் பெருவிரைவு ரயில் நிலையம்" },
  { n: "HarbourFront", k: "MRT", zh: "港湾地铁站", ms: "Stesen MRT HarbourFront", ta: "ஹார்பர்ஃபிரண்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Havelock", k: "MRT", zh: "合乐地铁站", ms: "Stesen MRT Havelock", ta: "ஹெவ்லொக் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Haw Par Villa", k: "MRT", zh: "虎豹别墅地铁站", ms: "Stesen MRT Haw Par Villa", ta: "ஹா பா வில்லா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Hillview", k: "MRT", zh: "山景地铁站", ms: "Stesen MRT Hillview", ta: "ஹில்வியூ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Holland Village", k: "MRT", zh: "荷兰村地铁站", ms: "Stesen MRT Holland Village", ta: "ஹாலந்து வில்லேஜ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Hougang", k: "MRT", zh: "后港地铁站", ms: "Stesen MRT Hougang", ta: "ஹவ்காங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Hume", k: "MRT", zh: "谦道地铁站", ms: "Stesen MRT Hume", ta: "ஹியூம் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Jalan Besar", k: "MRT", zh: "惹兰勿刹地铁站", ms: "Stesen MRT Jalan Besar", ta: "ஜாலான் புசார் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Jelapang", k: "LRT", zh: "泽拉邦轻轨列车站", ms: "Stesen LRT Jelapang", ta: "ஜெலப்பாங் இலகு ரயில் நிலையம்" },
  { n: "Joo Koon", k: "MRT", zh: "裕群地铁站", ms: "Stesen MRT Joo Koon", ta: "ஜூ கூன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Jurong East", k: "MRT", zh: "裕廊东地铁站", ms: "Stesen MRT Jurong East", ta: "ஜூரோங் ஈஸ்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Kadaloor", k: "LRT", zh: "卡达鲁轻轨列车站", ms: "Stesen LRT Kadaloor", ta: "கடலூர் இலகு ரயில் நிலையம்" },
  { n: "Kaki Bukit", k: "MRT", zh: "加基武吉地铁站", ms: "Stesen MRT Kaki Bukit", ta: "காக்கி புக்கிட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Kallang", k: "MRT", zh: "加冷地铁站", ms: "Stesen MRT Kallang", ta: "காலாங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Kangkar", k: "LRT", zh: "港脚轻轨列车站", ms: "Stesen LRT Kangkar", ta: "கங்கார் இலகு ரயில் நிலையம்" },
  { n: "Katong Park", k: "MRT", zh: "加东公园地铁站", ms: "Stesen MRT Katong Park", ta: "காத்தோங் பூங்கா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Keat Hong", k: "LRT", zh: "吉丰轻轨列车站", ms: "Stesen LRT Keat Hong", ta: "கியட் ஹொங் இலகு ரயில் நிலையம்" },
  { n: "Kembangan", k: "MRT", zh: "景万岸地铁站", ms: "Stesen MRT Kembangan", ta: "கெம்பாங்கான் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Kent Ridge", k: "MRT", zh: "肯特岗地铁站", ms: "Stesen MRT Kent Ridge", ta: "கெண்ட் ரிட்ஜ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Keppel", k: "MRT", zh: "吉宝地铁站", ms: "Stesen MRT Keppel", ta: "கெப்பல் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Khatib", k: "MRT", zh: "卡迪地铁站", ms: "Stesen MRT Khatib", ta: "கத்திப் பெருவிரைவு ரயில் நிலையம்" },
  { n: "King Albert Park", k: "MRT", zh: "阿尔柏王园地铁站", ms: "Stesen MRT King Albert Park", ta: "கிங் ஆல்பர்ட் பார்க் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Kovan", k: "MRT", zh: "高文地铁站", ms: "Stesen MRT Kovan", ta: "கோவன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Kranji", k: "MRT", zh: "克兰芝地铁站", ms: "Stesen MRT Kranji", ta: "கிராஞ்சி பெருவிரைவு ரயில் நிலையம்" },
  { n: "Kupang", k: "LRT", zh: "古邦轻轨列车站", ms: "Stesen LRT Kupang", ta: "குப்பாங் இலகு ரயில் நிலையம்" },
  { n: "Labrador Park", k: "MRT", zh: "拉柏多公园地铁站", ms: "Stesen MRT Labrador Park", ta: "லாப்ரடார் பூங்கா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Lakeside", k: "MRT", zh: "湖畔地铁站", ms: "Stesen MRT Lakeside", ta: "லேக்சைட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Lavender", k: "MRT", zh: "劳明达地铁站", ms: "Stesen MRT Lavender", ta: "லவண்டர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Layar", k: "LRT", zh: "拉雅轻轨列车站", ms: "Stesen LRT Layar", ta: "லாயார் இலகு ரயில் நிலையம்" },
  { n: "Lentor", k: "MRT", zh: "伦多地铁站", ms: "Stesen MRT Lentor", ta: "லெண்ட்டோர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Little India", k: "MRT", zh: "小印度地铁站", ms: "Stesen MRT Little India", ta: "லிட்டில் இந்தியா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Lorong Chuan", k: "MRT", zh: "罗弄泉地铁站", ms: "Stesen MRT Lorong Chuan", ta: "லோரோங் சுவான் பெருவிரைவு ரயில் நிலையம்" },
  { n: "MacPherson", k: "MRT", zh: "麦波申地铁站", ms: "Stesen MRT MacPherson", ta: "மெக்பர்சன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Marina Bay", k: "MRT", zh: "滨海湾地铁站", ms: "Stesen MRT Marina Bay", ta: "மரீனா பே பெருவிரைவு ரயில் நிலையம்" },
  { n: "Marina South", k: "MRT", zh: "滨海南地铁站", ms: "Stesen MRT Marina South", ta: "மரீனா சவுத் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Marina South Pier", k: "MRT", zh: "滨海南码头地铁站", ms: "Stesen MRT Marina South Pier", ta: "மரீனா சவுத் பியர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Marine Parade", k: "MRT", zh: "马林百列地铁站", ms: "Stesen MRT Marine Parade", ta: "மரீன் பரேட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Marine Terrace", k: "MRT", zh: "马林台地铁站", ms: "Stesen MRT Marine Terrace", ta: "மரீன் டெரஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Marsiling", k: "MRT", zh: "马西岭地铁站", ms: "Stesen MRT Marsiling", ta: "மார்சிலிங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Marymount", k: "MRT", zh: "玛丽蒙地铁站", ms: "Stesen MRT Marymount", ta: "மேரிமவுண்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Mattar", k: "MRT", zh: "玛达地铁站", ms: "Stesen MRT Mattar", ta: "மாத்தார் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Maxwell", k: "MRT", zh: "麦士威地铁站", ms: "Stesen MRT Maxwell", ta: "மெக்ஸ்வெல் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Mayflower", k: "MRT", zh: "美华地铁站", ms: "Stesen MRT Mayflower", ta: "மேஃபிளவர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Meridian", k: "LRT", zh: "丽园轻轨列车站", ms: "Stesen LRT Meridian", ta: "மெரிடியன் இலகு ரயில் நிலையம்" },
  { n: "Mount Pleasant", k: "MRT", zh: "快乐山地铁站", ms: "Stesen MRT Mount Pleasant", ta: "மவுண்ட் பிளசண்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Mountbatten", k: "MRT", zh: "蒙巴登地铁站", ms: "Stesen MRT Mountbatten", ta: "மவுண்ட்பேட்டன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Napier", k: "MRT", zh: "纳比雅地铁站", ms: "Stesen MRT Napier", ta: "நேப்பியர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Newton", k: "MRT", zh: "纽顿地铁站", ms: "Stesen MRT Newton", ta: "நியூட்டன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Nibong", k: "LRT", zh: "尼蒙轻轨列车站", ms: "Stesen LRT Nibong", ta: "நிபொங் இலகு ரயில் நிலையம்" },
  { n: "Nicoll Highway", k: "MRT", zh: "尼诰大道地铁站", ms: "Stesen MRT Nicoll Highway", ta: "நிக்கல் நெடுஞ்சாலைப் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Novena", k: "MRT", zh: "诺维娜地铁站", ms: "Stesen MRT Novena", ta: "நொவீனா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Oasis", k: "LRT", zh: "绿洲轻轨列车站", ms: "Stesen LRT Oasis", ta: "ஒயேசிஸ் இலகு ரயில் நிலையம்" },
  { n: "One-North", k: "MRT", zh: "纬壹地铁站", ms: "Stesen MRT One-North", ta: "ஒன்-நார்த் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Orchard", k: "MRT", zh: "乌节地铁站", ms: "Stesen MRT Orchard", ta: "ஆர்ச்சர்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Orchard Boulevard", k: "MRT", zh: "乌节大道地铁站", ms: "Stesen MRT Orchard Boulevard", ta: "ஆர்ச்சர்ட் புலவார்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Outram Park", k: "MRT", zh: "欧南园地铁站", ms: "Stesen MRT Outram Park", ta: "ஊட்ரம் பார்க் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Pasir Panjang", k: "MRT", zh: "巴西班让地铁站", ms: "Stesen MRT Pasir Panjang", ta: "பாசிர் பாஞ்சாங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Pasir Ris", k: "MRT", zh: "巴西立地铁站", ms: "Stesen MRT Pasir Ris", ta: "பாசிர் ரிஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Paya Lebar", k: "MRT", zh: "巴耶利峇地铁站", ms: "Stesen MRT Paya Lebar", ta: "பாய லேபார் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Pending", k: "LRT", zh: "秉定轻轨列车站", ms: "Stesen LRT Pending", ta: "பெண்டிங் இலகு ரயில் நிலையம்" },
  { n: "Petir", k: "LRT", zh: "柏提轻轨列车站", ms: "Stesen LRT Petir", ta: "பெட்டீர் இலகு ரயில் நிலையம்" },
  { n: "Phoenix", k: "LRT", zh: "凤凰轻轨列车站", ms: "Stesen LRT Phoenix", ta: "ஃபீனிக்ஸ் இலகு ரயில் நிலையம்" },
  { n: "Pioneer", k: "MRT", zh: "先驱地铁站", ms: "Stesen MRT Pioneer", ta: "பயனியர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Potong Pasir", k: "MRT", zh: "波东巴西地铁站", ms: "Stesen MRT Potong Pasir", ta: "பொத்தோங் பாசிர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Prince Edward Road", k: "MRT", zh: "爱德华太子路地铁站", ms: "Stesen MRT Prince Edward Road", ta: "பிரின்ஸ் எட்வர்ட் ரோடு பெருவிரைவு ரயில் நிலையம்" },
  { n: "Promenade", k: "MRT", zh: "宝门廊地铁站", ms: "Stesen MRT Promenade", ta: "புரொமனாட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Punggol", k: "LRT", zh: "榜鹅轻轨列车站", ms: "Stesen LRT Punggol", ta: "பொங்கோல் இலகு ரயில் நிலையம்" },
  { n: "Punggol", k: "MRT", zh: "榜鹅地铁站", ms: "Stesen MRT Punggol", ta: "பொங்கோல் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Punggol Coast", k: "MRT", zh: "榜鹅海岸地铁站", ms: "Stesen MRT Punggol Coast", ta: "பொங்கோல் கோஸ்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Punggol Point", k: "LRT", zh: "榜鹅坊轻轨列车站", ms: "Stesen LRT Punggol Point", ta: "பொங்கோல் பாயிண்ட் இலகு ரயில் நிலையம்" },
  { n: "Queenstown", k: "MRT", zh: "女皇镇地铁站", ms: "Stesen MRT Queenstown", ta: "குவீன்ஸ்டவுன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Raffles Place", k: "MRT", zh: "莱佛士坊地铁站", ms: "Stesen MRT Raffles Place", ta: "ராஃபிள்ஸ் பிளேஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Ranggung", k: "LRT", zh: "兰岗轻轨列车站", ms: "Stesen LRT Ranggung", ta: "ரங்கோங் இலகு ரயில் நிலையம்" },
  { n: "Redhill", k: "MRT", zh: "红山地铁站", ms: "Stesen MRT Redhill", ta: "ரெட்ஹில் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Renjong", k: "LRT", zh: "仁宗轻轨列车站", ms: "Stesen LRT Renjong", ta: "ரெஞ்சோங் இலகு ரயில் நிலையம்" },
  { n: "Riviera", k: "LRT", zh: "里维拉轻轨列车站", ms: "Stesen LRT Riviera", ta: "ரிவியாரா இலகு ரயில் நிலையம்" },
  { n: "Rochor", k: "MRT", zh: "梧槽地铁站", ms: "Stesen MRT Rochor", ta: "ரோச்சோர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Rumbia", k: "LRT", zh: "棕美轻轨列车站", ms: "Stesen LRT Rumbia", ta: "ரும்பியா இலகு ரயில் நிலையம்" },
  { n: "Sam Kee", k: "LRT", zh: "三记轻轨列车站", ms: "Stesen LRT Sam Kee", ta: "சாம் கீ இலகு ரயில் நிலையம்" },
  { n: "Samudera", k: "LRT", zh: "山姆轻轨列车站", ms: "Stesen LRT Samudera", ta: "சமுத்திரா இலகு ரயில் நிலையம்" },
  { n: "Segar", k: "LRT", zh: "实加轻轨列车站", ms: "Stesen LRT Segar", ta: "செகார் இலகு ரயில் நிலையம்" },
  { n: "Sembawang", k: "MRT", zh: "三巴旺地铁站", ms: "Stesen MRT Sembawang", ta: "செம்பவாங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Sengkang", k: "LRT", zh: "盛港轻轨列车站", ms: "Stesen LRT Sengkang", ta: "செங்காங் இலகு ரயில் நிலையம்" },
  { n: "Sengkang", k: "MRT", zh: "盛港地铁站", ms: "Stesen MRT Sengkang", ta: "செங்காங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Senja", k: "LRT", zh: "信佳轻轨列车站", ms: "Stesen LRT Senja", ta: "சென்ஜா இலகு ரயில் நிலையம்" },
  { n: "Serangoon", k: "MRT", zh: "实龙岗地铁站", ms: "Stesen MRT Serangoon", ta: "சிராங்கூன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Shenton Way", k: "MRT", zh: "珊顿道地铁站", ms: "Stesen MRT Shenton Way", ta: "ஷெண்ட்டன் வே பெருவிரைவு ரயில் நிலையம்" },
  { n: "Siglap", k: "MRT", zh: "实乞纳地铁站", ms: "Stesen MRT Siglap", ta: "சிக்ளாப் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Simei", k: "MRT", zh: "四美地铁站", ms: "Stesen MRT Simei", ta: "சிமெய் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Sixth Avenue", k: "MRT", zh: "第六道地铁站", ms: "Stesen MRT Sixth Avenue", ta: "சிக்ஸ்த் அவென்யூ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Somerset", k: "MRT", zh: "索美塞地铁站", ms: "Stesen MRT Somerset", ta: "சாமர்செட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Soo Teck", k: "LRT", zh: "树德轻轨列车站", ms: "Stesen LRT Soo Teck", ta: "சூ தெக் இலகு ரயில் நிலையம்" },
  { n: "South View", k: "LRT", zh: "南景轻轨列车站", ms: "Stesen LRT South View", ta: "சவுத் வியூ இலகு ரயில் நிலையம்" },
  { n: "Springleaf", k: "MRT", zh: "春叶地铁站", ms: "Stesen MRT Springleaf", ta: "ஸ்பிரிங்லீஃவ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Stadium", k: "MRT", zh: "体育场地铁站", ms: "Stesen MRT Stadium", ta: "ஸ்டேடியம் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Stevens", k: "MRT", zh: "史蒂芬地铁站", ms: "Stesen MRT Stevens", ta: "ஸ்டீவன்ஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Sumang", k: "LRT", zh: "苏芒轻轨列车站", ms: "Stesen LRT Sumang", ta: "சுமாங் இலகு ரயில் நிலையம்" },
  { n: "Sungei Bedok", k: "MRT", zh: "双溪勿洛地铁站", ms: "Stesen MRT Sungei Bedok", ta: "சுங்கை பிடோக் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tai Seng", k: "MRT", zh: "大成地铁站", ms: "Stesen MRT Tai Seng", ta: "தை செங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tampines", k: "MRT", zh: "淡滨尼地铁站", ms: "Stesen MRT Tampines", ta: "தெம்பனிஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tampines East", k: "MRT", zh: "淡滨尼东地铁站", ms: "Stesen MRT Tampines East", ta: "தெம்பனிஸ் ஈஸ்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tampines West", k: "MRT", zh: "淡滨尼西地铁站", ms: "Stesen MRT Tampines West", ta: "தெம்பனிஸ் வெஸ்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tan Kah Kee", k: "MRT", zh: "陈嘉庚地铁站", ms: "Stesen MRT Tan Kah Kee", ta: "டான் கா கீ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tanah Merah", k: "MRT", zh: "丹那美拉地铁站", ms: "Stesen MRT Tanah Merah", ta: "தானா மேரா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tanjong Katong", k: "MRT", zh: "丹戎加东地铁站", ms: "Stesen MRT Tanjong Katong", ta: "தஞ்சோங் காத்தோங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tanjong Pagar", k: "MRT", zh: "丹戎巴葛地铁站", ms: "Stesen MRT Tanjong Pagar", ta: "தஞ்சோங் பகார் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tanjong Rhu", k: "MRT", zh: "丹戎禺地铁站", ms: "Stesen MRT Tanjong Rhu", ta: "தஞ்சோங் ரூ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Teck Lee", k: "LRT", zh: "德利轻轨列车站", ms: "Stesen LRT Teck Lee", ta: "தெக் லீ இலகு ரயில் நிலையம்" },
  { n: "Teck Whye", k: "LRT", zh: "德惠轻轨列车站", ms: "Stesen LRT Teck Whye", ta: "தெக் வாய் இலகு ரயில் நிலையம்" },
  { n: "Telok Ayer", k: "MRT", zh: "直落亚逸地铁站", ms: "Stesen MRT Telok Ayer", ta: "தெலுக் ஆயர் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Telok Blangah", k: "MRT", zh: "直落布兰雅地铁站", ms: "Stesen MRT Telok Blangah", ta: "தெலுக் பிளாங்கா பெருவிரைவு ரயில் நிலையம்" },
  { n: "Thanggam", k: "LRT", zh: "丹甘轻轨列车站", ms: "Stesen LRT Thanggam", ta: "தங்கம் இலகு ரயில் நிலையம்" },
  { n: "Tiong Bahru", k: "MRT", zh: "中峇鲁地铁站", ms: "Stesen MRT Tiong Bahru", ta: "தியோங் பாரு பெருவிரைவு ரயில் நிலையம்" },
  { n: "Toa Payoh", k: "MRT", zh: "大巴窑地铁站", ms: "Stesen MRT Toa Payoh", ta: "தோ பாயோ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tongkang", k: "LRT", zh: "同港轻轨列车站", ms: "Stesen LRT Tongkang", ta: "தொங்காங் இலகு ரயில் நிலையம்" },
  { n: "Tuas Crescent", k: "MRT", zh: "大士弯地铁站", ms: "Stesen MRT Tuas Crescent", ta: "துவாஸ் கிரசண்ட் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tuas Link", k: "MRT", zh: "大士连路地铁站", ms: "Stesen MRT Tuas Link", ta: "துவாஸ் லிங்க் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Tuas West Road", k: "MRT", zh: "大士西路地铁站", ms: "Stesen MRT Tuas West Road", ta: "துவாஸ் வெஸ்ட் ரோடு பெருவிரைவு ரயில் நிலையம்" },
  { n: "Ubi", k: "MRT", zh: "乌美地铁站", ms: "Stesen MRT Ubi", ta: "உபி பெருவிரைவு ரயில் நிலையம்" },
  { n: "Upper Changi", k: "MRT", zh: "樟宜上段地铁站", ms: "Stesen MRT Upper Changi", ta: "அப்பர் சாங்கி பெருவிரைவு ரயில் நிலையம்" },
  { n: "Upper Thomson", k: "MRT", zh: "汤申路上段地铁站", ms: "Stesen MRT Upper Thomson", ta: "அப்பர் தாம்சன் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Woodlands", k: "MRT", zh: "兀兰地铁站", ms: "Stesen MRT Woodlands", ta: "உட்லண்ட்ஸ் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Woodlands North", k: "MRT", zh: "兀兰北地铁站", ms: "Stesen MRT Woodlands North", ta: "உட்லண்ட்ஸ் நார்த் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Woodlands South", k: "MRT", zh: "兀兰南地铁站", ms: "Stesen MRT Woodlands South", ta: "உட்லண்ட்ஸ் சவுத் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Woodleigh", k: "MRT", zh: "兀里地铁站", ms: "Stesen MRT Woodleigh", ta: "உட்லீ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Xilin", k: "MRT", zh: "锡林地铁站", ms: "Stesen MRT Xilin", ta: "ஸீலின் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Yew Tee", k: "MRT", zh: "油池地铁站", ms: "Stesen MRT Yew Tee", ta: "இயூ டீ பெருவிரைவு ரயில் நிலையம்" },
  { n: "Yio Chu Kang", k: "MRT", zh: "杨厝港地铁站", ms: "Stesen MRT Yio Chu Kang", ta: "இயோ சூ காங் பெருவிரைவு ரயில் நிலையம்" },
  { n: "Yishun", k: "MRT", zh: "义顺地铁站", ms: "Stesen MRT Yishun", ta: "யீஷூன் பெருவிரைவு ரயில் நிலையம்" },
];

export const SG_STATION_NAMES_BY_NAME = new Map(
  SG_STATION_NAMES_I18N.map((s) => [s.n, s])
);

// THE LOOKUP FOLDS, AND IT DOES SO BECAUSE THE EXACT VERSION MISSED ON THE FIRST TRY.
// The government register writes "One-North"; this repo writes "one-north", which is the
// station's own lower-case branding. An exact-keyed Map resolved 182 of 183 stations and
// silently returned English for the one it missed.
//
// That is the same defect as O-317, fixed in index.js earlier the same day — a
// case-sensitive lookup between two tables that do not agree on case — reintroduced in a
// new file within hours. Recorded here because the lesson clearly did not travel on its
// own. Exact hit still wins, so folding can only add a match, never redirect one.
const foldName = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const BY_FOLD = new Map(SG_STATION_NAMES_I18N.map((s) => [foldName(s.n), s]));

/** Official name in `lang` (zh|ms|ta), or the English `name` when unknown. */
export function stationName(name, lang) {
  if (lang === 'en') return name;
  const row = SG_STATION_NAMES_BY_NAME.get(name) || BY_FOLD.get(foldName(name));
  const v = row && row[lang];
  return (typeof v === 'string' && v.trim()) ? v : name;
}

/** The row for a station name, exact-then-folded. Null when unknown. */
export function stationRow(name) {
  return SG_STATION_NAMES_BY_NAME.get(name) || BY_FOLD.get(foldName(name)) || null;
}
