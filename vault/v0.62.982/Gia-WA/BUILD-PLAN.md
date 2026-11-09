# Gia-WA — WhatsApp Port of Soleat ("Gia4lunch") — Build Plan

**Handoff document for a fresh Claude Code session targeting `ang-kl/Gia-WA`.**

- **Source project**: `ang-kl/gia` ("Soleat" / Gia4lunch) — Telegram bot + 5 Mini Apps + Express server, in production.
- **Target project**: `ang-kl/Gia-WA` — a WhatsApp-native equivalent service, **separate repo, separate deploy, separate identity space**.
- **Operator pivot (2026-05-15)**: Gia-WA was originally scoped as a subdirectory of `ang-kl/gia` (see merged PR #419, then collapsed by draft PR #426). It is now its own repository; this plan reflects that.
- **Why an extensive plan**: the receiving session will start cold with no chat history from where this plan was authored. Every operator directive, every repo audit finding, every architectural decision that drove this design lives in this file. Treat it as the single source of truth until you and the operator amend it together.

---

## 0. How to use this document (receiving session: read this section first)

1. **Read in full before touching code.** Sections 1–4 are context; sections 5–12 are the build; sections 13–16 are operational.
2. **Do not silently deviate.** If a section conflicts with what the operator says in chat, the operator wins — but log the deviation in `doc/decisions/<NNN>-<slug>.md` inside `Gia-WA/` so the next session sees it.
3. **Do not touch `ang-kl/gia`.** Every file you create lives in `ang-kl/Gia-WA`. You read from `ang-kl/gia` only via the read-only-data bridges defined in §8.1, never via direct write or PR. If you need data that isn't bridged, raise it with the operator — don't fork or copy.
4. **Branch + PR per phase.** Section 12 defines phases. Each phase = one branch, one draft PR. Don't bundle phases. The operator merges (or rejects) phase-by-phase.
5. **`gia-preflight` rules carry over.** The source repo's pre-PR checklist (`.claude/skills/gia-preflight/SKILL.md`) encodes failure modes that have bitten this codebase. They apply to Gia-WA too, translated from HTML escaping → WhatsApp markup escaping (§4.5).
6. **Standing Journal rule applies.** After every Gia-WA PR (open + merge), append a `[HDR]` block to `Gia-WA/doc/Journal/journal-<vN>-<dd_mm_yy-hhmm>.md`. Mirror the format used in `ang-kl/gia/doc/Journal/`. Counter state lives in `Gia-WA/doc/.serial-state.yml` (initialise fresh at `0.1.0` — do not inherit Soleat's counters).

---

## 1. Mission

Build the WhatsApp-native equivalent of Soleat: a conversational venue-recommender for Raffles Place lunch decisions ("Gia4lunch"), delivered over the WhatsApp Business Cloud API. Same problem domain, same data, **different transport and different AI vendor**. The Telegram product keeps running, untouched, on `ang-kl/gia`.

**Success looks like**: a user in WhatsApp can (a) say what they feel like eating, (b) share location, (c) get a top-5 ranked list of nearby lunch venues with rationale, (d) optionally drill in via a Flow form. All powered by Meta Llama (no Anthropic), running on the same vault/cuisine data as Soleat.

---

## 2. Operator directives (non-negotiable until explicitly revised)

These have been issued in chat across multiple sessions. The receiving session must treat them as constraints, not preferences.

| # | Directive | Authority / origin | Implication |
|---|---|---|---|
| D-1 | **AI posture is "Meta Llama only" — no Anthropic SDK in Gia-WA.** | Operator, rev. 3 of the WhatsApp-port discussion. | No `@anthropic-ai/sdk` dependency. No Claude API calls. Llama via Groq (primary) / Together AI (fallback). |
| D-2 | **Zero edits to `ang-kl/gia` source code from Gia-WA work.** | Operator: *"Don't touch my codes here."* | The bridge from §8.1 is read-only. Any change to `ang-kl/gia` needed to enable Gia-WA must be raised as a separate PR on that repo by a different session. |
| D-3 | **`Gia-WA` is its own repository, not a subdirectory.** | Operator pivot, 2026-05-15 (current session). | All files under `ang-kl/Gia-WA`. The `Gia-WA/README.md` in `ang-kl/gia` is a pointer only (post-#426). |
| D-4 | **Standing rule: after opening any PR, and after a PR merges, record it in the Journal.** | Operator: recorded as G3 in `journal-0_60_144-13_05_26-0900.md` of `ang-kl/gia`. | Applies to Gia-WA too, on its own Journal under `Gia-WA/doc/Journal/`. |
| D-5 | **`gia-preflight` checklist before every commit/PR.** | `ang-kl/gia/.claude/skills/gia-preflight/SKILL.md`. | Translates: `node --check` on every `.js`, vitest 100 % green, equivalent of "HTML-escape risk" becomes "WhatsApp-markup-escape risk" (§4.5). |
| D-6 | **Hold all source-code work in `ang-kl/Gia-WA` until sandbox access is confirmed.** | Operator, current session. | Receiving session must verify it has clone + push access before writing code — see §16.3. |

If a future operator turn revises any of these, mark them `[REVISED]` here with the date and the new wording. Don't delete the row.

---

## 3. Source-project overview (audit of `ang-kl/gia` for porting reference)

Two Explore-agent passes were done on `ang-kl/gia` to surface what actually needs porting versus what is Telegram-specific noise. Findings:

### 3.1 Telegram surface (heavier than first scoped)

- **Bot instantiation**: `node-telegram-bot-api` at `ang-kl/gia/index.js:88`.
- **Keyboard shapes**: ~40 distinct inline-keyboard configurations across handlers.
- **HTML `parse_mode`**: 8 known callsites in `index.js` rendering user-supplied venue strings with HTML escaping.
- **Mini Apps**: 5 separate Vite builds under `web/`:
  - `web/cuisine` — primary filter UI (cuisine multi-select, meal period, distance, time-of-day, geo-pin, results grid).
  - `web/menu` — 6-tile hub.
  - `web/hawker` — NEA-hawker-centre map + pick/save.
  - `web/transport` — MRT / bus live arrivals + station map + footfall overlays.
  - `web/oversight` — admin / analytics dashboard.
- **Mini App launch**: bot sends inline-keyboard buttons with `web_app: { url: ... }`. Mini Apps round-trip data back via `Telegram.WebApp.sendData` → `web_app_data` handler at `index.js:2397–2401`.
- **Auth**: `twa-auth.js` verifies Telegram `initData` with HMAC-SHA256.
- **Webhook secret**: secret-token check at `index.js:7726`.

### 3.2 AI integration (Claude, today)

Single integration point: `ang-kl/gia/llm-client.js` using `@anthropic-ai/sdk@^0.40.0`.

| Where | Model | Why it's there |
|---|---|---|
| `nl-intent.js` (intent classifier) | `claude-haiku-4-5-20251001` | Sub-second classification of every inbound message. Static cuisine catalogue re-sent each call (~150 KB system prompt). |
| `prompt-builder.js` (Stage-A meta-prompt) | `claude-sonnet-4-6` | Generates the executor prompt for the venue search loop. Long static template re-sent each call. |
| `consultant.js` (sanctuary judgment) | `claude-haiku-4-5-20251001` | Decides whether a venue qualifies as a "sanctuary" using Google reviews context. |
| `index.js:3901` (Hidden-Gems Tier-3 fallback) | implicit Claude with `web_search_20260209` server-side tool | Only place a server-side tool is wired. Replaces a vault miss with web-search-driven recommendation. |
| `gemini-client.js` (R.E.D template) | Gemini (sibling vendor) | `HIDDEN_GEMS_PROMPT_TEMPLATE` ~150 KB; the Gemini path is independent of Claude. |

**Notable absences** in the current Claude integration: zero `cache_control`, zero `thinking: { type: 'enabled' }`, zero streaming, zero Batch/Files/Citations/Memory usage, `claude-opus-4-7` is referenced but never actually called. So Soleat's Claude usage is competent but not at the frontier — Gia-WA isn't giving up much by leaving Claude behind, except prompt caching (which is the only one that actually saves money).

### 3.3 Data layer (the part Gia-WA needs)

- `ang-kl/gia/data/cuisines.js` — canonical cuisine catalogue.
- `ang-kl/gia/vault/<version>/` — per-version snapshots of venue data (vault-versioned with the package version).
- `ang-kl/gia/data/` — other static data (hawker centres, MRT, etc.).

Gia-WA imports these read-only via the bridge in §8.1.

### 3.4 What does NOT need porting

- The 5 Mini Apps (UI is Telegram-WebApp-specific; WhatsApp Flows replace only Cuisine and possibly Hawker — see §5).
- The Telegram-bot framework, inline keyboards, callback queries — all replaced by WhatsApp message primitives.
- `twa-auth.js`, webhook-secret check, `web_app_data` handler — replaced by WhatsApp's own signature scheme and Flow Data Channel.
- The Gemini Hidden-Gems R.E.D template path — under D-1, Gia-WA uses Llama everywhere; if the operator later wants Gemini parity in Gia-WA, raise it.

---

## 4. WhatsApp surface — what's possible and what's not (the constraints driving design)

### 4.1 Cloud API basics

- **Transport**: HTTPS Graph API (`graph.facebook.com/v<latest>/<phone-number-id>/messages`).
- **Bearer auth**: long-lived system-user access token.
- **Inbound**: webhook POSTs with `entry[].changes[].value.messages[]` envelope, signed with `x-hub-signature-256` against your App Secret.
- **Outbound limits**: 80 messages/sec per phone number id (initial tier — scales with quality rating); 1024 chars per text body (longer splits into multiple messages); media uploads 16 MB image / 5 MB doc.
- **No `parse_mode`**: WhatsApp uses minimal markup only — `*bold*`, `_italic_`, `~strike~`, ``` `monospace` ``` (note: single backtick is monospace **inline** only; triple-backtick code fences are not rendered).

### 4.2 Message types you'll use

| Type | When | Substitute for (Telegram) |
|---|---|---|
| `text` | Plain replies, ack messages, results lines. | `sendMessage` plain. |
| `interactive: button` | Up to 3 reply buttons (e.g. "Yes / No / Skip"). | Inline keyboard ≤3 buttons. |
| `interactive: list` | Up to 10 row picker (sections optional). | Inline keyboard rows (used for the Menu hub). |
| `interactive: location_request_message` | Asks user to share location via the native share-location UI. | `request_location` keyboard button. |
| `interactive: flow` | Opens a Flow (multi-screen form). | Mini App launch (`web_app` button). |
| `template` | Outside the 24-hour window. Approved templates only. | No Telegram analog — Telegram has no template-approval gating. |
| `image` | Static map tiles, venue thumbnails. | `sendPhoto`. |
| `location` | Send a pin (lat, lng). | `sendLocation`. |

### 4.3 Flows — the only Mini-App-equivalent surface (in depth)

**A Flow is a server-driven, single-message, multi-screen form rendered natively inside the WhatsApp client. It is NOT a WebView.** The client renders a fixed component set from JSON; your server drives state via an encrypted Data Channel.

**Three pieces**:

| Piece | Role | Mental model |
|---|---|---|
| **Flow JSON** (versioned, declarative) | Defines screens, components, navigation, validation. Lives on Meta's servers; you publish/version via the WhatsApp Business Management API. | Closest analog: the JSX of `web/cuisine/src/*`, but declarative, much smaller component vocabulary, no custom CSS. |
| **Data Channel endpoint** (your HTTPS server) | Meta POSTs encrypted requests at `INIT`, on every `data_exchange` (next-screen / submit), and on `BACK`. You return the next screen + data, also encrypted. | Conceptually like a `/api/cuisine/*` REST handler, but with the contract dictated by Meta and the wire-format end-to-end encrypted. |
| **End-of-Flow webhook** | When user taps the terminal "Submit" action, Meta posts a `nfm_reply` message back to your normal chat webhook with the final payload. | Analog of `web_app_data` at `ang-kl/gia/index.js:2397–2401`. |

**Component vocabulary (~12 components, the constraint)**:

`TextInput`, `TextArea`, `Dropdown`, `RadioButtonsGroup`, `CheckboxGroup`, `DatePicker`, `OptIn`, `Footer` (the submit/next button), `EmbeddedLink`, `Image`, `TextHeading` / `TextSubheading` / `TextBody` / `TextCaption`, `If` (conditional render).

**What you do NOT get**: no map widget, no live geolocation pin inside the form, no real-time arrivals ticker, no custom CSS, no JS hooks, no third-party iframes, no inline carousel, no animations. Anything map-shaped degrades to a server-rendered static `Image` + a list, or punts to a deeplinked browser tab via `EmbeddedLink`.

**Data Channel contract — the part most teams get wrong on day 1**:

Every request from Meta is end-to-end encrypted. Meta encrypts the body with an ephemeral AES key, then encrypts that AES key with **your published RSA public key**. Your endpoint must:

1. Decrypt the AES key with your RSA private key (RSA-OAEP, SHA-256 hash, SHA-256 MGF).
2. Decrypt the body (AES-GCM-128).
3. Process the action — one of `INIT`, `data_exchange`, `BACK`, `ping`.
4. Respond by AES-GCM-encrypting the response payload (e.g. `{ screen, data }`) using the **flipped IV** (XOR every byte of the request IV with `0xFF`), then sending the **base64-encoded ciphertext as the raw HTTP response body** (`content-type: text/plain`). **Do not wrap the base64 in a JSON object** — Meta's official Node sample is `res.send(encryptResponse(...))` where `encryptResponse` returns only the base64 string. Two classic day-1 bugs that both surface as "Flow appears stuck": (a) reusing the request IV verbatim instead of flipping every bit, and (b) wrapping the response body in JSON (e.g. `{ encrypted_flow_data: "..." }`) instead of sending the bare base64 string.
5. Always answer `ping` with `{"data":{"status":"active"}}` within ~5 s. Meta health-checks every few minutes and **unpublishes Flows that go silent**. A 30-day unanswered `ping` window kills a published Flow.

Plus the signature check on `x-hub-signature-256` against your App Secret (same SHA-256 HMAC pattern as Telegram's secret-token at `ang-kl/gia/index.js:7726`, so the pattern is familiar).

**Publishing lifecycle**:

Flows have `DRAFT` and `PUBLISHED` states and are versioned. You **cannot hot-edit a published Flow's JSON**; you publish a new version and migrate. Implication: CI must include a `flows:publish` step that bumps the Flow version when the JSON changes, and the server must be able to handle multiple live versions briefly during rollover.

### 4.4 The 24-hour customer-care window + template messages

WhatsApp Business gating: **you can only send free-form messages within 24 hours of the last user-initiated message.** Outside that window, you must use **template messages** approved by Meta in advance.

Implications for Gia-WA:
- Most use cases (user texts → bot replies) are inside the window: no template needed.
- "Picks delivered after a 30-second background search" — depends on whether the search latency stays inside the window (usually yes, but plan for it).
- Any proactive notification (e.g. "Your saved venue is open now") — needs a pre-approved template. **Template approval is measured in hours to days, not seconds**, so this is a product gate, not just engineering.
- Reminder: Telegram has no analog. The 24-hour window is the single biggest behavioural difference between the two platforms.

### 4.5 Formatting & escaping (the `gia-preflight` HTML-escape risk, translated)

Soleat's `gia-preflight` flags HTML-injection risk in the 8 `parse_mode=HTML` callsites. In Gia-WA the analogous risk is **WhatsApp-markup corruption**: a venue name like `"Café ~Lao~ Beijing"` will render with `Lao` stricken through because `~Lao~` is interpreted as strikethrough markup.

**Mitigation**: a `Gia-WA/src/transport/format.js` renderer that escapes `*`, `_`, `~`, and `` ` `` inside user/data-derived strings. Unit test against the venue names known to be markup-hazardous in the cuisine catalogue. This is non-optional; ship it in Phase 1.

### 4.6 Identity (E.164 vs Telegram user IDs)

Soleat keys everything by Telegram numeric user id (opaque, stable, integer). WhatsApp identifies users by **E.164 phone number** (string, e.g. `+6591234567`). Implications:
- Redis keyspace must use a `wa:` prefix to keep WhatsApp and Telegram user spaces disjoint (you should never share a Redis key between transports; user `+6591234567` on WhatsApp and user `123456789` on Telegram are unrelated identities even if they're the same human).
- Cross-transport identity linking (a user wanting to use both bots and have prefs sync) is **out of scope** for the initial build. If raised, it's a separate epic — log to `Gia-WA/doc/decisions/` and escalate.

---

## 5. Feature mapping (Telegram Mini App → WhatsApp)

| Soleat Mini App | Realistic WhatsApp form | What degrades | Verdict |
|---|---|---|---|
| **Cuisine** (`web/cuisine`) — filters + geo-pin + results grid | Flow: `Dropdown` + `RadioButtonsGroup` for filters, separate location-request message before opening the Flow (geo can't be captured inside a Flow), final screen renders top-5 as `TextBody` rows + `EmbeddedLink` per venue. | Live results grid → static list at submit time. No interactive map. | **Good fit — canonical Flow use case. Build this.** |
| **Menu** (`web/menu`) — 6-tile hub | `interactive: list` message (max 10 rows, free). | Visual tiles → text rows. | **Skip Flow. Use a list message — cheaper and better fit.** |
| **Hawker** (`web/hawker`) — NEA centre map + pick/save | Flow: `Dropdown` of nearby centres (computed server-side from a prior location share), `Image` of pre-rendered static map tile per centre, `Footer` "Save pick". | No interactive map; map becomes a server-rendered PNG (Google Static Maps API call) per option — expensive at list scale. | **Marginal fit. Build only if Cuisine usage justifies the spend.** |
| **Transport** (`web/transport`) — MRT / bus live arrivals | A Flow could drive selection (line → station → direction), but live arrivals must be a **separate** text/image message sent after the Flow closes; Flows are single-turn and can't stream. The TMA's "refresh" button (`ang-kl/gia/index.js:2809–2813`) has no Flow equivalent. | All real-time behaviour; engineering/footfall overlays don't translate. | **Poor fit. Keep chat-driven (list message + plain text replies) or skip entirely.** |
| **Oversight** (`web/oversight`) — admin dashboard | Don't port. Operators keep using Telegram, or a web URL gated by a one-time WhatsApp code. | All of it. | **Don't port — operator-only tool.** |

**Net build scope**: Cuisine (Flow) + Menu (list message) + optional Hawker (Flow). This is **materially less** than "port all 5 Mini Apps."

---

## 6. Architecture — `ang-kl/Gia-WA` target shape

### 6.1 Repo layout (full tree)

```
ang-kl/Gia-WA/
├── package.json              # axios, express, redis, vitest. NO @anthropic-ai/sdk.
├── package-lock.json
├── README.md                 # how to run, env vars, links to this plan
├── .env.example              # see §9.1 for full env-var list
├── .gitignore                # node_modules, .env, *.log, dist/
├── .github/
│   └── workflows/
│       ├── ci.yml            # node --check, vitest, lint
│       └── publish-flows.yml # on push to main, publish DRAFT Flow JSON → Meta if changed
├── server.js                 # Express app: 3 routes (§6.2)
├── src/
│   ├── transport/
│   │   ├── whatsapp.js       # Cloud API client (§6.2)
│   │   └── format.js         # WhatsApp markup renderer + escaper (§4.5)
│   ├── flows/
│   │   ├── cuisine.json      # published Flow JSON
│   │   ├── hawker.json       # (Phase 5 only)
│   │   ├── handler.js        # INIT / data_exchange / BACK / ping router
│   │   ├── crypto.js         # RSA-OAEP decrypt + AES-GCM-128 + flipped-IV response
│   │   └── sign.js           # x-hub-signature-256 verify
│   ├── handlers/
│   │   ├── onMessage.js      # inbound text / button / list / location dispatch
│   │   ├── onFlowReply.js    # nfm_reply → search backend → result message
│   │   └── onLocation.js     # location share → cuisine/hawker entry
│   ├── ai/
│   │   ├── llama.js          # Groq primary + Together fallback. JSON-mode, fn-calling, streaming.
│   │   ├── router.js         # per-task model selection (3.1-8B / 3.3-70B / 3.2-11B-vision)
│   │   ├── dedup.js          # Redis-backed (lang, text-hash) → response, 60s TTL
│   │   ├── telemetry.js      # per-call input/output token logging
│   │   ├── tools/
│   │   │   ├── web-search.js     # Tavily / Serper wrapper for the agent loop
│   │   │   ├── google-reviews.js # sanctuary-judgment tool
│   │   │   └── vault-lookup.js   # read-only nearby/cuisine queries
│   │   └── prompts/
│   │       ├── classifier.js     # token-trimmed intent classifier system + cuisine catalogue
│   │       ├── stage-a.js        # token-trimmed Stage-A builder; strict JSON schema
│   │       └── sanctuary.js      # tool-use loop, client-driven agent
│   ├── data/
│   │   ├── vault.js          # READ-ONLY loader; imports from §8.1 bridge
│   │   └── cuisines.js       # READ-ONLY loader for cuisine catalogue
│   └── user/
│       ├── identity.js       # E.164 → tenant key prefix (wa:<msisdn>)
│       └── prefs.js          # Redis-backed prefs, separate keyspace from Soleat
├── __tests__/
│   ├── crypto.test.js        # Meta-published Flow encryption test vectors
│   ├── format.test.js        # WhatsApp markup escape (star, underscore, tilde, backtick)
│   ├── router.test.js        # llama.js routes classifier→8B, Stage-A→70B
│   ├── ai-fallback.test.js   # Groq 429 → Together failover
│   ├── onFlowReply.test.js   # nfm_reply payload round-trip
│   └── handlers/             # one .test.js per handler
├── scripts/
│   ├── publish-flow.mjs      # publish/version Flow JSON via Graph API
│   └── rotate-flow-keys.mjs  # rotate RSA keypair for Flows Data Channel
└── doc/
    ├── Journal/              # standing-rule per-PR journal (D-4)
    ├── decisions/            # numbered ADRs for deviations from this plan
    └── .serial-state.yml     # counters (initialised fresh at 0.1.0)
```

### 6.2 Module responsibilities

- **`server.js`** — Express app, three routes:
  - `GET /webhook` — Meta's verify-token echo for webhook registration. Reads `WA_VERIFY_TOKEN` from env, compares `hub.verify_token` from query, echoes `hub.challenge` on match.
  - `POST /webhook` — inbound messages + `nfm_reply` from Flow submissions. Verifies `x-hub-signature-256` first; on success, dispatches to `src/handlers/`.
  - `POST /flows/data` — encrypted Data Channel. Verifies `x-hub-signature-256`, decrypts via `src/flows/crypto.js`, dispatches `INIT` / `data_exchange` / `BACK` / `ping` via `src/flows/handler.js`, re-encrypts the response.
- **`src/transport/whatsapp.js`** — Cloud API client. Methods: `sendText(to, body)`, `sendButtons(to, body, buttons[])`, `sendList(to, body, sections[])`, `sendLocationRequest(to, body)`, `openFlow(to, flowId, flowToken, initialScreen, data)`, `sendImage(to, mediaIdOrLink, caption?)`, `sendTemplate(to, name, language, components[])`. All methods do retry with jitter on 429 / 5xx.
- **`src/transport/format.js`** — escapes `*`, `_`, `~`, `` ` `` in user/data strings; provides `renderVenue(v)` that produces the WhatsApp-markup version of Soleat's `formatTechniqueVenueBlock` (cf. `ang-kl/gia/venue-templates.js`).
- **`src/flows/crypto.js`** — pure functions: `decryptRequest({ encrypted_aes_key, encrypted_flow_data, initial_vector }, privateKeyPem)` → `{ action, screen, data }`. `encryptResponse(payload, aesKey, requestIV)` → **base64-encoded ciphertext string** (NOT a JSON object — Meta's Flow Data Channel expects the encrypted bytes, base64-encoded, as the **raw HTTP response body**; `server.js` does `res.type('text/plain').send(encryptResponse(...))`). **Flipped-IV is hard-coded inside `encryptResponse` to prevent the day-1 bug.** [Codex-flagged 2026-05-15 on PR #439, line 266.]
- **`src/flows/sign.js`** — `verifyHubSignature(rawBody, header, appSecret)` → boolean. Use timing-safe compare.
- **`src/flows/handler.js`** — routes the decrypted action: `INIT` → initial screen + data; `data_exchange` → next screen given submitted form; `BACK` → previous screen; `ping` → `{ data: { status: "active" } }`. Pure-ish; defers business logic to `src/handlers/onFlowReply.js`-style code only for terminal submissions, but a Flow can also short-circuit and complete inside `data_exchange` if Meta routes it that way.
- **`src/handlers/onMessage.js`** — dispatches an inbound chat message. For text: classify via `ai/router.js` → if "venue intent", ask for location or open Cuisine Flow; else converse with `ai/llama.js` (3.3-70B). For list/button replies: lookup the option, route. For location: hand to `src/handlers/onLocation.js`.
- **`src/handlers/onFlowReply.js`** — receives `nfm_reply` (the Flow's terminal payload). Runs the venue search (Stage-A → executor → vault lookup → optional web-search tool loop) and sends results back as a text or image+text message.
- **`src/ai/llama.js`** — OpenAI-compatible wrapper for Groq (primary) and Together AI (fallback). Supports `chat.completions.create` with `response_format: { type: 'json_object' }` and `tools` (function-calling). Streaming variant for long responses. Auto-fallback on Groq 429 / 5xx. Per-call token telemetry to `telemetry.js`.
- **`src/ai/router.js`** — pure function `pick(task: 'classify' | 'converse' | 'stage-a' | 'sanctuary' | 'vision')` → `{ provider, model, temperature, response_format }`. Single place to change model assignments.
- **`src/ai/dedup.js`** — 60 s `(lang, sha256(text))` → response cache in Redis. Saves repeat costs since prompt caching is unavailable (D-1).
- **`src/ai/telemetry.js`** — appends `{ timestamp, task, provider, model, input_tokens, output_tokens, cost_usd_estimate }` to a Redis list, with a daily aggregator emitting summary logs.
- **`src/ai/tools/web-search.js`** — Tavily by default (Serper as alt). Returns top 5 results with snippets. Used in the sanctuary-judgment tool loop.
- **`src/ai/tools/google-reviews.js`** — proxies the Google Places `place_details` field-mask=`reviews,rating,user_ratings_total`. Mirrors `ang-kl/gia/consultant.js`.
- **`src/ai/tools/vault-lookup.js`** — `nearbyPicks(lat, lng, radiusM)`, `lookupVault(cuisineKey)`. Reads from `src/data/vault.js` only.
- **`src/data/vault.js` / `src/data/cuisines.js`** — read-only loaders; see §8.1 for how they reach Soleat's data.
- **`src/user/identity.js`** — `tenantKey(msisdn)` → `'wa:' + sanitised(msisdn)`. Validates E.164 format.
- **`src/user/prefs.js`** — get/set per-user prefs in Redis under `tenantKey(msisdn)` namespace.

### 6.3 Data flow — happy path (user asks for lunch)

```
WA user                  Meta Cloud API           Gia-WA server                   Llama provider           Vault/data
  |                            |                       |                              |                       |
  | "I want sushi nearby"      |                       |                              |                       |
  |--------------------------->|                       |                              |                       |
  |                            | POST /webhook         |                              |                       |
  |                            |---------------------->|                              |                       |
  |                            |                       | verify signature             |                       |
  |                            |                       | dedup.check (miss)           |                       |
  |                            |                       | router.pick('classify')      |                       |
  |                            |                       |--- llama.chat (3.1-8B JSON)->|                       |
  |                            |                       |<-- {intent: venue, ...} -----|                       |
  |                            |                       | request location             |                       |
  |                            | POST /messages        |                              |                       |
  |                            |<----------------------|                              |                       |
  |                            | (location_request_message)                            |                      |
  |<---------------------------|                       |                              |                       |
  | shares location pin        |                       |                              |                       |
  |--------------------------->|                       |                              |                       |
  |                            |---------------------->|                              |                       |
  |                            |                       | onLocation                   |                       |
  |                            |                       | router.pick('stage-a')       |                       |
  |                            |                       |--- llama.chat (3.3-70B JSON)>|                       |
  |                            |                       |<-- {executor_prompt} --------|                       |
  |                            |                       | tools/vault-lookup ----------+--------- read ------->|
  |                            |                       |<----- nearby picks ----------+-----------------------|
  |                            |                       | (optional tool loop:                                  |
  |                            |                       |  web-search if vault miss)                            |
  |                            |                       | format.renderVenue x 5       |                       |
  |                            | POST /messages        |                              |                       |
  |                            |<----------------------|                              |                       |
  |                            | (text body with top-5)|                              |                       |
  |<---------------------------|                       |                              |                       |
```

For the Cuisine Flow path, replace the "request location → onLocation" segment with `openFlow → POST /flows/data (INIT) → POST /flows/data (data_exchange) → POST /flows/data (data_exchange terminal) → onFlowReply`.

### 6.4 Dependencies (own `package.json`)

```json
{
  "name": "gia-wa",
  "version": "0.1.0",
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "start": "node server.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "syntax": "find . -name '*.js' -not -path './node_modules/*' -not -path './__tests__/*' -print0 | xargs -0 -n1 node --check",
    "publish-flows": "node scripts/publish-flow.mjs"
  },
  "dependencies": {
    "axios": "^1.7.0",
    "express": "^4.21.0",
    "ioredis": "^5.4.0"
  },
  "devDependencies": {
    "vitest": "^2.1.0"
  }
}
```

**Explicit non-dependencies** (do not add): `@anthropic-ai/sdk`, `node-telegram-bot-api`, anything `@google/generative-ai`, anything that pulls in Vite or a frontend build chain (Gia-WA has no frontend bundle — Flows are server-side JSON).

---

## 7. AI layer — Meta Llama only (the maximization story)

Track B from the depth analysis: extract the most we can from open-weight Llama, given D-1.

### 7.1 Provider strategy

- **Primary: Groq** — sub-200 ms TTFT, cheapest per token in the market, generous free tier, OpenAI-compatible API. Models available: Llama 3.1 8B Instant, 3.3 70B Versatile, 3.2 11B Vision (limited).
- **Fallback: Together AI** — OpenAI-compatible, better sustained-load rate limits than Groq, broader Llama 3.2 Vision support, has Llama 4 (Scout/Maverick) as they GA. Slower TTFT (~500 ms) but acceptable for fallback.
- **Auto-fallback trigger**: Groq returns 429 or 5xx, or exceeds a 3 s timeout. `src/ai/llama.js` retries on Together; emits a structured telemetry event so we can see fallback rates.
- **Out of scope (for now)**: AWS Bedrock, Cerebras, Fireworks, self-hosted Llama. Operator may revise.

### 7.2 Model router

`src/ai/router.js#pick(task)` returns the provider/model/params tuple. Initial mapping:

| Task | Model | Provider | Notes |
|---|---|---|---|
| `classify` (intent detection on every inbound) | Llama 3.1 8B Instant | Groq | Sub-200 ms TTFT; cents-per-million tokens; 8B is plenty for our classifier. |
| `converse` (short ack/reply outside venue intent) | Llama 3.3 70B Versatile | Groq | Quality matters; latency budget allows. |
| `stage-a` (executor-prompt synthesis) | Llama 3.3 70B Versatile (Llama 4 Maverick if GA) | Groq primary, Together fallback | Strongest reliable Llama for multi-constraint reasoning. |
| `sanctuary` (Google-reviews-driven tool-use loop) | Llama 3.3 70B Versatile | Groq | Function-calling support landed in 3.1; 3.3 is stable. |
| `vision` (menu OCR if added later) | Llama 3.2 11B Vision | Together | Groq vision support is limited. |

The router is a pure function — trivially unit-testable. Tests assert that `pick('classify').model === 'llama-3.1-8b-instant'` etc. (one `router.test.js` file).

### 7.3 Prompt structure (token-trimmed for Llama)

Llama follows JSON-schema prompts well; few-shot is less load-bearing than for older models. Compared to Soleat's Claude prompts:

- **Classifier system prompt**: keep the cuisine catalogue (Llama needs the enum to do strict classification), but drop 60–80 % of the few-shot examples and verbose explanations. Target: ≤ 8 k input tokens per call (Soleat's Claude classifier sends ~25 k including catalogue).
- **Stage-A meta-prompt**: shorter, more deterministic schema, fewer free-form filters. Llama 3.3 70B is materially worse than Opus 4.7 at "creative" constraint blending — lean into strict schema instead.
- **Sanctuary prompt**: tool-use loop with at most 3 iterations to bound latency.

All static prompts live in `src/ai/prompts/` as ES modules exporting strings, so they're greppable, lintable, and unit-testable for token count regressions.

### 7.4 Tool use (function calling)

Llama 3.1+ supports OpenAI-compatible function calling. Use it for:

- **`web-search`** — replaces `web_search_20260209` (the server-side tool that Soleat uses in `ang-kl/gia/index.js:3901`). Tavily by default; Serper as alt. The agent loop in `llama.js` handles `tool_call` → tool execution → result-back → continuation, capped at 3 iterations.
- **`google-reviews`** — sanctuary judgment, called from the `sanctuary` task.
- **`vault-lookup`** — `nearby_picks(lat, lng, radius_m)` and `lookup_vault(cuisine)` so the model can pull from our data on demand (avoids dumping the whole vault into context).

**Tool-arg hallucination guard**: validate `tool_calls.arguments` against a JSON schema before dispatching. If invalid, reject with a corrective system message ("argument `lat` is required and must be a number") and loop. This is non-optional; Llama hallucinates tool args more than Claude.

### 7.5 JSON-mode / strict schema

Both Groq and Together support `response_format: { type: 'json_object' }`; Groq additionally supports strict `json_schema`. Use strict schema everywhere `nl-intent.js` / Stage-A / sanctuary in Soleat would have manually parsed LLM JSON — eliminates the schema-parse failures that `gemini-retry.js` exists to swallow.

### 7.6 What we lose vs. Anthropic (honest accounting, for the record)

- **No prompt caching.** Static prompts are re-billed every call. Mitigations: prompt trimming (§7.3), Redis dedup (§7.7), telemetry-driven monitoring.
- **No extended-thinking equivalent.** Stage-A meta-prompts must be shorter and more deterministic. Expect measurably lower quality on multi-constraint searches.
- **No server-side `web_search_20260209`.** Implemented client-side via Tavily; adds an external dependency, +200 ms latency per tool call, more failure modes (Tavily 5xx / rate limits).
- **No tool-use determinism guarantees.** Mitigated by the validation guard in §7.4.

### 7.7 Mitigations

- **Redis dedup** (`src/ai/dedup.js`): 60 s TTL on `(lang, sha256(text))` → response. Catches duplicate-request bursts (refresh-spam, double-tap) which is the only "cache" we have access to.
- **Per-call telemetry** (`src/ai/telemetry.js`): input/output token counts written per call. Daily aggregate logged. Without caching, **visibility is the only cost lever**.
- **Streaming-aware delivery**: `src/transport/whatsapp.js#sendText` chunks at sentence boundaries; `llama.js#stream` exposes a token stream that pumps into a coalescing buffer flushed at WhatsApp's effective length. Reduces perceived latency.

---

## 8. Data layer

### 8.1 Read-only bridge from `ang-kl/gia`

Gia-WA needs the cuisine catalogue and the versioned vault from Soleat. Options, in preference order:

**Option A (preferred): published npm package or GitHub package** — Soleat publishes `@ang-kl/soleat-vault@<version>` containing `data/cuisines.js` + `vault/<latest>/`. Gia-WA depends on it via `package.json`. Pro: clean, versioned. Con: requires a one-time setup PR on `ang-kl/gia` (which D-2 forbids without operator sign-off).

**Option B: git submodule** of `ang-kl/gia` mounted under `Gia-WA/vendor/soleat/`. `src/data/vault.js` does `import { ... } from '../../vendor/soleat/data/cuisines.js'`. Pro: zero changes to Soleat; pinning is explicit. Con: submodule UX is rough; CI must `git submodule update --init`.

**Option C: HTTP fetch at build time** from `raw.githubusercontent.com/ang-kl/gia/<sha>/data/cuisines.js`. Pre-commit hook materialises a local cached copy under `Gia-WA/cache/soleat-data/`. Pro: no submodule, no npm publishing. Con: needs a vault-version pin file; ergonomics tricky.

**Decision (default for receiving session)**: **Option B (submodule)** for Phase 0 — it's the lowest-coupling, least-coordination path. Revisit to Option A after operator gives the green light to publish the soleat-vault package.

### 8.2 Redis keyspace

- **All Gia-WA keys** prefixed `wa:`.
- **No shared keys with Soleat.** Soleat uses `tg:` prefix (or unprefixed legacy keys); Gia-WA must never read or write into Soleat's keyspace.
- **Recommended**: separate Redis database number (`REDIS_URL=redis://...:6379/2`) to make accidental collisions impossible. Document in `.env.example`.

### 8.3 User identity (E.164)

`src/user/identity.js#tenantKey(msisdn: string): string`:
- Strip leading `+`, strip spaces and hyphens, validate it's all digits and 8–15 chars long (E.164 length bounds).
- Return `'wa:' + sanitised`.
- Throw on invalid input — fail loud, don't silently coerce.

Unit-test against:
- `'+6591234567'` → `'wa:6591234567'`
- `'+65 9123 4567'` → `'wa:6591234567'`
- `'tg:123'` → throw.
- `''` → throw.

---

## 9. Security & secrets

### 9.1 Full env-var list (`.env.example`)

```
# WhatsApp Cloud API
WA_PHONE_NUMBER_ID=
WA_BUSINESS_TOKEN=          # long-lived system-user token
WA_VERIFY_TOKEN=            # arbitrary string you choose; matches Meta webhook config
WA_APP_SECRET=              # for x-hub-signature-256 verification

# Flows Data Channel
FLOWS_PRIVATE_KEY_PEM=      # RSA-2048 private key, base64-encoded PEM
FLOWS_PUBLIC_KEY_PEM=       # corresponding public key, must be uploaded to Meta

# AI providers
GROQ_API_KEY=
TOGETHER_API_KEY=
TAVILY_API_KEY=             # for web-search tool

# Optional Google integration (sanctuary tool)
GOOGLE_PLACES_API_KEY=

# Storage
REDIS_URL=redis://localhost:6379/2

# Observability
LOG_LEVEL=info
```

### 9.2 Flow encryption keys

- Generate RSA-2048 keypair with `openssl genrsa -out flows-private.pem 2048` and `openssl rsa -in flows-private.pem -pubout -out flows-public.pem`.
- Upload `flows-public.pem` to Meta via the Business Management API (or via the Meta UI under WhatsApp Manager → Flows → Encryption).
- **Rotation**: `scripts/rotate-flow-keys.mjs` generates a new pair, uploads the new public key, then waits 24 h before disposing of the old private key (during which the server accepts both). Run quarterly.

### 9.3 Provider API keys

- Each provider key lives only in env; never logged, never committed.
- `telemetry.js` redacts any string ≥ 32 chars that matches `^[a-zA-Z0-9_-]+$` from emitted logs (paranoid but cheap).

### 9.4 Telegram-bot isolation

The Soleat Telegram bot's token (`TELEGRAM_BOT_TOKEN`) **must never** be present in the Gia-WA env or process. If you see it leaking into the new repo's `.env.example`, that's a process bug — file it.

---

## 10. Testing strategy

### 10.1 Unit (vitest)

Every module under `src/` has a `.test.js` in `__tests__/`, organised mirroring the source tree. Coverage target: ≥ 80 % on `src/transport/`, `src/flows/crypto.js`, `src/ai/router.js`, `src/user/identity.js`. Lower bars on glue handlers.

### 10.2 Meta-published Flow encryption test vectors

Meta publishes test vectors for the Flow encryption scheme. `__tests__/crypto.test.js` must include at least 3 round-trip cases from the published vectors. This is the single most error-prone piece of code in the codebase; tests are non-negotiable.

### 10.3 Integration (WA Business test number)

- Provision a Meta-supplied test phone number (free, 5 recipients).
- Manual end-to-end smoke per phase before merge:
  - Phase 3: send "hello" → bot replies via Llama 3.3-70B.
  - Phase 4: send "sushi nearby" → location request → share location → Cuisine Flow opens → submit → receive top-5 message.
  - Phase 5: same loop for Hawker.
- Confirm `ping` health-check returns 200 from your server (Meta's Flow → Health → Test action).

### 10.4 Pre-commit / pre-PR checklist (gia-preflight, ported)

Before every commit and every PR:

- [ ] `node --check` clean on every changed `.js`.
- [ ] `npm test -- --run` 100 % green.
- [ ] No `console.log` of user-supplied text without going through `format.js` escaper (translation of the HTML-escape rule).
- [ ] No handler path that returns without sending a message (Soleat's "silent failure" failure mode).
- [ ] No `catch (e) {}` empty bodies (Soleat's "error swallowing" failure mode).
- [ ] `package.json` version bumped if any user-visible behaviour changed.

### 10.5 What CI runs (`.github/workflows/ci.yml`)

Mirror Soleat's CI shape but trimmed:
- `syntax` job: `npm install --ignore-scripts` + `npm run syntax`.
- `test` job: `npm install --ignore-scripts` + `npm test -- --run`.
- **No TMA build job** — Gia-WA has no frontend.

---

## 11. Deployment

### 11.1 Hosting target

- **Recommended**: Railway parallel project, separate from Soleat. Reasons: (a) keeps the Telegram and WhatsApp processes' blast radii independent; (b) separate `WA_BUSINESS_TOKEN` rotation cadence; (c) avoids accidental env-var co-mingling.
- **Alternative**: Render / Fly.io / a dedicated VPS. All workable; Railway chosen for parity with Soleat's existing setup.
- **Not recommended**: Vercel serverless. The Flow Data Channel needs warm RSA-private-key state and predictable cold-start; a long-running Express process is the right shape.

### 11.2 Flow publish lifecycle (in CI)

`.github/workflows/publish-flows.yml`:
- Trigger: push to `main` if any file under `src/flows/*.json` changed.
- Steps: compute diff → for each changed Flow JSON, call Meta's publish API with a new version → emit a release note in the run summary.
- Initial publish is `DRAFT`; promotion to `PUBLISHED` is **manual via Meta UI** for the first month, then automated once the lifecycle is well-understood.

### 11.3 Domain / phone provisioning (one-time, operator)

- Register a WhatsApp Business Account in Meta Business Manager.
- Add a phone number (cannot be one already on WhatsApp consumer).
- Verify business identity (1–7 days).
- Get the `WA_PHONE_NUMBER_ID` and `WA_BUSINESS_TOKEN` from Meta; populate Gia-WA's deploy env.

---

## 12. Execution order (PR-by-PR, each phase is one branch + one draft PR)

Each phase is independent enough that the operator can pause or redirect between any two phases without rework.

### Phase 0 — Repo bootstrap (1 PR)
- Initialise `ang-kl/Gia-WA` with `README.md` (pointer to this plan), `.gitignore`, MIT (or operator-chosen) LICENSE, `.github/workflows/ci.yml` skeleton (no jobs yet), `package.json` at `0.1.0` with empty `scripts`. No source code.
- Branch: `claude/phase-0-bootstrap`.

### Phase 1 — Skeleton + transport + format (1 PR)
- `package.json` final deps (axios, express, ioredis, vitest).
- `server.js` with the three routes; `POST /webhook` and `POST /flows/data` stubbed to 200; `GET /webhook` does verify-token echo.
- `src/transport/whatsapp.js` with `sendText` only; other methods as `throw new Error('not implemented')` stubs.
- `src/transport/format.js` with escape + tests.
- `src/flows/sign.js` with HMAC verify + test.
- CI jobs `syntax` + `test` populated; both green.
- Branch: `claude/phase-1-skeleton`.

### Phase 2 — Llama wrapper + router (1 PR)
- `src/ai/llama.js` (Groq primary + Together fallback, JSON-mode, function-calling, streaming).
- `src/ai/router.js` (pure function, fully tested).
- `src/ai/dedup.js` (Redis-backed; integration test against a local Redis).
- `src/ai/telemetry.js`.
- `src/ai/prompts/classifier.js` (token-trimmed cuisine-classifier system + cuisine catalogue).
- Tests: router selection, JSON-mode parse, fallback on 429, dedup hit/miss.
- Branch: `claude/phase-2-llama-router`.

### Phase 3 — Inbound text path (1 PR)
- `src/handlers/onMessage.js` — text intent classifier round-trip; routes to `converse` for non-venue intents.
- `src/transport/whatsapp.js` completes `sendButtons`, `sendList`, `sendLocationRequest`.
- Integration test (mocked Cloud API) for the round-trip.
- Branch: `claude/phase-3-text`.

### Phase 4 — Cuisine Flow (1 PR, the big one)
- `src/flows/crypto.js` with Meta test vectors green.
- `src/flows/cuisine.json` (the Flow definition).
- `src/flows/handler.js` routing INIT / data_exchange / BACK / ping.
- `src/handlers/onLocation.js` + `src/handlers/onFlowReply.js`.
- `src/ai/tools/vault-lookup.js` + `src/ai/prompts/stage-a.js` (Llama 3.3-70B).
- `src/data/vault.js` + `src/data/cuisines.js` via the §8.1 bridge.
- `scripts/publish-flow.mjs` working end-to-end on a DRAFT Flow.
- Branch: `claude/phase-4-cuisine`.

### Phase 5 — Hawker Flow (conditional, 1 PR)
- Skip unless Cuisine usage data after a week justifies the spend.
- If green-lit: `src/flows/hawker.json`, static-map rendering, hawker-centre lookup.
- Branch: `claude/phase-5-hawker`.

### Phase 6 — Telemetry + 24 h soak (1 PR)
- Daily cost-aggregator job in `src/ai/telemetry.js`.
- Per-message latency histogram emitted to logs.
- 24 h staging soak: assert p50 classifier latency < 250 ms; p50 Stage-A latency < 2.5 s; per-message cost < $0.005.
- Branch: `claude/phase-6-soak`.

### Phase 7 — Out-of-scope decisions documented (1 PR, docs-only)
- `doc/decisions/001-transport-not-ported.md`, `002-oversight-not-ported.md`, `003-no-prompt-cache.md`, `004-llama-only.md`. Each ADR explains the constraint, the consequence, and the open-door condition for revisiting.
- Branch: `claude/phase-7-decisions`.

**Hard stop after Phase 4**: operator approves before Phase 5. The Hawker Flow's static-map rendering is non-trivial spend; don't build it speculatively.

---

## 13. Success criteria per phase

| Phase | "Done" looks like |
|---|---|
| 0 | `ang-kl/Gia-WA` exists with `README.md`, `package.json@0.1.0`, CI skeleton. PR merged. |
| 1 | `GET /webhook` echoes verify_token in production; `sendText` works; format escape unit-tested. |
| 2 | Llama classifier responds to a curl test in < 300 ms; fallback to Together verified by simulated 429. |
| 3 | A user can text the test number and get a conversational reply; intent classifier picks `venue` correctly ≥ 90 % on a 50-message smoke set. |
| 4 | End-to-end: user texts "sushi" → location request → location share → Cuisine Flow opens → submit → top-5 sushi venues message arrives, formatted, with no markup corruption. |
| 5 | (If reached) End-to-end equivalent for Hawker, with at least one static map per option rendered. |
| 6 | 24 h soak emits aggregate telemetry; SLOs met. |
| 7 | ADRs merged and visible in `doc/decisions/`. |

---

## 14. Open questions to confirm with operator before Phase 4

- **Vault bridge**: confirm Option B (submodule) vs revisit to Option A (published package). §8.1.
- **Llama 4 availability**: by Phase 2 timing, is Llama 4 Maverick GA on Groq? If yes, swap Stage-A to it; revise §7.2.
- **Tavily vs Serper vs Google Custom Search** for the web-search tool. §7.4. Default Tavily unless operator prefers otherwise.
- **Hawker phase gate** (§12 Phase 5): what usage metric green-lights the build?
- **Cross-transport identity linking**: confirm out-of-scope. §4.6.
- **Free-tier limits on the Meta test number**: 5 recipient WA accounts may bottleneck Phase 4 manual smoke; do we provision the production number earlier?

---

## 15. Reference links (Meta + Llama)

- **WhatsApp Cloud API** — https://developers.facebook.com/docs/whatsapp/cloud-api
- **Flows reference** — https://developers.facebook.com/docs/whatsapp/flows
- **Flow Data Channel encryption** — https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
- **Flow component spec** — https://developers.facebook.com/docs/whatsapp/flows/reference/components
- **Message templates** — https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates
- **Webhook signature verification** — https://developers.facebook.com/docs/messenger-platform/webhooks#validate-payloads
- **Groq API docs** — https://console.groq.com/docs
- **Together AI docs** — https://docs.together.ai
- **Tavily API** — https://docs.tavily.com
- **Llama 3.1 / 3.3 model cards** — https://llama.meta.com/

---

## 16. Hygiene rules for the receiving session

### 16.1 Branch + commit + PR style

- **Branch names**: `claude/phase-<N>-<short-slug>`, e.g. `claude/phase-4-cuisine`.
- **Commit messages**: imperative present, 1-line summary ≤ 72 chars, blank line, body explaining "why". Mirror Soleat's style (`git log --oneline` on `ang-kl/gia/main`).
- **PRs**: always **draft**. Title ≤ 70 chars. Body has `## Summary`, `## What's in this PR`, `## Test plan` (checklist), `## Notes` sections.
- **Per-PR Journal entry** before requesting review (D-4).

### 16.2 What never to touch

- `ang-kl/gia` — read-only via §8.1 bridge. Any change there needs a separate session and operator sign-off (D-2).
- Anyone else's repos. Your MCP allowlist should restrict you to `ang-kl/Gia-WA`; verify on startup.
- `WA_BUSINESS_TOKEN`, `FLOWS_PRIVATE_KEY_PEM`, or any other secret in commits, logs, or PR bodies.

### 16.3 Access verification on session startup

Before writing any code, the receiving session must run these checks (read-only) and surface any failures to the operator:

1. `git remote -v` shows `origin` pointing at `ang-kl/Gia-WA`.
2. A test fetch (`git ls-remote origin`) succeeds — confirms the local git proxy admits the repo.
3. An MCP test call (`mcp__github__get_me` or `mcp__github__list_branches` on `ang-kl/Gia-WA`) succeeds — confirms the MCP allowlist admits the repo.
4. Underlying GitHub identity has Contents:write + Pull requests:write + Workflows:write on `ang-kl/Gia-WA`. If unsure, the operator can confirm in chat.

If any check fails, **stop and tell the operator which layer is blocked** (proxy / MCP / GitHub permissions). Do not try to work around it.

### 16.4 When to ask the operator

- Any deviation from this plan that affects an operator directive (§2 D-1 through D-6).
- Any module that requires reading from `ang-kl/gia` outside the §8.1 bridge.
- Phase 5 entry (operator gate).
- Anything that would publish a Flow to `PUBLISHED` for the first time (manual operator action).
- Anything that touches WhatsApp template approval (latency is hours-to-days, plan accordingly).

### 16.5 When NOT to ask the operator

- Internal refactors within Gia-WA that don't change the public contract.
- Picking between two equivalent npm packages.
- Vitest test-case additions.
- Lint / formatting / `node --check` fixes.

---

## Appendix A — File inventory (zero edits to `ang-kl/gia`)

All files below are CREATED under `ang-kl/Gia-WA/`. Nothing under `ang-kl/gia/` is modified by Gia-WA work.

`package.json`, `package-lock.json`, `README.md`, `.env.example`, `.gitignore`, `.github/workflows/ci.yml`, `.github/workflows/publish-flows.yml`, `server.js`, `src/transport/whatsapp.js`, `src/transport/format.js`, `src/flows/cuisine.json`, `src/flows/hawker.json`, `src/flows/handler.js`, `src/flows/crypto.js`, `src/flows/sign.js`, `src/handlers/onMessage.js`, `src/handlers/onFlowReply.js`, `src/handlers/onLocation.js`, `src/ai/llama.js`, `src/ai/router.js`, `src/ai/dedup.js`, `src/ai/telemetry.js`, `src/ai/tools/web-search.js`, `src/ai/tools/google-reviews.js`, `src/ai/tools/vault-lookup.js`, `src/ai/prompts/classifier.js`, `src/ai/prompts/stage-a.js`, `src/ai/prompts/sanctuary.js`, `src/data/vault.js`, `src/data/cuisines.js`, `src/user/identity.js`, `src/user/prefs.js`, `__tests__/*` (one per module), `scripts/publish-flow.mjs`, `scripts/rotate-flow-keys.mjs`, `doc/Journal/*`, `doc/decisions/*`, `doc/.serial-state.yml`.

---

## Appendix B — Glossary

- **TMA** — Telegram Mini App. The Soleat in-bot WebView UI.
- **Flow** — WhatsApp's server-driven multi-screen form. The TMA-equivalent surface on WhatsApp.
- **MSISDN** — Mobile Subscriber ISDN Number, i.e. an E.164 phone number used as identity.
- **R.E.D** — "Random Excellent Discovery". Soleat's Gemini-driven hidden-gems template.
- **AU recipe** — Soleat's authenticity protocol for docs (append, never compress; preserved in `doc/CLAUDE.md`). Gia-WA's `doc/` follows a parallel discipline.
- **Vault** — Soleat's versioned venue dataset under `ang-kl/gia/vault/<version>/`.
