'use strict';

// v0.62.884 — the Telegram slash-menu command list, as data.
//
// WHY THIS FILE EXISTS. index.js has no module.exports and cannot be required
// by a test, so anything inside it is unreachable to the suite. The command
// list lived there as two hardcoded arrays — English and French, side by side —
// and `grep -rn setMyCommands __tests__/` returned nothing. Seven of the nine
// locales had no list at all, and nothing would ever have said so. Same shape
// as bot-description-fit.js: the pure part comes out here where a guard can
// reach it, and index.js keeps only the calls that need `bot`.
//
// THE ORDER OF THIS ARRAY IS THE ORDER OF THE MENU. Telegram renders the list
// exactly as sent, so this is copy, not configuration. Hidden commands (/ver,
// /legal, /hidden, /clip, /log, /drink, /grocery, /buddy) are deliberately
// absent — their handlers exist, the menu does not list them.
const COMMAND_IDS = [
  'menu',
  'cuisine',
  'location',
  'hawker',
  'recognised',
  'weather',
  'transport',
  'carpark',
  'search',
  'rating',
  'clipboard',
  'language',
  'privacy',
  'forgetme',
];

// Telegram's own limits, from the Bot API BotCommand object. Kept here rather
// than in the test so that the values a guard asserts and the values the code
// believes are the same values.
const MAX_COMMANDS = 100;
const NAME_MAX = 32;
const DESCRIPTION_MAX = 256;
const NAME_RE = /^[a-z0-9_]{1,32}$/;

// A per-chat scope. This is the whole answer to "make the menu follow the
// toggle": Bot API §Determining list of commands ranks botCommandScopeChat
// ABOVE botCommandScopeDefault + language_code, so a list set here wins over
// whatever the user's Telegram CLIENT language would otherwise have selected.
// `language_code` is matched against that client language, never against our
// stored /language preference — which is why registering the nine language
// lists alone would not have fixed anything for a user whose app is in English.
//
// Set it with NO language_code. Adding one moves the entry from rank 2 to rank
// 1, which is narrower, not stronger: it would then apply only to users whose
// client language happens to match, i.e. exactly the users who did not need it.
function chatScope(chatId) {
  return { type: 'chat', chat_id: chatId };
}

// node-telegram-bot-api 0.64.0 is ASYMMETRIC here and it is a silent failure:
// setMyCommands() JSON-stringifies form.scope for you (src/telegram.js:2139),
// deleteMyCommands() does NOT (src/telegram.js:2158). Passing the object to
// delete sends the literal string "[object Object]", which Telegram accepts as
// a malformed scope rather than rejecting loudly. Every delete goes through
// here so the difference is stated once.
function deleteScopeArg(chatId) {
  return JSON.stringify(chatScope(chatId));
}

// Build the list Telegram receives. Pure: no bot, no redis, no I/O.
// `counts` carries the live Periodical figures ({cuisines}, {hawker}); `n` is
// filled in from the locale count so the /language description can never again
// drift out of step with SUPPORTED the way "English / Français" did.
function buildCommandList(lang, counts = {}) {
  const { tn, SUPPORTED } = require('./i18n');
  const vars = {
    cuisines: counts.cuisines != null ? counts.cuisines : '',
    hawker: counts.hawker != null ? counts.hawker : '',
    n: SUPPORTED.length,
  };
  return COMMAND_IDS.map((command) => ({
    command,
    description: tn(`bot.commands.${command}`, lang, vars),
  }));
}

// v0.62.885 — the "What can this bot do?" pane, built from the same COMMAND_IDS
// as the menu so the two can never disagree about which commands exist. That
// disagreement is exactly what went wrong: the pane advertised /buddy for three
// months after v0.60.113 removed it from the menu, and omitted three commands
// the menu had. Deriving the list makes it structural rather than remembered.
//
// Telegram caps the pane at 512 characters TOTAL and the profile blurb at 120
// (Bot API setMyDescription / setMyShortDescription). Both are asserted in
// __tests__/bot-commands.test.js against every locale and every count value.
const DESCRIPTION_CAP = 512;
const SHORT_DESCRIPTION_CAP = 120;

function buildDescription(lang, counts = {}) {
  const { t, tn, SUPPORTED } = require('./i18n');
  const vars = {
    cuisines: counts.cuisines != null ? counts.cuisines : '',
    hawker: counts.hawker != null ? counts.hawker : '',
    n: SUPPORTED.length,
  };
  const lines = COMMAND_IDS.map((id) => `/${id} · ${tn(`bot.about.${id}`, lang, vars)}`);
  return `${lines.join('\n')}\n\n${t('bot.about.hint', lang)}`;
}

function buildShortDescription(lang) {
  return require('./i18n').t('bot.about.short', lang);
}

module.exports = {
  COMMAND_IDS,
  DESCRIPTION_CAP,
  SHORT_DESCRIPTION_CAP,
  buildDescription,
  buildShortDescription,
  MAX_COMMANDS,
  NAME_MAX,
  DESCRIPTION_MAX,
  NAME_RE,
  chatScope,
  deleteScopeArg,
  buildCommandList,
};
