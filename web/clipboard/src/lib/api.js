// Clipboard TMA → backend client.
//
// Thin wrappers around the 16 endpoints PR #2 mounts under /api/clipboard.
// Every authed call stuffs initData inline (matches the cuisine TMA's
// postJson pattern) so the server's requireInitDataFromBodyOrHeader gate
// can verify either header or body.

import { initData } from './tg.js';

const BASE = '/api/clipboard';

async function jsonOr(error, res) {
  let body = null;
  try { body = await res.json(); } catch { /* may be empty */ }
  if (!res.ok) {
    const e = new Error(error);
    e.status = res.status;
    e.body = body;
    throw e;
  }
  return body;
}

async function postJson(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData() },
    body: JSON.stringify({ initData: initData(), ...body })
  });
  return jsonOr(`POST ${path} failed`, res);
}

async function patchJson(path, body = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData() },
    body: JSON.stringify({ initData: initData(), ...body })
  });
  return jsonOr(`PATCH ${path} failed`, res);
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'X-Telegram-Init-Data': initData() }
  });
  return jsonOr(`GET ${path} failed`, res);
}

async function delJson(path) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: { 'X-Telegram-Init-Data': initData() }
  });
  return jsonOr(`DELETE ${path} failed`, res);
}

// ── State + cabinets ─────────────────────────────────────────────────

export const getState              = () => getJson('/state');
// v0.62.433 — archive (clear-all, 30-day) + restore the catch-all.
export const archiveAll            = () => postJson('/archive-all', {});
export const restoreArchive        = () => postJson('/restore-archive', {});
export const getCabinet            = (cabId) => getJson(`/cabinet/${cabId}`);
export const createCabinet         = (patch) => postJson('/cabinet', patch);
export const updateCabinet         = (cabId, patch) => patchJson(`/cabinet/${cabId}`, patch);
export const deleteCabinet         = (cabId) => delJson(`/cabinet/${cabId}`);
// v0.62.416 — default cabinet (footer tab 2) + duplicate cabinet.
export const setDefaultCabinet     = (cabId) => postJson(`/cabinet/${cabId}/default`, {});
export const duplicateCabinet      = (cabId) => postJson(`/cabinet/${cabId}/duplicate`, {});

// ── Drawers ──────────────────────────────────────────────────────────

export const addDrawer             = (cabId, patch) => postJson(`/cabinet/${cabId}/drawer`, patch);
export const deleteDrawer          = (cabId, n) => delJson(`/cabinet/${cabId}/drawer/${n}`);
export const updateDrawer          = (cabId, n, patch) => patchJson(`/cabinet/${cabId}/drawer/${n}`, patch);
// v0.62.416 — duplicate a drawer (copies its cards).
export const duplicateDrawer       = (cabId, n) => postJson(`/cabinet/${cabId}/drawer/${n}/duplicate`, {});

// ── Cards ────────────────────────────────────────────────────────────

export const placeCard             = (cardId, cabinetId, drawerIdx) => postJson(`/card/${cardId}/place`, { cabinetId, drawerIdx });
export const unplaceCard           = (cardId, cabinetId, drawerIdx) => postJson(`/card/${cardId}/unplace`, { cabinetId, drawerIdx });
export const moveCard              = (cardId, from, to) => postJson(`/card/${cardId}/move`, { from, to });
export const amendCard             = (cardId, patch) => patchJson(`/card/${cardId}`, patch);
export const deleteCard            = (cardId) => delJson(`/card/${cardId}`);

// ── Share + fork ─────────────────────────────────────────────────────

export const shareDrawer           = (cabId, n) => postJson(`/cabinet/${cabId}/drawer/${n}/share`, {});
export const readSharedDrawer      = (token) => getJson(`/shared/${token}`);
export const forkSharedDrawer      = (token, cabinetId = null) => postJson(`/shared/${token}/fork`, cabinetId ? { cabinetId } : {});
