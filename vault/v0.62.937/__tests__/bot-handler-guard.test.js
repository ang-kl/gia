// bot-handler-guard.test.js — v0.62.893
//
// THE WORST FAILURE A CHAT BOT HAS IS SILENCE. Sixteen `bot.onText` handlers had
// no try/catch. node-telegram-bot-api ignores the promise a handler returns, so a
// rejection went to `process.on('unhandledRejection')`, was logged to Sentry, and
// the user saw NOTHING — not an error, not a "try again", nothing. Every one of
// those handlers opens with `resolveLang`, a Redis read, so a single blip was a
// dead command with no feedback on /s, /hidden, /w, /clip, /hk, /t, /b, /language
// and eight more.
//
// THE LESSON WAS ALREADY IN THE FILE. `runSearchCommand` carries it verbatim:
// "never let a /s turn go silent … a throw in any of them used to propagate out of
// the bot.onText callback with no user-facing message". That guard was wrapped
// around ONE call inside ONE handler — and bare `/s`, the commonest way anyone
// enters search, was still uncovered. Knowing the rule and applying it in one place
// is how sixteen handlers stayed unguarded for a year.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const SRC = readFileSync(join(ROOT, 'index.js'), 'utf8');
const LINES = SRC.split('\n');
const { t, SUPPORTED } = require('../i18n.js');

/** Every top-level `bot.onText(` registration, with its body. */
function registrations() {
  const out = [];
  for (let i = 0; i < LINES.length; i++) {
    if (!/^bot\.onText\(/.test(LINES[i])) continue;
    let j = i;
    while (j < LINES.length && LINES[j] !== '});' && LINES[j] !== '}));') j++;
    out.push({ line: i + 1, head: LINES[i], body: LINES.slice(i, j + 1).join('\n') });
  }
  return out;
}

describe('no command handler can go silent', () => {
  it('every async bot.onText handler is guarded, one way or the other', () => {
    // Either wrapped in `guarded(...)` at registration, or carrying its own
    // try/catch inside. Both are acceptable; neither being present is not.
    const naked = registrations()
      .filter((r) => /async \(msg/.test(r.head))
      .filter((r) => !/guarded\('/.test(r.head) && !/\n\s*try \{/.test(r.body))
      .map((r) => `index.js:${r.line} ${r.head.slice(0, 60)}`);
    expect(naked).toEqual([]);
  });

  it('sixteen are wrapped at the registration — the count is pinned', () => {
    // Pinned deliberately: a NEW handler added without a guard should show up as a
    // change here, not slip in under a >= .
    expect((SRC.match(/guarded\('/g) || []).length).toBe(16);
    expect(registrations().length).toBe(33);
  });

  it('the commands the operator actually uses are among them', () => {
    const heads = registrations().map((r) => r.head).join('\n');
    for (const [tag, rx] of [
      ['search', /search\|s\)/], ['hidden', /\\\/hidden/], ['language', /LANGUAGE_CMD_RE/],
      ['clip', /clip\|cl\|clipboard\)/], ['hawker', /hawker\|hk\)/], ['weather', /weather\|w\)/],
    ]) {
      const line = heads.split('\n').find((h) => rx.test(h));
      expect(line, `${tag} registration not found`).toBeTruthy();
      expect(line, `${tag} is not guarded`).toContain("guarded('");
    }
  });
});

describe('the guard itself cannot fail silently', () => {
  it('it replies, and it replies through safeSend', () => {
    expect(SRC).toMatch(/^function guarded\(tag, fn\) \{/m);
    expect(SRC, 'the reply is the whole point').toMatch(/await safeSend\(chatId, t\('bot\.error\.generic', lang\)\);/);
  });

  it('resolving the locale cannot throw a SECOND time and re-orphan the reply', () => {
    // The catch block runs because something already failed — very possibly Redis,
    // which is exactly what resolveLang reads. An unguarded resolveLang here would
    // throw inside the handler for the throw, and the user would be back to silence
    // with an extra stack trace in Sentry.
    expect(SRC).toMatch(/try \{ lang = await resolveLang\(redis, chatId, msg\); \} catch \{[^}]*\}/);
    expect(SRC, 'and it must default to a real locale, not undefined').toMatch(/let lang = 'en';/);
  });

  it('a missing chat id returns instead of sending into the void', () => {
    expect(SRC).toMatch(/const chatId = msg\?\.chat\?\.id;\n\s*if \(!chatId\) return;/);
  });

  it('the message it sends exists in all nine locales, and says something useful', () => {
    for (const l of SUPPORTED) {
      const v = t('bot.error.generic', l);
      expect(typeof v, l).toBe('string');
      expect(v.trim().length, l).toBeGreaterThan(15);
      if (l !== 'en') expect(v, `${l} is still the English string`).not.toBe(t('bot.error.generic', 'en'));
    }
    expect(SUPPORTED).toHaveLength(9);
  });
});
