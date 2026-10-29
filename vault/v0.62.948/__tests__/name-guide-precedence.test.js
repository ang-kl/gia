// __tests__/name-guide-precedence.test.js — v0.62.856.
//
// Codex, PR #1796 P2, on the precedence chain shipped one commit earlier:
//   "When a venue carries `nameLocal` or `nameReading` … the first two arms always win, so
//    `sayNow` can never render."
//
// VERIFIED, AND NARROWER THAN REPORTED — both halves matter. `nameLocal` is attached only by
// `local-name.js`, gated on LOCAL_LANG_BY_CC = {JP, KR, CN, TW, HK, MO, TH}; `nameReading`
// only by `translate-name.js`, on the same country gate. Singapore and Malaysia — this app's
// main use — set neither, which is why the operator's Japanese screenshots looked correct and
// why nothing in production regressed. But inside those seven countries the shadowing is
// total, and those are the venues the pronunciation line exists for. Operator, asked
// directly: pronunciation wins for foreign script.
//
// THE DISCRIMINATOR IS THE SCRIPT OF `venue.name`, NOT THE PRESENCE OF `nameLocal`. A
// Latin-named venue in Tokyo carries a Japanese `nameLocal` too, and should keep it — the
// reader can already say "Blue Note Tokyo", and the Japanese name is the line they hold up to
// a driver. Getting that backwards would have "fixed" the finding by breaking the case the
// address rule already settled.
//
// These are behavioural assertions. The chain they replace was pinned by source scans, and
// four of those broke on refactors while the behaviour held — so the rule is now a function,
// and the function is called.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { pickNameGuide, hasForeignScript } from '../web/_shared/lib/name-guide.js';
import { pickAddressGuide } from '../web/_shared/lib/address-guide.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

describe('a foreign-script name shows how to SAY it', () => {
  it('the Codex case: CJK name + nameLocal + a pronunciation → the pronunciation wins', () => {
    const g = pickNameGuide(
      { name: '銀座 寿司', nameLocal: '銀座 寿司', nameGloss: 'Ginza Sushi' },
      'ghin-zah soo-shee',
    );
    expect(g.key).toBe('say');
    expect(g.text).toBe('ghin-zah soo-shee');
    expect(g.icon).toBe('pronounce');
  });

  it('Hangul and Thai count too — the gate is the script, not the country', () => {
    expect(pickNameGuide({ name: '진미평양냉면', nameLocal: '진미평양냉면' }, 'jin-mi').key).toBe('say');
    expect(pickNameGuide({ name: 'ร้านอาหาร', nameReading: 'Raan Ahaan' }, 'raan a-haan').key).toBe('say');
  });

  it('and falls back in order when there is no pronunciation yet', () => {
    // The fetch is in flight, or the model returned nothing. The line must not go blank.
    expect(pickNameGuide({ name: '銀座 寿司', nameLocal: '銀座 寿司' }, null).key).toBe('local');
    expect(pickNameGuide({ name: '銀座 寿司', nameReading: 'Ginza Sushi' }, null).key).toBe('reading');
    expect(pickNameGuide({ name: '銀座 寿司', nameGloss: 'silver seat' }, null).key).toBe('gloss');
    expect(pickNameGuide({ name: '銀座 寿司' }, null)).toBeNull();
  });
});

describe('a Latin name keeps the curated line — the half that must NOT change', () => {
  it('Blue Note Tokyo keeps its Japanese name even though a pronunciation exists', () => {
    // Reader can already say it. The native name is the line you show a driver, which is the
    // same reasoning the address rule already settled.
    const g = pickNameGuide(
      { name: 'Blue Note Tokyo', nameLocal: 'ブルーノート東京' },
      'bloo noht toh-kyoh',
    );
    expect(g.key).toBe('local');
  });

  it('nameReading still outranks a pronunciation for a Latin name', () => {
    expect(pickNameGuide({ name: 'Gion Karyo', nameReading: '祇園 花霞' }, 'ghee-on').key).toBe('reading');
  });

  it('Singapore is untouched — neither curated field is ever set there', () => {
    // The operator's actual case, and the reason nothing in production regressed either way.
    const g = pickNameGuide({ name: 'Tian Tian Hainanese Chicken Rice' }, 'tyen-tyen');
    expect(g.key).toBe('say');
    expect(pickNameGuide({ name: 'Restoran Sri Nirwana Maju' }, 'shree neer-wah-nah').key).toBe('say');
  });
});

describe('hasForeignScript', () => {
  it('matches the four scripts the server gates on and nothing else', () => {
    for (const s of ['銀座', 'すし', 'スシ', '진미', 'อาหาร', '小笼包']) {
      expect(hasForeignScript(s), `${s} not detected`).toBe(true);
    }
    for (const s of ['Blue Note Tokyo', 'Café Français', 'Restoran Sri Nirwana', 'Ñam', '']) {
      expect(hasForeignScript(s), `${s} wrongly detected`).toBe(false);
    }
  });

  it('does not treat a full-width space as CJK — the wider server regex does', () => {
    // local-name.js's HAS_LOCAL_SCRIPT starts at U+3000 because it tests a name FETCHED in
    // the local language, where a leading ideographic space is fair signal. This tests the
    // venue's own display name, where it is not. Reusing that regex would have flipped a
    // Latin name with one full-width space onto the foreign branch.
    expect(hasForeignScript('Blue　Note')).toBe(false);
    expect(hasForeignScript('　')).toBe(false);
  });

  it('is total on junk input rather than throwing', () => {
    for (const x of [null, undefined, 42, {}, []]) expect(hasForeignScript(x)).toBe(false);
    expect(pickNameGuide(null, null)).toBeNull();
    expect(pickNameGuide(undefined, 'say').key).toBe('say');
  });
});

describe('the card renders the function’s answer, not its own copy of the rule', () => {
  it('ResultCard calls pickNameGuide and holds no inline chain', () => {
    const src = read('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src).toMatch(/pickNameGuide\(venue, sayNow\)/);
    expect(src, 'the precedence has been re-inlined, so the tests above no longer describe it')
      .not.toMatch(/const nameGuide = venue\.nameLocal/);
    expect(src).toMatch(/data-name-guide=\{nameGuide\.key\}/);
    // The icon is chosen from the returned key, so the module can stay JSX-free.
    expect(src).toMatch(/nameGuide\.icon === 'pronounce' && <PronounceIcon/);
  });

  it('sayNow is still the LIVE projection, not a static venue read', () => {
    // v0.62.849's reactivity: the card prefers the in-flight answer and uses the venue field
    // only as a fallback. Passing venue.namePronounce straight in would re-flatten it.
    const src = read('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src).toMatch(/const sayNow = said !== undefined \? said : venue\.namePronounce;/);
  });
});

describe('the finding’s stated blast radius is checked against the source, not assumed', () => {
  it('only the seven-country gate can set nameLocal or nameReading', () => {
    const local = read('local-name.js');
    expect(local).toMatch(/LOCAL_LANG_BY_CC = \{ JP: 'ja', KR: 'ko', CN: 'zh-CN', TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW', TH: 'th' \}/);
    expect(local, 'SG/MY gained a local language, so this fix now changes the main use case')
      .not.toMatch(/\bSG: '|\bMY: '/);
    // nameReading is attached under the same map.
    expect(read('translate-name.js')).toMatch(/const localLang = LOCAL_LANG_BY_CC\[/);
  });
});

// ── v0.62.915 — THE SAVED CARD SPEAKS THE SAME LANGUAGES THE LIVE ONE DOES ─────────────────
//
// The operator asked whether the Sketchbook "has been updated with translation including extra
// data fields to store translations (eatery, address, etc) when saved". Traced end to end, the
// answer was TWO gaps at OPPOSITE ENDS OF THE SAME WIRE:
//
//   * `ResultCard.copy()` has forwarded nameLocal / nameReading / namePronounce / nameGloss
//     since v0.62.840 — and `web/clipboard/.../VenueCard.jsx` rendered `{v.name}` and stopped.
//     Four fields persisted, none read.
//   * `addressLocal` was the reverse: rendered on the live card since v0.62.895 and never put
//     into the copy payload at all. One field read, never persisted.
//
// So a Japanese venue whose live card showed "(銀座 寿司)" and a Korean address came back to the
// Sketchbook as a bare Latin name and an English address. Both halves are asserted here, by
// CALLING — this file's own header records that four source-scan pins broke on refactors while
// the behaviour held, and v0.62.915 broke two more in exactly that way.

describe('a card saved to the Sketchbook keeps its translated lines', () => {
  const { _normaliseRecord, _denormaliseRecord } = require('../clip-store.js');
  const TOKYO = {
    placeId: 'p1',
    name: '銀座 寿司',
    nameLocal: '銀座 寿司',
    nameReading: 'Ginza Sushi',
    namePronounce: 'GIN-za SOO-shee',
    nameGloss: 'Ginza Sushi',
    area: '6-chome, Ginza, Chuo City, Tokyo',
    addressLocal: '東京都中央区銀座6丁目',
  };
  const roundTrip = (venue) =>
    _denormaliseRecord(_normaliseRecord({ lang: 'ja', body: 'x', venue })).venue;

  it('⚠ every translated field survives the card HASH', () => {
    const back = roundTrip(TOKYO);
    for (const k of ['nameLocal', 'nameReading', 'namePronounce', 'nameGloss', 'addressLocal']) {
      expect(back[k], `${k} was dropped in storage`).toBe(TOKYO[k]);
    }
  });

  it('the guide the Sketchbook draws is the same one the live card draws', () => {
    // Same function, same inputs, same answer — the property that makes a second copy of the
    // precedence unnecessary. The Sketchbook has no live pronunciation projection, so the
    // PERSISTED namePronounce is its `sayNow`.
    const back = roundTrip(TOKYO);
    const live = pickNameGuide(TOKYO, TOKYO.namePronounce);
    const saved = pickNameGuide(back, back.namePronounce);
    expect(saved).toEqual(live);
    expect(saved.key, 'foreign script must still resolve to the pronunciation').toBe('say');
  });

  it('⚠ the address guide reaches the saved card, which is what was never forwarded', () => {
    const back = roundTrip(TOKYO);
    const g = pickAddressGuide(back);
    expect(g, 'addressLocal did not survive the copy payload').toBeTruthy();
    expect(g.key).toBe('local');
    expect(g.text).toBe('(東京都中央区銀座6丁目)');
    // …and the English area is never displaced — it stays the primary and the Maps query.
    expect(back.area).toBe(TOKYO.area);
  });

  it('a venue with nothing translated draws no guide at all', () => {
    // The Singapore case, which is most of this app: no local-name gate, so no second line.
    // A guard that only ever asserts the positive would not notice a bracket under every card.
    const sg = roundTrip({ placeId: 'p2', name: 'Tiong Bahru Bakery', area: '56 Eng Hoon St' });
    expect(pickNameGuide(sg, sg.namePronounce)).toBeNull();
    expect(pickAddressGuide(sg)).toBeNull();
  });

  it('VenueCard calls the shared functions and holds no copy of either rule', () => {
    const src = read('web/clipboard/src/components/VenueCard.jsx');
    expect(src).toMatch(/pickNameGuide\(v, v\.namePronounce\)/);
    expect(src).toMatch(/pickAddressGuide\(v\)/);
    expect(src).toMatch(/data-name-guide=/);
    expect(src).toMatch(/data-address-guide=/);
    // A re-inlined chain is the failure this whole file exists to prevent.
    expect(src, 'the Sketchbook re-implemented the precedence').not.toMatch(/v\.nameLocal \?/);
    expect(src, 'the Sketchbook re-implemented the address rule').not.toMatch(/v\.addressLocal \?/);
  });

  it('⚠ the copy payload forwards addressLocal, or the storage test above is vacuous', () => {
    // The round-trip proves the STORE keeps the field. It cannot see whether the client ever
    // sends it — and for addressLocal, for twenty releases, it did not.
    const src = read('web/cuisine/src/v2/components/ResultCard.jsx');
    expect(src, 'addressLocal is not in the copy payload').toMatch(/addressLocal: venue\.addressLocal,/);
    for (const k of ['nameLocal', 'nameReading', 'namePronounce', 'nameGloss']) {
      expect(src, `${k} left the copy payload`).toMatch(new RegExp(`${k}: venue\\.${k},`));
    }
  });
});
