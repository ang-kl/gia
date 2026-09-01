# CLAUDE.md — repo root orchestration

@CLAUDE-protocol.md

The line above imports the project-neutral reply protocol — serial, time,
paragraph numbering, agent/token counts, the mental model, the custom
commands, and protocol points P1–P8. Same file in every repo. Everything
else in this file is gia-specific.


This is the **Soleat** (`gia` / "Gia4lunch") Telegram bot + Mini Apps + Express server.

## Documentation protocol

The full doc contract lives in **`doc/CLAUDE.md`** (lean orchestrator) and `doc/CLAUDE-FULL.md`
(reasoning, decision rules, worked examples). On a session that touches docs, follow it —
the eight folder templates under `doc/` (Builder / Persona / Feature / Technical / Legal /
Journal / Chat / Register), the AU-1…AU-7 authenticity Recipe (add, never compress; preserve
removed content in Removed/Deprecated tables), the serial-number protocol (`doc/.serial-state.yml`),
the time-anchor protocol (TF-1…TF-10), and the confirmation gates (G1…G4).

`doc/VibeCodingRecord/` is a separate, **generated** artifact (a per-PR cross-section + the
hosted Vibe Journal page at `/doc/vibe-journal.html`); it is *not* one of the eight templates
and is *not* under the AU append-only Recipe — regenerate it with `node doc/VibeCodingRecord/generate.mjs`.
See `doc/VibeCodingRecord/VibeCodingRecord.md`.

## Standing rule — keep `doc/Journal/` current per-PR

**After opening any PR, and after a PR merges, record it in the Journal.** Concretely:

1. Append a new `[HDR]` block (or, mid-arc, extend the current arc's entry) in
   `doc/Journal/journal-<MAJOR_MINOR_PATCH>-<dd_mm_yy-hhmm>.md` — covering `[INTENT]`
   (the operator's request, quoted where it matters), `[DELTA]` (what changed, file by file),
   `[VERIFICATION (sandbox)]`, `[STATUS]` (PROD/STAGED/DRAFT + how it deploys), `[TEST]`,
   `[KNOWN GAPS]`, and the Confirmation-Gates table — using `doc/Journal/Journal.md` as the
   skeleton and the most recent `journal-*.md` for tone/format.
2. Bump the relevant counters in `doc/.serial-state.yml` (`journal`, `commit`, …) and re-anchor
   `last_anchor_*` to the current time (PR merge timestamps are an acceptable evidence source —
   see the `tf_7_self_correction_*` precedents).
3. If a `doc/Feature/` / `doc/Technical/` / `doc/Register/` update or a `vault/<version>/`
   snapshot is also due, either do it in the same pass or log it as "still due" in the
   Journal's `[KNOWN GAPS]` and in `doc/Register/`.
4. Regenerate `doc/VibeCodingRecord/` when convenient (append the new PR's row to
   `doc/VibeCodingRecord/data/prs.ndjson` + its squash-commit file list to `data/pr-files.tsv`,
   bump `GEN_DATE`, run the generator) so the ledger + hosted page track main.

This rule was set by the operator: *"Update the Journal every time a new PR is created and done."*
(Recorded as decision-gate G3 in `journal-0_60_144-13_05_26-0900.md`.)

### Amendment D-205 — merge records fold forward · ✅ APPROVED (G3), 22-08 '26

> **In force.** SR-1 (`CLAUDE-FULL.md` §17.6) requires a standing rule to carry the operator's
> verbatim approval and a journal reference. Both hold.
> **Operator, 22-08 '26, verbatim: *"fold merge records into the next substantive PR"*.**
> Journal reference: `journal-0_62_732-22_08_26-1108.md` `[AMD-12]`.

**Do not open a PR whose only content is a merge record.** Write the record when the merge
happens — that part is unchanged, and rule 1 above still governs what the entry must contain —
but hold it in the working tree and ship it with the next substantive PR.

The rule as written above recursed: a docs-only PR recording a merge is itself a PR, so it needs
its own record, which needs its own PR. On 22-08 '26 that chain produced **nine of the day's
twenty-four PRs** — #1728 recorded #1727, #1732 recorded #1731, #1735 recorded #1734, and #1737
would have recorded #1735 and #1736. The rule's purpose is that the Journal stays current, and
folding forward serves that; opening the PR was never the point.

Two things this does **not** relax:

- **The record is still written at merge time**, from the merged tree, verified by content
  (D-123) — not reconstructed later from memory. Delay the *PR*, never the *verification*.
- **If no substantive PR follows**, the record is still owed. Log it as "still due" in the
  Journal's `[KNOWN GAPS]` and in `doc/Register/`, per rule 3 above — the same treatment a
  pending `doc/Feature/` or `vault/` update already gets. A record folded forward into a PR
  that never arrives is a record that was dropped.

### Anchor time — D-203 · ✅ APPROVED (G3), 22-08 '26

> **In force.** SR-1 (`CLAUDE-FULL.md` §17.6) requires a standing rule to carry the
> operator's verbatim approval and a journal reference. Both now hold.
> **Operator, 22-08 '26, verbatim: *"proceed with proposed D-203"*.**
> Journal reference: `journal-0_62_723-22_08_26-0730.md` `[AMD-4]` (proposal) and
> `[AMD-6]` (this approval). It was proposed by Claude Code and briefly installed here
> *before* approval — that was itself a rule violation, caught by Codex on PR #1719 and
> recorded as **X-13**; the history is kept rather than tidied away.

An anchor is **`max(sensor reading, latest known event time)`**, never the
sensor reading alone. TF-10 already says a payload timestamp from `api.data.gov.sg` is a *lower bound on
now*, not the current time; D-203 says what to do with that bound. If a git commit, a PR
merge, or any other event with a trustworthy timestamp is already known to have happened,
the anchor cannot predate it.

This exists because `journal-0_62_723` `[AMD-3]` was stamped `07:55` while reporting a merge
that git records at `07:59:45` — a verification dated before the event it verified. The
entry had first been stamped `08:00` and was then "corrected" to the fetched value, moving
it away from the truth while announcing increased rigour. Compute the `max()` with a
deterministic tool, per reporting-protocol rule 5.

Counters and anchors move together: bumping `journal`/`commit` in `doc/.serial-state.yml`
without re-anchoring `last_anchor_*` leaves serial generation pointing at a stale event.

## Standing rules — operator, 22-08 '26 (PINNED)

Set by the operator verbatim: *"use this Mental model for building this project"* and
*"Pin this request"*. These apply to every session, not just the one they were set in.

The mental model, the three custom commands and the eight reporting-protocol
points now live in `CLAUDE-protocol.md` (§9, §10, P1–P8), imported at the top
of this file, so they read identically in every repo. They are unchanged in
substance; only their home moved. What stays here is what is true of gia and
nowhere else:

- the command files in `.claude/commands/{understanding,gaps,delta}.md` are
  gia's own, longer than the neutral one-liners, and are the ones that run;
- P7 subsumes gates G2 and G4 here, and is wider than both;
- and the D-199 rule below, which is why P3 has teeth in this repo.

P3 has teeth here specifically because of D-199: repo state is evidence about the past,
not the present. An invariant checked against a comment, a stored chain, or a prior journal
entry is **Not Verifiable**, not Passed. When an external API is the authority on a fact,
only its live response verifies it.

## Serial rebase records

`CLAUDE-protocol.md` §1 requires that any session running on a partial transcript corpus append
a rebase line here recording the count reached and where it was measured. **Until 22-08 '26 that
had never been done**, which is why the serial had nothing to continue from and drifted onto the
per-session chat counter instead (§3.2's counter is a different number for a different purpose —
see X-11). The ledger is this file; a container is not.

| Measured | Where | `serial_measured` | Note |
| :--- | :--- | ---: | :--- |
| 16-08 '26 | owner's local corpus | 6,253 | The figure already cited in `CLAUDE-protocol.md` §1. |
| 22-08 '26 | owner's local corpus, **all** `gia*` project folders | **6,822** | The rebase base. See the derivation below. |
| 22-08 '26 | remote container (`claude/handover-july-11-49uzvf`) | 711 | Partial — this container was cloned fresh on 09-08 '26 and holds one transcript. **Not** a correction to the above; added to it. |
| 27-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **1,077** | Partial, and the successor to the row above rather than a second measurement of it — the same container, 366 replies later. Running serial from here = 6,822 + 1,077 = **7,899**. Appended per `CLAUDE-protocol.md` §1: replies made in a container the local corpus never sees have to be written down, or a later local re-measure legitimately reads low and the count drifts through the other door. |
| 28-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **1,313** | Partial, and the successor to the row above — same container, 236 replies later, written down on the day #1771 merged rather than at some later session's convenience. Running serial from here = 6,822 + 1,313 = **8,135**. The 27-08 row was already stale by the time it was read back: §1's write-back is only a ratchet if it is appended while the container is still alive, and this one is ephemeral. |
| 30-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **1,944** | Partial, and the successor to the row above — same container, 631 replies later. Running serial from here = 6,822 + 1,944 = **8,766**. Written down on the day #1796 merged rather than at a later session's convenience: the 28-08 row was two days and 631 replies stale by the time it was read back, which is the drift §1 describes arriving through the gap between one write-back and the next rather than through a missing one. A ratchet appended once has stopped ratcheting. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,096** | Partial, and the successor to the row above — same container, 152 replies later. Running serial from here = 6,822 + 2,096 = **8,918**. Appended one day after the row above rather than two, because that gap is the variable §1 actually cares about: the 30-08 row was already 152 replies stale when it was read back this morning, and the 28-08 row before it was 631 replies stale. Shortening the interval is the only thing that shrinks the window in which an ephemeral container can die holding replies no ledger records. Measured twice this session — 2,094 at 09:32 SGT, 2,096 at 09:36 — and stamped with the reading that produced the row, not the earlier one it was planned from. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,172** | Partial, and the successor to the row above — the SAME DAY, 76 replies later, which is the point. Running serial from here = 6,822 + 2,172 = **8,994**. The rows above shortened the interval from two days to one; this one shortens it to an hour, because §1's write-back is a ratchet and the window it leaves open is measured in replies, not in days. Three PRs merged between the 09:36 reading and this one (#1802, #1803, and the batch-1 dish names), any of which could have been the last thing this ephemeral container did. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,323** | Partial, and the successor to the row above — the same day again, 151 replies later. Running serial from here = 6,822 + 2,323 = **9,145**. Appended on the same principle as the two rows above it: §1's write-back is a ratchet, and the window it leaves open is measured in replies rather than in days. #1808 merged between that reading and this one, and this session then built batch 5a on top of it — so the interval covers a merge and a full PR's worth of work, which is exactly the span an ephemeral container can take with it. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,344** | Partial, and the successor to the row above — the same day, 21 replies later, which is the shortest interval any row here records. Running serial from here = 6,822 + 2,344 = **9,166**. Short not for its own sake: #1809 merged in between, and the merge record it produced lived only in this container until a force-push the operator had to approve. That is the §1 window made concrete — a ratchet appended once has stopped ratcheting, and the interval that matters is the one between the last write-back and whatever ends the container. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,361** | Partial, and the successor to the row above — 17 replies later, shorter again. Running serial from here = 6,822 + 2,361 = **9,183**. #1810 merged in between and Europe was completed, so this interval covers a whole continent's worth of the dish-name work. The rows above shortened the write-back interval from two days to one, then to an hour; this one holds it there rather than letting it drift back, which is the only thing §1's ratchet actually asks for. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,370** | Partial, and the successor to the row above — 9 replies later, the shortest interval recorded here. Running serial from here = 6,822 + 2,370 = **9,192**. Two PRs merged inside that window (#1810 and #1811) and two batches were built on top, so the interval is short in replies but not in work — which is the distinction §1's ratchet is actually about. The window that matters is between the last write-back and whatever ends the container, not between one calendar day and the next. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,382** | Partial, and the successor to the row above — 12 replies later. Running serial from here = 6,822 + 2,382 = **9,204**. #1812 merged in that window and batch 7a was built on top, taking the table past 1,562 of 1,612. The interval is short because the last four rows established that the window §1 cares about is the one between the last write-back and whatever ends the container, and this container has now survived long enough that the habit is the only thing keeping it honest. |
| 31-08 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,395** | Partial, and the successor to the row above — 13 replies later, and the row that closes the dish-name arc. Running serial from here = 6,822 + 2,395 = **9,217**. #1813 merged in that window and batch 7b completed the table at 66 slugs, 1,612 distinct dishes, 0 untranslated. Worth writing down at the end of a piece of work rather than only at the start of the next one: the interval §1 cares about closes when the container dies, and a finished arc is exactly the moment a session is most likely to stop. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,403** | Partial, and the successor to the row above — 8 replies later, and **the first row to cross a date boundary**. Running serial from here = 6,822 + 2,403 = **9,225**. The rows above all landed on 31-08; this one is stamped 01-09 because the session resumed after midnight SGT and D-203's `max(sensor, latest known event)` puts the anchor at the sensor, not at #1814's 21:01 merge. Worth an explicit row rather than folding into the last one: a date change is exactly where a reader reconstructing the count would otherwise assume a gap, and §1's ledger is read by people who were not here. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,430** | Partial, and the successor to the row above — 27 replies later. Running serial from here = 6,822 + 2,430 = **9,252**. #1815 merged in that window and the operator ruled on the overlay duplicates, which retired three entries and added a folding guard. The interval is longer than yesterday's rows because the work was investigation rather than authoring: four of those replies were measurement that changed what the job was, and one was a question put to the operator instead of a decision taken for them. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,466** | Partial, and the successor to the row above — 36 replies later, and the row that closes the operator's "3, 2, 1". Running serial from here = 6,822 + 2,466 = **9,288**. #1816 merged in that window and the Vibe Journal ledger was brought current, which is the one piece of work in this arc that **publishes** — so the interval covers the only change whose blast radius reaches past the repo. Written down before the push rather than after it, because a container that dies mid-publish is exactly the case §1's ratchet is for. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,475** | Partial, and the successor to the row above — 9 replies later. Running serial from here = 6,822 + 2,475 = **9,297**. #1817 merged in that window, and it is **the first PR in this session merged by Claude Code rather than the operator**, on their instruction *"Merge when ready"*. That merge is also the one that **publishes** — it puts the caught-up ledger on soleat.net — so this interval covers the only change in the arc whose blast radius reaches past the repo. The row exists because §1's ratchet caught its first draft inserted ABOVE the 2,466 row: a count out of order reads as a decrease, and the guard refuses that whether it is a real regression or a misplacement. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,503** | Partial, and the successor to the row above — 28 replies later. Running serial from here = 6,822 + 2,503 = **9,325**. **The row above is why this one exists in the form it does.** This session restarted the branch from `origin/main`, so the 2,475 row — which lives one commit *ahead* of `main`, on the remote branch — was invisible locally, and I drafted a replacement row asserting it had been **lost**. It had not been lost; it had been pushed, and the non-fast-forward refusal is what sent me to read the remote instead of overwriting it. §1 says the file is the ledger and a container is not; the sharper form is that **the ledger is `origin/<branch>`, not `origin/main`**, and a restart from the wrong one makes a written row look like a missing one. Appended in the same commit as the work it counts, which is the only arrangement where the row and the code cannot be separated by a rollback. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,507** | Partial, and the successor to the row above — 4 replies later, the shortest interval this table records. Running serial from here = 6,822 + 2,507 = **9,329**. Short because #1818 went **ready and merged in the same second**, which is the shape §1's ratchet is actually guarding against: the window between one write-back and whatever ends the container is not measured in replies or in days but in *events that can happen while you are not looking*. Four replies covered a PR opened, reviewed by nobody, and merged. The row above took 28 replies to cover less. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,516** | Partial, and the successor to the row above — 13 replies later. Running serial from here = 6,822 + 2,516 = **9,338**. **The interval is short in replies and long in work**, which is the distinction this table keeps re-learning: those 13 replies cover #1818 merging, a plan re-measured against `main` that moved the remaining surface from 4,211 units to 5,852, a scope question put back to the operator because a scope chosen against a wrong total is not a scope that was chosen, and then all 916 Mini App strings authored, inserted, guarded and built. §1's ratchet is not counting conversation; it is counting what an ephemeral container would take with it. |
| 01-09 '26 | remote container (`claude/handover-july-11-49uzvf`), same transcript | **2,520** | Partial, and the successor to the row above — 4 replies later, tying the shortest interval this table records. Running serial from here = 6,822 + 2,520 = **9,342**. Four replies covered #1819 opening and going green, and all 1,612 Korean dish names authored, inserted, guarded and mutation-proved. **The reply count and the work have come almost entirely apart**, which is the clearest case yet for why §1 counts what a container holds rather than how much was said: a session that ended here would lose an afternoon's work and four lines of conversation. |

**Derivation, because "which folders" is a real question and the wrong answer resets the count.**
`~/.claude/projects/` holds three `gia`-matching folders, because Claude Code keys transcripts on
the working-directory path and this repo has been opened at more than one:

- `…-Github-gia` — 4,090 replies
- `…-Github-gia-web` — 2,732 replies (sessions started inside `web/`; same repo, same work)
- `…-Github-Gia-WA` — 0 replies

Counting only the first gives **4,090, which is BELOW the 6,253 already recorded** — and §1 is
explicit that a measurement below the last recorded rebase is evidence of a partial corpus, not a
correction. Silently adopting it would reset the count by thousands while looking like diligence.
Including `gia-web` gives **6,822**, which is above the precedent and grows from it by 569 over
six days. So the web subtree counts, and the total is the sum.

**Serial from here** = **6,822** + replies measured in the current session's own corpus. Once the
local machine next runs a measurement it will include everything except replies made in remote
containers, which is why each such session appends its own row above rather than overwriting one.

## Pre-PR safety

Run the `gia-preflight` checklist (`.claude/skills/gia-preflight/SKILL.md`, `/gia-preflight`)
before committing/opening a PR after any change to `index.js`, the bot handlers, the `/s` /
free-text search flow, venue rendering, `i18n.js`, or a fuzzy matcher. Non-negotiable every
time: `node --check` on each changed `.js`, `npm test -- --run` 100 % green, a `web/` build if
`web/` changed, and a `package.json` version bump.
