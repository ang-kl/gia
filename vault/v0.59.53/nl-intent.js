// nl-intent.js — natural-language intent classifier (v0.30.0).
//
// Bot intercepts non-slash chat messages, asks Gemini Flash to:
//   1. Classify intent: food / drinks / groceries / other
//   2. Extract canonical English cuisines from our 70-cuisine catalogue
//   3. Extract special_request (free-form qualifier)
//   4. Detect input language (ISO 639-1)
//   5. Generate ack_text in same language as input
//
// Multi-language is free — Gemini classifies + responds in any language
// the user types in. Cached per (lang, text-hash) for 60 s in Redis to
// keep tap-spam costs near zero.

const crypto = require('crypto');
const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');

const MODEL_NAME = llm.HAIKU_MODEL;

const CACHE_TTL_S = 60;
const KEY_PREFIX = 'nl-intent:';
const MIN_CONFIDENCE = 0.6;
const MAX_TEXT_LEN = 500;

const CUISINE_CATALOGUE = [
  'Singaporean','Peranakan','South Indian','North Indian','Malaysian','Eurasian','Indonesian',
  'Thai','Filipino','Vietnamese','Japanese','Chinese','Korean','Taiwanese','American','Mexican',
  'Brazilian','Australian','New Zealand','Australasia','Burmese','Laotian','Timorese',
  'Sichuan','Shanghainese','Cantonese','Hunan','Hokkien','Teochew','Hainanese','Hakka','Northeastern','Northwestern',
  'Bengali','Gujarati','Goan','Nepalese','Tibetan',
  'Mediterranean','Italian','Spanish','Greek','French','British','German','Austrian','Swiss','Portuguese',
  'Russian','Ukrainian','Polish','Scandinavian','Belgian','Dutch','Irish',
  'Lebanese','Turkish','Persian','Moroccan','Egyptian','Jordanian','Israeli','Afghan','Uzbek','Georgian',
  'Peruvian','Argentinian','Cuban','Jamaican','Ethiopian','Kenyan','Nigerian','South African'
];

async function classifyIntent({ text, langCode = 'en', redis = null }) {
  if (!llm.isReady()) return null;
  const cleanText = String(text || '').slice(0, MAX_TEXT_LEN).trim();
  if (!cleanText) return null;

  // Cache lookup
  let cacheKey = null;
  if (redis) {
    try {
      const h = crypto.createHash('sha1').update(`${langCode}:${cleanText}`).digest('hex').slice(0, 16);
      cacheKey = `${KEY_PREFIX}${h}`;
      if (!redis.isOpen) await redis.connect();
      const cached = await redis.get(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          logger.info({ intent: parsed.intent, confidence: parsed.confidence }, 'nl-intent cache HIT');
          return parsed;
        } catch { /* fall through */ }
      }
    } catch (err) {
      logger.warn({ err: { message: err.message } }, 'nl-intent cache read failed');
    }
  }

  const prompt = `You are an intent classifier for a Singapore food/drinks/groceries concierge bot. The user wrote a free-text message in any language. Classify it and extract structured params.

User message: """${cleanText}"""
User's Telegram language code (hint): ${langCode}

Return JSON exactly:
{
  "intent": "food" | "drinks" | "groceries" | "update-location" | "other",
  "confidence": <float 0..1>,
  "cuisines": [<canonical English cuisine names from this catalogue if mentioned or implied; omit if generic — pick from: ${CUISINE_CATALOGUE.join(', ')}>],
  "special_request": "<distinctive qualifier in English: 'Michelin-starred', 'halal', 'vegetarian', 'romantic dinner', 'kid-friendly', 'late-night', 'outdoor seating', 'budget under $20', etc.; empty string if none>",
  "location_override": "<Singapore place name the user explicitly mentioned to anchor the search around — e.g. 'Tanjong Pagar MRT', 'Raffles Place', 'Bishan', 'Joo Chiat', 'Holland Village'. Empty string if the user didn't mention a specific anchor (in which case the bot uses their cached GPS).>",
  "lang": "<ISO 639-1 two-letter code of the input language>",
  "ack_text": "<short acknowledgement IN THE SAME LANGUAGE as the input>"
}

Intent definitions:
  "food"            — wants restaurant / dish / cuisine recommendations
  "drinks"          — wants bars / coffee / tea / juice
  "groceries"       — wants supermarkets / fresh markets
  "update-location" — wants to change/refresh stored location
                      ("I moved", "my location changed", "我换地方了",
                      "use new location", "I'm somewhere else now")
  "other"           — greetings, off-topic, sensitive

Examples:
  "Show me Michelin star food" → {intent:"food",confidence:0.95,cuisines:[],special_request:"Michelin-starred",location_override:"",lang:"en",ack_text:"🌿 Searching for Michelin-starred restaurants near you…"}
  "推荐附近的米其林法餐" → {intent:"food",confidence:0.95,cuisines:["French"],special_request:"Michelin-starred",location_override:"",lang:"zh",ack_text:"🌿 正在为您搜寻附近的米其林法式餐厅…"}
  "Find Korean food near Tanjong Pagar MRT" → {intent:"food",confidence:0.95,cuisines:["Korean"],special_request:"",location_override:"Tanjong Pagar MRT",lang:"en",ack_text:"🌿 Searching for Korean food near Tanjong Pagar MRT…"}
  "Newly opened restaurants 1km of Raffles Place" → {intent:"food",confidence:0.9,cuisines:[],special_request:"newly opened",location_override:"Raffles Place MRT",lang:"en",ack_text:"🌿 Hunting newly opened restaurants near Raffles Place…"}
  "Bishan halal food" → {intent:"food",confidence:0.9,cuisines:[],special_request:"halal",location_override:"Bishan",lang:"en",ack_text:"🌿 Halal food near Bishan…"}
  "where can I find good kopi" → {intent:"drinks",confidence:0.9,cuisines:["Singaporean"],special_request:"local kopi / coffee",location_override:"",lang:"en",ack_text:"🌿 Hunting for kopi near you…"}
  "supermarket open now" → {intent:"groceries",confidence:0.9,cuisines:[],special_request:"open now",location_override:"",lang:"en",ack_text:"🌿 Finding supermarkets open now…"}
  "My location change" → {intent:"update-location",confidence:0.95,cuisines:[],special_request:"",location_override:"",lang:"en",ack_text:"📍 Tap to share your new location, or type a place name."}
  "我换地方了" → {intent:"update-location",confidence:0.9,cuisines:[],special_request:"",location_override:"",lang:"zh",ack_text:"📍 请发送新位置或输入地名。"}
  "thanks" → {intent:"other",confidence:0.1,cuisines:[],special_request:"",location_override:"",lang:"en",ack_text:""}
  "tell me about quantum physics" → {intent:"other",confidence:0.0,cuisines:[],special_request:"",location_override:"",lang:"en",ack_text:""}

Return ONLY the JSON object.`;

  try {
    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, json: true, maxTokens: 1024 }),
      { label: 'NL-Intent' }
    );
    const parsed = JSON.parse(result.response.text());
    const out = {
      intent: ['food', 'drinks', 'groceries', 'update-location', 'other'].includes(parsed.intent) ? parsed.intent : 'other',
      confidence: Number(parsed.confidence) || 0,
      cuisines: Array.isArray(parsed.cuisines)
        ? parsed.cuisines.filter((c) => CUISINE_CATALOGUE.includes(c)).slice(0, 5)
        : [],
      special_request: typeof parsed.special_request === 'string' ? parsed.special_request.slice(0, 200) : '',
      location_override: typeof parsed.location_override === 'string' ? parsed.location_override.slice(0, 100).trim() : '',
      lang: typeof parsed.lang === 'string' ? parsed.lang.slice(0, 2).toLowerCase() : 'en',
      ack_text: typeof parsed.ack_text === 'string' ? parsed.ack_text.slice(0, 240) : '🌿 Sensing the vibe…'
    };
    logger.info({ intent: out.intent, confidence: out.confidence, cuisines: out.cuisines, specialRequest: out.special_request, locationOverride: out.location_override, lang: out.lang }, 'nl-intent classified');
    if (cacheKey && redis) {
      redis.set(cacheKey, JSON.stringify(out), { EX: CACHE_TTL_S }).catch(() => {});
    }
    return out;
  } catch (err) {
    logger.error({ err: { message: err.message } }, 'nl-intent classify failed');
    return null;
  }
}

module.exports = { classifyIntent, MIN_CONFIDENCE, CUISINE_CATALOGUE };
