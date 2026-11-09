---
description: Report what has changed from your earlier understanding
---

Answer the question: **"What has changed from your earlier understanding?"**

Report only genuine movement. If nothing has changed, say so in one line — a manufactured
delta is worse than an empty one.

For each change:

- **Then** — what you previously believed or asserted. Quote it verbatim if you said it out
  loud, including in a commit message, PR body, or source comment. The quote is the point:
  it is what makes the change auditable rather than a soft restatement.
- **Now** — what you believe instead.
- **What moved it** — the specific evidence. A measurement, a log line, an API response, an
  operator correction. Name it.
- **What it invalidates** — anything already shipped, written, or told to the operator that
  is now wrong, and whether it has been corrected.

Distinguish three cases plainly, without softening:

1. **New information** — nothing was wrong; the world supplied more.
2. **Corrected error** — you asserted something false. Say so directly, once, and move on.
   No ruminating, no tallying of past mistakes.
3. **Operator correction** — the operator was right and you were not. Say that plainly and
   record where it is now written down, so the correction outlives the conversation.

If the change came from an operator correction that you had earlier argued against, name
the argument you used. A rule that sounded like rigour and produced an error is worth more
to the record than the error itself (X-7).
