// __tests__/fun-facts.test.js — v0.61.290 (data path: .json → .js)

import { describe, it, expect, afterAll, vi } from 'vitest';
import {
  _pickFact,
  pickFunFact,
  factBody,
  totalFunFacts,
  clearFunFactHistory,
  deviceFactLang,
  dishFactsFromPlate
} from '../web/cuisine/src/v2/lib/fun-facts.js';
import facts from '../web/cuisine/src/v2/data/fun-facts.js';

describe('dishFactsFromPlate — 📜 dish explanations as fun facts (v0.62.x)', () => {
  const plate = {
    headliners: [
      { dish: 'Phở', local: 'Phở Hà Nội', note: { en: 'Hanoi beef noodle soup.', fr: 'Soupe de nouilles au bœuf.' } },
      { dish: 'NoNote' }, // skipped — no note
    ],
    groups: [
      { dishes: [
        { dish: 'Bún chả', note: { en: 'Grilled pork with noodles.' } },
        { dish: 'Phở', note: { en: 'dup — dropped' } }, // duplicate dish → deduped
      ] },
    ],
  };
  it('extracts one fact per noted dish, deduped, with name baked into the body', () => {
    const out = dishFactsFromPlate(plate);
    expect(out.map((f) => f.id)).toEqual(['dish:phở', 'dish:bún chả']);
    expect(out[0].en).toBe('Phở · Phở Hà Nội — Hanoi beef noodle soup.');
    expect(out[1].fr).toBe('Bún chả — Grilled pork with noodles.'); // fr falls back to en
    expect(out[0].source).toBe('Soleat');
  });
  it('tolerates a null / shapeless plate', () => {
    expect(dishFactsFromPlate(null)).toEqual([]);
    expect(dishFactsFromPlate({})).toEqual([]);
  });
  it('pickFunFact mixes a dish fact in (tagged to the live ctx) and can return it', () => {
    const extra = dishFactsFromPlate(plate);
    // Force the dish facts to be the only candidates by clearing history + a
    // deterministic rng — but simplest: assert a dish id is reachable.
    const picks = new Set();
    for (let i = 0; i < 40; i++) {
      const f = pickFunFact({ cuisines: ['pho'], region: 'OTHER', countryPref: 'VN' }, extra);
      if (f) picks.add(f.id);
    }
    expect([...picks].some((id) => id.startsWith('dish:'))).toBe(true);
  });
});

describe('fun-facts data contract', () => {
  it('exports 72 facts (40 SG-NLB + 12 MY-regional + 12 anti-repeat variety + 8 v0.61.383 global)', () => {
    expect(facts.length).toBe(72);
    expect(totalFunFacts()).toBe(72);
  });

  it('every fact has id + tags + EN + FR + source URL', () => {
    for (const f of facts) {
      expect(typeof f.id).toBe('string');
      expect(f.id.length).toBeGreaterThan(0);
      expect(Array.isArray(f.tags)).toBe(true);
      expect(f.tags.length).toBeGreaterThan(0);
      expect(typeof f.en).toBe('string');
      expect(f.en.length).toBeGreaterThan(20);
      expect(typeof f.fr).toBe('string');
      expect(f.fr.length).toBeGreaterThan(20);
      expect(typeof f.source).toBe('string');
      expect(typeof f.sourceUrl).toBe('string');
      expect(f.sourceUrl.startsWith('https://')).toBe(true);
    }
  });

  it('every fact ID is unique', () => {
    const ids = facts.map((f) => f.id);
    const set = new Set(ids);
    expect(set.size).toBe(ids.length);
  });

  it('every source URL points to nlb.gov.sg OR wikipedia.org (Phase 1 + 2A sourcing)', () => {
    for (const f of facts) {
      const ok = f.sourceUrl.includes('nlb.gov.sg') || f.sourceUrl.includes('wikipedia.org');
      expect(ok).toBe(true);
    }
  });

  it('Phase 2A: at least 10 MY-tagged facts (v0.61.295 extension)', () => {
    const myFacts = facts.filter((f) => f.tags.includes('MY'));
    expect(myFacts.length).toBeGreaterThanOrEqual(10);
  });
});

describe('_pickFact — pure selector', () => {
  it('picks a tag-matching fact when ctx tags overlap fact tags', () => {
    const result = _pickFact({
      ctxTags: ['laksa'],
      lastSeen: [],
      factsList: facts,
      rng: () => 0
    });
    expect(result).not.toBeNull();
    expect(result.tags).toContain('laksa');
  });

  it('falls back to any non-seen fact when no tags match', () => {
    const result = _pickFact({
      ctxTags: ['xx-impossible-tag-xx'],
      lastSeen: [],
      factsList: facts,
      rng: () => 0
    });
    expect(result).not.toBeNull();
    // First fact in the list by id ordering when rng()=0.
    expect(result.id).toBe(facts[0].id);
  });

  it('excludes the lastSeen IDs from the matched subset', () => {
    // Find a tag with at least 2 facts to test exclusion.
    const sgFacts = facts.filter((f) => f.tags.includes('SG'));
    expect(sgFacts.length).toBeGreaterThan(1);
    const excludeId = sgFacts[0].id;
    const result = _pickFact({
      ctxTags: ['SG'],
      lastSeen: [excludeId],
      factsList: facts,
      rng: () => 0
    });
    expect(result).not.toBeNull();
    expect(result.id).not.toBe(excludeId);
  });

  it('resets the pool when ALL facts are in lastSeen', () => {
    const allIds = facts.map((f) => f.id);
    const result = _pickFact({
      ctxTags: [],
      lastSeen: allIds,
      factsList: facts,
      rng: () => 0
    });
    // Pool collapses to facts list; rng=0 → first item.
    expect(result).not.toBeNull();
    expect(result.id).toBe(facts[0].id);
  });

  it('returns the same fact deterministically for a fixed rng', () => {
    const a = _pickFact({ ctxTags: ['SG'], lastSeen: [], factsList: facts, rng: () => 0.5 });
    const b = _pickFact({ ctxTags: ['SG'], lastSeen: [], factsList: facts, rng: () => 0.5 });
    expect(a.id).toBe(b.id);
  });
});

describe('factBody — localised body', () => {
  const sample = facts[0];

  it('returns EN body for lang=en', () => {
    expect(factBody(sample, 'en')).toBe(sample.en);
  });

  it('returns FR body for lang=fr', () => {
    expect(factBody(sample, 'fr')).toBe(sample.fr);
  });

  it('falls back to EN for a genuinely unsupported lang', () => {
    // 'de' is now supported via the _i18n overlay; use an unsupported tag.
    expect(factBody(sample, 'xx')).toBe(sample.en);
  });

  it('returns empty string for null fact', () => {
    expect(factBody(null, 'en')).toBe('');
  });
});

describe('pickFunFact — public selector with localStorage', () => {
  // localStorage stub: vitest's node env doesn't ship one.
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  };

  it('returns a fact whose tags overlap the cuisine context', () => {
    store.clear();
    const fact = pickFunFact({ cuisines: ['laksa'], region: 'SG', countryPref: null });
    expect(fact).not.toBeNull();
    expect(fact.tags).toContain('laksa');
  });

  it('persists picked IDs in localStorage', () => {
    store.clear();
    const fact = pickFunFact({ cuisines: ['hokkien-mee'], region: 'SG', countryPref: null });
    const raw = store.get('gia.funfact.lastSeen');
    const arr = JSON.parse(raw);
    expect(arr).toContain(fact.id);
  });

  it('avoids repeating the most-recent ID across consecutive calls', () => {
    store.clear();
    // Use a cuisine with at least two tagged facts.
    const ctx = { cuisines: ['hokkien-mee'], region: 'SG', countryPref: null };
    const first = pickFunFact(ctx);
    const second = pickFunFact(ctx);
    // Note: with only 1 hokkien-mee fact in the catalogue this would
    // collide via the pool-reset path. The catalogue has ≥2 facts
    // tagged 'SG' though, so this assertion holds for SG context.
    const sgCtx = { cuisines: [], region: 'SG', countryPref: null };
    store.clear();
    const a = pickFunFact(sgCtx);
    const b = pickFunFact(sgCtx);
    expect(a.id).not.toBe(b.id);
  });

  it('clearFunFactHistory wipes the localStorage entry', () => {
    store.clear();
    pickFunFact({ cuisines: ['laksa'], region: 'SG', countryPref: null });
    expect(store.has('gia.funfact.lastSeen')).toBe(true);
    clearFunFactHistory();
    expect(store.has('gia.funfact.lastSeen')).toBe(false);
  });
});

// ── v0.61.383 — global facts + device-language localisation ──────────────

describe('global facts (v0.61.383)', () => {
  const LANGS = ['en', 'fr', 'zh', 'ms', 'ta', 'ja', 'ko', 'th'];
  const globals = facts.filter((f) => f.tags.includes('global'));

  it('adds at least 8 facts tagged "global"', () => {
    expect(globals.length).toBeGreaterThanOrEqual(8);
  });

  it('every global fact carries all 8 localisations + the "other" region tag', () => {
    for (const f of globals) {
      for (const l of LANGS) {
        expect(typeof f[l]).toBe('string');
        expect(f[l].length).toBeGreaterThan(5);
      }
      expect(f.tags).toContain('other'); // so OTHER-region searches surface them
    }
  });
});

describe('factBody — device-language resolution (v0.61.383)', () => {
  const ramen = facts.find((f) => f.id === 'g-ramen-china-origin');

  it('returns the Japanese body for lang=ja', () => {
    expect(factBody(ramen, 'ja')).toBe(ramen.ja);
  });
  it('returns the Korean body for lang=ko', () => {
    expect(factBody(ramen, 'ko')).toBe(ramen.ko);
  });
  it('returns the Thai body for lang=th', () => {
    expect(factBody(ramen, 'th')).toBe(ramen.th);
  });
  it('falls back to EN only when the fact lacks the language BOTH ways', () => {
    // v0.62.777 — this test used to pick `tags.includes('SG') && !f.ja` and assert
    // English. That premise was wrong the moment the fun-facts overlay shipped a
    // Japanese body for the same fact: `!f.ja` only means "no FLAT ja", and the
    // fact still had `_i18n.ja`. The old factBody discarded it — the bug this
    // version fixes — so the assertion pinned the discard, not the fallback.
    //
    // There is no longer ANY fact missing ja both ways, so the fallback is tested
    // on a constructed fact rather than by hunting the corpus for a hole that no
    // longer exists. Asserted below, so this stays honest if a hole reappears.
    expect(facts.filter((f) => !f.ja && !(f._i18n && f._i18n.ja))).toEqual([]);
    // v0.62.919 — the same statement for ko, and it is the COMPLETENESS CHECK for the 72
    // Korean bodies. Stronger than counting rows: a count of 72 is satisfied by 72 rows
    // whatever they contain, while this fails the moment one fact has no Korean by either
    // route. `ko` was in OVERLAY_LANGS from v0.62.915 with nothing behind it, so every
    // Korean reader saw English on both the bot and the Mini App.
    expect(facts.filter((f) => !f.ko && !(f._i18n && f._i18n.ko))).toEqual([]);
    const bare = { id: 'x-bare', tags: [], en: 'English body', fr: 'Corps francais' };
    expect(factBody(bare, 'ja')).toBe('English body');
    expect(factBody(bare, 'ko')).toBe('English body');
    expect(factBody(bare, 'xx')).toBe('English body');
  });

  it('reads the overlay when there is no curated flat key — zh/ja/es/ko', () => {
    // The regression guard for the fix. OVERLAY_LANGS was ['id','ru','de'] while
    // both overlays already carried six languages, so zh/ja/es were translated
    // and then dropped at render time. `ko` joins them in v0.62.919.
    //
    // ⚠ THE `if (!f) continue` THIS LOOP USED TO CARRY IS GONE. If no fact matched, the
    // body never ran and the iteration passed having measured nothing — the vacuous-pass
    // shape this arc has now found a dozen times, most recently in a verifier that parsed
    // zero rows out of a correct 862-row file and printed four passes ([AMD-183]). A loop
    // that can silently examine nothing is not a guard. It asserts a fact was FOUND first.
    for (const lang of ['zh', 'ja', 'es', 'ko']) {
      const f = facts.find((x) => !x[lang] && x._i18n && x._i18n[lang]);
      expect(f, `no fact has an overlay-only ${lang} body — this iteration would measure nothing`)
        .toBeTruthy();
      expect(factBody(f, lang), `${f.id} ${lang}`).toBe(f._i18n[lang]);
      expect(factBody(f, lang)).not.toBe(f.en);
    }
  });

  it('a curated flat body still beats the generated overlay', () => {
    // Precedence, pinned in the direction that bit me: my first draft read the
    // overlay first and returned the machine draft over the hand-authored ja.
    const both = facts.find((f) => f.ja && f._i18n && f._i18n.ja && f._i18n.ja !== f.ja);
    if (both) expect(factBody(both, 'ja')).toBe(both.ja);
  });
});

describe('deviceFactLang — navigator.language → fact language (v0.61.383)', () => {
  const setLang = (l) => { vi.stubGlobal('navigator', { language: l, languages: [l] }); };
  afterAll(() => { vi.unstubAllGlobals(); });

  it('maps a supported device language (ja-JP → ja)', () => {
    setLang('ja-JP');
    expect(deviceFactLang()).toBe('ja');
  });
  it('maps ko-KR → ko and th-TH → th', () => {
    setLang('ko-KR'); expect(deviceFactLang()).toBe('ko');
    setLang('th-TH'); expect(deviceFactLang()).toBe('th');
  });
  it('maps the curated-5 overlay languages (de-DE → de, id-ID → id, ru-RU → ru)', () => {
    setLang('de-DE'); expect(deviceFactLang()).toBe('de');
    setLang('id-ID'); expect(deviceFactLang()).toBe('id');
    setLang('ru-RU'); expect(deviceFactLang()).toBe('ru');
  });
  it('falls back to en for a genuinely unsupported device language (pt-BR)', () => {
    setLang('pt-BR');
    expect(deviceFactLang()).toBe('en');
  });
});

describe('factBody — id/ru/de from the _i18n overlay (v0.62.x)', () => {
  it('reads id/ru/de from _i18n and never the `id` identifier field', () => {
    const f = { id: 'x-slug', en: 'EN body', fr: 'FR body', _i18n: { id: 'Tubuh ID', ru: 'RU тело', de: 'DE Körper' } };
    expect(factBody(f, 'id')).toBe('Tubuh ID'); // NOT 'x-slug'
    expect(factBody(f, 'ru')).toBe('RU тело');
    expect(factBody(f, 'de')).toBe('DE Körper');
    expect(factBody(f, 'en')).toBe('EN body');
    expect(factBody(f, 'fr')).toBe('FR body');
  });
  it('falls back to en (NOT the identifier) when _i18n is absent', () => {
    const f = { id: 'y-slug', en: 'EN only' };
    expect(factBody(f, 'id')).toBe('EN only');
    expect(factBody(f, 'ru')).toBe('EN only');
    expect(factBody(f, 'de')).toBe('EN only');
  });
});

describe('_pickFact — surfaces global facts for non-SG context (v0.61.383)', () => {
  it('a Tokyo search (countryPref jp) can pick a jp-tagged global fact', () => {
    // Force selection deterministically with rng → 0 over the jp-matched tier.
    const jpMatched = facts.filter((f) => f.tags.includes('jp'));
    expect(jpMatched.length).toBeGreaterThan(0);
    const result = _pickFact({ ctxTags: ['jp', 'other'], lastSeen: [], factsList: facts, rng: () => 0 });
    expect(result).not.toBeNull();
    expect(result.tags).toContain('jp');
  });

  it('an OTHER-region search with no country match falls to a "other"-tagged global fact', () => {
    const result = _pickFact({ ctxTags: ['other'], lastSeen: [], factsList: facts, rng: () => 0 });
    expect(result).not.toBeNull();
    expect(result.tags).toContain('other');
    expect(result.tags).toContain('global');
  });
});
