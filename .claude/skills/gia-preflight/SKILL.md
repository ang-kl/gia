---
name: gia-preflight
description: >-
  Pre-commit / pre-PR safety pass for the gia (Soleat) repo. Run this BEFORE
  committing or opening a PR after any change to index.js, the Telegram bot
  handlers, the /s search flow, free-text search, venue rendering
  (venue-templates.js / formatTechniqueVenueBlock / deliverPicks), i18n.js,
  or any fuzzy matcher (cooking-methods.js, nation-overlay.js, gemini-client.js
  R.E.D, dessert-drink-keywords.js, freetext-classify.js). Codifies the
  failure modes that have bitten this codebase: a missing module export
  collapsing a render path (and going silent), unescaped user text in a
  parse_mode='HTML' message, handler paths that return without sending,
  error-swallowing catches, fuzzy matchers over-matching common queries,
  and destructive git ops wiping uncommitted work.
---

# gia preflight — don't let it happen again

A checklist distilled from real regressions in this repo. Work top to bottom.
Most items are a `grep` + 30s of thought; the test/`node --check` ones are
non-negotiable.

## 0. Always (every change, no exceptions)

- [ ] `node --check <each changed .js>` — must be clean.
- [ ] `npm test -- --run` — must be 100% green. If you added behaviour, you
      added a test for it.
- [ ] If you touched anything under `web/` → `cd web/<app> && npm run build`
      (or `npm run build` at root for all four TMAs). Server-only changes
      (`index.js`, `i18n.js`, modules) don't need a build.
- [ ] **If you touched anything under `web/`, then `npm run test:render`.** A
      build is not a render: Rollup compiles a reference-before-declaration
      happily, and `node --check` sees valid syntax. Only this harness actually
      MOUNTS each app in a headless browser, and it is the only check that
      fails on one.

      > Regression, twice, same app. v0.62.692: `renderCentreCard` used an
      > `isShort` it never declared — white-screened Hawker in production after
      > passing `node --check`, `vite build` and every unit test. Register O-120
      > created `scripts/render-smoke.mjs` in response. v0.62.841: a new hook
      > block was placed above the `const active` it read, so every Hawker launch
      > threw `Cannot access 'active' before initialization`. `active?.centres`
      > looked defensive but optional chaining does not guard the temporal dead
      > zone. CI caught it; this checklist did not, because the harness O-120
      > built was never added here. It is added now.
- [ ] Bump `package.json` `version` (PATCH for bug fix / copy / prompt tweak).
- [ ] After a non-trivial edit to a long function, **re-read the whole
      function** start to finish. (The `handleSearchTurn` restructures slipped
      bugs precisely because the diff looked fine in isolation.)

## 1. Module exports — the "thin cards / silence" class

> Regression: `formatTechniqueVenueBlock` called `require('./venue-templates').escapeHtmlForTelegram(...)`
> but the module only exported `escapeHtml`. Every call threw `TypeError: … is
> not a function` on its first line → callers with a per-card `catch` showed the
> name-only fallback ("doesn't use the standard template"); callers without one
> let the throw escape the `bot.onText` callback → `/s` went **totally silent**.

- [ ] For every `require('./x').y(...)` or `const m = require('./x'); … m.y(...)`
      you added or moved: confirm `y` is in `x`'s `module.exports`.
      `node -e "console.log(Object.keys(require('./x')))"` settles it.
- [ ] Render helpers (`formatTechniqueVenueBlock`, `formatVenueBlock`,
      `deliverPicks`, anything that builds a venue card) are under-tested.
      If you change one, add at least a smoke assertion (e.g. via
      `venue-templates.js`'s exported helpers) that it doesn't throw on a
      realistic-but-sparse venue object and produces the expected lines.

## 2. Telegram HTML — the "unescaped user text" class

> `parse_mode: 'HTML'` messages choke on a stray `<` / `>` / `&`. The
> `freetext.divider` `{dish}` and the `🔎 Results for "…"` header interpolated
> raw user text into HTML messages.

- [ ] Every `{placeholder}` you put into an i18n string that is sent with
      `parse_mode: 'HTML'` (or `tn(...)`/`t(...)` whose result is sent that
      way): if the value is user input / a Places field / any external string,
      wrap it in `esc(...)` (local) or `escapeHtmlForTelegram(...)` (module-level
      in index.js) or `vt.escapeHtmlForTelegram(...)`.
- [ ] Strings sent **without** a `parse_mode` are plain text → no escaping
      needed (e.g. `bot.noresults`, the `/ver` deny log). Don't over-escape
      those.
- [ ] `formatTechniqueVenueBlock` / `formatVenueBlock` escape their own inputs
      (venue name, area, dishPhrase) — don't double-escape before passing in.
- [ ] When you build a message string by `.join('\n')`-ing a `lines[]` array
      that is then sent with `parse_mode: 'HTML'`, every element pushed into
      `lines` must already be HTML-safe.

## 3. Bot handlers — the "silence" class

> A handler that `return`s without sending, or whose only error handling is
> `console.warn`, leaves the user staring at nothing.

- [ ] Trace every `return` path in a `bot.onText` / `bot.on('callback_query')`
      handler (and `handleSearchTurn`, `runFreeTextSearch`, the fan-outs): does
      it either (a) send a message, or (b) is it an intentional, documented
      no-op (e.g. keyboard-text echo, owner-gate deny)?
- [ ] Top-level handler bodies that dispatch into multiple render paths get a
      `try { … } catch (err) { console.error(...); safeSend(chatId, <friendly
      EN/FR fallback>); }` so a throw anywhere downstream still produces a
      reply. (`runSearchCommand` wraps `handleSearchTurn` for exactly this.)
- [ ] Per-item renders inside a `.map(...)` (venue cards) get a per-item
      `try/catch` returning a minimal fallback — one bad item must not blank
      the whole reply.
- [ ] A `catch` that only `console.warn`s is fine for *best-effort enrichment*
      (travel times, footfall, recent-picks) but NOT for the main path.

## 4. Fuzzy matchers — the "over-match" class

> Regression: after the `data/cooking method reference by cuisine.md` merge
> added ~3,900 entries, `findCookingMethodMatches` matched the bare leading
> token of multi-word entries — so `/s ramen` ("ramen reduction"), `/s pizza`
> ("pizza stone-baking"), `/s chicken`, `/s beef`, `/s rice`, `/s soup`,
> `/s curry`, `/s egg`, `/s tofu` all got hijacked into the cooking-method
> pivot. `/s` "stopped working" for most common queries.

- [ ] After bulk-adding entries to ANY fuzzy matcher (`cooking-methods.js`,
      `nation-overlay.js`, R.E.D `AMBIGUOUS_DISHES`/`TECHNIQUE_FALLBACK`,
      `dessert-drink-keywords.js`, `misrepresented-dishes.js`): run a quick
      smoke pass against common queries and assert they DON'T match:
      `node -e "const m=require('./cooking-methods'); for (const q of ['ramen','pizza','chicken','beef','fish','rice','noodle','soup','curry','egg','tofu','laksa','char kway teow']) console.log(q, m.findCookingMethodMatches(q).length)"`
      — all should be `0` (or, for genuine dish-methods, deliberate). Add a
      regression test pinning the "must NOT match" set.
- [ ] A new matcher entry whose first token is a common food-component /
      state word (chicken, beef, fish, rice, noodle, soup, curry, egg, tofu,
      sweet, sour, fried, …) and that matches via a "leading prefix" rule will
      capture far more than intended — gate it (see
      `cooking-methods.js`'s `COMMON_DISH_LEADING_BLOCKLIST`).

## 5. Resolver ordering — the "pre-empted" class

> Regression: `handleSearchTurn` ran the technique short-circuit + the Gemini
> `classifySearchIntent` step BEFORE the deterministic R.E.D disambiguation,
> so "/s goulash dumpling" got an over-broad reading instead of "Czech guláš
> with bread dumplings".

- [ ] When several resolvers feed one flow (R.E.D / technique short-circuit /
      nation-overlay / cooking-method / Gemini intent), the order is:
      **deterministic + most-specific first**, LLM last. A confident R.E.D
      resolution must pre-empt the looser fallbacks (gate them on
      `!disambigDisclosure`), not the other way round.
- [ ] If you add a new short-circuit, check it doesn't shadow an existing
      AMBIGUOUS_DISHES / NATION_OVERLAY entry for the same term.

## 6. Git safety — the "wiped my work" class

> `git reset --hard origin/main` with a dirty working tree silently discarded
> an in-progress restructure. Had to redo it from memory.

- [ ] **Never** `git reset --hard`, `git checkout -- .`, `git clean -fd`,
      `git stash drop`, force-push to a shared branch, etc. while there are
      uncommitted changes you care about. To inspect remote state, use
      `git fetch && git log --oneline origin/<branch>` — that touches nothing.
- [ ] If you genuinely need a clean tree, `git stash` first (recoverable),
      then `git stash pop`.
- [ ] Commit work-in-progress before any branch surgery (`reset`, `rebase`,
      `merge`, switching branches with overlapping changes).

## 7. PR hygiene (this repo)

- [ ] Develop on the assigned `claude/...` branch; push with
      `git push -u origin <branch>` (`--force-with-lease` only when the branch
      was already merged and you're starting the next change on top of `main`).
- [ ] Open the PR as a **draft**. After CI is green, mark ready + squash-merge
      (the operator usually says "merge").
- [ ] PR body: what broke, the root cause, the fix per file, and a manual test
      plan (the exact `/s …` / chat inputs to try post-deploy).
- [ ] Doc-bearing changes (anything under `doc/`) follow `doc/CLAUDE.md`'s
      AU-1/AU-3/AU-7 protocol — reproduce prior content verbatim, append, never
      compress; bump `doc/.serial-state.yml`. If you're not doing the full
      ceremony, say so explicitly in the PR.

## 8. UI / message-rendering changes — verify the actual output

- [ ] You cannot run the Telegram bot here. So for any change to what a
      message looks like (templates, dividers, the "🍽️ Try X" line, headers),
      trace the **render path end to end** by reading the code: which function
      builds the string? `deliverPicks` (→ `formatVenueBlock`) or
      `formatTechniqueVenueBlock`? Does it get a `dishPhrase`? a `dividerAfter`?
      Confirm the change lands where you think it does. (We chased the "Try X"
      line through `deliverPicks` before realising the screenshots were
      `handleSearchTurn` → `formatTechniqueVenueBlock`.)
- [ ] When the user reports "X doesn't work / looks wrong" with a screenshot,
      first identify which code path produced that exact output (search for the
      literal strings/emoji in the screenshot) before theorising a fix.
