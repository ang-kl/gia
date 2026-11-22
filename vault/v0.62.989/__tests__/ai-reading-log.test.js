// __tests__/ai-reading-log.test.js — v0.62.945.
//
// Spec: doc/Feature/2026-10-26-ai-place-building-scope.spec.md (I4).
//
// On 25-10 and 26-10 '26 the operator asked the AI about "Raffles City" and the log could not say
// whether the model dropped the place or never ran. Every AI question now reaches the identity-free
// free-text log (/ftlog), and one line records what the AI read.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nl = require('../nl-anchor');
const SRC = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');

describe('readingLine', () => {
  it('names source, place, how it was found, scope, new, cuisines and radius', () => {
    const line = nl.readingLine({ route: 'NL-Query', source: 'keyword-fallback', place: 'Raffles City', placeVia: 'detector', scope: 'building', newlyOpened: true, cuisines: ['thai'], radius: 1500, count: 3 });
    expect(line).toBe('[NL-Query] D769 reading source=keyword-fallback place="Raffles City" via=detector scope=building new=true cuisines=["thai"] radius=1500m results=3');
  });
  it('a reading with nothing still prints every field', () => {
    expect(nl.readingLine({})).toBe('[AI] D769 reading source=? place="" via=none scope=none new=false cuisines=[] radius=?m');
  });
  it('carries no chat id even when one is passed', () => {
    expect(nl.readingLine({ chatId: 4242424242, place: 'x' })).not.toMatch(/4242424242|chat/);
  });
});

describe('index.js wiring', () => {
  const nlRoute = SRC.slice(SRC.indexOf("app.post('/api/cuisine/nl-query'"), SRC.indexOf("app.post('/api/cuisine/nl-query'") + 40000);
  it('the AI route logs its reading and writes the question to /ftlog', () => {
    expect(nlRoute).toMatch(/nlAnchor\.readingLine\(\{[^}]*route: 'NL-Query'/);
    expect(nlRoute).toMatch(/logFreeTextQuery\(redis, text, \{ src: 'cuisine-tma-ai'/);
  });
  it('the chat path passes a logger and the place detector', () => {
    const at = SRC.indexOf('async function answerChatQuestionWithAi(');
    const body = SRC.slice(at, at + 6000);
    expect(body).toMatch(/log: \(line\) => console\.log\(line\)/);
    expect(body).toMatch(/detectPlace: /);
  });
});
