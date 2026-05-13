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
| `generate.mjs` | The generator. Reads `data/`, writes `records.tsv` + `vibe-coding-record.md`. Run: `node doc/VibeCodingRecord/generate.mjs`. |
| `data/prs.ndjson` | Committed snapshot of GitHub PR metadata — one JSON object per line: `{ n, title, state, merged, body }` where `body` is the first ~360 chars of the PR description. |
| `data/pr-files.tsv` | Committed snapshot of `git log origin/main` — `<PR#>\t<comma-separated files>` for every PR that squash-merged to a `(#NNN)`-tagged commit on `main` (≈ PR #78 onward; earlier PRs predate that convention, so they have no file list and the *Code impact* column says so). |

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
| 6 | `Feature & UX area` | Which user-facing surface / flow it primarily affected (see list below). | keyword map on title + body |
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

First match wins (the rule order in `generate.mjs` `FEATURE_RULES` is the priority).

---

## How to refresh

When new PRs land:

1. **Append PR metadata** to `data/prs.ndjson` — one line per new PR:
   `{"n":380,"title":"…","state":"closed","merged":"2026-…Z","body":"<first ~360 chars of the PR description, single line>"}`
   (the existing lines were produced from the GitHub PR-list API; any equivalent dump works).
2. **Append the squash-commit file list** to `data/pr-files.tsv`:
   `380<TAB>fileA,fileB,…` — get it from
   `git log origin/main --name-only --pretty='@@@%s'` (find the commit whose subject ends `(#380)`; its file lines are the value).
3. **Bump `GEN_DATE`** at the top of `generate.mjs` to the refresh date.
4. **Regenerate:** `node doc/VibeCodingRecord/generate.mjs`
5. Commit `data/prs.ndjson`, `data/pr-files.tsv`, `records.tsv`, `vibe-coding-record.md` (and `generate.mjs` if you changed it).

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
- **Snapshot, not live.** `data/` is a point-in-time export; the ledger is only as
  fresh as the last refresh (see `GEN_DATE` in `generate.mjs` and the banner at the
  top of `vibe-coding-record.md`).
