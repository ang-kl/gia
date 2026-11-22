# Journal Template

> Per CLAUDE.md §3: chronological build record with HDR blocks. Per §4.1: three sections — New / Amendments / Deleted.

Versioned files: `journal-<v>-<d>.md`. Copy this template to bootstrap a new entry.

Filename convention: `journal-<MAJOR_MINOR_PATCH>-<dd_mm_yy-hhmm>.md`.
Serial first line: `(№ <counter> - DD-MM 'YY HH:MM TZ)`.

---

## New

### [HDR] #<counter> | HH:MM:SS TZ DD-MM-YY | v<MAJOR.MINOR.PATCH> | <kb> | <lines>

- **[INTENT]** Why this version exists. Quote the Human Lead's words verbatim where relevant.
- **[DELTA]** What changed, file by file. Use bullet sublists for non-trivial changes.
- **[VERIFICATION (sandbox)]** Code blocks showing the lint/build/test output proving the change compiles + behaves.
- **[STATUS]** PROD | STAGED | DRAFT — and how it deploys.
- **[TEST]** Reproducible steps a user (or Human Lead in person) can run to confirm the change.
- **[KNOWN GAPS]** What this version did NOT solve. Decisions deferred. Trade-offs accepted.

---

## Confirmation Gates Satisfied

| Gate | Authority | Stamp |
| :--- | :--- | :--- |
| G1 — version bump (major / minor / patch) | _human_lead per §8 rules_ | DD-MM 'YY |
| G2 — destructive action (only if applicable) | _human_lead "<verbatim quote>"_ | DD-MM 'YY |
| G3 — new decision rule (only if applicable) | _proposal accepted_ | DD-MM 'YY |
| G4 — paid external API call (only if applicable) | _within quota; documented_ | DD-MM 'YY |

## Amendments

Quote prior content verbatim, then append change with rationale + serial number. AU-7.

(none) — or list amendments here.

## Deleted

Per AU-5: preserve deleted content verbatim with rationale. AU-2: corresponding rows go in the Removed table of the relevant Feature/Technical/Register file.

(none) — or list deletions here with verbatim originals.
