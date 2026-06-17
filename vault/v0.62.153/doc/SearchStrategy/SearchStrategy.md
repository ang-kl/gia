# doc/SearchStrategy — Cuisine TMA Search Decision Tree

A **generated** artifact (like `doc/VibeCodingRecord/`), **not** one of the eight AU doc templates and
**not** under the append-only Recipe. It is the canonical, validated map of how the Cuisine-TMA search
modes compose — the "search tree / mind-map / network" + the "99% strategy" the operator asked for.

## Why this exists

Search precedence used to live **implicitly and scattered** across `index.js` (Michelin early-return,
special-mode gate, durian soft-rating floor-skip, New-pill relax) and the TMA (halal auto-off). Nothing
documented or validated the whole tree, so mode combinations (Michelin + filter, New + durian,
rating + special-mode, combo + Michelin) were fragile — e.g. the JB+durian path. This folder makes the
tree a **single source of truth** that the docs, the hosted diagram, and the tests all read.

## Files

| File | Role |
|---|---|
| `data/search-modes.json` | **Source of truth.** Dimensions, precedence tiers, conflicts, the master tree. |
| `generate.mjs` | Reads the JSON → writes `search-strategy.md` + `../../public/doc/search-strategy.html`. |
| `search-strategy.md` | Generated Markdown view (committed). |
| `../../public/doc/search-strategy.html` | Generated hosted mind-map, served at **`/doc/search-strategy.html`**. Colour-blind-safe (blue/orange, shape-coded — never red/green). |
| `../../__tests__/search-mode-matrix.test.js` | The combination test matrix — asserts every mode × mode outcome against the **real** helpers + `search-precedence.js`, driven off the SAME JSON, so the three can never drift. |

## Regenerate

```bash
node doc/SearchStrategy/generate.mjs
npm test -- --run __tests__/search-mode-matrix.test.js
```

Edit `data/search-modes.json` whenever a precedence rule changes (cite the `index.js` line), then
regenerate + re-test. The matrix test fails loudly if the data file and the real helpers disagree.

## Companion module

`search-precedence.js` (repo root) is the **read-only** executable descriptor of the tree:
`resolveSearchPrecedence(inputs)` returns which mode wins and what each dimension effectively does. The
live route does **not** depend on it (operator declined a hot-path resolver refactor); it exists so the
"99% strategy" is *testable*, and the route MAY log it for observability.
