// privacy-html.js — v0.59.10
//
// Renders the i18n privacy.body string (EN or FR) as a self-contained
// HTML page. Used by the /privacy HTTP route so a single source of
// truth (i18n.js) drives both the chat-side /privacy command and the
// hosted policy URL pasted into BotFather's "Privacy Policy URL" field.
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
    const bolded = line.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
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
function renderPrivacyPage(body, lang = 'en') {
  const altLang = lang === 'fr' ? 'en' : 'fr';
  const altLabel = lang === 'fr' ? 'English' : 'Français';
  const title = lang === 'fr' ? 'Confidentialité — Soleat' : 'Privacy — Soleat';
  const inner = renderPrivacyHtml(body, lang);
  return [
    '<!doctype html>',
    `<html lang="${lang}">`,
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
    '.lang-toggle { margin-top: 2em; padding-top: 1em; border-top: 1px solid #e5e5e5; font-size: 0.9em; color: #666; }',
    '.lang-toggle a { margin-right: 0.5em; }',
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
    `<div class="lang-toggle"><a href="?lang=${altLang}">${altLabel}</a></div>`,
    '</body>',
    '</html>'
  ].join('\n');
}

module.exports = { renderPrivacyHtml, renderPrivacyPage };
