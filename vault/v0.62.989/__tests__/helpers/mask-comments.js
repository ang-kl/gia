// mask-comments.js — v0.62.911
//
// Blank out comments so a "does the CODE contain X?" scan cannot be answered by PROSE.
//
// ⚠ EXTRACTED BECAUSE THE THREE COPIES OF IT WERE BROKEN, and the breakage was measured, not
// suspected. `bot-ternary-sweep.test.js` and `bot-commands.test.js` each carried a masker that
// treats every quote as a string delimiter. A REGEX LITERAL containing a quote — for example
// `.replace(/"/g, '&quot;')` at mapOverlays.js:266 — opens a string that never closes, and the
// scan desyncs from there to the end of the file: 512 comment lines in index.js and 83 in
// mapOverlays.js came back UNMASKED.
//
// Both existing guards still PASS with the corrected version (measured before this was extracted),
// so the defect was latent rather than live for them. It was not latent for
// `map-locale-text.test.js`, where it reported a correct fix as broken. A guard that cannot tell
// code from a comment is the defect the runSearch census already recorded once; this is the same
// one, inside the helper written against it.

// ⚠ THIS MASKER IS REGEX-AWARE, AND THE SHARED ONE IS NOT — measured, not assumed.
// `__tests__/bot-ternary-sweep.test.js` and `__tests__/bot-commands.test.js` carry a masker that
// treats every quote as a string delimiter. `mapOverlays.js:266` contains
//
//     .replace(/"/g, '&quot;')
//
// — a REGEX LITERAL holding a double quote. The shared masker reads that `"` as opening a string,
// scans forward to the next one, and desyncs: 83 comment lines in this file, and 512 in index.js,
// come back UNMASKED. So a guard of the form "the code does not contain X" has been scanning 512
// lines of prose as if they were code, in the file that guard exists to protect. That is the same
// defect the journal already records for the runSearch census — a check that cannot tell code from
// a comment — still live inside the helper written against it.
//
// A `/` starts a regex only where a value cannot appear, which the previous significant character
// decides. That is the whole fix.
export function maskComments(src) {
  let out = '';
  let i = 0;
  const n = src.length;
  let prev = '';                       // last significant char emitted, for the regex/division test
  const REGEX_OK = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '/' && REGEX_OK.has(prev)) {
      // A regex literal: copy it verbatim so its quotes never open a string.
      let j = i + 1, cls = false;
      while (j < n) {
        const ch = src[j];
        if (ch === '\\') { j += 2; continue; }
        if (ch === '[') cls = true;
        else if (ch === ']') cls = false;
        else if (ch === '/' && !cls) break;
        else if (ch === '\n') break;      // an unterminated regex is really division; bail out
        j++;
      }
      if (j < n && src[j] === '/') { out += src.slice(i, j + 1); i = j + 1; prev = '/'; continue; }
      // not a regex after all — fall through and treat as an ordinary character
    }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; prev = c; continue;
    }
    out += c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}
