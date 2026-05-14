# Buddy Level 2 — solo-dining match policy

> **Status:** v0.31.0 (01-05 '26 SGT). Pilot scope.

soleat's Buddy Level 2 lets two opted-in users discover that they're heading to the same venue in the next 60 minutes and — with mutual consent — exchange first names + Telegram handles to coordinate.

This document is the explicit policy. All controls baked into code; this doc explains the rationale.

---

## What it does

When BOTH conditions are true:
1. User A has opted in (`/buddy on`)
2. User A receives a Sanctuary pick

…then for each venue in the pick, the bot:
- Registers User A's "intent" at that venue (60-min window).
- Checks if any OTHER opted-in user has registered intent at the same venue.
- If yes, surfaces a `👥 Connect` inline button on the venue card.

When User A taps Connect, a one-shot match offer is sent to User B with `✅ Accept` / `🚫 Decline` buttons. **Nothing is revealed unless User B accepts.**

On mutual confirmation, both sides see:
- The other person's first name (from Telegram profile)
- The other person's Telegram handle (e.g. `@alex`) — only if they have one set
- The other person's chat ID (numeric) — for `/buddy block` if needed afterwards

---

## Safety rules baked into code

| Rule | Enforcement |
|---|---|
| Opt-in only | Buddy mode is OFF by default. Sending `/buddy on` is the only way to enable. |
| Mutual confirmation | First-name + handle revealed ONLY when both parties confirm. Either side can `🚫 Decline` the offer. |
| No PII reveal | No phone, no last name, no exact GPS. Telegram handle is only revealed if user has one set; chat ID is numeric (not de-anonymising on its own). |
| Block list | `/buddy block <chat_id>` per user. Blocked users never matched. Max 50 blocks per user. |
| Daily cap | 5 successful connections per user per 24 h. |
| 60-min window | Intents expire after 60 min. Stale matches not possible. |
| 30-min offer expiry | Match offers expire after 30 min if not accepted. |
| Auto-block on report | `/buddy report <chat_id> <reason>` logs to admin Redis list AND auto-blocks the reported user from your matches. |
| "Meet in public" reminder | Surfaced on every match offer + every successful connection. |

---

## Slash commands

| Command | Effect |
|---|---|
| `/buddy on` | Enable. 30-day TTL on opt-in (re-confirm consent monthly). |
| `/buddy off` | Disable. Active intents and offers untouched but no new matches surfaced. |
| `/buddy status` | Show current state + today's connection count. |
| `/buddy block <chat_id>` | Add chat_id to your block list. |
| `/buddy report <chat_id> <reason>` | Log report to admin set + auto-block. |

---

## Storage shape (for ops review)

| Key | Type | Purpose | TTL |
|---|---|---|---|
| `buddy-optin:<chatId>` | STRING | Opt-in flag | 30 d |
| `buddy-intent:<placeId>` | ZSET | members=chatIds, score=expiry-ms | self-pruned |
| `buddy-blocks:<chatId>` | SET | blocked chatIds | none |
| `buddy-day:<chatId>:<YYYYMMDD>` | STRING | daily count | 24 h |
| `buddy-offer:<token>` | STRING (JSON) | pending match offer | 30 min |
| `buddy-reports` | LIST | append-only audit trail (last 1000) | none |

---

## What this does NOT do

- **No women-only flag.** Adding a self-declared gender filter requires identity verification we don't have. A future PR could integrate Telegram Premium phone-verification or KYC, but v1 ships without it. If a user reports another, the report goes to admin review.
- **No public-place enforcement.** The bot can suggest meeting at the venue (which is public), but cannot prevent users from agreeing to meet elsewhere.
- **No background check.** soleat has no relationship to law-enforcement databases. Treat every match as "stranger from the internet."
- **No automated moderation.** Reports go to a Redis list. Admin reviews manually. Pilot mode — when usage grows, we'll need a moderation pipeline.

---

## What we ask of you (pilot users)

1. Stay in public. Don't share home address.
2. Trust your gut. Either party can decline at any stage.
3. Report bad behaviour: `/buddy report <chat_id> <reason>`.
4. If you feel unsafe, leave. Tell soleat support after.

---

## Future scope (NOT in v1)

- Women-only opt-in flag with verification
- Group dining (3+ buddies)
- Recurring buddies ("regulars")
- Trust score across successful past matches
- Public moderation API for admin review
- Encrypted in-bot chat (so handles don't need to be revealed)
