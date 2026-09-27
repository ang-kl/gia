# CLAUDE.md

> **Lean orchestrator for Claude Code.** This file is read on every session start.
> For full contract, decision rules, worked examples, and protocol detail, see `CLAUDE-FULL.md` in the same folder.

```yaml
contract:
  version: 0.0.4
  reader_primary: claude-code
  reader_secondary: human-lead
  last_updated: 27-04 '26 07:34 SGT
  enforcement: strict
  fallback_document: CLAUDE-FULL.md
  template_neutral: true
```

---

## 1. TWO-TIER READ PROTOCOL

```yaml
on_session_open:
  step_1: read this CLAUDE.md
  step_2: locate eight Folder Templates listed in §3
  step_3_per_folder:
    if Folder/<Folder>.md exists:
      use it as the template skeleton for new content this session
    else:
      open CLAUDE-FULL.md and read the corresponding section
      surface to Human Lead: "Template <Folder>.md missing - using CLAUDE-FULL fallback"
  step_4: ask Human Lead: "Which project? Confirm date and time."
  step_5: fetch anchor time per §6 (Rule TF-6 mandatory)
  step_6: read .serial-state.yml at doc/.serial-state.yml
```

**Rule R-1:** Folder templates are the primary reference. `CLAUDE-FULL.md` is the fallback for missing templates or deeper context.

**Rule R-2:** Claude Code MUST NOT proceed past step 5 without anchor time confirmed.

---

## 2. FOLDER STRUCTURE

```
<project-root>/
└── doc/
    ├── CLAUDE.md            # this file - lean orchestrator
    ├── CLAUDE-FULL.md       # comprehensive contract, fallback reference
    ├── Builder/
    │   ├── Builder.md       # template skeleton
    │   └── builder-<v>-<d>.md   # versioned content (created by copying template)
    ├── Persona/
    │   ├── Persona.md       # template
    │   └── persona-<v>-<d>.md
    ├── Feature/
    │   ├── Feature.md       # template
    │   └── feature-<v>-<d>.md
    ├── Technical/
    │   ├── Technical.md     # template
    │   └── technical-<v>-<d>.md
    ├── Legal/
    │   ├── Legal.md         # template
    │   └── legal-<v>-<d>.md
    ├── Journal/
    │   ├── Journal.md       # template
    │   └── journal-<v>-<d>.md
    ├── Chat/
    │   ├── Chat.md          # template
    │   └── chat-<v>-<d>.md
    ├── Register/
    │   ├── Register.md      # template
    │   └── register-<v>-<d>.md
    └── Archive/             # superseded files; Archive itself has no template
```

---

## 3. FOLDER TEMPLATES INDEX

| # | Template path | Purpose | Accumulation form (per §4 Recipe) |
|---|---|---|---|
| 1 | `Builder/Builder.md` | Builder Lens, Framework, Persona patterns | add + amendment, no deletion |
| 2 | `Persona/Persona.md` | Living capability profile of Human Lead | add + amendment, no deletion |
| 3 | `Feature/Feature.md` | Full and summary feature documentation | add + amendment + Removed table at end |
| 4 | `Technical/Technical.md` | Stack, functions, budgets, build constraints | add + amendment + Deprecated table at end |
| 5 | `Legal/Legal.md` | Disclaimer, data sources, jurisdiction notes | add + amendment, no deletion |
| 6 | `Journal/Journal.md` | Chronological build record with HDR blocks | three sections: New / Amendments / Deleted |
| 7 | `Chat/Chat.md` | Serial-numbered chat exchange log | append-only chronological |
| 8 | `Register/Register.md` | Open items, known issues, deferred, decisions, completed | items move between sections, never deleted |

---

## 4. THE RECIPE (Authenticity Protocol)

**Compression is the enemy of authenticity. Every versioned file MUST add to the previous version. It MUST NOT amend, compress, remove, reframe, or rewrite prior content. When content is superseded or removed, the prior content is preserved in-file with rationale.**

```yaml
recipe:
  AU-1:
    rule: document_updates_must_add_to_prior_content_never_replace_or_compress
    enforcement: strict
    applies_to: all_eight_document_types

  AU-2:
    rule: when_content_is_removed_it_is_preserved_in_a_Removed_or_Deprecated_table
    location: end_of_file_not_inline
    columns: [number, item, original_version, removed_in_version, removal_date, reason, replacement, rule_reference, serial_number]

  AU-3:
    rule: builder_persona_legal_documents_allow_add_and_amendment_only
    no_deletion: true
    rationale: these_documents_are_permanent_records_including_what_was_learned_wrongly

  AU-4:
    rule: chat_is_append_only_chronological
    no_edits_to_prior_turns: true
    no_condensation: true

  AU-5:
    rule: journal_uses_three_sections
    sections: [New, Amendments, Deleted]
    note: Deleted_section_preserves_deleted_content_verbatim_with_rationale

  AU-6:
    rule: removal_of_any_kind_requires_Confirmation_Gate_G2_destructive_action
    surface_to: human_lead
    default: no

  AU-7:
    rule: amendments_quote_prior_content_verbatim_then_append_change_with_rationale_and_serial_number
    rationale: trace_must_be_readable_top_to_bottom_without_consulting_archive
```

### 4.1 Per-Type Accumulation Form

| Document type | New content | Amendments | Deletions |
|---|---|---|---|
| Builder | append new patterns | quote prior verbatim, append change | NOT ALLOWED |
| Persona | append new ratings/observations | quote prior verbatim, append change | NOT ALLOWED |
| Feature | append new features | quote prior verbatim, append change | move to Removed table at EOF |
| Technical | append new decisions | quote prior verbatim, append change | move to Deprecated table at EOF |
| Legal | append new clauses | quote prior verbatim, append change | NOT ALLOWED |
| Journal | New section | Amendments section quotes prior verbatim | Deleted section preserves verbatim |
| Chat | append exchange in order | NOT ALLOWED | NOT ALLOWED |
| Register | items in Open section | items move to Decisions/Completed | items move to Deferred, never deleted |

### 4.2 Removed/Deprecated Table Format (end-of-file standard)

```markdown
## Removed Features (or "Deprecated Decisions" for Technical)

| # | Item | Original Version | Removed in Version | Removal Date (DD-MM 'YY) | Reason | Replacement | Rule Reference | Serial № |
|---|------|------------------|--------------------|--------------------------|--------|-------------|----------------|----------|
| 1 | <verbatim feature name> | 1.0.0 | 1.2.0 | 15-04 '26 | <reason> | <replacement or "none"> | R### or AU-X | (№ N - <stamp>) |
```

**Rule AU-EOF:** The Removed/Deprecated table is positioned at the end of the file, after all active content. Never inline mid-document.

---

## 5. SERIAL NUMBER PROTOCOL (summary)

```
(№ #,##0 - DD-MM 'YY HH:MM TZ)
```

- Single digits unpadded (1-9). Thousands separated by comma.
- TZ default: SGT. Resolution chain in CLAUDE-FULL §5.1.
- Counters tracked in `doc/.serial-state.yml`.
- Every chat reply, every commit, every build, every document update MUST begin with the serial number on its own line.

**For full counter reset rules, see CLAUDE-FULL §3.**

---

## 6. TIME ANCHOR PROTOCOL (summary)

**Rule TF-1:** Anchor time MUST be fetched on the first response of each session.

**Rule TF-6:** Live fetch is mandatory on first response, regardless of conversational context.

**Rule TF-7:** If drift > 5 min detected, stop, surface, log, re-anchor, continue.

**Rule TF-9:** Two runtimes:
- **Claude Code terminal:** curl/sntp/ntpdate to sovereign or NTP sources
- **Assistant chat:** ask Human Lead to paste API URL OR state device clock

**Rule TF-10:** Sensor APIs return reading time, not server time. Treat payload timestamps as lower bounds on now.

**For full TF-1 to TF-10, source list, runtime decision tree, see CLAUDE-FULL §5.**

**Singapore primary source (sovereign):**
```
GET https://api.data.gov.sg/v1/environment/air-temperature
parse: items[0].timestamp
```

---

## 7. FILENAME CONVENTION (summary)

```
<type>-<version>-<date>.md

type:    journal | builder | persona | feature | technical | legal | register | chat
version: MAJOR_MINOR_PATCH    (underscores in filenames, dots in document body)
date:    dd_mm_yy-hhmm        (24-hour, no colon)
```

Templates exempt - they keep folder name + .md (e.g. `Builder.md`).

**For full naming convention, see CLAUDE-FULL §2.**

---

## 8. VERSION BUMP RULES (summary)

| Bump | Triggers | Confirmation |
|---|---|---|
| MAJOR | breaking change, data source replacement, architecture rewrite | human_lead required |
| MINOR | new feature, redaction, rename, identity change | human_lead required |
| PATCH | bug fix, copy change, prompt tweak | optional |

**For decision rules R001-R010 (project-specific), see CLAUDE-FULL §6.**

---

## 9. CONFIRMATION GATES (summary)

- **G1:** version bump
- **G2:** destructive action (file deletion, archive move, sed cascade) - default no
- **G3:** new decision rule proposed
- **G4:** external paid API call - default no

**For full gate definitions, see CLAUDE-FULL §8.**

---

## 10. UPKEEP TRIGGERS (summary)

```yaml
on_build_complete:
  - increment build counter in .serial-state.yml
  - generate serial number
  - append entry to Journal/journal-<v>-<d>.md (using Journal.md as template)
  - update Register/register-<v>-<d>.md if items changed

on_session_close:
  - append session entry to Journal with HDR block
  - update Builder if new patterns observed
  - update Persona if capability ratings changed
  - move superseded files to Archive/
  - commit with serial-numbered commit message
```

**For full upkeep matrix, see CLAUDE-FULL §7.**

---

## 11. BOOTSTRAP CHECKLIST FOR NEW PROJECT

1. Confirm project name with Human Lead.
2. Create `doc/` at project root.
3. Copy `CLAUDE.md`, `CLAUDE-FULL.md`, and all eight `<Folder>.md` templates into place.
4. Create empty sub-folders: Builder, Persona, Feature, Technical, Legal, Journal, Chat, Register, Archive.
5. Create `doc/.serial-state.yml` with all counters at 0.
6. Confirm time zone with Human Lead per §6.
7. Fetch anchor time per Rule TF-6.
8. Ask Human Lead which decision rules in CLAUDE-FULL §6.3 apply.
9. Create first journal entry by copying `Journal/Journal.md` to `Journal/journal-0_0_1-<date>.md`, fill, save.
10. Commit with serial-numbered commit message.

---

## 12. END OF LEAN CONTRACT

```yaml
file_end_marker: CLAUDE_MD_v0_0_4_END
fallback_pointer: CLAUDE-FULL.md (v0.0.3, same folder)
```

> **For Human Readers:** This is the lean version. If you want to understand WHY any rule exists, or read the worked example of how time anchor triangulation went wrong and was corrected, open `CLAUDE-FULL.md` in this folder. It is the same content this file points to, but with full reasoning, decision trees, and the §15 case study preserved.

---

## 13. Supplementary surfaces (v0.0.4) — see `CLAUDE-FULL.md` §§16–18

Added in contract v0.0.4 (codifications discovered during the soleat v0.59 → v0.60 arc):

- **§16 Supplementary folders** — `vault/<v>/` snapshot protocol (§16.1), `doc/third-party.yaml` manifest (§16.2), `.vibe-journal/` framework (§16.3).
- **§17 Operational patterns** — seven rules of practice: reproduce-by-reference (§17.1), operator-supplied-copy paste convention (§17.2), doc-system catch-up cadence (§17.3), admin-merge for CI-infra failures (§17.4), cross-team onboarding sequence (§17.5), standing-rules registry (§17.6), vault-prior-known-good (§17.7).
- **§18 Vibe Journal framework** — 5-row tab spec (§18.1), per-tab data sources (§18.2), multi-file + bundled output modes (§18.3), Soleat reference deployment (§18.4), adoption checklist for new projects (§18.5).
