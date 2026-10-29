# Vibe-Coding Record — schema & maintenance

A standalone, regenerable ledger of **every pull request** in `ang-kl/gia` (Soleat),
built so the project's "vibe-coded" history can be sliced from several angles at
once: what triggered each change, what the AI did, which feature/UX surface it
touched, which code/modules/TMAs it changed, and whether it touched Redis state,
privacy, the Legal docs, or tests.

> **This is deliberately *not* one of the eight `doc/` authenticity templates**
> (Builder / Persona / Feature / Technical / Legal / Journal / Chat / Register)
> and it does **not** follow the AU-1/AU-3 append-only Recipe. It is a *derived
> view* — a generated artifact regenerated wholesale from a metadata snapshot.
> The append-only narrative of the build still lives in `doc/Journal/` and
> `doc/Register/`; this folder just gives a wide, queryable cross-section.

---

## Files in this folder

| File | Role |
|---|---|
| `VibeCodingRecord.md` | **This file** — the schema, column legend, category taxonomy, and how to refresh. |
| `vibe-coding-record.md` | **The ledger, rendered as Markdown** — summary tallies + one table row per PR (#1 → latest). Auto-generated; do not hand-edit. |
| `records.tsv` | The **source-of-truth ledger as TSV** — the same rows, machine-readable (one header line + one line per PR), plus the raw `Title` column. Diff-friendly; easy to `awk`/`cut`/import. Auto-generated. |
| `generate.mjs` | The generator. Reads `data/`, writes `records.tsv`, `vibe-coding-record.md`, and the two `public/doc/vibe-journal.*` files. Pure (no network / no repo I/O outside this folder and `public/doc/`). Run: `node doc/VibeCodingRecord/generate.mjs`. |
| `data/prs.ndjson` | Committed snapshot of GitHub PR metadata — one JSON object per line: `{ n, title, state, merged, body }` where `body` is the first ~360 chars of the PR description. |
| `data/session-replies.ndjson` | Committed snapshot of this project's **assistant chat replies**, one JSON object per line: `{ i, ts, serialled, tagged, era, kind, chars, redactions, text }`. Produced by `extract-session-replies.mjs` from a Claude Code transcript. Exists because rules **S-1** (a serial number on every reply) and **T-1** (`[§X.Y]` on every paragraph) went unfollowed for an entire session — **351 replies, none numbered, none tagged**. Back-filling `doc/Chat/` was refused: AU-4 forbids condensation and the protocol forbids invention, so retrospective serials would fabricate a compliance that never happened. Operator ruling, 22-08 '26: *"vibe-journal 359 unlogged replies"* — this folder is the right home precisely because it is **not** one of the eight authenticity templates and **not** under the AU Recipe, so a derived view can record the replies as what they are. See `journal-0_62_723` `[HDR]` / `[AMD-6]`. |
| `extract-session-replies.mjs` | Extracts the above from a transcript: `node doc/VibeCodingRecord/extract-session-replies.mjs <transcript.jsonl>`. Redaction of API keys / OAuth / bot tokens runs **unconditionally** — the output feeds a public page, and "I checked and it was clean" is not a safeguard a future run can inherit. |
| `data/pr-files.tsv` | Committed snapshot of `git log origin/main` — `<PR#>\t<comma-separated files>` for every PR that squash-merged to a `(#NNN)`-tagged commit on `main` (≈ PR #78 onward; earlier PRs predate that convention, so they have no file list and the *Code impact* column says so). |
| `../../public/doc/vibe-journal.html` | **Hosted query page** — a self-contained HTML dashboard (no external deps; embeds the full dataset). Served by the bot at **`/doc/vibe-journal.html`** (e.g. `https://soleat.net/doc/vibe-journal.html`). Filter / sort / full-text-search the ledger; an *Insights* panel computes likely-rework pairs, churn by feature area & by module, PRs-per-release, the category mix, and same-day clusters; plus a "lessons to reduce rework" list distilled from `.claude/skills/gia-preflight/SKILL.md`. Auto-generated. |
| `../../public/doc/vibe-journal.json` | The same records as a flat JSON array (`{ generated, count, records:[…] }`) for `jq` / DuckDB / pandas / spreadsheets. Served at `/doc/vibe-journal.json`. Auto-generated. |

---

## The Wrong-Log (`extract-wrong-log.mjs` → `wrong-log.html`) — **not committed**

Every paragraph in which the assistant said something was **wrong**, lifted verbatim out of a
Claude Code transcript. Operator, 31-08 '26: *"copy those paragraphs into the vibe-coding journal
with a section called Wrong-Log. These are good learning lessons."*

```
node doc/VibeCodingRecord/extract-wrong-log.mjs <transcript.jsonl> [--since YYYY-MM-DD]
node doc/VibeCodingRecord/build-wrong-log.mjs
open doc/VibeCodingRecord/wrong-log.html
```

**Verbatim and complete — no curation.** The operator said *copy*, and AU-1 says add, never
compress. Signal was measured before deciding: of 84 paragraphs in the sample window, **zero**
were "nothing wrong" false positives, so there is no noise to remove even if removing it were
permitted. Choosing which of my own mistakes are worth keeping is exactly the judgement that
should not be mine.

### Why it is gitignored, and what that costs

`ang-kl/gia` is a **public** repository, and `data/session-replies.ndjson` is already committed
to it. Committing the Wrong-Log would therefore publish 226 paragraphs of defect narrative on
GitHub whatever the soleat.net gate does. Shown that, the operator chose: **never committed**.

So `data/wrong-log.ndjson`, `data/wrong-log.stats.json` and `wrong-log.html` are in
`.gitignore`, and `__tests__/wrong-log.test.js` asserts `git check-ignore` agrees — a
`.gitignore` line is precisely what a later `git add -A` defeats silently.

**The consequence, stated so nobody rediscovers it as a gap: Railway deploys from git, so a
gitignored file can never reach `/doc/vibe-journal.html`.** The operator separately asked for the
panel to be gated behind `VIBE_JOURNAL_KEY`; the two requests cannot both hold, and *never
committed* is the stricter one and was chosen second. Anyone adding the panel later is
**reversing that decision, not filling a gap** — and would be putting the text on GitHub too.

The durable half is the **script**, which carries no paragraphs. It runs against any transcript,
including the owner's local corpus (`CLAUDE.md`: 6,822+ replies across `gia` and `gia-web`) —
far more than an ephemeral container can see.

### Secrets

Uses the same three-layer pipeline as `extract-session-replies.mjs`, imported from
`redact.mjs` rather than reimplemented — `KNOWN SHAPES → transcript-derived operator literals →
fail closed`. Being uncommitted does **not** relax this: the file is written to disk and handed
to a human. On the 226-paragraph run it reported `redactions: 0` from 83 collected operator
secrets; that zero is only meaningful because the tests prove the pipeline **fires** on planted
credentials rather than inferring health from the count.

### Measured, 2026-08-31

| | |
| :--- | ---: |
| paragraphs | 226 |
| replies | 181 |
| distinct days | 12 |
| text | ~58 KB |
| busiest days | 22-08 and 30-08, **69 each** |

## The hosted query page (`/doc/vibe-journal.html`)

The "database to query and learn from" is `public/doc/vibe-journal.html` — a single
self-contained HTML file (the whole dataset is embedded; works offline / over
`file://` too). The bot serves it at **`/doc/vibe-journal.html`** via a tiny
`express.static('/doc', …)` route in `index.js` (alongside `/privacy`). It has:

- **KPIs** — PR count, merged / closed-unmerged, number of release lines, count of
  PRs flagged as rework, count of titles with a follow-up cue.
- **Insights — "where the loops are":**
  - *Likely rework / "we shipped, then iterated"* — every PR that is a `fix` (or
    whose title carries a follow-up cue: "again", "actually", "restore",
    "follow-up", "not taking effect", …) **and** has an earlier PR within the
    previous 8 PRs in the same feature area, linked to that earlier PR.
  - *Churn by feature / UX area* and *by code area / module* — bar lists; high
    churn ≈ the design took a while to settle / those files keep coming back.
  - *PRs per release (MAJOR.MINOR)* — a minor line with many PRs = lots of
    follow-up patches after the first cut.
  - *Category mix* and *same-day clusters* (days with ≥4 PRs ≈ iterating fast).
  - *📈 PRs over time* — PRs per ISO week and per day (tall spikes = high-iteration sessions).
  - *🪶 Small / low-effort PRs* — PRs touching ≤ 2 files (or category copy / prompt-tune / test); the headline % + a per-area breakdown + the list — "could any of these have been folded into a sibling PR?"
  - *🔁 Indecision* — PRs whose title/intent carries a revert / rollback / re-enable / re-add / "actually" / "not taking effect" / "again" / "take 2" / "finally" cue, with the matched signal — decisions that did not stick the first time.
  - *🧠 Behavioural patterns* — a KPI grid: PRs/active-day, busiest day, fix : feature ratio, rework rate, longest consecutive same-area streak, median files/PR, most-edited code area, small-PR share.
  - *🧩 Hard parts & recurring failure modes* — fix-density per feature area (share of an area's PRs that are `fix`), and PRs whose title/intent/approach matches a known failure mode (silent handler / missing module export / HTML escaping / fuzzy over-match / resolver ordering / stale bundle / post-refactor regression) drawn from the lessons list.
- **Lessons to reduce rework** — the practical checklist distilled from
  `.claude/skills/gia-preflight/SKILL.md` (run the gates, verify `require()`
  exports, escape user text in HTML messages, handler return paths, fuzzy-matcher
  smoke tests, resolver ordering, no destructive git ops, trace UI render paths,
  bump the version & re-read long functions).
- **The ledger — query it** — full-text search (PR #, title, intent, approach,
  module names, area, category) + dropdown filters (category, feature area, TMA,
  impact tag, release) + a "rework only" toggle + sortable columns; each row links
  to the GitHub PR and expands to show modules / file count / burst membership.

For querying outside the browser, `public/doc/vibe-journal.json` (`/doc/vibe-journal.json`)
is the same data as `{ generated, count, records:[…] }` — feed it to `jq`, DuckDB
(`read_json_auto`), pandas, or a spreadsheet. The canonical tab-separated copy is
`records.tsv` in this folder.

### Access gate (`VIBE_JOURNAL_KEY`)

`/doc` and `/doc/*` honour an optional shared key, the Railway service variable
**`VIBE_JOURNAL_KEY`**:

- **Unset** → the page is public (the default-open convention used by the other
  gates in this repo).
- **Set** → callers must supply the key via `?key=<value>` in the URL (a correct
  `?key=` also drops a 30-day `httpOnly` cookie scoped to `/doc`, so the in-page
  JSON link and the `/doc` redirect keep working without re-typing it), or the
  `X-Vibe-Key: <value>` request header (handy for `curl`). A missing/wrong key
  returns `401` with a tiny "enter the access code" form.

The key lives **only** in the Railway variable — it is never committed. The
served HTML embeds the full dataset, so the gate protects the *document*, not
individual fields; rotate the key by changing the variable (it takes effect on
the next deploy / restart). Implementation: the `/doc` routes in `index.js`
(search `VIBE_JOURNAL_KEY`).

> **Note on "reduce the PRs".** The intent behind this page is to make the *rework
> loops* visible — feature areas that took many PRs to settle, fixes that closely
> follow the PR that introduced the bug, same-day production iteration — so the
> next change is scoped, gated (`gia-preflight`), and verified well enough to land
> in one PR instead of three. The heuristics are coarse; treat a flag as "go read
> that pair", not a verdict.

---

## Column schema

Each PR is one row. Columns (in `records.tsv` order):

| # | Column | Meaning | Source |
|---|---|---|---|
| 1 | `PR` | PR number (`#1`…). | GitHub |
| 2 | `Status` | `merged`, `closed (unmerged)`, or `open`. | GitHub |
| 3 | `Merged (UTC)` | Merge timestamp (UTC), or blank if never merged. | GitHub |
| 4 | `Version` | Release version this PR cut, parsed from the title (`v0.60.142` → `0.60.142`); blank if the title carries no version. | title regex |
| 5 | `Category` | One of the categories below — what *kind* of change it was. | heuristic on title + body |
| 6 | `Feature & UX area` | Which user-facing surface / flow it primarily affected (see list below). | **title → files → body**, in that order (O-324) — `FEATURE_RULES` keywords against the title first, then `FILE_RULES` paths against the file list, then the keywords against the body as a last resort |
| 7 | `Triggering intent (paraphrased from PR title)` | A short imperative restatement of what was asked for. **The verbatim chat prompt is not retained in repo history** (`doc/Chat/` was never populated), so this is reconstructed from the PR title — treat it as a paraphrase, not a quote. | title |
| 8 | `AI approach / solution (from PR description)` | The first line / first bullet of the PR description — the one-line "what was done". | PR body |
| 9 | `Code / module / TMA impact` | Summary of files changed on the squash commit, bucketed: `index.js`, root modules by name, `TMA:<cuisine\|menu\|hawker\|transport\|oversight>`, `tests`, `doc`, `vault`, `ci`, `data`, `package`, `config`, other top-level dirs. `"(pre-squash convention — not tracked)"` for PRs before the squash-with-PR-number practice; for those, a best-effort guess from the title is shown and labelled `(inferred — pre-squash)`. | `pr-files.tsv` |
| 10 | `TMAs` | Which of the five Telegram Mini Apps were touched (`cuisine`, `menu`, `hawker`, `transport`, `oversight`), `+`-joined, or `—`. | `pr-files.tsv` / title |
| 11 | `Data / privacy / legal / test impact` | `;`-joined tags: `Redis/state` (touches Redis keys/TTLs/cache), `privacy` (hashes, `/forgetme`, identity-handling, anonymisation), `legal` (Legal docs / disclaimer / jurisdiction), `tests` (added/changed `__tests__/`), `doc/vault` (touched `doc/` or `vault/`). `—` if none detected. | `pr-files.tsv` + keywords |
| 12 | `Title` *(TSV only)* | The full PR title, verbatim. | GitHub |

The Markdown view (`vibe-coding-record.md`) shows columns 1–11 plus two summary tables (PRs per category, PRs per feature area) at the top.

### Category taxonomy

| Category | Definition |
|---|---|
| `feature` | New capability or a meaningful enhancement to an existing one (the default). |
| `fix` | Bug fix / regression repair / "X stopped working". |
| `refactor` | Internal restructure, rename, consolidation, extraction, de-dup, cleanup — no behaviour change intended. |
| `copy` | User-facing wording / i18n string / EN-FR translation / rephrasing changes. |
| `prompt-tune` | Changes to LLM prompts, Gemini/Claude instructions, narration, temperature, few-shot examples. |
| `docs` | `doc/` + `vault/` catch-ups, journal/feature/technical/register/legal updates, changelog. |
| `infra` | CI workflows, deploy/Railway, dependencies, `package.json` plumbing, env templates, `.gitignore`, skills, gatekeeper. |
| `test` | Test-only PRs (new/changed `__tests__/` with no production change). |

Heuristics are intentionally simple and title/body-driven, so they're occasionally
coarse (e.g. a PR that both fixes a bug *and* adds a feature lands in one bucket).
The `records.tsv` keeps the raw `Title` so a human can reclassify if needed.

### Feature & UX areas

`Oversight / usage stats` · `Cuisine Picker` · `Search / free-text` · `/eat /drink flow` ·
`/hidden surprise` · `Hawker NEA` · `Transport / carpark` · `Weather` · `Buddy / sharing` ·
`Recognised lists` · `Menu hub` · `Privacy / legal` · `Language / i18n` ·
`Maps / geo / location` · `Docs / vault` · `Infra / setup` · `Pipeline / discovery` ·
`Commands / chat UX` · `Core / misc` (fallback).

First match wins within each stage, and the stages run title → files → body (**O-324**).
`FEATURE_RULES` (keywords) drives the title and body stages; `FILE_RULES` (path patterns)
drives the file stage. Two things about `FILE_RULES` are deliberate and easy to undo by
accident:

- **`Docs / vault` and `Infra / setup` only win when nothing else scored.** `doc/.serial-state.yml`
  and a `doc/Journal/` entry ride along on nearly every PR in this repo, so without that rule
  every feature PR would file itself as documentation.
- **The dish corpora (`classics-notes`, `city-plates`, `nation-overlay`, `dish-aliases`) count
  as `Cuisine Picker`, not `Language / i18n`.** The translation programme works *on* them, which
  makes the other reading tempting; it measured worse (66 % → 62 % on the labelled sample).
  Genuine i18n work lands in their `-i18n.generated.js` siblings, which still match `/i18n/`.

---

## How to refresh

When new PRs land:

1. **Append PR metadata** to `data/prs.ndjson` — one line per new PR:
   `{"n":380,"title":"…","state":"MERGED","merged":"2026-…+00:00","body":"<the PR description>"}`

   > **The shape drifted, and this line used to describe the old one.** It said `state: "closed"`,
   > `merged: "…Z"` and *"first ~360 chars of the PR description, single line"*. Measured 2026-09-01
   > against the last 30 rows: they carry `"MERGED"`, `…+00:00`, and **full** bodies (1,970–8,116
   > chars) with newlines intact and HTML entities decoded. The generator reads whatever is there,
   > so **match the recent rows, not this file's history** — and if you change the shape again,
   > change this line in the same commit.
   (the existing lines were produced from the GitHub PR-list API; any equivalent dump works).

   **Redact before you write the file — this step is not optional and it is not a one-off.**
   PR bodies are prose written during live sessions, and they quote things: an env-var
   *value* pasted into chat, a Railway log line carrying the operator's `chat <id>`. The
   repo is public, so those bodies are already public on GitHub — but this snapshot is
   *also* served from `soleat.net/doc/vibe-journal.html`, and copying a value into the repo
   is a separate act from GitHub having it. Two were found and removed on 2026-08-28:
   the `ASIA6languages.*` i18n token in #1722's body, and the operator's Telegram chat id
   in #265 and #1021 (both pre-existing rows, public in this dataset since those PRs were
   logged). They are stored as `«OPERATOR-SECRET-REDACTED»` / `«OPERATOR-CHAT-ID-REDACTED»`.

   A **wholesale re-dump from the GitHub API will reintroduce both**, because GitHub still
   holds the original bodies — redaction here is the only thing standing between them and
   the hosted page. Sweep every new or re-fetched row for credential shapes and personal
   identifiers before writing, the same unconditional posture `extract-session-replies.mjs`
   already takes for transcripts, and for the same reason: *"I checked and it was clean"*
   is not a safeguard a future run can inherit.
2. **Append the squash-commit file list** to `data/pr-files.tsv`:
   `380<TAB>fileA,fileB,…` — get it from
   `git log origin/main --name-only --pretty='@@@%s'` (find the commit whose subject ends `(#380)`; its file lines are the value).
3. **Bump `GEN_DATE`** at the top of `generate.mjs` to the refresh date.
4. **Regenerate:** `node doc/VibeCodingRecord/generate.mjs` — rewrites `records.tsv`, `vibe-coding-record.md`, `public/doc/vibe-journal.html`, and `public/doc/vibe-journal.json`.
5. Commit `data/prs.ndjson`, `data/pr-files.tsv`, `records.tsv`, `vibe-coding-record.md`, `public/doc/vibe-journal.html`, `public/doc/vibe-journal.json` (and `generate.mjs` if you changed it). The page is then live at `/doc/vibe-journal.html` on the next deploy.

The generator is pure (no network, no repo I/O beyond this folder), so step 4 is
deterministic and safe to run any time. To re-derive *everything* from scratch,
re-dump all PRs from the GitHub API into `data/prs.ndjson` and re-run `git log`
for `data/pr-files.tsv`.

---

## Caveats

- **No verbatim prompts.** `doc/Chat/` (the serial chat log) was never populated,
  so column 7 is a reconstruction from PR titles, not the original chat text.
- **Pre-squash PRs (≈ #1–#77).** Before the "squash-merge, commit subject ends
  `(#NNN)`" convention, there's no clean PR→files mapping; those rows show
  `(pre-squash convention — not tracked)` (with a title-derived guess) in column 9.
- **Coarse buckets.** Categories and feature areas are keyword heuristics; a PR
  spanning several areas is filed under the first matching rule.
- **Redacted values.** Three rows carry `«OPERATOR-SECRET-REDACTED»` / `«OPERATOR-CHAT-ID-REDACTED»`
  in place of a credential or a personal identifier that appeared in the original PR body
  (#1722, #265, #1021). The bodies on GitHub are unchanged; only this snapshot is redacted.
- **`#1–#N` is a range, not a count.** The banners print the highest PR *number*, not the row
  count — the numbering has gaps (numbers consumed by issues, PRs never opened). Until
  2026-08-28 both banners printed the count on both sides, which read as a claim about the
  range and was wrong by 27 at that day's catch-up (1,743 rows, highest #1771).
- **Feature areas resolve TITLE → FILES → BODY** (changed 2026-08-28, Register **O-324**).
  The column used to pour title and body into one string and take the first `FEATURE_RULES`
  keyword that hit anywhere in it. Bodies here are long narrative documents that mention every
  surface in passing, so a bare substring like `'hawker'` at rule 6 captured whatever it
  touched: of the 8 rows the 2026-08-28 catch-up filed under `Hawker NEA`, **6 were not about
  hawker centres**, including a transport i18n PR that matched on `mrt.nearestHawker` in its
  prose. Resolution now takes the PR's **title** (its own statement of intent) first, then its
  **file list** (`FILE_RULES` — what it actually changed, which cannot be mentioned in
  passing), and only then falls back to the body, which is still needed because 338 rows have
  no file list at all.

  **Measured, on a seeded 50-PR sample labelled from title + file list *before* any strategy
  was run against it: 38 % → 66 % overall, and 38 % → 71 % on the 42 rows whose area was not
  genuinely arguable.** Two alternatives were rejected on the same sample: title-then-body
  (46 %) and scoring areas by body keyword *frequency* (48 %, and it stripped 219 rows off
  `Cuisine Picker` — it failed differently, not less).

  **It moved 799 rows, 45.8 % of the ledger**, so the *churn by feature area* and *fix-density*
  insights are not comparable with any earlier snapshot. That is the point of the change and
  the cost of it, stated here rather than left to be discovered.

- **The residual error is one taxonomy question, not a bug.** 10 of the 17 remaining sample
  misses are the same disagreement: is a map fix inside the Cuisine TMA `Maps / geo / location`
  or `Cuisine Picker`? The rules cannot settle that; the taxonomy has to. `records.tsv` keeps
  the raw `Title` so a human can reclassify.

- **Snapshot, not live.** `data/` is a point-in-time export; the ledger is only as
  fresh as the last refresh (see `GEN_DATE` in `generate.mjs` and the banner at the
  top of `vibe-coding-record.md`).
