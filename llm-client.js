// llm-client.js — Anthropic SDK wrapper for the soleat bot.
//
// v0.40.0: migrated off @google/generative-ai. This module is the single
// integration point for Claude. All callers in the repo go through this
// thin shim so the SDK choice can be swapped again without touching 12+
// files.
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
//   ANTHROPIC_MODEL        — primary model    (default claude-opus-4-7)
//   ANTHROPIC_HAIKU_MODEL  — cheap classifier (default claude-haiku-4-5-20251001)
//   ANTHROPIC_SONNET_MODEL — mid-tier         (default claude-sonnet-4-6)
//   ANTHROPIC_API_KEY      — required for any LLM call to succeed
//
// JSON output: Anthropic doesn't accept `responseMimeType` like Gemini did.
// We emulate strict-JSON output via the prefill technique — seed the
// assistant turn with `{` (object) or `[` (array). The model is forced to
// continue inside that bracket. We re-prepend the prefill on the way out
// so callers see complete JSON. Combined with the existing extractJson*
// helpers in pipeline.js / surprise.js, this handles >99% of malformed
// fences in practice.

const Anthropic = require('@anthropic-ai/sdk');

const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-opus-4-7';
const HAIKU_MODEL = process.env.ANTHROPIC_HAIKU_MODEL || 'claude-haiku-4-5-20251001';
const SONNET_MODEL = process.env.ANTHROPIC_SONNET_MODEL || 'claude-sonnet-4-6';

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
async function generate({
  prompt,
  model = DEFAULT_MODEL,
  system,
  json = false,
  jsonShape = 'object',          // 'object' | 'array'
  maxTokens = 4096
} = {}) {
  if (!client) {
    const err = new Error('ANTHROPIC_API_KEY missing');
    err.status = 401;
    throw err;
  }

  const messages = [{ role: 'user', content: prompt }];

  // Prefill assistant turn to force JSON-only output.
  const prefill = json ? (jsonShape === 'array' ? '[' : '{') : null;
  if (prefill) {
    messages.push({ role: 'assistant', content: prefill });
  }

  const params = {
    model,
    max_tokens: maxTokens,
    messages
  };
  if (system) {
    params.system = system;
  } else if (json) {
    params.system = 'Respond with valid JSON only. No prose, no markdown, no code fences.';
  }

  const resp = await client.messages.create(params);
  let txt = (resp.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');

  if (prefill) {
    txt = prefill + txt;
  }

  return {
    response: { text: () => txt },
    _raw: resp
  };
}

module.exports = {
  generate,
  isReady,
  getClient,
  DEFAULT_MODEL,
  HAIKU_MODEL,
  SONNET_MODEL,
  Anthropic
};
