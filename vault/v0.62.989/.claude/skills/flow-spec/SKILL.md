---
name: flow-spec
description: Turn a request into an approvable flow spec (Intent, Interpretation, Assumptions, Invariants) before any code is written, interviewing the user with AskUserQuestion where the request is vague. Use whenever a feature, fix, refactor or improvement is requested and no approved spec covers it, whenever a hook reports FLOW ALERT F1 or F2, or when the user types /flow-spec, even if they never said the word "spec".
argument-hint: "[brief description of the change]"
---

# Flow spec

Code edits in this repo stay gated until the user approves a spec. Approval only means something when the spec is short, testable and shows every assumption, so this skill optimises for those three things rather than for length.

1. **Classify the request** as a speech act with a force (see `.claude/rules/flow.md` §0). If the force is weak, or a vague qualifier steers scope, ask about that first; a spec built on an undefined "better" cannot be verified.
2. **Explore read-only.** Stay in plan mode if you are in it. Scope exploration tightly and use a subagent for broad searches so the main context stays clean.
3. **Interview on the hard parts only**, using AskUserQuestion: edge cases, failure behaviour, trade-offs and what "done" means. Skip anything the code already answers; each question should be one the user is better placed to answer than the codebase.
4. **Write the spec** by copying `.claude/flow/spec.template.md` into `doc/Feature/`, following the repo's doc filename conventions if they exist. Fill every `{{...}}` placeholder:
   - `scope:` lists the paths you expect to touch. Keep it specific; edits outside it will prompt the user.
   - Assumptions start as `pending`. Only the user moves one to `confirmed` or `corrected`.
   - Each invariant carries maxim / scope / limit / contrary and a named check (a test name or command). An invariant without a check cannot be evidenced later.
5. **Hand over for approval.** In chat, present UNDERSTANDING, GAPS and the pending assumptions, then ask the user to reply with the exact line `APPROVE <spec path>`. Do not start Execution until the approval arrives as a `FLOW:` system reminder.

The approval hook refuses specs with unfilled placeholders, pending assumptions or invariants without a check, so resolving those first saves a round trip. The user can override with `APPROVE!`; that is their call, never yours.
