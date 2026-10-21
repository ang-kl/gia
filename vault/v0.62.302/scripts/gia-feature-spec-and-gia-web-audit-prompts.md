(№ 1 - 02-06 '26 19:12 SGT)

# Claude Code prompts - gia feature spec + gia-web conformance audit

Two prompts, used in sequence:

- **PROMPT 1** runs in the **`gia`** repo. It produces the long, clause-level feature specification you asked for (categorised by TMA / free-text / slash-commands / google-map micro-details / per-surface results / UI sub-categories), folding every merged PR with number <= 818, verified against current `main`.
- **PROMPT 2** runs in the **`gia-web`** repo. It forces Claude Code to read that spec and audit its own HTML/CSS3/JS for exact behavioural parity - reporting gaps before touching code, and forbidden from inventing or "improving" anything.

Recommended run: open `gia` with Claude Code on Opus, paste Prompt 1, let it produce + commit the spec; copy that spec file into `gia-web` (or reference its path); open `gia-web`, paste Prompt 2.

Two working assumptions are baked in - tell me if either is wrong: (a) `gia-web` is a separate vanilla HTML/CSS/JS re-implementation of the React/Vite TMAs in `gia`, so parity is *behavioural*, not line-for-line; (b) the PR ceiling #818 is the intended state boundary (the current master sits around v0.61.31x, so confirm #818 maps to where you want the snapshot drawn).

Everything between the START / END markers is the prompt body to copy. The markers themselves are not part of the prompt.

---

=== PROMPT 1 START (run inside the `gia` repo) ===

You are documenting an existing, shipped codebase. Your role is technical archaeologist and specification writer, not designer. You are producing the single canonical feature specification that a separate project (`gia-web`) will be audited against, so precision and completeness outrank brevity.

## Non-negotiable rules

1. ZERO invention. Document only behaviour that exists in (a) merged code on the current `main` branch, and (b) merged PR diffs with PR number <= 818. If a behaviour cannot be confirmed in source, mark it `[UNVERIFIED: <what is missing>]` and move on. Never fill a gap with a plausible guess, a "probably", or a tidied-up version. This mirrors the repo's own 100%-non-inventive constraint - honour it in the documentation too.
2. COMPLETENESS is mandatory. You will account for the full set of merged PRs with number <= 818. Maintain a ledger file `doc/Feature/_ledger-818.md` with one row per PR: number, title, status (PENDING / FOLDED / SKIPPED-irrelevant + one-line reason). The task is not complete while any row is PENDING.
3. NO premature stop, NO excuses. If the volume is large, work in numbered batches and post a one-line progress note after each batch, then continue. Do not ask whether to keep going - keep going until the ledger has zero PENDING rows.
4. VERIFY against HEAD, not just PR text. A PR may have been superseded or reverted. The spec must reflect current `main`. Anything removed goes into the Removed-Features table per `doc/CLAUDE.md`, never silently deleted from history.
5. RESPECT doc governance. Read `doc/CLAUDE.md` first and obey it (append precedent AU-1, removed-table rules AU-2 / AU-EOF, the serial-number header line). Use `doc/Journal/` as your primary per-PR index - it already holds the exhaustive per-PR record - then confirm each claim against source on `main`.
6. EVERY claim is traceable. Each feature entry cites the source file path(s) and the symbol (function / component / route) that implements it.

## Method (follow in order)

Step 0 - Orient. Read `doc/CLAUDE.md`, the current master `doc/Feature/feature-0_61_83-21_05_26-1645.md`, and the `doc/Journal/` index. Note the serial-number header convention and the Removed-table rules.

Step 1 - Enumerate PRs and build the ledger.
`gh pr list --state merged --limit 1000 --json number,title,mergedAt,headRefName | jq 'map(select(.number <= 818)) | sort_by(.number)'`
Write every PR into `doc/Feature/_ledger-818.md` as PENDING. If `gh` cannot read a PR, record it as `PENDING [BLOCKED: <reason>]` - do not drop it.

Step 2 - Group by the category taxonomy below. For each PR, fold its effect into the relevant section, then mark it FOLDED (or SKIPPED-irrelevant with reason).

Step 3 - Confirm against source. For each feature, open the named files on `main`, grep the symbol, and read the current behaviour. Record file + symbol. Where current code contradicts the PR text, current code wins.

Step 4 - Write the spec using the per-feature schema, exhaustively.

Step 5 - Self-audit. Re-open the ledger, confirm zero PENDING, and list every `[UNVERIFIED]` tag in a closing section so gaps are explicit, not hidden.

## Category taxonomy (top-level sections; UI is a sub-section under each surface)

- Section A - Surfaces overview: the Telegram bot, the five TMAs (Cuisine, Menu, Hawker, Transport, Oversight), and the Express server. One-line surface map plus the shared module list.
- Section B - Slash-command registry: every command and alias (`/cuisine` `/c`, `/s`, `/recognised`, `/hidden`, `/hawker`, `/transport` `/train` `/carpark` `/weather`, `/l` `/clipboard` `/share` `/picks` `/legal` `/privacy` `/forgetme` `/start` `/language`, and the hidden owner set `/v` `/ver` `/oversight` `/ftlog` `/log`). For each: handler symbol, owner-gating (`isOwnerChat`), `setMyCommands` visibility, exact reply layout, and the exact emoji / header strings.
- Section C - Free-text chat pipeline: intent classification (deterministic dictionaries first, then Gemini classifier), the five intent kinds (dish / ingredient / cooking-technique / cuisine / ambiguous), the guided assistance sub-menu, the `dish-name.js` guard, and the Google-Places `discover()` path that replaced the LLM-invents-names path. State the exact fan-out and caveat strings.
- Section D - TMA: Cuisine. Sub-categories: D.1 search criteria + quick filters (Halal, open-now, crowd, pet, price tier, accessibility); D.2 editable LocationField + autocomplete + the recents drawer; D.3 in-field search trigger + rotating loading overlay; D.4 venue result card (list every field in render order, every badge, every emoji); D.5 map + numbered droplet pins; D.6 page-history FABs + the 3 s search-FAB flash with the arrow cue; D.7 region modes (SG 20 km, JB 30 km whole-state).
- Section E - TMA: Hawker. Sub-categories mirroring D: input, list + map, per-centre InfoWindow, nearby-transit enrichment, surrounding amenity pins.
- Section F - TMA: Transport. Sub-categories: F.1 Train sub-flow (nearest-3-stations, station-code colouring, more-info hyperlinks, status block order); F.2 Bus sub-flow (nearest stops, road-name-led blocks, ETA bands, refresh control); F.3 Carpark; F.4 Weather; F.5 the station map (schematic PNG <-> interactive ~206-station map toggle).
- Section G - TMA: Menu (launcher). FAB behaviour (always "end" + close), location set/echo, clipboard / share / picks, legal / privacy / forgetme, language toggle.
- Section H - TMA: Oversight (owner-only). What it surfaces and how it is gated.
- Section I - Google-map micro-details (shared across the three map-bearing TMAs). Sub-categories: I.1 overlay chip layers + the fixed overlay radius (~550 m) + the overflow menu order (menu first, then Colour pill, then toggles); I.2 station info card (header rules for single vs interchange, click-to-expand Exits row, per-line First/Last-train blocks, deduped footer, forced pin render on tap); I.3 pins + the single zoom breakpoint z=15 (station square <-> pill, exit bare-id <-> card, bus-stop compact <-> card, cuisine numbered droplet); I.4 Exit Template popup (line-coloured header, code pills, nearby-attractions line); I.5 amenity pins via `attachAmenityPins` (exits, bus arrivals, taxis, carparks); I.6 map chrome (vertical nav-button column, Colour greyscale pill, Overview toggle, polyline opacity tracking zoom and muting on selection); I.7 popup / InfoWindow palette.
- Section J - Result rendering per surface. Compare chat-reply layouts against TMA result views. Capture exact header strings such as `Results (12)` versus `Results (12/130)`, the loading-overlay copy, and the zero-result silent-retry then reset-CTA behaviour.
- Section K - Data, APIs, geo-build scripts. Google Places API (New), Gemini, LTA (TrainServiceAlerts, bus arrivals), NEA forecast, `michelin-2025.js`, `data/stations.json`, the `scripts/build-*` and `scripts/fetch-*` geo scripts, and the `/api/geo/*` routes. For each: input source, output file, and consuming surface.
- Section L - Governance constraints carried in code. The 100%-non-inventive selection rule, owner gating, and the region no-SG-leak sentinel (`__NONE__` / `null`). State where each is enforced.
- Section M - Removed features. Carry forward and extend the existing Removed-Features table (RF-1 .. RF-18) per AU-2 / AU-EOF. Append only; delete nothing.

## Per-feature schema (use for every entry, no field omitted)

- Name + stable ID
- Surface / trigger / entry point + alias(es)
- PR(s): originating + modifying (numbers)
- Behaviour: exact user-facing behaviour
- Input + validation
- Logic flow: numbered steps
- Data / APIs called
- Output / result: exact strings, render order, badges, emoji
- UI: component or file, HTML structure, key CSS classes, JS handlers, and any state / zoom breakpoints
- Edge cases + error handling (retries, fallbacks, empty states)
- Source: file path(s) + symbol(s)
- Status: live / experimental / removed (-> RF-x)
- Verification: `[OK: confirmed on main @ <short-sha>]` or `[UNVERIFIED: <reason>]`

## Output

Write to `doc/Feature/feature-<version>-<DD_MM_YY>-<HHMM>.md` following the naming and serial-header convention in `doc/CLAUDE.md`, with the serial-number line at the very top. This file supersedes brevity: it is expected to be materially longer than the 28 KB master. Do not compress, do not omit sub-categories, do not summarise a feature you have not opened in source.

## Prohibited

- Inventing endpoints, flags, copy, components, or behaviour.
- "Improving", redesigning, or modernising anything.
- Summarising a feature without opening its source.
- Stopping while the ledger has PENDING rows.
- Emitting "I think" / "probably" without an `[UNVERIFIED]` tag.

Begin at Step 0. After the ledger is built, post the batch plan in one short message, then proceed without pausing.

=== PROMPT 1 END ===

---

=== PROMPT 2 START (run inside the `gia-web` repo) ===

You are a conformance auditor. Your role is to verify that `gia-web` (vanilla HTML / CSS3 / JS) reproduces the behaviour described in the gia feature specification exactly. You are not a designer and you have no licence to improve, restyle, simplify, or reinterpret anything.

Spec file to treat as the single source of truth: `<PATH-TO-SPEC>.md` (the file produced by the gia spec-generation run). Read it in full before doing anything else.

## Non-negotiable rules

1. The SPEC is law. `gia-web` must reproduce gia's behaviour exactly. Parity is behavioural - same inputs produce the same outputs, the same UI states, the same copy, the same render order, the same emoji and badges. It is not line-for-line code parity: gia uses React / Vite, gia-web is vanilla, so map each React component or handler to its HTML/CSS3/JS equivalent by behaviour.
2. ZERO creativity. You may not substitute a "cleaner" pattern, modernise styling, rename copy, or add a feature the spec does not list. Any point where gia-web differs from the spec is a DEFECT to report, never a design choice to defend.
3. NO silent skips, NO excuses. Audit every section and every sub-section item in the spec. If you cannot find an implementation, that is a MISSING finding - record it; it is not a reason to move on quietly. If the spec is large, batch the audit and continue; do not stop short and do not decline on grounds of scope.
4. AUDIT before you touch code. Produce a read-only Conformance Report first. Do not edit any gia-web file until the operator names which findings to remediate.
5. If a spec clause is genuinely ambiguous, ASK one precise question. Do not assume intent.

## Method (follow in order)

Step 0 - Read the entire spec. Build an internal checklist with one row per feature, sub-feature, and named UI state (e.g. each pin zoom-state, each result header string, each filter, each reply layout).

Step 1 - Locate. For each checklist row, grep the gia-web HTML / CSS / JS for the implementation. Record the file plus the selector or function.

Step 2 - Classify each row:
- PRESENT - behaviour matches the spec.
- PARTIAL - present but deviates; list the exact deltas.
- MISSING - no implementation found.
- DEVIATED - present but behaves differently or has been re-styled / re-invented; this is a defect, not a variant.

Step 3 - For every PARTIAL / MISSING / DEVIATED row, cite the exact spec clause (section + sub-id) and the exact gia-web gap in one line.

Step 4 - Emit the Conformance Report as a single table:
`Spec ref | Feature / UI item | Spec behaviour (1 line) | gia-web status | gia-web location | Gap / required action`

Step 5 - Add summary counts (PRESENT / PARTIAL / MISSING / DEVIATED) and an ordered remediation backlog, most user-visible parity gaps first.

Step 6 - STOP. Wait for the operator to select which rows to fix.

## Remediation (only after the operator selects rows)

- Fix ONE row at a time, implemented to match the spec exactly. No extra features, no restyling beyond what the spec states, no opportunistic refactors.
- After each fix, re-audit that single row against the spec and report PRESENT or PARTIAL with remaining deltas.
- Never mark a row done without re-verification against the spec clause.

## Prohibited

- "I'll assume gia-web intends X." -> ask instead.
- Implementing a cleaner / modern / alternative variant. -> match the spec.
- Reporting a row as fixed without re-auditing it.
- Skipping spec items silently or sampling instead of covering all of them.
- Declining or trailing off on grounds of scope or size. -> batch it and continue.

Begin at Step 0 now. Produce the full Conformance Report, then stop and wait.

=== PROMPT 2 END ===

---

## Notes on the guardrails (why each clause is there)

- The completeness ledger (Prompt 1, rule 2) is the direct counter to "Claude Code always misses a feature": a PR cannot be missed if it must be marked FOLDED or SKIPPED-with-reason before the task can close.
- The verify-against-HEAD clause (rule 4) catches the reverted / superseded PRs that the Removed-Features table already records, so the spec describes the live product, not a stale PR.
- The `[UNVERIFIED]` tag replaces silent guessing with a visible gap, which is what lets you trust the rest of the document.
- In Prompt 2, audit-before-edit plus one-row-at-a-time remediation is what stops the "too creative" drift: Claude Code cannot rewrite a feature it has only been asked to verify, and every change is checked back against a named clause.
