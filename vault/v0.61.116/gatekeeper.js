const crypto = require('crypto');
const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');

const MODEL_NAME = llm.HAIKU_MODEL;
const CACHE_TTL_SECONDS = 60;

const SYSTEM_PROMPT = `You are Gia — a wise, mid-50s Singapore concierge inside a Telegram bot called soleat.
Your domain: dining in Singapore (cuisines, hawker centres, hidden gems, recognised awards), local transport (MRT, buses, walking, driving), parking, and weather. You point users at the bot's commands rather than inventing answers.

Classify the user's message into one of:
  food       — meals, restaurants, cafés, hawker, cuisines, dining, drinks
  transit    — MRT, buses, trains, traffic, getting around Singapore
  parking    — carparks, parking lots, where to park
  weather    — weather, forecast, rain, hot/cold
  greeting   — hi/hello/thanks/goodnight/etc
  off-topic  — anything else (news, jokes, technical help, philosophy)

Then write ONE short reply (max 50 words) that:
  food       → suggest /cuisine for the full picker; /hidden for 5 lesser-known gems 1.5–3 km away; /hawker for hawker centres; /recognised for Michelin / Bib / Asia 50-100. Mention sharing location helps.
  transit    → suggest /transport for bus, MRT, walk, drive options.
  parking    → suggest /carpark for the nearest 5 with live lots.
  weather    → suggest /weather for now + the 2-hour NEA forecast.
  greeting   → warm 1-line greeting + remind them of /cuisine, /hidden, /transport, /weather, /carpark.
  off-topic  → politely steer back. Phrasing: "I'm best with Singapore dining, transport, parking, and weather. Try /cuisine, /hidden, /transport, /weather, or /help for the full list."

Return ONLY a JSON object: {"intent": "...", "reply": "..."}.
No markdown, no preamble.`;

const fallbackReply = "I'm best with Singapore dining, transport, parking, and weather. Try /cuisine, /hidden, /transport, /weather, or /help for the full list.";

function hashMessage(text) {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 24);
}

async function classifyAndReply(text) {
  if (!llm.isReady()) {
    return { intent: 'off-topic', reply: fallbackReply };
  }
  try {
    const result = await withRetry(
      () => llm.generate({
        prompt: `User message:\n${text}`,
        system: SYSTEM_PROMPT,
        model: MODEL_NAME,
        json: true,
        maxTokens: 512
      }),
      { label: 'Gatekeeper' }
    );
    const parsed = JSON.parse(result.response.text());
    if (typeof parsed.reply === 'string' && typeof parsed.intent === 'string') {
      return { intent: parsed.intent, reply: parsed.reply };
    }
  } catch (err) {
    logger.error({ err: { message: err.message } }, 'gatekeeper classify failed');
  }
  return { intent: 'off-topic', reply: fallbackReply };
}

async function gatekeep(redis, text) {
  if (!text || !text.trim()) return null;
  const key = `gate:${hashMessage(text.trim())}`;
  if (redis.isOpen) {
    const cached = await redis.get(key).catch(() => null);
    if (cached) {
      try { return JSON.parse(cached); } catch { /* fall through */ }
    }
  }
  const result = await classifyAndReply(text);
  if (redis.isOpen) {
    redis.setEx(key, CACHE_TTL_SECONDS, JSON.stringify(result)).catch(() => {});
  }
  return result;
}

module.exports = { gatekeep, classifyAndReply, hashMessage };
