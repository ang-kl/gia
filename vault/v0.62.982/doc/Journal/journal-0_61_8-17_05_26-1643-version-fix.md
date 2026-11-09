(№ 219 - 17-05 '26 16:43 SGT) v0.61.8

# Journal — soleat v0.61.8 (version-numbering correction)

> Operator: *"Version numbers are wrong, still 0.60.# … Redo the following document and
> filenames"* — supplying the corrected HDR → version mapping for entries #205–#211.

## New

### [HDR] #212 | 16:43:00 SGT 17-05-26 | v0.61.8 — renumber the v0.61.2–v0.61.8 arc to a single 0.61.x PATCH sequence | 10 files | 1 PR | 0 builds |

- **[INTENT]** This session's map-review work (Journal #205–#211) was version-bumped as MINOR
  releases — `0.62.0`, `0.63.0`, `0.63.1`, `0.64.0`, `0.65.0`, `0.66.0`, `0.66.1`. The operator
  directed that the whole arc is one feature line and must instead be a single **`0.61.x` PATCH
  sequence**: #203 = 0.61.0, #204 = 0.61.1, then #205–#211 = 0.61.2 … 0.61.8.

- **[DELTA]**
  - **`doc/Journal/`** — seven journal files renamed (`git mv`, history preserved) and their
    contents corrected:
    | Entry | Old version → file | New version → file |
    |---|---|---|
    | #205 | 0.62.0 · `journal-0_62_0-…1300.md` | 0.61.2 · `journal-0_61_2-…1300.md` |
    | #206 | 0.63.0 · `journal-0_63_0-…1320.md` | 0.61.3 · `journal-0_61_3-…1320.md` |
    | #207 | 0.63.1 · `journal-0_63_1-…1508.md` | 0.61.4 · `journal-0_61_4-…1508.md` |
    | #208 | 0.64.0 · `journal-0_64_0-…1520.md` | 0.61.5 · `journal-0_61_5-…1520.md` |
    | #209 | 0.65.0 · `journal-0_65_0-…1525.md` | 0.61.6 · `journal-0_61_6-…1525.md` |
    | #210 | 0.66.0 · `journal-0_66_0-…1532.md` | 0.61.7 · `journal-0_61_7-…1532.md` |
    | #211 | 0.66.1 · `journal-0_66_1-…1616.md` | 0.61.8 · `journal-0_61_8-…1616.md` |
  - Inside each file: the serial line, the `# Journal — soleat` heading, the `[HDR]` line, the
    `[DELTA]` `package.json` bump line, the `[STATUS]` cross-references and the G1 gate row were
    updated to the new versions; the five entries previously marked **MINOR** are now **PATCH**
    (the arc is all PATCH increments off 0.61.1).
  - **`package.json`** — `version` corrected `0.66.1 → 0.61.8`.
  - **`doc/.serial-state.yml`** — the per-version counter comments relabelled to the 0.61.x
    sequence; the stale "0.63.0 skips 0.62.x — concurrent lineage" note removed.
  - #203 (`journal-0_61_0`) and #204 (`journal-0_61_1`) were already correct — untouched.

- **[VERIFICATION (sandbox)]**

  ```bash
  $ node -e 'JSON.parse(... package.json)'   → version 0.61.8
  $ grep -r '0.6[2-6].[0-9]' doc/Journal/journal-0_61_*  → no stale versions
  $ npm test -- --run                         → 1924 passed (1924)  (no code change)
  ```

- **[STATUS]** STAGED → merges via this docs-only PR. No code, no build artefacts changed; the
  TMA bundles are unaffected.

- **[TEST]** N/A — documentation correction only.

- **[KNOWN GAPS]**
  - The GitHub PR titles / squash-commit messages for #489–#493 still read `v0.63.1`…`v0.66.1`
    (immutable git history) — only the in-repo docs + `package.json` are corrected.
  - `doc/Chat/` holds only the template `Chat.md`; no chat log has been kept for this session's
    PRs (the Journal is the serial-numbered record).

## Amendments

Per Rule AU-7 this entry records that Journal entries **#205–#211** were amended in place — the
version strings only — under explicit operator direction (*"Redo the following document and
filenames"*). The prior (incorrect) versions are preserved in the mapping table above and in
git history. No `[INTENT]` / `[DELTA]` substance of those entries was changed.

## Deleted

(Nothing deleted — the seven journal files were renamed, not removed; git history is intact.)
