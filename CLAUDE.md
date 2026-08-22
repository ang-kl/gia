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

### Anchor time — D-203 · ⚠️ PROPOSED, AWAITING OPERATOR APPROVAL (G3)

> **Not in force.** SR-1 (`CLAUDE-FULL.md` §17.6) requires a standing rule to carry the
> operator's verbatim approval and a journal reference. This one has neither: it was
> proposed by Claude Code in `journal-0_62_723` `[AMD-4]`, and installing it here as an
> active rule was itself a rule violation, caught by Codex on PR #1719 and recorded as
> **X-13**. It stays visible so the reasoning is not lost, and stays labelled so no
> future session enforces a policy the operator never approved.

Proposed: an anchor is **`max(sensor reading, latest known event time)`**, never the
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

## Pre-PR safety

Run the `gia-preflight` checklist (`.claude/skills/gia-preflight/SKILL.md`, `/gia-preflight`)
before committing/opening a PR after any change to `index.js`, the bot handlers, the `/s` /
free-text search flow, venue rendering, `i18n.js`, or a fuzzy matcher. Non-negotiable every
time: `node --check` on each changed `.js`, `npm test -- --run` 100 % green, a `web/` build if
`web/` changed, and a `package.json` version bump.
