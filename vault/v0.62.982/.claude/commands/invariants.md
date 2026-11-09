---
description: State the material invariants and report each as Passed, Failed or Not Verifiable
---

Answer the question: **"What must hold for this to be correct, and does it?"**

This is the command handle on P3 of the consequential-work protocol. Answer
from the current state of the work — the question is about what has actually
been established, not about what the code says it does.

List the **material** invariants only: the properties that, if broken, make
the work wrong. Not a checklist of everything that happens to be true. For
each one, report exactly one of:

- **Passed** — measured this session, and say with what. Name the command,
  the test, the log line, the query. A tool that resolved and a number it
  returned.
- **Failed** — it does not hold. Say what breaks and what that costs.
- **Not Verifiable** — the check could not be performed here. Say what was
  tried, what blocked it, and what it would take to settle. This is a
  first-class result and the whole reason the three-way split exists.

**Never present Not Verifiable as Passed.** A guard that was configured but
never exercised, a test that was written but not run, a claim checked against
a comment rather than the running system — all of these are Not Verifiable.
Reporting one as Passed is the failure this project has paid for repeatedly:
something reports healthy because the thing it measures never reached it.

Two specific traps worth naming when they apply:

- **Absence of evidence.** "No errors in the log" verifies nothing unless it
  is known that an error would have been logged. Say which.
- **Circularity.** An invariant checked against a value derived from the same
  source it is meant to validate has not been checked. A parser compared to
  its own output is Not Verifiable; a parser compared to the export's own
  footer total is Passed.

Where an invariant was stated up front and is only being confirmed now, say
so — the chain is Intent → Interpretation → Assumptions → **Invariants** →
Execution → Evidence, and invariants named after the fact are a weaker
instrument than invariants named before.
