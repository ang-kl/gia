// __tests__/prompt-locale.test.js — v0.62.839.
//
// Operator: "thorough check all the codebase for hard-coded foreign language that
// ought to be dynamic translated". The audit's headline finding was NOT a hardcoded
// string at all — it was an ABSENT one.
//
// Every prompt that told the model which language to write in was shaped
// `lang === 'fr' ? <a French instruction> : ''`. French got an instruction, English
// needs none, and the other SIX locales got an empty string — so the model wrote
// English. Seven sites: pipeline.js ×2 (vibe / dishes / signature_dish),
// gemini-client.js ×3 (chat reply, hidden-gems narration, dish explainer),
// vibe-summary.js ×2 (the sanctuary summary and its CACHE KEY).
//
// THIS IS WHY THE OPERATOR'S SCREENSHOT LOOKED LIKE A MISSING TRANSLATION. The card
// read `おすすめ: lobster cream pasta • crab arrabiata • tiramisu` — the label came
// from the i18n table and was Japanese; the dishes came from the model and were
// English. Chasing it as a missing key would have found nothing, because the key
// was there and correct. It is also NOT O-337: that is Google Places DATA, which
// costs money to re-request; this is our own narration and costs nothing.
//
// THE CACHE KEY IS HALF THE BUG, and the half that is easy to miss.
// `vibe-summary.js` clamped its Redis key dimension to `fr`/`en`, so a Japanese
// reader was served the ENGLISH cached summary. Localising the prompt alone would
// have changed nothing for them — the prompt would never have run.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const {
  APP_LOCALES, needsLocalisation, narrationLocalisation,
  replyLanguageLine, proseLanguageLine, ICONIC_SG_DISHES,
} = require('../prompt-locale');
const { langName } = require('../translate-review');

describe('the model is told the reader’s language, for every locale the app ships', () => {
  it('all six formerly-silent locales now get an instruction', () => {
    // The regression this file exists for. Before v0.62.839 each of these produced ''.
    for (const l of ['id', 'ru', 'de', 'zh', 'ja', 'es']) {
      const block = narrationLocalisation(l);
      expect(block, `${l} still gets no instruction`).not.toBe('');
      expect(block).toContain(langName(l).toUpperCase());
    }
  });

  it('French still gets one — the locale that worked must keep working', () => {
    expect(narrationLocalisation('fr')).toContain('FRENCH');
  });

  it('English gets none, because the prompt is already written in it', () => {
    expect(narrationLocalisation('en')).toBe('');
    expect(replyLanguageLine('en')).toBe('Reply in English (en).');
  });

  it('an unsupported code gets none rather than a nonsense instruction', () => {
    // `langName('kr')` returns the uppercase fallback 'KR' — 'kr' is not an ISO code,
    // Korean is 'ko'. Gating on "langName returned something" would have told the
    // model to write in "KR". Found by exercising the function, not by reading it,
    // and pinned here so the gate cannot quietly widen back to langName's 35 codes.
    for (const junk of ['kr', 'ko', 'xx', 'en-GB', '', null, undefined, 42]) {
      expect(needsLocalisation(junk), `${junk} should not be localised`).toBe(false);
      expect(narrationLocalisation(junk)).toBe('');
    }
  });

  it('every app locale is covered, and the list is the app’s — not langName’s', () => {
    expect(APP_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']);
    for (const l of APP_LOCALES) expect(langName(l), `langName has no name for ${l}`).toBeTruthy();
  });

  it('iconic Singapore dish names are protected in EVERY locale, not just French', () => {
    // The French block already did this. A translated dish name matches nothing the
    // user could search for and erases the name the dish actually has, so the
    // protection is inherited rather than reinvented.
    for (const l of ['ja', 'zh', 'de']) {
      const b = narrationLocalisation(l);
      expect(b).toContain('laksa');
      expect(b).toContain('char kway teow');
      expect(b).toMatch(/ORIGINAL form, untranslated/);
    }
    expect(ICONIC_SG_DISHES).toContain('teh tarik');
  });

  it('the reply and prose lines name the language, and keep lookup fields English', () => {
    expect(replyLanguageLine('ja')).toContain('Reply in Japanese (ja)');
    expect(replyLanguageLine('ja')).toContain('Places searchTerm in English');
    expect(proseLanguageLine('de', 'explainer', 'exampleDish'))
      .toBe('Write the "explainer" in German. Keep the dish name in "exampleDish" in its common English / original form.');
    expect(proseLanguageLine('en', 'explainer', 'exampleDish')).toBe('Write the "explainer" in English.');
  });
});

describe('the seven call sites actually use it', () => {
  it('pipeline.js narrates in the reader’s language on both prompts', () => {
    const src = read('pipeline.js');
    expect((src.match(/narrationLocalisation\(lang\)/g) || []).length).toBe(2);
    expect(src, 'a French-only langBlock survives').not.toMatch(/langBlock = lang === 'fr'/);
  });

  it('gemini-client.js routes its chat reply and dish explainer through the helper', () => {
    const src = read('gemini-client.js');
    expect(src).toContain('replyLanguageLine(lang)');
    expect(src).toContain("proseLanguageLine(lang, 'explainer', 'exampleDish')");
  });

  it('gemini-client keeps the HAND-TUNED French block and adds a generic sibling', () => {
    // Deliberate asymmetry, asserted so it is not "tidied" away later. The French
    // block names exact label wordings ("Address" → "Adresse") and French
    // typographic rules; folding it into the generic version would regress a locale
    // that works today in order to fix six that did not.
    const src = read('gemini-client.js');
    expect(src).toContain('HIDDEN_GEMS_LOCALISATION_FR');
    expect(src).toContain('function hiddenGemsLocalisationFor(lang)');
    expect(src).toMatch(/if \(lang === 'fr'\) return .*HIDDEN_GEMS_LOCALISATION_FR/);
  });

  it('vibe-summary localises the prompt AND widens the cache key with it', () => {
    // Both halves, because either alone is a no-op: an unlocalised prompt behind a
    // widened key still writes English, and a localised prompt behind a clamped key
    // never runs — the reader is served the cached English entry instead.
    const src = read('vibe-summary.js');
    expect(src).toContain('SUMMARY_LOCALES.includes(lang)');
    expect(src, 'the cache key is still clamped to fr/en')
      .not.toContain("const safeLang = lang === 'fr' ? 'fr' : 'en';");
    expect(src).toContain('needsLocalisation(lang)');
    expect(src).toContain('SG_ICONIC_DISHES');
  });
});
