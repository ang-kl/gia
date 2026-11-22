// request-store.js — Redis HASH wrapper for v0.32.0 cuisine/surprise
// request rows.
//
// Per-request state lives in `cuisine-request:<reqId>` for 1 hour. The
// TMA polls a GET endpoint that reads this row; the server's background
// pipeline-task writes stages into it as work progresses. This decouples
// the slow Gemini calls (Stage A prompt-builder + Stage B reason) from
// any HTTP timeout — the row is the single source of truth.
//
// Design: large objects (payload, prompt_constructed, candidates, venues,
// diag) are JSON-stringified into individual HASH fields. Small scalars
// (status, stage, timestamps) live as plain HASH fields. This lets us
// HGET individual fields cheaply on every poll without round-tripping
// the whole row.
//
// reqId: 12-char base64url (~72 bits), generated via crypto.randomBytes.

const crypto = require('crypto');

const KEY_PREFIX = 'cuisine-request:';
const TTL_SECONDS = 60 * 60; // 1h

const VALID_KINDS = new Set(['cuisine', 'surprise']);
const VALID_STATUSES = new Set(['queued', 'building_prompt', 'reasoning', 'validating', 'ranking', 'refining', 'done', 'empty', 'error']);

function makeReqId() {
  return crypto.randomBytes(9).toString('base64url'); // 12 chars
}

function key(reqId) {
  return `${KEY_PREFIX}${reqId}`;
}

async function create(redis, { kind, chatId, userId, payload }) {
  if (!VALID_KINDS.has(kind)) throw new Error(`request-store: invalid kind=${kind}`);
  if (!chatId) throw new Error('request-store: chatId required');
  const reqId = makeReqId();
  const now = Date.now();
  await redis.hSet(key(reqId), {
    reqId,
    kind,
    chatId: String(chatId),
    userId: userId ? String(userId) : '',
    payload: JSON.stringify(payload || {}),
    status: 'queued',
    stage: 'queued',
    diag: '[]',
    createdAt: String(now),
    updatedAt: String(now)
  });
  await redis.expire(key(reqId), TTL_SECONDS);
  return reqId;
}

async function get(redis, reqId) {
  const raw = await redis.hGetAll(key(reqId));
  if (!raw || Object.keys(raw).length === 0) return null;
  return parseRow(raw);
}

function parseRow(raw) {
  return {
    reqId: raw.reqId,
    kind: raw.kind,
    chatId: raw.chatId,
    userId: raw.userId || null,
    payload: safeParse(raw.payload, {}),
    status: raw.status,
    stage: raw.stage,
    promptConstructed: raw.promptConstructed ? safeParse(raw.promptConstructed, null) : null,
    promptMeta: raw.promptMeta ? safeParse(raw.promptMeta, null) : null,
    candidates: raw.candidates ? safeParse(raw.candidates, []) : null,
    candidatesMeta: raw.candidatesMeta ? safeParse(raw.candidatesMeta, null) : null,
    venues: raw.venues ? safeParse(raw.venues, []) : null,
    diag: safeParse(raw.diag || '[]', []),
    error: raw.error || null,
    createdAt: Number(raw.createdAt) || null,
    updatedAt: Number(raw.updatedAt) || null
  };
}

function safeParse(s, fallback) {
  try { return JSON.parse(s); } catch { return fallback; }
}

async function setStage(redis, reqId, stage) {
  await redis.hSet(key(reqId), { stage, status: stage, updatedAt: String(Date.now()) });
}

async function setStatus(redis, reqId, status, extras = {}) {
  if (!VALID_STATUSES.has(status)) throw new Error(`request-store: invalid status=${status}`);
  const fields = { status, updatedAt: String(Date.now()) };
  for (const [k, v] of Object.entries(extras)) {
    fields[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  await redis.hSet(key(reqId), fields);
}

async function setPromptConstructed(redis, reqId, prompt, meta) {
  await redis.hSet(key(reqId), {
    promptConstructed: JSON.stringify(prompt),
    promptMeta: JSON.stringify(meta || {}),
    updatedAt: String(Date.now())
  });
}

async function setCandidates(redis, reqId, candidates, meta) {
  await redis.hSet(key(reqId), {
    candidates: JSON.stringify(candidates),
    candidatesMeta: JSON.stringify(meta || {}),
    updatedAt: String(Date.now())
  });
}

async function setVenues(redis, reqId, venues) {
  await redis.hSet(key(reqId), {
    venues: JSON.stringify(venues),
    updatedAt: String(Date.now())
  });
}

async function setError(redis, reqId, err) {
  const message = (err && err.message) || String(err);
  await redis.hSet(key(reqId), {
    status: 'error',
    error: message.slice(0, 500),
    updatedAt: String(Date.now())
  });
}

async function pushDiag(redis, reqId, entry) {
  // Read-modify-write — diag entries are small (~100 chars) and we add
  // ~10 per request. Atomicity isn't critical because there's only one
  // writer (the pipeline-task background runner).
  const raw = await redis.hGet(key(reqId), 'diag');
  const list = safeParse(raw || '[]', []);
  list.push({ ...entry, t: Date.now() });
  if (list.length > 50) list.splice(0, list.length - 50); // keep last 50
  await redis.hSet(key(reqId), { diag: JSON.stringify(list), updatedAt: String(Date.now()) });
}

module.exports = {
  KEY_PREFIX,
  TTL_SECONDS,
  makeReqId,
  create,
  get,
  setStage,
  setStatus,
  setPromptConstructed,
  setCandidates,
  setVenues,
  setError,
  pushDiag
};
