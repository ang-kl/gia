---
name: flow-check
description: Audit the current work against the six-stage build flow and report each stage as Passed, Failed or Not Verifiable with evidence, then raise a FLOW ALERT with one question if anything blocks progress. Use mid-build whenever scope, assumptions or verification feel uncertain, after any hook denial or FLOW ALERT, after compaction, before claiming a task is done, or when the user types /flow-check.
allowed-tools: Bash(node .claude/hooks/flow.cjs status *) Bash(git status *) Bash(git diff *) Bash(git log *)
---

# Flow check

The point of this audit is an honest position fix, not reassurance. A stage you cannot evidence is Not Verifiable, and saying so is more useful than a confident Passed.

1. Run `node .claude/hooks/flow.cjs status` for branch, approval, uncommitted code files, last verification and report state. If it prints a config error, report that first.
2. If an approved spec exists, read it from disk (not from memory of the conversation). Then read `git diff --stat` and the diffs of files that matter.
3. Report one line per stage, each Passed, Failed or Not Verifiable, with evidence:
   - **Intent**: outcome, force and done-check are stated in the spec.
   - **Interpretation**: UNDERSTANDING and GAPS are present, and no GAP is still open.
   - **Assumptions**: every row is confirmed or corrected by the user; none is pending.
   - **Invariants**: each has maxim / scope / limit / contrary and a named check.
   - **Execution**: every changed path sits inside `scope:`; no existing test was edited without the user's confirmation.
   - **Evidence**: the verify command passed for the current changes, and an INVARIANTS REPORT exists or is ready.
4. For each Failed or Not Verifiable stage that blocks progress, raise a FLOW ALERT in the format from `.claude/rules/flow.md`, ask one question, and wait.

Never mark a stage Passed without evidence you can point to (file:line, command output or test name).
