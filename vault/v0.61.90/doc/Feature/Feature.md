# Feature Template

> Per CLAUDE.md §3: this folder records **full and summary feature documentation**. Per §4.1: add + amendment + Removed table at EOF.

Versioned files: `feature-<v>-<d>.md`. Copy this template to bootstrap a new entry.

---

## 1. Active Feature Summary

| # | Feature | Slash / surface | Description (one line) | Version introduced | Status |
|---|---|---|---|---|---|

## 2. Per-Feature Detail

For each active feature, a short subsection:

### Feature N — `<name>`

- **Surface:** slash command / TMA route / inline button / passive
- **Introduced:** vN.N.N (date)
- **Last amended:** vN.N.N (date)
- **Behaviour:** narrative paragraph of what happens, in order
- **Inputs:** what the user provides
- **Outputs:** what the user sees
- **Failure modes:** known surfaces + how each is handled
- **Cost:** API billing per invocation
- **Diagnostic codes:** D-codes that fire during execution (cross-link to register)

---

## Removed Features

> AU-EOF: this table sits at end of file, after all active content.

| # | Item | Original Version | Removed in Version | Removal Date (DD-MM 'YY) | Reason | Replacement | Rule Reference | Serial № |
|---|------|------------------|--------------------|--------------------------|--------|-------------|----------------|----------|

---

## Rule reference

- **AU-1:** add to prior content; quote priors verbatim before amending.
- **AU-2:** removals move to Removed table at EOF.
- **AU-EOF:** Removed table sits last.
