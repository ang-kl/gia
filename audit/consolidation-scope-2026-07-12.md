# Consolidation Scope — turning the 11-Jul code-reuse audit into a PR queue

**Date:** 12-07 '26 · **Base:** `origin/main` @ v0.62.527 (audit report PR #1534) ·
**Companion to:** [`tma-code-reuse-audit-2026-07-11.md`](./tma-code-reuse-audit-2026-07-11.md)

**This is a scope, not an implementation.** No source is touched by this document. It converts the
audit's §5 priority list into a **sequenced queue of self-contained PRs**, each with a target, a
module shape, a migration order, a verification plan, and a risk gate — so that when consolidation
starts, each PR is already decision-ready and the highest-risk items stay explicitly gated.

---

## 1. Sequencing principles

1. **Behaviour-preserving only.** Every consolidation PR must be a pure refactor: identical rendered
   output, identical API responses, identical bot replies. Anything that would *change* behaviour
   (picking a canonical CJK range, resolving the `history.length` divergence) is **not** a
   consolidation PR — it is a separate behaviour decision that must land *first*. See §4.
2. **Lowest-risk / highest-confidence first.** Byte-identical extractions and off-hot-path call
   sites lead; anything backing the live `/s` search or module-load path trails.
3. **One surface per PR.** A PR extracts one shared unit and migrates its consumers; it does not
   also refactor a second unrelated unit. Keeps the diff reviewable and the blast radius scoped.
4. **The extracted copy must be proven byte-identical to what it replaces**, or the diff must show
   exactly why it differs — no silent "close enough" merges (this is the failure mode `gia-preflight`
   already guards: a copy that drifts from the original and goes silent).
5. **Never blind-merge a copy that another copy has already bug-fixed.** The two flagged pairs
   (§2.5/§2.9 of the audit) and the CJK range (§3.7) are deferred until their divergence is resolved
   as a deliberate decision (§4).

---

## 2. The PR queue (ordered — lowest risk first)

Each card is one PR. "Est. LOC" is the audit's rough saving, used only for ordering.

### PR-1 · `index.js` require-hoist (zero-risk warm-up) — Est. ~60 LOC
- **Audit ref:** §4.2. **Risk: LOW** (cosmetic; zero behaviour change).
- **Target:** the ~56 inline `const { resolveLang } = require('./user-prefs')` re-declarations and the
  3 redundant inline `require('./location-cache')` calls (`index.js:3630, 8263, 11147`).
- **Shape:** hoist both `require`s to the existing top-of-file import block; delete the inline copies.
- **Verify:** `node --check index.js`; full `vitest run`; grep to confirm zero remaining inline
  `require('./user-prefs')` / `require('./location-cache')`; **`/gia-preflight`** (touches `index.js`).
  Drive one `resolveLang`-dependent command (e.g. `/weather`) per `/verify` to confirm lang still
  resolves.
- **Why first:** it is the single item the audit calls "trivial, zero-risk, do any time" — a clean
  warm-up that exercises the preflight + verify loop on `index.js` before anything structural.
- **Rollback:** revert single commit; no data or module-boundary change.

### PR-2 · `web/_shared/` — byte-identical small components — Est. ~700 LOC
- **Audit ref:** §2.1 rows 2–6, 10; §2.6 item 2. **Risk: LOW** (proven byte-identical).
- **Target (only the ones `diff -q` proves identical):** `MapControls.jsx` (cuisine/hawker/transport),
  `FooterNav.jsx` (hawker/menu/transport), `device-id.js` (cuisine·v2/menu), `location-sync.js`
  (cuisine·v2/menu). **Include `WeatherBadge.jsx` and `LocaleToggle.jsx` only after** re-running
  `diff -q` per pair — the audit calls cuisine's `WeatherBadge` and one `LocaleToggle` line
  *near*-identical, not identical; if they differ, leave them for a follow-up, do not normalise here.
- **Shape:** new `web/_shared/components/` + `web/_shared/lib/`; each TMA imports from it. Confirm the
  7 Vite builds resolve the cross-package path (`base` rewrite + alias) — this is the one real risk in
  an otherwise trivial PR, so validate the resolver before deleting the per-TMA copies.
- **Verify:** `diff -q` old-vs-shared (must be empty) captured in the PR body; **build every affected
  `web/` TMA** (preflight non-negotiable when `web/` changes); `/verify` renders each TMA and confirms
  the map controls / footer / weather badge still paint.
- **Rollback:** restore per-TMA copies (kept in git history); delete `web/_shared/`.

### PR-3 · `lib/gemini/` unified client — migrate the 3 outside call sites ONLY — Est. ~380–450 LOC
- **Audit ref:** §3.1, §5 item 2. **Risk: LOW for the 3 migrants; HIGH for `gemini-client.js` internals — do NOT touch the latter in this PR.**
- **Target:** a new `lib/gemini/` factory (one `buildModelChain(chain, opts)` + `callWithFallback()` +
  retry) migrating **`translate-name.js`, `translate-review.js`, `durian-gemini-verifier.js`** onto it.
  Leave `gemini-client.js`'s 5 internal reimplementations and the `index.js:13985` one-off **untouched**
  — they back the live `/s` + hidden-gems flow (HIGH risk) and are a separate, later decision once the
  new helper is proven on the 3 low-blast-radius migrants.
- **Watch:** `translate-review.js`'s `SEARCH_INTENT_MODEL_CHAIN` duplicates the name/values of the one
  in `gemini-client.js:1828` — the new helper must reproduce the *exact* chain each caller used today
  (do not "unify" the chains — that is a behaviour change, out of scope here).
- **Verify:** unit tests for the new factory (retry, fallback order, timeout); `node --check` each
  migrant; full `vitest run`; `/verify` exercises one translate path end-to-end. **`/gia-preflight`**
  (`gemini-client.js` is in its trigger set — even though we don't edit it, the flow is adjacent).
- **Rollback:** per-migrant revert; the 3 are independent, so a bad one reverts without the others.

### PR-4 · `lib/redis-kv.js` — migrate non-hot-path modules first — Est. ~100–150 LOC
- **Audit ref:** §3.4. **Risk: LOW-MEDIUM** (15+ call sites = large review surface).
- **Target:** a thin `getJSON(key)` / `setJSON(key, val, ttl)` wrapper (JSON parse/stringify + try/catch
  + `setEx` TTL + fallback). **Migrate only `recent-locations.js` and `country-pref.js` in this PR**
  (explicitly off the `/s` hot path per the audit); leave the hot-path modules
  (`search-conversation.js`, `pick-cache.js`, `response-cache.js`, …) for later PRs once the wrapper is
  proven.
- **Verify:** unit tests for the wrapper (parse failure → fallback, TTL passthrough); full `vitest run`;
  `/verify` drives a flow that reads/writes `recent-locations`.
- **Rollback:** per-module revert.

### PR-5 · `web/_shared` build-config + `api.js` core + i18n infra — Est. ~360 LOC
- **Audit ref:** §2.1 rows 7, 12, 13, 14; §2.6 item 3–5. **Risk: LOW-MEDIUM.**
- **Target:** `vite.config.js` / `tailwind.config.js` factory functions; `api.js` core
  (`postJson`/`getJson`/`initData`) **after auditing the auth-header divergence** — clipboard uses an
  `X-Telegram-Init-Data` header, menu/cuisine pass initData only in the body; the shared wrapper must
  preserve each caller's convention, not unify it. i18n **infra only** (`LOCALE_KEY`/`useLocale`/
  storage+CustomEvent sync) — **string tables stay per-TMA**. Cuisine's `postJsonStream`/NDJSON is
  unique — leave it in cuisine.
- **Verify:** all 7 `web/` builds; `/verify` renders each TMA and confirms locale toggle + one
  API-backed action still work.
- **Rollback:** restore per-TMA configs from history.

### PR-6 · `web/_shared/lib/mapOverlays.js` — the big one, LAST — Est. ~4,800 LOC
- **Audit ref:** §2.1 row 1, §2.6 item 1. **Risk: LOW-MEDIUM but LARGEST blast radius** (3 live map
  surfaces: cuisine, hawker, transport).
- **Target:** one shared `mapOverlays.js` + a per-TMA layer-data config object. Sequenced deliberately
  last: it is ~70% of the frontend duplication, so it carries the most review and regression surface,
  and it benefits from `web/_shared/` already existing and proven by PR-2/PR-5.
- **Precondition:** the hawker↔transport diff is ~13% — **enumerate every difference first** and decide
  per-difference whether it is (a) genuine per-TMA config → parameterise, or (b) an un-synced drift/bug
  → resolve as a behaviour decision (§4) *before* extracting. Do not fold divergent behaviour into a
  shared file silently.
- **Verify:** all 3 map TMAs build; `/verify` drives each map (pan/zoom, layer toggles, station/venue
  overlays) and compares against pre-PR screenshots.
- **Rollback:** restore per-TMA `mapOverlays.js` from history.

### Offline / CI-only (parallel track, any time — not on the bot's live path)
- **PR-A · `scripts/lib/pipeline-scaffold.mjs`** (audit §3.2, ~160–200 LOC) — shared CLI-config/batch-loop/
  generated-header/idempotency for the 4 `draft-*`/`curate-*` scripts. Risk LOW (manual `workflow_dispatch`).
- **PR-B · `.github/actions/gemini-batch-pipeline/`** (audit §3.6, ~140–160 LOC) — one composite action;
  the 4 workflow YAMLs become thin callers. Risk LOW (testable via manual dispatch).
- **PR-C · `nation-overlay.js` `mergeGeneratedOverlay(path, applyFn)` helper** (audit §3.3, ~60 LOC) —
  collapses the 5 hand-copied merge blocks. **Risk MEDIUM** — runs at module-load on the live bot; keep
  it mechanical and diff the merged output against pre-PR for a fixed input set.

---

## 3. Suggested cadence

PR-1 → PR-2 → PR-3 → PR-4 → PR-5 → PR-6, one PR per session, each fully preflighted + `/verify`-driven
before the next. The offline track (PR-A/B/C) can interleave whenever convenient since it shares no
files with the live-path queue. **Stop and re-scope** if any PR's `diff -q` / difference enumeration
surfaces an unexpected divergence — that is a §4 decision, not a merge.

---

## 4. Deferred — behaviour decisions that MUST precede their consolidation (do NOT blind-merge)

These are **not** consolidation PRs. Each is a small behaviour decision that has to be made and landed
*first*; only then can the corresponding files be extracted safely.

| # | Divergence | Audit ref | Decision needed first | Then |
|---|---|---|---|---|
| D-1 | `web/hawker/src/tg.js` still uses `window.history.length > 1` back/close heuristic; transport removed it as buggy | §2.5 | Confirm transport's "always show back" (or its replacement) is the intended behaviour for all TMAs; apply it to hawker in a standalone bugfix PR | shared `tg.js` becomes a mechanical extraction |
| D-2 | `web/hawker/src/components/BackFab.jsx` keeps the same heuristic that `web/menu/.../BackFab.jsx` explicitly reverted | §2.9 | Same decision as D-1, applied to `BackFab.jsx`; land the hawker revert first | `BackFab.jsx` joins `web/_shared/` |
| D-3 | `translate-name.js` CJK range starts at U+3040 (kana); `local-name.js` `HAS_LOCAL_SCRIPT` starts at U+3000 (ideographic space) — they disagree on edge chars today | §3.7 | Pick the canonical Unicode range (decide what U+3000–U+303F should classify as); land it as a correctness PR touching both files | extract one `script-detect.js` |
| D-4 | `LocationField`/`LocationCard`/`LocationSheet` — same concept, very different maturity (30 vs 1,495 LOC) across TMAs | §2.1 #15 | Decide the target is a shared **hook** (state/logic), not a shared **component** (markup); design the hook API | build the hook; leave per-TMA markup |

---

## 5. Explicitly out of scope for the whole consolidation effort (for now)

- **`gemini-client.js` internal reimplementations** (5×) and the `index.js:13985` one-off — HIGH risk,
  backs the live `/s` + hidden-gems flow. Revisit only after PR-3 proves the shared `lib/gemini/` helper
  on the 3 low-risk migrants.
- **Hot-path Redis modules** (`search-conversation.js`, `pick-cache.js`, `response-cache.js`, `vibe.js`,
  …) — migrate onto `lib/redis-kv.js` only after PR-4's off-hot-path migration is proven.
- **`web/about`, `web/oversight`** — small and structurally different; low duplication surface, not worth
  a shared-package dependency.
- **Places-result normalizer (§3.5)** — unsized; needs a deeper field-for-field read across 15 files
  before it can even be scoped into a PR. Left as a research task, not a queued PR.
- **Bot `registerCommand()` wrapper (§4.3)** — MEDIUM risk; a careless generic try/catch could mask the
  exact "silent return" / "error-swallowing catch" failure modes `gia-preflight` watches for. Not queued;
  if ever pursued, cover only the ~20 simplest handlers and leave `/buddy`, `/hidden`, `/ztest`, `/cost`,
  `/ftlog` untouched.

---

## 6. What this scope deliberately does NOT claim

- The LOC figures are the audit's own rough estimates — ordering signal only, not a refactor budget.
- No PR here is pre-approved: each still needs its own G1 version-bump gate and (for the `web/_shared/`
  package boundary and `lib/gemini/`/`lib/redis-kv.js` new modules) a G3-style structural sign-off before
  the first extraction lands.
- Estimated total addressable by the live-path queue (PR-1…PR-6): the audit's ~7,800–8,300 LOC ceiling,
  minus the §4 deferrals and §5 out-of-scope items — realistically **~6,000–6,500 LOC** of pure,
  behaviour-preserving de-duplication if the full queue lands.
