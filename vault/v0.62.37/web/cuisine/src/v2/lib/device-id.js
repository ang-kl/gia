// device-id.js — v0.61.363
//
// A stable per-DEVICE token. One Telegram account (chatId) can run the
// TMA on several devices at once, each in a different place; without a
// device key the server's location + country-pref cache (keyed by chatId)
// clobbers across devices (last writer wins). This token — persisted in
// localStorage, regenerated only if cleared — is sent with every request
// (JSON body via postJson, or the X-Device-Id header via getJson) so each
// device gets its own server-side slot.

const STORAGE_KEY = 'gia_device_id';
let _cached;

function makeToken() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    }
  } catch { /* crypto unavailable — fall through */ }
  // Fallback: time + randomness, charset-safe ([a-z0-9]).
  return ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 14)).slice(0, 32);
}

export function deviceId() {
  if (_cached !== undefined) return _cached;
  let id = null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && /^[a-zA-Z0-9_-]{8,40}$/.test(stored)) id = stored;
  } catch { /* private mode / no storage */ }
  if (!id) {
    id = makeToken();
    try { window.localStorage.setItem(STORAGE_KEY, id); } catch { /* non-fatal */ }
  }
  _cached = id;
  return _cached;
}
