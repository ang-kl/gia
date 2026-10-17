# Plan — observability expansion (usage / latency / security / UX insight)

Operator ask: *"more details to understand how people are using this bot — the network,
latency, security concerns, the UI/UX, famous places, people's nationality…"*

This is a separate initiative from the exit feature. It is **new instrumentation** — most
of the operator's wishlist is not tracked today.

## What exists today

- `usage-log.js` — identity-free DAU / searchers / per-cuisine popularity / search-criteria
  counters (Redis, 90-day TTL); surfaced at `GET /api/oversight/stats` → Oversight TMA.
- `freetext-log.js` — free-text query terms + match outcome + result counts.
- `rate-limit.js` — logs 429 hits (endpoint, chatId, IP).
- `sentry.js` — exception tracking.

## What is missing (the operator's wishlist)

| Want | Status | Proposed |
|---|---|---|
| Network / latency | none | Express timing middleware → per-endpoint p50/p95 + request counts + error rate, Redis rolling windows |
| Per-endpoint request volume | none | counter in the same middleware |
| "Famous places" / popular venues | none | `usage:venue:<id>` increment when a venue is delivered/tapped; top-N panel |
| Nationality | only Telegram `language_code` | surface the `language_code` distribution; **do NOT add geo-IP** (PDPA/GDPR risk) |
| Security | 429s + Sentry only | counter for auth-gate denials (`isOwnerChat` rejects — currently silent); aggregate abuse signal |
| UI/UX interaction funnel | none | identity-free `POST /api/usage/event` from the TMAs (chip toggles, slider use, map taps, exit taps) |

## Phases

1. **Latency + request volume** — timing middleware, `/api/oversight/stats` extended, a
   latency panel in the Oversight TMA. Lowest risk, highest signal.
2. **Venue popularity** — increment on `deliverPicks` / TMA venue tap; "famous places" panel.
3. **UX events** — `/api/usage/event` endpoint + TMA instrumentation; funnel panel.
4. **Security panel** — auth-denial + abuse counters surfaced in Oversight.

## Hard constraints

- **Identity-free only.** The bot is PDPA/GDPR-conscious (`/privacy`, `/forgetme`). No new
  per-user PII. Nationality = Telegram `language_code` distribution only; geo-IP is out.
- Every new counter needs a TTL and must be erasable / already aggregate.
- Each phase is its own PR with the `gia-preflight` pass.

## Open questions for the operator

- Is the Oversight TMA dashboard the right home for all of this, or a new admin view?
- Retention window for latency/UX data (usage-log uses 90 days)?
- Priority order — is latency first the right call, or venue popularity?
