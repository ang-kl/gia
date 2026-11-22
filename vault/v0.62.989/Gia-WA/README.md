# Gia-WA

WhatsApp port of the Soleat (`gia` / "Gia4lunch") bot. Self-contained workspace
under the repo root. **Zero edits to existing root code** — Gia-WA imports root
data (`/data/`, `/vault/`, cuisine catalogue, hawker data) read-only via
relative-path imports and ships its own `package.json`, server, tests, and
deploy config.

Per operator directive (rev. 3), the AI layer here is **Meta Llama only** — no
Anthropic SDK. Hosted via Groq (primary) with Together AI as fallback;
client-side function calling for web-search, Google reviews, and vault lookup.

## Scope

In:

- WhatsApp Cloud API messaging (text, buttons, list messages, location request,
  templates, images).
- WhatsApp **Flows** for the two surfaces that justify them: Cuisine search
  (filters → results) and Hawker pick (nearby centres → save).
- Encrypted Flows Data Channel (RSA-OAEP + AES-GCM-128, flipped-IV response).
- Llama-driven NLU: classifier on Llama 3.1 8B Instant (Groq), Stage-A
  meta-prompter and sanctuary judgment on Llama 3.3 70B Versatile (Groq, with
  Together fallback).
- Phone-number (E.164) tenant identity; separate Redis keyspace from the
  Telegram bot.

Out:

- The root `index.js` Telegram bot — untouched, keeps shipping.
- Transport (live MRT/bus arrivals) and Oversight (admin dashboard) Mini Apps —
  do not fit Flows; not ported.
- Menu Mini App — replaced by a WhatsApp List Message, no Flow needed.

## Status

`0.1.0` — directory placeholder. No runtime code yet. Skeleton (`package.json`,
`server.js`, vitest) is the next PR.

See `/doc/Journal/` for the per-PR record and `/root/.claude/plans/` for the
full depth plan.
