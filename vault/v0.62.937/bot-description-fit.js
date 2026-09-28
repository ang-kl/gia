// bot-description-fit.js — v0.62.723
//
// Telegram caps setMyDescription at 512 characters and rejects the WHOLE call
// with `400 BOT_DESC_INVALID` if you exceed it. The failure is caught and logged
// non-fatally, so the only visible symptom is that the bot's "What can this bot
// do?" panel silently keeps whatever it had before.
//
// That is what happened. The v0.60.37 description is 520–524 characters at every
// count value the interpolation can produce ('50+'/'100' fallback, and the live
// figures), so it has been rejected on every boot since it was written and the
// panel has never shown it.
//
// WHY A HELPER RATHER THAN JUST SHORTENING THE COPY. Two of the lines
// interpolate live counts (`${cuisines}`, `${hawker}`) that grow as the
// catalogue grows. Hand-trimming to 511 buys a few characters and then breaks
// again, silently, the same way. The length has to be enforced where the string
// is built.
//
// WHAT GETS SACRIFICED, IN ORDER. The command list is the payload — a user
// reading this panel wants to know what the bot does. So the trailing hint
// paragraph ("Tap 🍴 …") goes first, which is enough on its own today. Only if
// that still does not fit are whole command lines dropped from the end, and only
// then a hard character cut. Every step reports what it did.
//
// LENGTH IS MEASURED THE PESSIMISTIC WAY. Telegram documents the cap in
// "characters" without saying whether it counts code points or UTF-16 units;
// '🍴' is one code point and two UTF-16 units, so the two measures disagree by
// exactly the thing most likely to sit near the boundary. This takes the larger
// of the two, which can only ever be over-cautious.

'use strict';

const CAP = 512;

function measure(s) {
  return Math.max(String(s).length, [...String(s)].length);
}

/**
 * Fit a bot description inside Telegram's cap.
 * @returns {{ text: string, length: number, trimmed: null|'hint'|'lines'|'hard' }}
 */
function fitDescription(text, cap = CAP) {
  const original = String(text ?? '');
  if (measure(original) <= cap) {
    return { text: original, length: measure(original), trimmed: null };
  }

  // 1. Drop the trailing hint paragraph (everything after the last blank line).
  const para = original.lastIndexOf('\n\n');
  if (para > 0) {
    const withoutHint = original.slice(0, para);
    if (measure(withoutHint) <= cap) {
      return { text: withoutHint, length: measure(withoutHint), trimmed: 'hint' };
    }
  }

  // 2. Drop whole command lines from the end — a half-line is worse than no line.
  let lines = (para > 0 ? original.slice(0, para) : original).split('\n');
  while (lines.length > 1 && measure(lines.join('\n')) > cap) lines.pop();
  const byLine = lines.join('\n');
  if (measure(byLine) <= cap) {
    return { text: byLine, length: measure(byLine), trimmed: 'lines' };
  }

  // 3. Last resort. Slice by code point so a surrogate pair is never split in
  //    half — half an emoji is a replacement character, not a shorter string.
  const hard = [...byLine].slice(0, cap).join('');
  return { text: hard, length: measure(hard), trimmed: 'hard' };
}

module.exports = { fitDescription, measure, CAP };
