// freetext-history.js — v0.62.964. The last 30 searches typed into Cuisine's free-text box.
//
// Spec: doc/Feature/2026-10-31-tellme-keyboard-toggle-and-history.spec.md, C4, C5, C7, C8.
//
// WHERE (C5; operator, A3: "Telegram account"). The list lives in the user's own Telegram CloudStorage (Bot API 6.9+),
// so it follows them across devices and our server never holds a copy. Outside Telegram, or on an older client, it
// falls back to localStorage under the same key. CloudStorage values are capped at 4,096 characters, so the stored
// JSON is kept under that by dropping the oldest entries.
//
// ERASING (C7). /forgetme cannot reach this list: CloudStorage lives in the user's Telegram account and the Bot API has
// no server-side way to read or erase it. The list's own "Clear all" is the way to erase it.
//
// STRINGS (C8; operator: "Separate table"). The box's four new labels live here, not in i18n.js, whose Cuisine table is
// pinned at exactly 410 keys by tma-i18n-korean.test.js and tma-i18n-coverage.test.js. No React here, so the node
// suite imports it directly.

export const HISTORY_KEY = 'gia.freetext.v1';
export const MAX_ENTRIES = 30;
export const MAX_LEN = 120;
export const MAX_VALUE = 4096;

const clean = (text) => (typeof text === 'string' ? text.trim().slice(0, MAX_LEN) : '');

// C4 — newest first; a repeat (matched regardless of case) moves to the top rather than being added twice.
export function addEntry(list, text) {
  const t = clean(text);
  if (!t) return Array.isArray(list) ? list : [];
  const key = t.toLowerCase();
  return [t, ...(Array.isArray(list) ? list : []).filter((s) => String(s).toLowerCase() !== key)].slice(0, MAX_ENTRIES);
}

export function removeEntry(list, text) {
  return (Array.isArray(list) ? list : []).filter((s) => s !== text);
}

// The stored value, kept strictly under CloudStorage's 4,096 characters by dropping the oldest entries.
export function serialise(list) {
  let l = (Array.isArray(list) ? list : []).slice(0, MAX_ENTRIES);
  let v = JSON.stringify(l);
  while (v.length >= MAX_VALUE && l.length) { l = l.slice(0, -1); v = JSON.stringify(l); }
  return v;
}

// I5 — never throws; anything that is not a list of strings reads as an empty list.
export function parse(value) {
  if (typeof value !== 'string' || !value) return [];
  let raw;
  try { raw = JSON.parse(value); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  let out = [];
  for (let i = raw.length - 1; i >= 0; i--) if (typeof raw[i] === 'string') out = addEntry(out, raw[i]);
  return out;
}

// CloudStorage only where Telegram says the client supports it (Bot API 6.9+): older clients log a warning and do
// nothing, which would silently lose the list.
export function resolveCloudStorage(webApp) {
  if (!webApp || !webApp.CloudStorage || typeof webApp.isVersionAtLeast !== 'function') return null;
  try { return webApp.isVersionAtLeast('6.9') ? webApp.CloudStorage : null; } catch { return null; }
}

export function createHistoryStore({ cloud = null, local = null } = {}) {
  return {
    load() {
      if (cloud) {
        return new Promise((resolve) => {
          try { cloud.getItem(HISTORY_KEY, (err, v) => resolve(err ? [] : parse(v))); } catch { resolve([]); }
        });
      }
      try { return Promise.resolve(parse(local ? local.getItem(HISTORY_KEY) : null)); } catch { return Promise.resolve([]); }
    },
    save(list) {
      const v = serialise(list);
      if (cloud) {
        return new Promise((resolve) => {
          try { cloud.setItem(HISTORY_KEY, v, () => resolve()); } catch { resolve(); }
        });
      }
      try { if (local) local.setItem(HISTORY_KEY, v); } catch { /* storage unavailable: kept for this view only */ }
      return Promise.resolve();
    },
  };
}

// The store the app uses: Telegram's CloudStorage when available, else this device's localStorage.
export function defaultHistoryStore() {
  const w = typeof window !== 'undefined' ? window : null;
  let local = null;
  try { local = w && w.localStorage ? w.localStorage : null; } catch { local = null; }
  return createHistoryStore({ cloud: resolveCloudStorage(w && w.Telegram && w.Telegram.WebApp), local });
}

export const FREETEXT_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const FREETEXT_STRINGS = {
  'kb.hide': { en: 'Hide keyboard', fr: 'Masquer le clavier', id: 'Sembunyikan keyboard', ru: 'Скрыть клавиатуру', de: 'Tastatur ausblenden', zh: '隐藏键盘', ja: 'キーボードを隠す', es: 'Ocultar teclado', ko: '키보드 숨기기' },
  'kb.show': { en: 'Show keyboard', fr: 'Afficher le clavier', id: 'Tampilkan keyboard', ru: 'Показать клавиатуру', de: 'Tastatur einblenden', zh: '显示键盘', ja: 'キーボードを表示', es: 'Mostrar teclado', ko: '키보드 보이기' },
  'list.clearAll': { en: 'Clear all', fr: 'Tout effacer', id: 'Hapus semua', ru: 'Очистить всё', de: 'Alle löschen', zh: '全部清除', ja: 'すべて消去', es: 'Borrar todo', ko: '모두 지우기' },
  'list.remove': { en: 'Remove', fr: 'Retirer', id: 'Hapus', ru: 'Удалить', de: 'Entfernen', zh: '删除', ja: '削除', es: 'Quitar', ko: '삭제' },
};

export function ft(key, lang) {
  const row = FREETEXT_STRINGS[key];
  if (!row) return key;
  return row[lang] || row.en;
}
