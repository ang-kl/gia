'use strict';

// bot-keyboard.js — v0.62.891
//
// WHY THIS FILE EXISTS. Same reason as bot-commands.js: index.js has no
// module.exports and cannot be required by a test, so anything inside it is
// unreachable to the suite. The /language keyboard's row layout lived there as
// a `for (i += 2)` loop, and no test could call it — only grep at it. The pure
// part comes out here where a guard can reach it by CALLING it, which is the
// lesson name-guide.js records after five source-scanning tests, four of which
// broke on a refactor while the behaviour held.
//
// THE DEFECT IT FIXES. Operator, having opened /language: "KR should be
// together with the rest." Nine locales chunked two per row gave five rows, and
// the fifth carried ONE button — Korean, alone, full width, with Telegram's own
// row separators above it. The v0.62.883 comment in index.js even said so out
// loud: "nine now, so five rows and the last carries one button." It was written
// down as a fact and never read as a defect.
//
// AND IT IS NOT A KOREAN PROBLEM. `i += 2` orphans the last button at EVERY odd
// count. Korean was simply the locale that made nine. Hardcoding three per row
// would fix today and orphan again at 13. So this balances instead: given a
// maximum row width, it spreads the items as evenly as the count allows, and a
// trailing row of one is impossible unless there is only one item in total.
//
//   9 items, max 3  ->  [3, 3, 3]      (was [2, 2, 2, 2, 1])
//   8 items, max 3  ->  [3, 3, 2]
//  10 items, max 3  ->  [3, 3, 2, 2]   — the next locale added does not orphan
//   7 items, max 3  ->  [3, 2, 2]

/**
 * Split `items` into rows of at most `maxPerRow`, as evenly as the count allows.
 *
 * Rows differ in length by at most one, and the longer rows come first — so the
 * keyboard reads as a block rather than tapering to a single stranded button.
 *
 * @param {Array} items
 * @param {number} maxPerRow  the widest a row may be (>= 1)
 * @returns {Array<Array>} rows
 */
function balancedRows(items, maxPerRow) {
  const list = Array.isArray(items) ? items : [];
  const width = Math.max(1, Math.floor(Number(maxPerRow) || 1));
  const n = list.length;
  if (n === 0) return [];
  const rowCount = Math.ceil(n / width);
  const out = [];
  let i = 0;
  for (let r = 0; r < rowCount; r++) {
    // Spread what is LEFT over the rows that remain, rather than filling each
    // row to `width` and letting the remainder fall off the end. That single
    // difference is the whole fix.
    const size = Math.ceil((n - i) / (rowCount - r));
    out.push(list.slice(i, i + size));
    i += size;
  }
  return out;
}

module.exports = { balancedRows };
