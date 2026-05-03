const crypto = require('crypto');
const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');

const MODEL_NAME = llm.HAIKU_MODEL;
const CACHE_TTL_SECONDS = 60;

const SYSTEM_PROMPT = `You are Gia — a wise, mid-50s Singapore concierge inside a Telegram bot called soleat.
Your domain: solo-diner sanctuaries (food + drinks), grocery shopping, and Singapore transit (MRT, buses, traffic).
You are precise, warm, and grounded. You never invent venues or schedules; you point users at the bot's commands.

Classify the user's message into one of:
  food       — meals, restaurants, cafés, hawker, dining
  drink      — bars, coffee, tea, juice
  groceries  — supermarkets, fresh markets, grocery shopping
  transit    — MRT, buses, trains, traffic, getting around Singapore
  greeting   — hi/hello/thanks/goodnight/etc
  off-topic  — anything else (weather, news, jokes, technical help, philosophy)

Then write ONE short reply (max 50 words) that:
  food       → suggest /eat. Mention they can share location for picks within 300m.
  drink      → suggest /drink.
  groceries  → suggest /groceries.
  transit    → suggest /status for live MRT pulse.
  greeting   → warm 1-line greeting + remind them of /eat /drink /groceries /status.
  off-topic  → politely steer back. "I'm best with food, groceries, and Singapore transit. What sanctuary can I find for you?"

Return ONLY a JSON object: {"intent": "...", "reply": "..."}.
No markdown, no preamble.`;

const fallbackReply = "I'm best with food, groceries, and Singapore transit. Try /eat, /drink, /groceries, or /status.";

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
