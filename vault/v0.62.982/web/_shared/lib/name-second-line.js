// name-second-line.js — v0.62.889
//
// ONE secondary line under a transport name, chosen by precedence.
//
// Operator: "MRT stays English or Chinese or Malay or Tamil but second line has
// the translated words in bracket and one font size smaller."
//
// THE GATE DID NOT NEED INVERTING, AND THAT IS THE FINDING. Reading the request
// as "show the bracket even when the register already answered" would have put
// 东西线 above (东西线) for a Chinese reader. The rule StationCard.jsx:454-460
// wrote down is still exactly right —
//
//     "Rendered only when displayName === name, i.e. the government register had
//      nothing for this locale — where it does, that official name IS the answer
//      and a second line under it would be noise."
//
// — and what was actually missing was the CONTENT. For es/fr/de/ru/ja/ko the
// register publishes nothing, so the gate opened onto an empty hand: the only
// thing available was a pronunciation guide, which answers a different question.
// Now there is a translation to put there. The gate is unchanged; the shelf
// behind it is stocked.
//
// "BOTH MEANS TWO" — name-guide.js carries the operator's own rule verbatim:
// "only address, restaurant names and transport name can show both languages.
// Both means TWO, so exactly one guide renders." So this returns ONE result or
// null, never a translation AND a pronunciation. The translation outranks the
// guide: knowing what a line is called in your language beats knowing how to say
// its English name.
//
// BRACKETS MEAN TRANSLATION; THE PRONOUNCE ICON MEANS PRONUNCIATION. Two
// different lines with two different meanings, and conflating them would make
// both useless. The bracket is applied here so no call site re-invents it.
//
// FOUR SOURCES, ONE ANSWER. v0.62.889 added the stations, and with them a rank
// the lines never needed: a station name can be either a translation or a baked
// transliteration, and the baked reading outranks the FETCHED pronunciation
// guide. The network is never consulted for a name already held offline.
//
// Pure and framework-free on purpose — it can be unit-tested by calling it,
// which name-guide.js's header explains is why that module exists at all:
// "the precedence has now been asserted by five separate source-scanning tests,
// four of which broke on a refactor while the behaviour held."

import { lineNameLocal } from './mrt-lines-i18n.local.generated.js';
import { stationNameLocal } from './mrt-stations-i18n.local.generated.js';

/**
 * The one secondary line to render under a transport name, or null.
 *
 * @param {object}  o
 * @param {string}  o.primary   what the card already shows on the top line
 * @param {string}  o.english   the English name — the key, never displaced
 * @param {string}  [o.code]    line code, for a line
 * @param {string}  [o.station] English station name, for a station
 * @param {string}  o.lang      the reader's locale
 * @param {string}  [o.say]     a pronunciation guide, when one was fetched
 * @returns {{ text: string, key: 'translated'|'say' }|null}
 */
export function secondLine({ primary, english, code, station, lang, say }) {
  // 1. The register already answered in the reader's language. The primary IS
  //    the answer; repeating it in brackets would be noise. (zh, and id via ms.)
  if (primary && english && primary !== english) return null;

  // 2. A translation we authored for this locale — a MEANING, so it is bracketed.
  const local = code ? lineNameLocal(code, lang) : null;
  if (local && local !== english) return { text: `(${local})`, key: 'translated' };

  const st = station ? stationNameLocal(station, lang) : null;
  if (st && st.kind === 'translated' && st.text !== english) {
    return { text: `(${st.text})`, key: 'translated' };
  }

  // 3. A BAKED transliteration, ranked above the fetched guide on purpose:
  //    usePronunciations needs Telegram initData and a network round-trip
  //    (pronounce-client.js:107 returns empty without it), so a name we already
  //    hold must never send the reader to the network to learn how to say it.
  //    Unbracketed — brackets mean translation, and this is not one.
  if (st && st.kind === 'reading' && st.text !== english) {
    return { text: st.text, key: 'say' };
  }

  // 4. Failing all of that, how to SAY the English name. Never alongside the
  //    above — that would be a third language on one card.
  if (say && say !== english) return { text: say, key: 'say' };

  return null;
}
