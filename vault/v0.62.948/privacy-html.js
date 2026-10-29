// privacy-html.js — v0.62.735
//
// Renders the i18n privacy.body / legal.body string as a self-contained HTML
// page. Used by the /privacy and /legal HTTP routes so a single source of
// truth (i18n.js) drives both the chat-side commands and the hosted URLs —
// the privacy one is what BotFather's "Privacy Policy URL" field points at.
//
// v0.62.735 — the page used to offer a TWO-WAY toggle between EN and FR while
// the underlying strings carried eight languages. `?lang=ja` already rendered
// Japanese content, but the only link on the page said "Français" and no route
// from the page reached the other six. The switcher now lists every supported
// locale by its ENDONYM, for the same reason `language.btn.*` does: a reader
// who cannot read the current language still has to be able to find their own.
//
// The privacy.body string uses Telegram-flavoured Markdown:
//   *bold*  for headings / emphasis
//   • …     for bullet items (literal U+2022 prefix)
//   blank   line for paragraph break
// We translate each line in turn — bullets get wrapped in <ul>/<li>,
// blank lines flush any open list, all other lines become <p>. Bold
// runs are converted in place.

function renderPrivacyHtml(body, lang = 'en') {
  const lines = String(body || '').split('\n');
  const out = [];
  let inList = false;
  function closeList() {
    if (inList) { out.push('</ul>'); inList = false; }
  }
  for (const line of lines) {
    // legal.body carries a markdown link for takedown requests. Without this the
    // page rendered the literal `[text](url)` and the contact route was unusable.
    const bolded = line
      .replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
        '<a href="$2" rel="noopener noreferrer">$1</a>');
    if (bolded.startsWith('• ')) {
      if (!inList) { out.push('<ul>'); inList = true; }
      out.push(`<li>${bolded.slice(2)}</li>`);
      continue;
    }
    closeList();
    if (bolded === '') continue;
    out.push(`<p>${bolded}</p>`);
  }
  closeList();
  return out.join('\n');
}

// Wraps the rendered body in a minimal mobile-friendly HTML document.
// Includes a language toggle to the alternate locale.
// Endonyms, not exonyms: the switcher has to be readable to someone who cannot
// read the page they are currently on.
const LOCALE_NAMES = {
  en: 'English', fr: 'Français', id: 'Bahasa Indonesia', ru: 'Русский',
  de: 'Deutsch', zh: '中文', ja: '日本語', es: 'Español', ko: '한국어'
};

const TITLES = {
  privacy: {
    en: 'Privacy', fr: 'Confidentialité', id: 'Privasi', ru: 'Конфиденциальность',
    de: 'Datenschutz', zh: '隐私', ja: 'プライバシー', es: 'Privacidad', ko: '개인정보'
  },
  legal: {
    en: 'Legal', fr: 'Mentions légales', id: 'Hukum', ru: 'Правовая информация',
    de: 'Rechtliches', zh: '法律声明', ja: '法的事項', es: 'Aviso legal', ko: '법적 고지'
  }
};

/**
 * @param {string} body   the resolved i18n string for this page and locale
 * @param {string} lang   the locale being rendered
 * @param {object} [opts] { kind: 'privacy' | 'legal', locales: string[] }
 */
function renderPrivacyPage(body, lang = 'en', opts = {}) {
  const kind = TITLES[opts.kind] ? opts.kind : 'privacy';
  const locales = (opts.locales && opts.locales.length)
    ? opts.locales
    : Object.keys(LOCALE_NAMES);
  const l = LOCALE_NAMES[lang] ? lang : 'en';
  const title = `${TITLES[kind][l] || TITLES[kind].en} — Soleat`;
  const inner = renderPrivacyHtml(body, l);
  const links = locales
    .filter((x) => x !== l && LOCALE_NAMES[x])
    .map((x) => `<a href="?lang=${x}" hreflang="${x}">${LOCALE_NAMES[x]}</a>`)
    .join(' · ');
  return [
    '<!doctype html>',
    `<html lang="${l}">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    '<style>',
    'body { font: 16px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; max-width: 640px; margin: 1.5em auto; padding: 0 1em; color: #1a1a1a; background: #fafafa; }',
    'p { margin: 0.6em 0; }',
    'p:first-of-type { font-size: 1.2em; }',
    'ul { padding-left: 1.4em; margin: 0.4em 0 1em; }',
    'li { margin: 0.25em 0; }',
    'a { color: #0078e7; }',
    'strong { color: #000; }',
    '.lang-toggle { margin-top: 2em; padding-top: 1em; border-top: 1px solid #e5e5e5; font-size: 0.9em; color: #666; line-height: 2; }',
    '.lang-toggle a { margin-right: 0.35em; white-space: nowrap; }',
    '@media (prefers-color-scheme: dark) {',
    '  body { color: #e5e5e5; background: #181818; }',
    '  strong { color: #fff; }',
    '  a { color: #5ab1ff; }',
    '  .lang-toggle { border-top-color: #333; color: #999; }',
    '}',
    '</style>',
    '</head>',
    '<body>',
    inner,
    `<div class="lang-toggle">${links}</div>`,
    '</body>',
    '</html>'
  ].join('\n');
}

module.exports = { renderPrivacyHtml, renderPrivacyPage, LOCALE_NAMES, TITLES };
