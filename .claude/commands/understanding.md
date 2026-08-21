---
description: Restate what the operator means, and what is being treated as given
---

Answer the question: **"What do you think I mean, including what you are treating as given?"**

This is step 1–3 of the project mental model (Intent → Interpretation → Assumptions →
Invariants → Execution → Evidence). Stop before Execution. Do not start work.

Report, in this order:

1. **Intent** — what the operator is trying to achieve, in their terms, not yours.
   Quote their words where the wording carries the requirement.
2. **Interpretation** — how you are reading that intent into concrete work. Where the
   request admits more than one reading, name the reading you picked.
3. **Assumptions (treated as given)** — everything you are taking as true without having
   checked it this turn. Mark each one:
   - `verified` — measured this session, and say how
   - `inferred` — reasoned from something else, and say from what
   - `unverified` — taken on trust, including anything read from the repo
4. **Invariants** — what must remain true for the result to be correct.

The point of `unverified` is that repo state is evidence about the past, not the present
(D-199). A comment, a chain, a stored receipt, a prior journal entry — all of these are
records of a moment that has passed. If an external API is the authority on a fact, an
in-repo record of it is `unverified`, not `verified`.

Be specific enough that the operator can disagree with one line rather than the whole
answer. Vague restatement is worse than none: it manufactures the appearance of alignment.
