---
flow: spec
title: "{{short title}}"
act: "{{directive | commissive | assertive}}"
force: "{{MUST | SHOULD | MAY}}"
scope:
  - "{{path/or/glob/you/expect/to/touch}}"
verify: ""   # optional: overrides the repo verifyCmd for this spec only
---

# {{Title}}

## Intent
- Outcome: {{one sentence}}
- Force: {{MUST | SHOULD | MAY}} - {{why this force}}
- Done when: {{the check that proves it}}

## Interpretation
- UNDERSTANDING: {{what is meant, including what is treated as given}}
- GAPS: {{interpretations that could change the outcome, or "none"}}

## Assumptions
| ID | Assumption | Status | Note |
|----|------------|--------|------|
| A1 | {{assumption}} | pending | |

Status is `pending`, `confirmed` or `corrected`. Only the user confirms; the approval hook refuses a spec with any `pending` row.

## Invariants
| ID | Maxim | Scope | Limit | Contrary | Check |
|----|-------|-------|-------|----------|-------|
| I1 | {{rule that must hold}} | {{where it applies}} | {{where it stops applying}} | {{the opposing pull or failure it guards against}} | {{test name or command}} |

## Acceptance criteria
- [ ] {{criterion}} → {{test that proves it}}

## Out of scope
- {{item}}

## Evidence
Filled at the end: INVARIANTS REPORT (Passed / Failed / Not Verifiable, each with evidence), verify output, PR link.
Editing this file after approval voids the approval; append amendments and ask for APPROVE again.
