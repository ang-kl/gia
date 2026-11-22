(№ 174 - 15-05 '26 21:55 SGT) DF cleanup pass — doc-only

# Journal — DF cleanup pass

> Operator: *"one-shot DF cleanup pass: drop the speculative items, close the observational items"*. Doc-only. No code change. No `package.json` bump. The point is to stop carrying items that either (a) I invented without an operator request or (b) are observational with no reported pain. The remaining carry list shrinks from ~15 items to **4**.

## New

### [HDR] #167 | 21:55:00 SGT 15-05-26 | DF cleanup pass — drop speculative + close observational | 2 files | 1 PR |

- **[INTENT]** Two failures the prior carry-forward lists were making:
  1. **Speculative items** I added without operator request, violating CLAUDE.md *"Don't design for hypothetical future requirements"*. These were never on the operator's roadmap; they were my own ideas dressed as deferred work.
  2. **Observational items** kept on the list with no signal that they are actually a problem. *"Watch this"* with no expiry becomes permanent debt that crowds out real work.

  This entry formally drops/closes both classes. Future PRs' `[KNOWN GAPS]` tables should reference only the **Retained** table below.

- **[DELTA]**

  **`doc/Journal/journal-df-cleanup-15_05_26-2155.md`** (new, this entry).

  **`doc/.serial-state.yml`** — `journal 166 → 167`, `commit 173 → 174`; re-anchored `15-05 '26 21:55 SGT`. No anchor source change in code-state (last code-bearing PR remains v0.60.199 / `bfa016f`).

  Per the AU Recipe: dropped/closed items are preserved in tables below, never erased from history. Prior journals retain their `[KNOWN GAPS]` sections verbatim.

### Dropped — speculative, never operator-requested

| # | Item | Reason for drop |
|---|---|---|
| **DF-V1** | Vibe Journal full-text search (lunr.js client index) | I invented this; operator never asked. Vibe Journal serves a small per-PR ledger — browser ctrl-F is adequate. |
| **DF-V2** | Vibe Journal CI auto-regen on every PR merge | Speculative; operator regenerates manually when convenient (see DF-68's "whenever convenient" framing). Adding CI would couple two release surfaces for no observed need. |
| **DF-V3** | Vibe Journal per-key auth allowlist | Superseded by DF-82's close (operator-set `VIBE_JOURNAL_KEY` env var). The single-key gate is sufficient — multi-key allowlist is invention. |
| **DF-V4** | Vibe Journal DAG view (cross-PR file-edit graph) | Pure feature speculation; no operator request, no use case stated. |
| **DF-98** | Cuisine-aware allow-list for LLM-narrate denylist | The current regex denylist (v0.60.196) is working; per-cuisine vocab lists are an over-engineering temptation. Revisit ONLY if operator reports a specific false-positive class. |
| **DF-92** | "Indecision" panel for closed-without-merge PRs in Vibe Journal | Operator never asked for a churn-signal panel. The Vibe Journal's existing scope is sufficient. |

### Closed — observational, no operator-reported pain

| # | Item | Reason for close |
|---|---|---|
| **DF-94** | Michelin Places cost-watch (12 calls per tap, no cache) | No cost signal in any deploy log so far. The fix path (short-TTL cache) is well-understood; will re-open if Places spend shows up in operator's monthly review. |
| **DF-97** | Stale `michelin:enrich:<slug>` Redis cache may hold pre-v0.60.196 "meat"/"chocolates" payloads | 7-day natural rotation — by 2026-05-22 the cache will have self-cleared regardless of any action. Time will close this. |
| **DF-99** | Sanctuary `getOrCacheSummary` first-tap cold cache (card initially missing 🌿 on first tap, fills on second) | Acceptable UX trade-off explicitly accepted at v0.60.197 ship. No operator report of "first tap feels slow". |
| **DF-100** | Bib-gourmand sub-slice still shuffled per request in Michelin handler | Seen-set filtering (v0.60.198) makes this harmless. Order non-determinism is invisible to the operator. |
| **DF-102** | Telegram `/s michelin` from JB context still serves SG entries | The `/s` flow has no region toggle — there is no operator-facing path that exposes this. Re-open only if a JB-aware Telegram track opens. |

### Retained — actionable, real

| # | Item | Why kept | Next action |
|---|---|---|---|
| **DF-84** | Redundant HTML emission in `doc/VibeCodingRecord/generate.mjs` (line 669) duplicates the new Vibe Journal bundle | Real dead code; 1-line delete | One-line delete on next adjacent touch of `generate.mjs`, or a tiny standalone PR. |
| **DF-95** | Dead `michelinDedupKey` attachment in Michelin handler | Real dead code | Strip on next adjacent touch of `handleMichelinSearch`. |
| **DF-96** | Unused `michelinPageDepth` variable in Michelin handler | Real dead code | Strip on next adjacent touch of `handleMichelinSearch`. |
| **DF-101** | Server-side auto-recycle when Michelin walk exhausted (currently `exhausted: true` persists until filter change or 1h idle) | Real product question, not invention | Operator decides: (a) keep current "explicit reset only" behaviour, (b) auto-recycle to venues 1-12 on the tap after exhaustion, (c) show a TMA-side "↺ Start over" button. No action without operator pick. |

### Standing operator-side / non-PR (separate from DF backlog)

| # | Item | Status |
|---|---|---|
| `VIBE_JOURNAL_KEY` env var | Operator-side env-var action (DF-82 closed at v0.60.197) | awaiting operator |
| Rogue commit `46de1c0` *"Update print statement from 'Hello' to 'Goodbye'"* | Sanity-check `git show 46de1c0`; not authored by Claude | awaiting operator |
| `log/Depoly_2053_15-May.MD` | Railway deploy-log artifact (note typo) committed to repo; cleanup optional | operator decision |
| IG pipeline | Stood down per *"Don't build anything yet"* | awaiting green light |
| `/s` cooking-methods dead-code rip | Offered, not approved | awaiting operator |

- **[VERIFICATION (sandbox)]** Doc-only PR. No tests run, no build run. `node --check` not applicable.

- **[STATUS]** Will land on `main` immediately on PR merge; Railway redeploys but the bundle is byte-identical to v0.60.199 (no JS change).

- **[TEST]** None — doc-only.

- **[KNOWN GAPS]** Carry-forward as of this PR is the **Retained** table above: **DF-84, DF-95, DF-96, DF-101**. All other DF-prefixed identifiers from prior journals are either Closed or Dropped as recorded above. The DF-V series is fully retired.

## Confirmation Gates

| Gate | Authority | Stamp |
|---|---|---|
| G1 — version bump | _N/A — doc-only. `package.json` stays at 0.60.199._ | n/a |
| G2 — destructive action | _None. Prior journals untouched; this entry adds the Closed/Dropped tables per AU Recipe ("preserve removed content")._ | n/a |
| G3 — new decision rule | _Operator: speculative DFs should never be carried; observational DFs should be closed unless a real signal arises. From this PR forward, only Retained-style items belong in `[KNOWN GAPS]`._ | operator |
| G4 — paid external API call | _None._ | n/a |

## Amendments

(None. v0.60.199 (#166) is the prior entry. No code state changed by this PR.)

## Deleted

(Nothing physically deleted from the repo. Prior journals' `[KNOWN GAPS]` sections retain their original DF lists verbatim — the Dropped/Closed status is recorded only here.)
