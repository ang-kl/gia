// misrepresented-dishes.js — v0.60.128
//
// Curated lookup table of "misrepresented" dishes / desserts / drinks
// (sourced from data/Misrepresented Dish Dessert Drink.MD — operator-
// maintained plain text, one entry per line in the form
//   "Name - often assumed X, but actually Y."
// ).
//
// Used as a SUPPLEMENTARY context layer on the free-text dish-search
// paths (the chat free-text handler + the Cuisine TMA "Tell me" box):
// when a user types one or two words that name one of these dishes, we
// surface the "actually it's …" note alongside whatever search runs.
//
// NOTE — this is NOT the /s (/search) command and NOT R.E.D's
// AMBIGUOUS_DISHES disambiguator (gemini-client.js). R.E.D resolves a
// term to a single canonical interpretation + steers the Places query;
// this table only adds an informational note and is consulted ONLY
// when R.E.D did not itself resolve the term (so no double disclosure).

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'Misrepresented Dish Dessert Drink.MD');

// Max words / chars we'll even attempt a lookup for. The operator's
// note says "one or two words"; the table itself has a few 3–5 word
// names ("Hainanese chicken rice", "Macanese pork chop bun"), and an
// exact match on those is still useful — but anything longer than a
// short phrase is a sentence, not a dish, so we bail early.
const MAX_LOOKUP_WORDS = 6;
const MAX_LOOKUP_CHARS = 48;

// Normalise a name / query for matching: lowercase, strip diacritics,
// fold curly apostrophes, drop punctuation, collapse whitespace.
function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')         // combining diacritics
    .replace(/[‘’ʼ']/g, '')   // apostrophes → nothing ("tso's" → "tsos")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')             // any other punctuation → space
    .replace(/\s+/g, ' ')
    .trim();
}

// Very small plural→singular folder on the LAST word only, so
// "goulash dumplings" matches the entry "Goulash dumpling" and
// "fortune cookie" matches "Fortune cookies". Returns the folded
// string, or null when nothing changed.
function singularizeLastWord(normStr) {
  const parts = String(normStr || '').split(' ');
  if (!parts.length || !parts[parts.length - 1]) return null;
  const last = parts[parts.length - 1];
  let folded = last;
  if (/(shes|ches|sses|xes|zes)$/.test(last) && last.length > 4) folded = last.slice(0, -2);
  else if (/s$/.test(last) && last.length > 3 && !/(ss|us|is|ous)$/.test(last)) folded = last.slice(0, -1);
  if (folded === last) return null;
  parts[parts.length - 1] = folded;
  return parts.join(' ');
}

function parseFile() {
  let text;
  try {
    text = fs.readFileSync(DATA_FILE, 'utf8');
  } catch (err) {
    console.warn('[misrepresented-dishes] data file not readable:', err.message);
    return { entries: [], byKey: new Map(), prefix: new Map() };
  }

  const entries = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Entry lines look like "Name - <explanation>". Requiring a
    // space-hyphen-space separator already excludes the file's header
    // sentence and stray lines; we add a couple of cheap sanity
    // checks (the name part is short, has no sentence punctuation).
    const m = line.match(/^([^.!?\n]{2,60}?)\s+-\s+(.{10,})$/);
    if (!m) continue;
    const name = m[1].trim();
    const desc = m[2].trim();
    if (!name || !desc) continue;
    if (name.split(/\s+/).length > 7) continue;
    entries.push({ name, desc });
  }

  const byKey = new Map();   // normalised key → entry
  const prefix = new Map();  // first-word key → [entries] (for 1-word lookups)

  const addKey = (key, entry) => {
    if (!key) return;
    if (!byKey.has(key)) byKey.set(key, entry);
  };

  for (const entry of entries) {
    const nk = norm(entry.name);
    addKey(nk, entry);
    const sing = singularizeLastWord(nk);
    if (sing) addKey(sing, entry);
    // index by first word so a single-word query can hit a multi-word
    // entry when it's the *only* entry starting with that word.
    const first = nk.split(' ')[0];
    if (first) {
      if (!prefix.has(first)) prefix.set(first, []);
      const arr = prefix.get(first);
      if (!arr.includes(entry)) arr.push(entry);
    }
  }

  return { entries, byKey, prefix };
}

const { entries: ENTRIES, byKey: BY_KEY, prefix: PREFIX } = parseFile();

// Look up a free-text query against the table.
// Returns { name, note } or null. `note` is the full "often assumed …,
// but …" description verbatim (English — the source data is English-
// only).
function lookupMisrepresentedDish(query) {
  const q0 = norm(query);
  if (!q0) return null;
  if (q0.length > MAX_LOOKUP_CHARS) return null;
  const words = q0.split(' ');
  if (words.length > MAX_LOOKUP_WORDS) return null;

  // 1) exact / singularised exact match
  let hit = BY_KEY.get(q0);
  if (!hit) {
    const sing = singularizeLastWord(q0);
    if (sing) hit = BY_KEY.get(sing);
  }
  // 2) single-word query → the unique entry starting with that word
  if (!hit && words.length === 1) {
    const arr = PREFIX.get(words[0]);
    if (Array.isArray(arr) && arr.length === 1) hit = arr[0];
  }
  if (!hit) return null;
  return { name: hit.name, note: hit.desc };
}

function getMisrepresentedDishCount() {
  return ENTRIES.length;
}

// Full parsed table (array of { name, desc }) — for tests / a future
// "tabulate" surface.
function getMisrepresentedTable() {
  return ENTRIES.map((e) => ({ name: e.name, note: e.desc }));
}

module.exports = {
  lookupMisrepresentedDish,
  getMisrepresentedDishCount,
  getMisrepresentedTable,
  // exported for unit tests
  _norm: norm,
  _singularizeLastWord: singularizeLastWord,
};
