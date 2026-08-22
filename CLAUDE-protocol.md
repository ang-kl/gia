# Claude Code Reply Protocol (project-neutral)

Portable instruction layer. One copy per repo root, imported by that repo's
`CLAUDE.md` via `@CLAUDE-protocol.md`. Contains no project names, paths
beyond repo-relative ones, rebase history, or hardcoded counts — those live
in each project's own `CLAUDE.md`. All counters are MEASURED from disk,
never remembered from context.

---

## 1. Serial — measured, not remembered

Source of truth is the session transcript on disk, read via the repo's
counting script:

```
node scripts/count-interactions.js --serial     # next serial number
node scripts/count-interactions.js --file ~/.claude/projects/<project>/<session>.jsonl
```

`reply turns` = assistant entries on the main thread carrying a non-empty
text block. Tool calls and subagent chatter are excluded. Never restart at
1; re-measure rather than guess if the thread is lost. Any rebase of the
count is recorded in the project's own `CLAUDE.md`, not here.

**WHICH DISK. The script measures the corpus it can see, and that is not
always the whole corpus.** A remote or web session runs in a fresh container
holding only the transcripts of sessions that ran there; a local machine
holds the rest. Measured case, 2026-08-22: the same script returned 788 in a
remote container and 6,253 against the owner's local corpus six days
earlier — same rule, same code, different disk.

So: a measurement BELOW the last rebase recorded in the project's
`CLAUDE.md` is evidence of a partial corpus, not a correction. Treat it as
unavailable, continue from the recorded rebase plus the replies since, and
say which of the two you used. Re-measuring is only authoritative where the
full transcript set is present. Silently adopting the smaller number is the
exact failure this section exists to prevent — it resets the count by
thousands while looking like diligence.

Prefix every substantive reply, on its own line:

```
№ N · DD-MM'YY HH:MM TZ
```

`№` is U+2116; no leading zeros; comma thousands (№ 1,024).

## 2. Time — fetched, not guessed

Before stamping: run `date -u` via Bash and convert to the active
timezone. Resolve TZ in this order: (a) owner states one this session;
(b) system zone via `date +%Z`; (c) default SGT. Re-run on session start,
on resume from idle, or if more than 60 minutes have elapsed since the
last fetch. If Bash is unavailable, derive from the newest timestamp in
context; if more than roughly an hour of drift is possible, ask rather
than invent.

## 3. Paragraph numbering

Once a reply carries 2+ distinct points:

- Letter sections `§N·A`, `§N·B`, ... where N is the reply serial.
- Number paragraphs within each section `¶A·1`, `¶A·2`, ... restarting
  at 1 per section.
- Skip markers on short single-point replies.

This enables references like "expand §1,774·B ¶B·2".

## 4. Agent count — measured from the same transcript

A subagent is spawned per `Task` tool invocation.

```
node scripts/count-interactions.js --agents
# prints: agents_total, breakdown by subagent_type, agents in latest turn
```

Counting rule: assistant entries whose content includes a `tool_use`
block with `name == "Task"`; group by `input.subagent_type`.

## 5. Token count — measured from the same transcript

```
node scripts/count-interactions.js --tokens
# sums usage.input_tokens, usage.output_tokens, usage.cache_read_input_tokens
# across assistant entries; prints per-session and latest-turn figures
```

If a usage block is absent, report "unavailable" — never estimate. The
§1 corpus caveat applies here too: these figures cover the transcripts
this machine can see, not necessarily every session ever run.

## 6. Reply footer — conditional on §4 and §5 being real

Where the counting script actually implements `--agents` and `--tokens`,
append one line to every substantive reply:

```
[agents: {n} turn | {total} session] [tokens: {in}/{out} turn | {cum_in}/{cum_out} session]
```

**Where those flags do not exist in this repo's script, omit the footer.**
Do not print a line of "unavailable" on every reply, and never fill it
with an estimate — §5 forbids the estimate and a permanent placeholder is
noise that trains the reader to skip the line. Check once per session:
`node scripts/count-interactions.js --agents`; a script without the flag
treats it as a directory name and reports "No .jsonl files found under:
--agents", which is the signal to omit.

## 7. On-demand dashboards (prompts, not native CLI)

Per-project — run inside the repo:

```
Run scripts/count-interactions.js with --serial, --agents and --tokens.
Render one table: current serial, agents_total, breakdown (descending),
token totals, last time fetch.
```

Cross-project — run from the parent folder holding all repos:

```
For each */.claude/projects transcript set, run count-interactions.js
--serial --agents --tokens. Render one table, one row per project plus a
TOTAL row, then the three most-used subagent types overall.
```

## 8. Invariants

| # | Invariant | Check |
|---|-----------|-------|
| 1 | Serial never decreases or resets mid-project | measured from transcript, §1 corpus rule applied |
| 2 | Transcript is the sole authority; every text reply counts | script rule |
| 3 | TZ read from owner or environment, never hardcoded | §2 order |
| 4 | Counts unavailable are reported, never estimated | §4-6 |
| 5 | Dashboards read transcripts; they never mutate them | §7 |

## 9. Mental model for building

Every build or change follows this chain, in order:

**Intent → Interpretation → Assumptions → Invariants → Execution → Evidence**

## 10. Custom commands

Register in each repo's `.claude/commands/` so they work as
slash-commands:

- `/UNDERSTANDING` — What do you think I mean, including what you are
  treating as given?
- `/GAPS` — Which unresolved interpretations could materially change the
  outcome?
- `/DELTA` — What has changed from your earlier understanding?

## 11. Protocol for important or consequential work

Points are lettered `P1`–`P8` rather than numbered so that a bare "#N" in
a repo keeps pointing at whatever that repo already numbers — several
projects cite their own numbered lists that way from code comments and
tests.

P1. Lead with the final answer or recommendation.
P2. Identify the authoritative sources used and distinguish verified facts
    from inference.
P3. State the material invariants and report each as Passed, Failed or
    Not Verifiable.
P4. Briefly disclose any material search, retrieval, calculation or
    external tool used. If this information is unavailable, say so rather
    than guessing.
P5. Use deterministic tools for exact calculations where available.
P6. Flag missing evidence, conflicting sources and assumptions requiring
    confirmation.
P7. Ask for the owner's approval before any external, destructive,
    financial, legal, personnel-related or otherwise consequential action.
P8. Never infer or invent the model, reasoning setting, hidden routing or
    unavailable system metadata.
