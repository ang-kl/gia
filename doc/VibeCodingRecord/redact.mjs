// redact.mjs — the three-layer secret redaction shared by every VibeCodingRecord
// extractor.
//
// LIFTED VERBATIM from extract-session-replies.mjs (v0.62.726), not rewritten. That
// implementation is the product of FIVE Codex findings across PRs #1721–#1725, each of
// which was a real leak or a real over-mask:
//
//   #1721 P1  the allowlist was described as "unconditional" and was not
//   #1722     `queue-operation` records were never scanned — which is exactly how
//             I18N_TRANSLATE_TOKEN's value was supplied, so it leaked into a reply
//             that was describing the redaction
//   #1722     tool_result payloads live in `content`, not `b.text` — 1,133 of them
//   #1724 P1  `\btoken\b` does not match `API_TOKEN`, because `_` is a word character
//   #1725     `printenv SOME_TOKEN` prints a word-shaped secret alone on a line
//
// A second copy would drift from that, and the drift would be silent until it leaked.
// This module exists so `extract-wrong-log.mjs` reuses the same pipeline rather than
// growing its own — the hazard `translate-dishes.js` and `open-hours.js:375` both name.
//
// The comments below are the original author's and are kept whole: each one records a
// measurement, and several record a wrong first cut that produced a healthy-looking
// redaction count while masking model names or leaking a token.


// ---------------------------------------------------------------- §SECRETS
//
// Three layers, because the output is committed AND embedded in a page served
// publicly at soleat.net/doc/vibe-journal.html. A leak here is not recoverable by
// editing the file afterwards.
//
//   1. KNOWN SHAPES — a deliberately wide pattern set, not a tour of what this one
//      session happened to contain.
//   2. TRANSCRIPT-DERIVED — every credential-shaped literal the OPERATOR pasted in
//      their own turns is collected first and redacted from assistant text by exact
//      match. This is the layer that catches a token with no recognisable shape,
//      which is exactly what I18N_TRANSLATE_TOKEN is: an arbitrary string. A secret
//      the model can echo is a secret that was said to it, so the transcript itself
//      is the authority on what to look for.
//   3. FAIL CLOSED — anything that still looks credential-shaped after redaction
//      aborts the run with a non-zero exit and writes nothing. Publishing is the
//      irreversible act; refusing to publish costs a re-run.

const KNOWN_SHAPES = [
  [/AIza[0-9A-Za-z_\-]{20,}/g,                        'GOOGLE-API-KEY'],
  [/\bAQ\.[A-Za-z0-9_\-]{20,}/g,                      'OAUTH-TOKEN'],
  [/\bya29\.[A-Za-z0-9_\-]{10,}/g,                    'OAUTH-TOKEN'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g,                   'GITHUB-TOKEN'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/g,                 'GITHUB-PAT'],
  [/\b\d{8,10}:[A-Za-z0-9_\-]{30,}/g,                 'TELEGRAM-TOKEN'],
  [/\bsk-[A-Za-z0-9_\-]{20,}/g,                       'API-KEY'],
  [/\bsk-ant-[A-Za-z0-9_\-]{20,}/g,                   'ANTHROPIC-KEY'],
  [/\bAKIA[0-9A-Z]{16}\b/g,                           'AWS-ACCESS-KEY'],
  [/\bxox[baprs]-[A-Za-z0-9\-]{10,}/g,                'SLACK-TOKEN'],
  [/\bglpat-[A-Za-z0-9_\-]{20,}/g,                    'GITLAB-TOKEN'],
  [/\bey[A-Za-z0-9_\-]{10,}\.ey[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, 'JWT'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, 'PRIVATE-KEY'],
  [/\bredis:\/\/[^\s"'`]+/gi,                         'REDIS-URL'],
  [/\bpostgres(?:ql)?:\/\/[^\s"'`]+/gi,               'POSTGRES-URL']
];

// A literal in an operator turn is treated as a credential only when it looks
// RANDOM. The first cut of this used "long and mixed-class", which redacted 77
// strings and not one of them was a secret: model names (`gemini-2.5-flash-lite`),
// branch names (`claude/handover-…`), session UUIDs, service-account emails. That
// is not a harmless excess — masking a model name destroys the meaning of the
// record the artefact exists to preserve, while still reporting a healthy-looking
// redaction count.
//
// The discriminator that separates them cleanly on this corpus: a real credential
// mixes UPPER, lower and digits, because it is base64-ish random. Word-structured
// identifiers are lowercase throughout — `gemini-2.5-flash-lite`,
// `claude/handover-july-11-49uzvf`, a hex UUID, a GCP project id. Shannon entropy
// is required as well, so a long CamelCase English phrase does not qualify.
const CANDIDATE = /\b[A-Za-z0-9][A-Za-z0-9._\-]{19,}\b/g;

function shannon(s) {
  const f = {};
  for (const ch of s) f[ch] = (f[ch] || 0) + 1;
  return -Object.values(f).reduce((h, c) => {
    const p = c / s.length;
    return h + p * Math.log2(p);
  }, 0);
}

function looksRandom(s) {
  if (!/[A-Z]/.test(s)) return false;   // word-structured ids are lowercase
  if (!/[a-z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (/\s/.test(s)) return false;
  return shannon(s) >= 3.5;             // bits per character
}

// Layer 2b — CONTEXT. Entropy cannot catch a token that is word-shaped, and the
// operator's I18N_TRANSLATE_TOKEN is exactly that: its value (redacted here — see O-325)
// reads like English, scores below the entropy gate, and matches no known vendor prefix.
// THE LITERAL IS NOT REPRODUCED. It was in this comment when the block lived in
// extract-session-replies.mjs, and that file is on a PUBLIC main — logged as Register
// O-325, still open, still the operator's to close by rotating the token. Moving the
// block was a chance to stop carrying it forward, so it is dropped here rather than
// copied. The lesson needs the SHAPE of the token, not its value.
// Codex made the point on PR #1721: "the documented I18N_TRANSLATE_TOKEN can be any
// random string". Shape-based detection has no answer to that; context does. When an
// operator turn mentions a credential word, every substantial literal in that turn
// is treated as sensitive — except env-var NAMES, which are ALL_CAPS and must stay
// legible or the record becomes unreadable.
// `\b` is the wrong boundary here: `_` is a word character, so /\btoken\b/ does
// NOT match `API_TOKEN` or `I18N_TRANSLATE_TOKEN` — the exact names this is meant
// to key on. Every env-var-shaped credential slipped past. Underscore-separated
// segments are what a credential variable looks like, so the boundary has to treat
// `_` as a separator. Found while testing the PR #1724 P1 fix and discovering it
// did not fire.
const SECRET_CONTEXT = /(?:^|[^A-Za-z])(key|token|secret|password|passphrase|credential|apikey|bearer|auth)(?![A-Za-z])/i;
const ENV_VAR_NAME = /^[A-Z][A-Z0-9_]{2,}$/;
const PATHY = /[/\\]|\.(?:js|mjs|json|md|yml|yaml|html|tsv|ndjson|txt|png|jpg)$/i;

// Restricted to how a credential is actually pasted: on a line of its own, or as
// the right-hand side of NAME=value / NAME: value. A first cut collected every
// 12-char literal from any turn mentioning "key" and produced 258 redactions —
// over-masking prose and destroying the record, which is the same failure as the
// entropy-only cut, in the other direction. A secret arrives as a value, not inside
// a sentence, and that positional fact is the discriminator.
function contextCandidates(text, opts = {}) {
  // bareLines:false — used for TOOL OUTPUT. Codex found on PR #1724 that
  // restricting ALL positional matching to operator-typed text left a hole: a
  // command or file read printing `I18N_TRANSLATE_TOKEN=MyWordShapedToken` puts an
  // arbitrary-shaped secret in the tool stream, where only KNOWN_SHAPES apply — so
  // it is neither redacted nor caught by the fail-closed scan. The ASSIGNMENT
  // branch is safe to run over code, because it already requires the NAME to be
  // credential-ish: `GEMINI_MODEL=…` is configuration and does not match. Only the
  // bare-standalone-line branch has to stay operator-only, since in source code
  // every line is a value.
  // proximity:true — used for TOOL OUTPUT. A bare standalone line only counts when
  // the PRECEDING non-empty line names a credential, which is what
  // `printenv I18N_TRANSLATE_TOKEN` followed by its value looks like. Without that,
  // enabling bare lines over tool output collected 48 strings, nearly all of them
  // camelCase function names dumped by a file read (`recordGeminiUsage`,
  // `getOrCacheSummary`) — they pass the uppercase test and carry no digit, so no
  // shape rule separates them from a word-shaped token. Proximity does.
  const { bareLines = true, proximity = false } = opts;
  if (!SECRET_CONTEXT.test(text)) return [];
  const out = [];
  let prevNonEmpty = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const prev = prevNonEmpty; prevNonEmpty = line;
    // `export NAME=…` / `NAME="…"` / `NAME: '…'` all reach here. Quotes must be
    // stripped BEFORE storing: Codex found on PR #1722 that capturing them meant a
    // later bare echo of the same value never matched, and a word-shaped token
    // matches no KNOWN_SHAPE, so fail-closed accepted it too.
    // The NAME must itself be credential-ish. `GEMINI_MODEL: …` is configuration;
    // `I18N_TRANSLATE_TOKEN=…` is not.
    const assigned = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*[=:]\s*(.+)$/);
    if (assigned && !SECRET_CONTEXT.test(assigned[1])) continue;
    const bareOk = bareLines && (!proximity || SECRET_CONTEXT.test(prev));
    const bare = bareOk && /^\S+$/.test(line) ? line : null;
    let value = (assigned ? assigned[2] : bare) || '';
    value = value.trim().replace(/[;,]$/, '');
    const quoted = value.match(/^(['"`])([\s\S]*)\1$/);
    if (quoted) value = quoted[2];
    if (/\s/.test(value)) continue;            // a phrase is prose, not a credential
    if (!value || value.length < 12) continue;
    if (ENV_VAR_NAME.test(value) || PATHY.test(value)) continue;
    if (/^[a-z]+$/.test(value)) continue;
    // A bare standalone line is the paste case, but the operator also drops plain
    // CONFIG values on their own line — `gemini-2.5-flash-lite` was admitted this
    // way and masked across a dozen replies, in the entry about model names.
    // Config identifiers are lowercase-kebab; credentials carry mixed case. This
    // is the narrowest rule that separates the two on this corpus, and it is a
    // heuristic: an all-lowercase secret would be missed here and caught only by
    // KNOWN_SHAPES. Stated as a limit in the journal, not papered over.
    if (!assigned && !/[A-Z]/.test(value)) continue;
    out.push(value);
  }
  return out;
}

// A `user` record carries three different shapes, and only one of them is `b.text`.
// The transcript's TOOL RESULTS live in user records as `tool_result` blocks whose
// payload is `content` — 1,133 of them in this session — so reading only `b.text`
// skipped every credential a command printed or a file read returned. Codex found
// this on PR #1722; a secret echoed out of command output is the likeliest kind to
// reach a reply, since it arrives without the operator ever typing it.
function blockText(b) {
  if (!b || typeof b !== 'object') return '';
  if (typeof b.text === 'string') return b.text;
  const inner = b.content;
  if (typeof inner === 'string') return inner;
  if (Array.isArray(inner)) return inner.map(blockText).join('\n');
  return '';
}

// Two streams, deliberately treated differently.
//
//   OPERATOR-TYPED text — a plain-string `content`, or a `text` block. A human
//   pasting a credential puts it in a value position, so the positional heuristic
//   applies here and is precise.
//
//   TOOL OUTPUT — `tool_result` blocks: command output, file reads, API responses.
//   Codex was right that these must be scanned (a credential printed by a command
//   is the likeliest kind to be echoed, since the operator never typed it). But the
//   positional heuristic MUST NOT run over them: tool output is source code, and
//   `const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';` is
//   a NAME='value' line. Applying it here masked model names across a dozen replies
//   — the same over-masking that the 77- and 258-redaction cuts produced, arriving
//   by a third route. Tool output therefore gets KNOWN_SHAPES only, which is
//   high-precision and needs no positional guess.
function splitStreams(records) {
  let typed = [], tool = [];
  for (const d of records) {
    // Operator text does NOT arrive only in `user` records. A message sent while a
    // turn is running is a `queue-operation` record with a plain-string `content`,
    // and that is exactly how I18N_TRANSLATE_TOKEN's value was supplied — which is
    // why a collector keyed on `type === 'user'` never saw it, and the token then
    // leaked into a reply that was describing the redaction. `attachment` records
    // carry pasted file content on the same footing. Found on PR #1722.
    if (d.type === 'queue-operation' || d.type === 'attachment') {
      if (typeof d.content === 'string') typed.push(d.content);
      else if (d.content) tool.push(JSON.stringify(d.content));
      continue;
    }
    // Assistant tool_use inputs are COMMANDS — `GEMINI_MODEL=gemini-2.5-flash-lite`
    // is a NAME=value line, so the positional rule over-masks here exactly as it did
    // over tool output. They go to the tool stream: known shapes only. The
    // human-authored streams above are enough to catch a word-shaped token, because
    // the operator has to type it somewhere before it can reach a command.
    if (d.type === 'assistant') {
      const c = d.message?.content;
      if (Array.isArray(c)) for (const b of c) {
        if (b && b.type === 'tool_use' && b.input) tool.push(JSON.stringify(b.input));
      }
      continue;
    }
    if (d.type !== 'user') continue;
    const c = d.message?.content;
    if (typeof c === 'string') { typed.push(c); continue; }
    if (!Array.isArray(c)) continue;
    for (const b of c) {
      if (!b || typeof b !== 'object') continue;
      if (b.type === 'tool_result') tool.push(blockText(b));
      else if (typeof b.text === 'string') typed.push(b.text);
    }
  }
  return { typed: typed.join('\n'), tool: tool.join('\n') };
}

function collectOperatorSecrets(records) {
  const { typed, tool } = splitStreams(records);
  const found = new Set();
  // Known shapes: both streams.
  for (const text of [typed, tool]) {
    for (const [re] of KNOWN_SHAPES) for (const m of text.match(re) || []) found.add(m);
  }
  // Randomness + position: operator-typed only.
  for (const m of typed.match(CANDIDATE) || []) if (looksRandom(m)) found.add(m);
  for (const m of contextCandidates(typed)) found.add(m);
  // Assignment-shaped credentials in tool output — see contextCandidates().
  // bareLines is now ON for tool output too. Codex, PR #1725: `printenv
  // I18N_TRANSLATE_TOKEN` prints an arbitrary word-shaped credential ALONE on a
  // line, which matches no vendor pattern and no entropy rule, so disabling bare
  // lines here left it uncollected — and the fail-closed scan misses it for the
  // same reason. It is safe to enable because the bare-line branch already requires
  // an uppercase letter: `gemini-2.5-flash-lite` and every other lowercase-kebab
  // config identifier stays out, which is what the earlier over-masking rounds were
  // about.
  for (const m of contextCandidates(tool, { proximity: true })) found.add(m);
  // Longest first, so a secret containing another is masked whole.
  return [...found].sort((a, b) => b.length - a.length);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function redact(text, operatorSecrets) {
  let out = String(text), n = 0;
  for (const [re, label] of KNOWN_SHAPES) {
    out = out.replace(re, () => { n++; return `«${label}-REDACTED»`; });
  }
  for (const secret of operatorSecrets) {
    const re = new RegExp(esc(secret), 'g');
    out = out.replace(re, () => { n++; return '«OPERATOR-SECRET-REDACTED»'; });
  }
  return { text: out, redactions: n };
}

// Layer 3. Runs over the FINAL text, after redaction.
function residualSecrets(text) {
  const hits = [];
  for (const [re, label] of KNOWN_SHAPES) if (re.test(text)) hits.push(label);
  return hits;
}

export {
  KNOWN_SHAPES,
  CANDIDATE,
  shannon,
  looksRandom,
  contextCandidates,
  blockText,
  splitStreams,
  collectOperatorSecrets,
  redact,
  residualSecrets
};
