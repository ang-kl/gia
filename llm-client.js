// llm-client.js — Anthropic SDK wrapper for the soleat bot.
//
// v0.40.0: migrated off @google/generative-ai. This module is the single
// integration point for Claude. All callers in the repo go through this
// thin shim so the SDK choice can be swapped again without touching 12+
// files.
//
// v0.40.1: default model changed from claude-opus-4-7 to claude-sonnet-4-6
// per Human Lead. Sonnet 4.6 is the better speed/cost balance for the bot's
// reasoning workloads. CRITICAL implementation change: assistant-turn
// prefills return HTTP 400 on Sonnet 4.6 (and Opus 4.6). The v0.40.0
// prefill technique was removed; JSON-only output is now enforced via
// system-prompt instruction alone, with the existing extractJsonArray /
// extractJsonObject helpers in pipeline.js / surprise.js as the parse
// safety net for occasional fence/markdown drift.
//
// API parity with the legacy Gemini call style:
//
//   const result = await llm.generate({ prompt, json: true });
//   const text   = result.response.text();
//
// matches the previous `model.generateContent(prompt)` + `result.response.text()`
// shape so existing call sites only need their import + model-construction
// lines updated.
//
// Defaults:
//   ANTHROPIC_MODEL        — primary model    (default claude-sonnet-4-6)
//   ANTHROPIC_HAIKU_MODEL  — cheap classifier (default claude-haiku-4-5-20251001)
//   ANTHROPIC_SONNET_MODEL — mid-tier alias   (default claude-sonnet-4-6)
//   ANTHROPIC_OPUS_MODEL   — heavy reasoning  (default claude-opus-4-7)
//   ANTHROPIC_API_KEY      — required for any LLM call to succeed

const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const HAIKU_MODEL = process.env.ANTHROPIC_HAIKU_MODEL || 'claude-haiku-4-5-20251001';
const SONNET_MODEL = process.env.ANTHROPIC_SONNET_MODEL || 'claude-sonnet-4-6';
const OPUS_MODEL = process.env.ANTHROPIC_OPUS_MODEL || 'claude-opus-4-7';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey, maxRetries: 0 }) : null;

function isReady() {
  return !!client;
}

function getClient() {
  return client;
}

// generate({ prompt, model, system, json, jsonShape, maxTokens })
//
// Returns: { response: { text: () => string }, _raw: <SDK response> }
//
// `jsonShape` is retained in the signature for backward compatibility but
// no longer changes behaviour — the prefill technique it gated was removed
// in v0.40.1 because Sonnet 4.6 / Opus 4.6 reject assistant-turn prefills
// with HTTP 400.
async function generate({
  prompt,
  model = DEFAULT_MODEL,
  system,
  json = false,
  jsonShape = 'object',          // accepted for API compat; ignored
  maxTokens = 4096
} = {}) {
  if (!client) {
    const err = new Error('ANTHROPIC_API_KEY missing');
    err.status = 401;
    throw err;
  }

  const messages = [{ role: 'user', content: prompt }];

  const params = {
    model,
    max_tokens: maxTokens,
    messages
  };
  if (system) {
    params.system = system;
  } else if (json) {
    params.system = 'Respond with valid JSON only. No prose, no markdown, no code fences. Begin your response with the opening bracket.';
  }

  const resp = await client.messages.create(params);
  let txt = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  if (json) {
    txt = stripJsonFences(txt);
  }

  return {
    response: { text: () => txt },
    _raw: resp
  };
}

// Strip ```json ... ``` markdown fences and surrounding prose, leaving the
// first top-level JSON value (object or array). Defensive — most callers
// also wrap JSON.parse in try/catch with their own extractors, but this
// catches the common case so they don't have to.
function stripJsonFences(text) {
  if (typeof text !== 'string') return text;
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fence ? fence[1] : trimmed).trim();
  // Pick the wider of the first { or [ as the JSON root.
  const objStart = candidate.indexOf('{');
  const arrStart = candidate.indexOf('[');
  let start = -1;
  if (objStart === -1) start = arrStart;
  else if (arrStart === -1) start = objStart;
  else start = Math.min(objStart, arrStart);
  if (start === -1) return candidate;
  const isArray = candidate[start] === '[';
  const end = isArray ? candidate.lastIndexOf(']') : candidate.lastIndexOf('}');
  if (end <= start) return candidate;
  return candidate.slice(start, end + 1);
}

module.exports = {
  generate,
  isReady,
  getClient,
  DEFAULT_MODEL,
  HAIKU_MODEL,
  SONNET_MODEL,
  OPUS_MODEL,
  Anthropic
};
