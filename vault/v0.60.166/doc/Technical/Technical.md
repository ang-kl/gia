# Technical Template

> Per CLAUDE.md §3: this folder records **stack, functions, budgets, build constraints**. Per §4.1: add + amendment + Deprecated table at EOF.

Versioned files: `technical-<v>-<d>.md`. Copy this template to bootstrap a new entry.

---

## 1. Stack

| Layer | Technology | Version | Purpose | Notes |
|---|---|---|---|---|
| Runtime | Node.js | >=20 | Bot + Express + pipeline | engines pin in package.json |
| Bot library | node-telegram-bot-api | ^0.64.0 | Telegram bot SDK | webhook + polling |
| Web framework | Express | ^5.x | webhook + /api/* + static TMA serving | |
| Cache | Redis | ^4 (node-redis) | location, vault, share tokens, pick cache | |
| LLM | Gemini 2.5 Flash | via @google/generative-ai | Reason + Refine pipeline phases | retry wrapped in gemini-retry.js |
| Maps | Google Places (v1) + Routes Matrix | REST | venue validation, walking minutes | |
| Front-end | Vite + React 18 + Tailwind | per `web/<page>/` | TMA pages | |

## 2. Functions / Modules

| Module | Exports | Purpose | Introduced |
|---|---|---|---|

## 3. Budgets

| Resource | Limit | Headroom | Source |
|---|---|---|---|
| Gemini call latency | ~3 s typical | Refine adds 1.5–3 s | observed |
| /cuisine end-to-end | <12 s p95 | 6 s fetch timeout in TMA | code |
| Places billable per /cuisine | ~15 validates × $0.005 = $0.075 | Cap=15 | code |
| Pick cache TTL | 60 s | 100 m grid + sorted cuisine key | code |

## 4. Build Constraints

| Constraint | Value | Notes |
|---|---|---|

## 5. Diagnostic Codes Index

Cross-reference of D-codes per surface. Source of truth lives in:
- `web/cuisine/src/state/diagnostics.js` (TMA-side)
- `console.log` lines tagged `[Cuisine-Diag]` (server-side)

| Range | Owner | Coverage |
|---|---|---|

---

## Deprecated Decisions

> AU-EOF: this table sits at end of file, after all active content.

| # | Item | Original Version | Deprecated in Version | Date (DD-MM 'YY) | Reason | Replacement | Rule Reference | Serial № |
|---|------|------------------|------------------------|------------------|--------|-------------|----------------|----------|

---

## Rule reference

- **AU-1:** add to prior content; quote priors verbatim before amending.
- **AU-2:** deprecations move to Deprecated table at EOF.
- **AU-EOF:** Deprecated table sits last.
