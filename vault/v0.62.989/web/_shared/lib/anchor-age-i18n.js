// anchor-age-i18n.js — v0.62.965. The "↩ Back to <place>" chip's strings, shared by the Cuisine and Menu Mini Apps.
//
// Spec: doc/Feature/2026-11-02-saved-place-expires-after-six-hours.spec.md, C4 and I7.
//
// A separate table, not the apps' i18n.js: tma-i18n-korean.test.js pins Cuisine's table at exactly 410 keys and
// Menu's at 80, and both are outside this spec's scope. Same arrangement as FREETEXT_STRINGS (v0.62.964) and
// SIM_STRINGS (v0.62.961). The chat's own lines live in the bot's i18n.js, which has no count pin.

export const CHIP_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const CHIP_STRINGS = {
  'chip.backTo': {
    en: '↩ Back to {label}',
    fr: '↩ Retour à {label}',
    id: '↩ Kembali ke {label}',
    ru: '↩ Вернуться к {label}',
    de: '↩ Zurück zu {label}',
    zh: '↩ 返回{label}',
    ja: '↩ {label}に戻る',
    es: '↩ Volver a {label}',
    ko: '↩ {label}(으)로 돌아가기',
  },
};

export function at(key, lang, vars = {}) {
  const row = CHIP_STRINGS[key];
  if (!row) return key;
  const raw = row[lang] || row.en;
  return raw.replace(/\{(\w+)\}/g, (_, name) => (vars[name] != null ? String(vars[name]) : `{${name}}`));
}

// The props both apps spread onto the chip's <button>, so the text, the label for screen readers and the test hook
// cannot drift apart between the two copies.
export function backToChipProps({ label, lang }) {
  const text = at('chip.backTo', lang, { label });
  return { text, 'aria-label': text, 'data-back-to': label, type: 'button' };
}
