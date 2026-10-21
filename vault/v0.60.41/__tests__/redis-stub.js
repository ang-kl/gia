// __tests__/redis-stub.js — minimal in-memory Redis mock (ESM).
//
// Surface-area: only what we use across the codebase.
// get / set (with EX) / del / incr / incrBy / hSet / hGet / hGetAll /
// hDel / expire / exists / sAdd / sMembers / sRem / sIsMember / ping /
// connect / quit / isOpen.

export class RedisStub {
  constructor() {
    this.store = new Map();
    this.hashes = new Map();
    this.sets = new Map();
    this.isOpen = true;
  }

  _isExpired(entry) {
    return entry?.expiresAt && entry.expiresAt < Date.now();
  }

  async connect() { this.isOpen = true; }
  async quit() { this.isOpen = false; }
  async ping() { return 'PONG'; }

  async get(key) {
    const e = this.store.get(key);
    if (!e) return null;
    if (this._isExpired(e)) { this.store.delete(key); return null; }
    return e.value;
  }

  async set(key, value, opts) {
    let expiresAt = null;
    if (opts?.EX) expiresAt = Date.now() + opts.EX * 1000;
    this.store.set(key, { value, expiresAt });
    return 'OK';
  }

  async setEx(key, seconds, value) {
    return this.set(key, value, { EX: seconds });
  }

  async del(...keys) {
    let n = 0;
    for (const key of keys) {
      if (this.store.delete(key)) n++;
      if (this.hashes.delete(key)) n++;
      if (this.sets.delete(key)) n++;
    }
    return n;
  }

  async exists(key) {
    return (this.store.has(key) || this.hashes.has(key) || this.sets.has(key)) ? 1 : 0;
  }

  async expire(key, seconds) {
    const e = this.store.get(key);
    if (e) { e.expiresAt = Date.now() + seconds * 1000; return 1; }
    return 0;
  }

  async incr(key) { return this.incrBy(key, 1); }

  async incrBy(key, n) {
    const cur = Number((await this.get(key)) || 0);
    const next = cur + n;
    await this.set(key, String(next));
    return next;
  }

  async hSet(key, field, value) {
    let h = this.hashes.get(key);
    if (!h) { h = new Map(); this.hashes.set(key, h); }
    if (typeof field === 'object') {
      for (const [k, v] of Object.entries(field)) h.set(k, String(v));
      return Object.keys(field).length;
    }
    const existed = h.has(field);
    h.set(field, String(value));
    return existed ? 0 : 1;
  }

  async hGet(key, field) {
    return this.hashes.get(key)?.get(field) ?? null;
  }

  async hGetAll(key) {
    const h = this.hashes.get(key);
    if (!h) return {};
    return Object.fromEntries(h.entries());
  }

  async hDel(key, ...fields) {
    const h = this.hashes.get(key);
    if (!h) return 0;
    let n = 0;
    for (const f of fields) if (h.delete(f)) n++;
    return n;
  }

  async sAdd(key, ...values) {
    let s = this.sets.get(key);
    if (!s) { s = new Set(); this.sets.set(key, s); }
    let n = 0;
    for (const v of values.flat()) {
      if (!s.has(String(v))) { s.add(String(v)); n++; }
    }
    return n;
  }

  async sMembers(key) {
    return [...(this.sets.get(key) || [])];
  }

  async sRem(key, ...values) {
    const s = this.sets.get(key);
    if (!s) return 0;
    let n = 0;
    for (const v of values.flat()) if (s.delete(String(v))) n++;
    return n;
  }

  async sIsMember(key, value) {
    return (this.sets.get(key)?.has(String(value)) ? 1 : 0);
  }

  _reset() {
    this.store.clear();
    this.hashes.clear();
    this.sets.clear();
  }
}

export function createStub() {
  return new RedisStub();
}
