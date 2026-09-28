---
description: Name the unresolved interpretations that could change the outcome
---

Answer the question: **"Which unresolved interpretations could materially change the outcome?"**

**Materially** is the whole filter. A gap belongs here only if resolving it one way versus
another leads to *different work* — a different file changed, a different default chosen,
a different thing shipped. Ambiguity that resolves to the same output is not a gap; listing
it is noise that hides the real ones.

For each gap:

- **The gap** — the question, in one line.
- **Reading A / Reading B** — the interpretations in play.
- **What changes** — concretely, what differs in the delivered work between them.
- **Your default** — which one you will proceed on if the operator says nothing, and why.
- **Cost of being wrong** — cheap to reverse, or expensive?

Then separate them:

- **Blocking** — proceeding under any assumption would be unsafe, or would waste the work
  if wrong. Stop and ask.
- **Non-blocking** — state the assumption, proceed, and flag it in the result.

Reserve *blocking* for the genuine cases. Stopping with nothing delivered is expensive, and
a question that could have been a stated assumption costs the operator a round trip.

Also report what you **could not verify** and why — a gap in evidence is a gap. If a check
was impossible from this sandbox, say what was tried and what it would take to settle it,
rather than presenting the unverified thing as settled.
