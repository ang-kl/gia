# Build Flow - flow-kit v0.1.1 (24-09 '26)

Every change moves through six stages: **Intent → Interpretation → Assumptions → Invariants → Execution → Evidence**. Hooks in `.claude/settings.json` enforce the gates; this file explains how to work with them. When anything here conflicts with another instruction (including `CLAUDE-protocol.md`), do not pick one: raise a FLOW ALERT and ask, because silent choices are where drift starts.

## 0. Read each request as a speech act first
Classify the act and its force before acting, and state it in one line when starting substantive work.
- **Directive, MUST/SHOULD** ("add", "fix", "must") → run the flow.
- **Directive, weak** ("maybe look at", "could we consider") → investigate and report; make no edits until the force is confirmed.
- **Assertive** from the user ("tests pass now", "the bug is in X") → a claim to verify before relying on it.
- **Expressive** (frustration, praise) → acknowledge it; it is not an instruction.
- **Declaration** (`APPROVE`, `REVOKE`, "ship it") → only the user can make these. Never infer, simulate or pre-empt one.
- A vague qualifier ("better", "cleaner", "faster", "robust") that steers scope must become a measurable criterion before planning. Ask for it.
- `??` = restate your understanding and wait. `!!` = proceed immediately within the approved scope; it never waives a hook gate.

## 1-6. Stages and their artefacts
1. **Intent** - one outcome, its force, and the check that proves it. For larger work, run `/flow-spec`, which interviews with AskUserQuestion.
2. **Interpretation** - plan in plan mode. The plan opens with UNDERSTANDING (what you think is meant, including what you treat as given) and GAPS (interpretations that would change the outcome).
3. **Assumptions** - listed in the spec, each `pending`, `confirmed` or `corrected`. Only the user confirms one.
4. **Invariants** - each written as maxim / scope / limit / contrary and mapped to a named test or check. List the paths you expect to touch in the spec's `scope:` frontmatter.
5. **Execution** - starts only after approval. Write the spec to `doc/Feature/` from `.claude/flow/spec.template.md`, then ask the user to reply with the exact line `APPROVE <spec path>`. Write tests first from the acceptance criteria, then implement until they pass. Small, behaviour-neutral fixes can use `APPROVE QUICK <intent>`, valid until the next commit.
6. **Evidence** - the verify command passes, and your final message contains an `INVARIANTS REPORT`: each invariant Passed, Failed or Not Verifiable, with its evidence (test name, command output, file:line). An invariant you did not check is Not Verifiable, never Passed.

## Mid-build alerts
Stop editing and raise a FLOW ALERT when:
- **F1** no valid approval covers this branch; **F2** the spec changed after approval;
- **F3** the work needs paths outside the approved `scope:`;
- **F4** an undefined vague qualifier is steering scope;
- **F5** a new assumption, a contradiction with the spec, or conflicting instructions appear;
- **F6** verification fails twice for the same cause, or no verification exists;
- **F7** an existing test looks wrong (report it; never edit a test just to make it pass);
- **F8** a repo overlay rule applies (see `.claude/rules/flow-overlay-*.md`);
- **F9** a protected path blocked an edit.

Use exactly this shape, then wait for the user:

```
⚠ FLOW ALERT [F#] · stage: <stage>
Observed: <fact, with file:line or command output>
Impact: <what goes wrong if we continue>
Options: (a) ... (b) ...
Question: <one question>
```

Do not resolve an alert by assuming agreement; silence is not approval.

## Working with the hooks
- A `FLOW STATE`, `FLOW NOTE` or `FLOW ALERT` system reminder may arrive with a prompt. Read it; if it reports an alert, raise it before other work.
- If a hook denies an action, relay its reason as a FLOW ALERT instead of trying another route to the same change.
- Never edit `.claude/flow/`, `.claude/hooks/`, `.claude/settings*.json` or the flow rules and skills, and never write approval records. These are the user's instruments; a gate you can edit is not a gate.
- The shell can bypass file gates. Do not use it to modify files the gates cover.
- After compaction or resume, re-read the approved spec from disk before continuing; the summary never overrides it.
- Run `/flow-check` whenever scope, assumptions or verification feel uncertain, and before claiming work is done.
