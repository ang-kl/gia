// pronounce-client.js — v0.62.841
//
// The Mini Apps' side of `POST /api/pronounce`. Operator: "do the hawker centre and
// train line endpoint".
//
// WHY THE CLIENT FILTERS, AND WHY THAT IS THE COST CONTROL.
// The government register already gives Chinese and Malay names for all 123 hawker
// centres, 193 MRT/LRT stations and the MRT lines — and those tables are bundled
// HERE, in the app. So the caller resolves its own curated answer first and this
// module only asks the server for what is genuinely missing. A Chinese or Indonesian
// reader therefore sends NO request at all, and a Japanese one sends only the names
// the register never covered. That is the operator's "minimum token" cap enforced
// at the cheapest possible point: before the network, let alone before the model.
//
// THREE LAYERS OF CACHE, because the same names recur constantly:
//   1. an in-flight map, so two components mounting at once make ONE request;
//   2. a module-level memory cache, for the life of the page;
//   3. localStorage, so a relaunch costs nothing.
// A null answer ("no guide needed") is cached at every layer exactly like a hit.
// Caching only successes would re-ask every already-sayable name forever, which is
// the same mistake `pronounce-name.js` avoids server-side.

const ENDPOINT = '/api/pronounce';
const LS_KEY = 'gia.say.v1';
const MAX_PER_REQUEST = 60;   // matches the server's cap
// NUL, written as an ESCAPE and not as a literal byte. The first draft embedded three
// real 0x00 bytes here and in `keyOf` — valid JavaScript, and git classified the file
// as BINARY, so the whole module showed as an unreviewable blob in the diff. A
// sentinel has to be a value no guide can equal; it does not have to be unprintable
// in the source.
const NULL_MARK = '\u0000';   // "asked, needs no guide" — distinct from "never asked"

const memory = new Map();     // `${lang}\u0000${name}` -> string | NULL_MARK
const inFlight = new Map();   // same key -> Promise

const keyOf = (lang, name) => `${lang}\u0000${String(name).trim().toLowerCase()}`;

function loadStore() {
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch { return {}; }   // private mode, or a corrupt value — behave as empty
}

function saveStore(store) {
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(store)); }
  catch { /* full or blocked — memory cache still holds for this session */ }
}

/** Seed the memory cache from localStorage once per page. */
let hydrated = false;
function hydrate() {
  if (hydrated) return;
  hydrated = true;
  const store = loadStore();
  for (const [k, v] of Object.entries(store)) {
    if (typeof v === 'string') memory.set(k, v);
  }
}

/**
 * What we already know for `name` in `lang`, without asking anyone.
 * @returns {string|null|undefined} a guide, null for "needs none", undefined for
 *          "never asked" — three distinct states, and collapsing the last two is
 *          how a cache starts re-asking questions it has already answered.
 */
export function cachedPronunciation(name, lang) {
  hydrate();
  const v = memory.get(keyOf(lang, name));
  if (v === undefined) return undefined;
  return v === NULL_MARK ? null : v;
}

/**
 * Fetch pronunciations for `names` in `lang`, skipping anything already known.
 *
 * @param {string[]} names
 * @param {string} lang
 * @param {object} opts
 * @param {string} opts.initData      Telegram initData — the route is authenticated
 * @param {function} [opts.curatedFor] (name) => string|null, the app's own free answer
 * @param {function} [opts.fetchImpl]  test seam
 * @returns {Promise<Map<string, string|null>>} name → guide (or null)
 */
export async function fetchPronunciations(names, lang, { initData, curatedFor = null, fetchImpl = null } = {}) {
  hydrate();
  const out = new Map();
  if (!Array.isArray(names) || !names.length || !lang) return out;

  const ask = [];
  for (const raw of names) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const name = raw.trim();

    // 1. Curated wins outright and never touches the network. This is the branch
    //    that makes zh and id free for hawker centres and train lines.
    const curated = typeof curatedFor === 'function' ? curatedFor(name) : null;
    if (typeof curated === 'string' && curated.trim() && curated.trim() !== name) {
      out.set(name, curated.trim());
      continue;
    }
    // 2. Anything already answered, including a remembered "needs none".
    const known = cachedPronunciation(name, lang);
    if (known !== undefined) { if (known) out.set(name, known); continue; }
    ask.push(name);
  }
  if (!ask.length || !initData) return out;

  const doFetch = fetchImpl || ((...a) => window.fetch(...a));
  const store = loadStore();

  for (let i = 0; i < ask.length; i += MAX_PER_REQUEST) {
    const batch = ask.slice(i, i + MAX_PER_REQUEST);
    const batchKey = `${lang}::${batch.join('|')}`;
    let p = inFlight.get(batchKey);
    if (!p) {
      p = doFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, lang, names: batch }),
      })
        .then((r) => (r && r.ok ? r.json() : { readings: {} }))
        .catch(() => ({ readings: {} }));   // offline / 401 — render no line
      inFlight.set(batchKey, p);
      p.finally(() => inFlight.delete(batchKey));
    }
    const data = await p;
    const readings = (data && data.readings) || {};
    for (const name of batch) {
      const say = typeof readings[name] === 'string' && readings[name].trim()
        ? readings[name].trim()
        : null;
      const k = keyOf(lang, name);
      // The null is stored too: "asked, needs none" must survive a reload, or the
      // next launch asks again and pays again.
      memory.set(k, say === null ? NULL_MARK : say);
      store[k] = say === null ? NULL_MARK : say;
      if (say) out.set(name, say);
    }
  }
  saveStore(store);
  return out;
}

/**
 * The answers for `names` in `lang`, as a Map — a pure PROJECTION of this module's cache.
 *
 * v0.62.847. `use-pronounce.js` used to keep its own accumulating Map and merge each
 * fetch into it. Codex caught the consequence on PR #1790 (P1): a `useState` initializer
 * runs once so it never re-seeded for a new locale, and the merge only ever ADDED keys —
 * so switching from a locale with guides (ja) to one that needs none (en) left the
 * Japanese guides on screen under an English UI, indefinitely.
 *
 * Deriving the map from the cache instead makes that structurally impossible: the cache
 * is keyed by (name, locale), so a projection of it cannot carry another locale's answer.
 *
 * Lives HERE, not in the hook, so it can be tested without React — the root vitest run
 * has no `web/*\/node_modules` (see `test-import-graph-guard.test.js`). A behaviour this
 * easy to get wrong should not be reachable only through a source-grep.
 *
 * @param {string[]} names
 * @param {string} lang
 * @param {function} [curatedFor] (name) => string|null — the caller's own free answer
 * @returns {Map<string,string>} only names that HAVE something to show
 */
export function projectPronunciations(names, lang, curatedFor = null) {
  const out = new Map();
  for (const n of Array.isArray(names) ? names : []) {
    if (typeof n !== 'string' || !n) continue;
    const c = typeof curatedFor === 'function' ? curatedFor(n) : null;
    if (typeof c === 'string' && c.trim() && c.trim() !== n) { out.set(n, c.trim()); continue; }
    const known = cachedPronunciation(n, lang);
    if (known) out.set(n, known);   // null ("needs none") correctly yields NO entry
  }
  return out;
}

/** Test seam — forget everything this module has learned. */
export function __resetPronounceCache() {
  memory.clear();
  inFlight.clear();
  hydrated = false;
  try { window.localStorage.removeItem(LS_KEY); } catch { /* noop */ }
}

export { LS_KEY, NULL_MARK, MAX_PER_REQUEST };
