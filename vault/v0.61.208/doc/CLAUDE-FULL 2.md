# CLAUDE.md

> **Purpose:** Master orchestrator file for Claude Code. Defines documentation upkeep, version control, file naming, serial number protocol, time fetch protocol, and decision rules for any project that adopts this template.
>
> **Reader priority:** (1) Claude Code (machine-readable instructions), (2) Human Lead (interpretive guidance).
>
> **Template scope:** Project-name-agnostic. Replace `<project-name>` placeholders at adoption.

---

## 0. CONTRACT

```yaml
contract:
  version: 0.0.4
  owner: <human-lead-name>
  reader_primary: claude-code
  reader_secondary: human-lead
  template_neutral: true
  last_updated: 15-05 '26 09:15 SGT
  last_anchor_source: claude_v0_60_177_claudefull_codify_supplementary_folders_plus_seven_patterns
  enforcement: strict
  changelog:
    - version: 0.0.1
      date: 28-04 '26 22:46 SGT
      change: initial draft (anchor stamp later proven incorrect by 1 day, see §15)
    - version: 0.0.2
      date: 29-04 '26 07:11 SGT
      changes:
        - A1_added_doc_parent_folder_to_structure
        - A2_added_time_nist_gov_to_fallback_chain
        - A3_added_rule_TF_6_mandatory_live_fetch_on_first_response
        - A4_added_rule_TF_7_self_correction_protocol_for_drift
      note: anchor stamp later proven incorrect by 2 days, see §15
    - version: 0.0.3
      date: 27-04 '26 07:29 SGT
      changes:
        - A5_corrected_anchor_via_data_gov_sg_sovereign_triangulation
        - A6_added_rule_TF_9_runtime_aware_fallback_assistant_chat_vs_claude_code
        - A7_added_NEA_data_gov_sg_endpoints_as_named_primary_for_SG_projects
        - A8_added_section_15_triangulation_worked_example
        - A9_added_rule_TF_10_sensor_cache_lag_aware_API_consumption
    - version: 0.0.4
      date: 15-05 '26 09:15 SGT
      changes:
        - A10_added_section_16_supplementary_folders_codified_during_soleat_v0_60_arc
        - A11_added_section_17_operational_patterns_seven_codifications_from_the_arc
        - A12_added_section_18_vibe_journal_framework_convention
      prior_archived_at: doc/Archive/CLAUDE-FULL-0.0.3-15_05_26.md
```

**Strict enforcement means:** Claude Code MUST refuse to proceed when a rule below is violated, and MUST surface the violation to the Human Lead before continuing.

---

## 1. FOLDER STRUCTURE

```
<project-root>/
└── doc/
    ├── CLAUDE.md                # this file - master orchestrator
    ├── Builder/                 # builder-lens, builder-framework, builder-persona
    ├── Persona/                 # persona profiles per session or per role
    ├── Feature/                 # feature-full, feature-summary
    ├── Technical/               # technical specifications, API references, build constraints
    ├── Legal/                   # legal notice, licensing, data source attribution
    ├── Journal/                 # build journal, chronological session record
    ├── Chat/                    # session logs with serial-numbered exchanges
    ├── Register/                # project register: open items, known issues, deferred, decisions
    └── Archive/                 # superseded versions retained for traceability
```

**Rule F-1:** All documentation lives under `<project-root>/doc/`. Source code lives outside `doc/`.

**Rule F-2:** Each sub-folder under `doc/` holds one or more `.md` files following the naming convention in §2.

**Rule F-3:** No `.md` file lives at `doc/` root except `CLAUDE.md`, `README.md`, and `LICENSE.md`.

**Rule F-4:** When a new file type emerges that does not fit existing sub-folders, Claude Code MUST ask the Human Lead before creating a new sub-folder.

**Rule F-5:** `.serial-state.yml` (per §3.2) lives at `doc/.serial-state.yml`.

---

## 2. FILENAME CONVENTION

```
<type>-<version>-<date>.md
```

| Token | Format | Example |
|---|---|---|
| `<type>` | one of: `journal`, `builder`, `persona`, `feature`, `technical`, `legal`, `register`, `chat` | `journal` |
| `<version>` | semantic version with underscore separators: `MAJOR_MINOR_PATCH` | `2_0_5` |
| `<date>` | `dd_mm_yy-hhmm` (24-hour clock, no colon, time zone implicit per §5) | `27_04_26-0729` |

**Examples:**

```
journal-2_0_5-08_04_26-1504.md
builder-0_0_1-27_04_26-0729.md
technical-2_0_5-01_04_26-1504.md
legal-2_0_0-24_03_26-0745.md
chat-0_0_1-27_04_26-0729.md
register-2_0_5-08_04_26-1504.md
```

**Rule N-1:** Time uses 24-hour format with no colon (macOS and Windows filename safety).

**Rule N-2:** Version segments use underscore, never dot, in filenames.

**Rule N-3:** When a file is superseded, the prior version moves to `doc/Archive/` unchanged. Never overwrite.

**Rule N-4:** `CLAUDE.md` itself is exempt from this convention because Claude Code auto-loads `CLAUDE.md` at session start.

---

## 3. SERIAL NUMBER PROTOCOL

**Scope:** Applies broadly to every commit message, every build artefact label, every document update header, and every chat exchange logged under `doc/Chat/`.

### 3.1 Syntax

```
(№ #,##0 - DD-MM 'YY HH:MM TZ)
```

| Component | Rule |
|---|---|
| `№` | unicode numero sign U+2116, literal |
| `#,##0` | integer counter; single digits 1-9 unpadded; thousands separated by comma (e.g. `1,000`, `12,345`) |
| `DD-MM 'YY` | day-month-year, two digits each, year prefixed with apostrophe |
| `HH:MM` | 24-hour time with colon |
| `TZ` | IANA-derived short label (e.g. `SGT`, `JST`, `UTC`, `PST`); see §5 |

**Examples:**

```
(№ 1 - 27-04 '26 07:29 SGT)
(№ 47 - 13-03 '26 19:00 SGT)
(№ 1,234 - 01-04 '26 15:04 SGT)
```

### 3.2 Counter Reset Rules

| Context | Reset trigger |
|---|---|
| Chat session log (`doc/Chat/`) | counter starts at 1 on first message of each new chat session; resets per session |
| Commit messages | counter is the cumulative commit number; never resets |
| Build artefacts | counter is the cumulative build number; never resets |
| Document update header | counter is the cumulative update number for that specific document; never resets |

**Rule S-1:** Every chat reply, every commit, every build, every document update MUST begin with the serial number on its own line before any other content.

**Rule S-2:** Counters MUST be tracked in a hidden file `doc/.serial-state.yml`:

```yaml
counters:
  commit: 0
  build: 0
  documents:
    journal: 0
    builder: 0
    persona: 0
    feature: 0
    technical: 0
    legal: 0
    register: 0
sessions:
  current_chat_id: <uuid-or-date-stamp>
  current_chat_counter: 0
last_anchor_time: <DD-MM_YY HH:MM TZ>
last_anchor_source: <worldtimeapi | time.is | timeanddate | nist | nea_data_gov_sg | user_stated_device | user_stated_required_due_to_runtime_constraint>
last_anchor_iso8601: <YYYY-MM-DDTHH:MM:SS+TZ:00>
last_anchor_utc: <YYYY-MM-DDTHH:MM:SSZ>
```

**Rule S-3:** Claude Code MUST read `doc/.serial-state.yml` before generating any new serial number, increment the appropriate counter, and write back atomically.

**Rule S-4:** If `doc/.serial-state.yml` is missing, Claude Code MUST recreate it from the highest serial number found in `doc/Chat/`, `doc/Journal/`, and git log, then ask the Human Lead to confirm before proceeding.

---

## 4. SERIAL NUMBER PARAGRAPH TAGGING

**Scope:** Applies to chat session logs (`doc/Chat/`) and any narrative `.md` file where paragraph-level reference is needed.

### 4.1 Syntax

```
[§X.Y]
```

| Component | Rule |
|---|---|
| `§` | section sign U+00A7 |
| `X` | response serial number for that session |
| `Y` | paragraph index within that response, starting at 1 |

**Example:** the second paragraph of response 3 ends with `[§3.2]`.

**Rule T-1:** Every substantive paragraph, numbered point, or bullet in a chat response MUST end with `[§X.Y]`.

**Rule T-2:** Single-line transactional replies (e.g. confirmations to `??` or `!!` shorthand) are exempt.

---

## 5. TIME ZONE AND TIME FETCH PROTOCOL

### 5.1 Time Zone Resolution

```yaml
resolution_chain:
  step_1: user_stated_zone_in_current_conversation
  step_2: default_SGT_Asia_Singapore
  step_3_trigger: travel_or_VPN_signalled_without_zone
  step_3_action: ask_once "Which time zone for this session?"
```

**Rule TZ-1:** Claude Code MUST resolve time zone in the order above. Skip to next step only if prior step yields no value.

**Rule TZ-2:** TZ short labels MUST map to IANA zones:

```yaml
tz_map:
  SGT: Asia/Singapore       # UTC+08:00, no DST
  JST: Asia/Tokyo           # UTC+09:00, no DST
  KST: Asia/Seoul           # UTC+09:00, no DST
  HKT: Asia/Hong_Kong       # UTC+08:00, no DST
  ICT: Asia/Bangkok         # UTC+07:00, no DST
  WIB: Asia/Jakarta         # UTC+07:00, no DST
  AEDT: Australia/Sydney    # UTC+11:00 in DST
  NZDT: Pacific/Auckland    # UTC+13:00 in DST
  IST: Asia/Kolkata         # UTC+05:30, no DST
  GST: Asia/Dubai           # UTC+04:00, no DST
  CET: Europe/Paris         # UTC+01:00
  CEST: Europe/Paris        # UTC+02:00 in DST
  BST: Europe/London        # UTC+01:00 in DST
  GMT: Europe/London        # UTC+00:00
  UTC: UTC                  # UTC+00:00
  EDT: America/New_York     # UTC-04:00 in DST
  EST: America/New_York     # UTC-05:00
  CDT: America/Chicago      # UTC-05:00 in DST
  CST: America/Chicago      # UTC-06:00
  MDT: America/Denver       # UTC-06:00 in DST
  MST: America/Denver       # UTC-07:00
  PDT: America/Los_Angeles  # UTC-07:00 in DST
  PST: America/Los_Angeles  # UTC-08:00
```

### 5.2 Time Fetch Sources

```yaml
primary_sources_global:
  - endpoint: https://worldtimeapi.org/api/timezone/{IANA}
    parse_field: datetime
    authority: A_NTP_synced_upstream
  - endpoint: https://timeapi.io/api/Time/current/zone?timeZone={IANA}
    parse_field: dateTime
    authority: A_NTP_synced_upstream

primary_sources_singapore_context:
  - endpoint: https://api.data.gov.sg/v1/environment/air-temperature
    parse_field: items[0].timestamp
    authority: A_plus_plus_sovereign_NEA_Singapore_Government
    caveat: see_rule_TF_10_sensor_cache_lag
  - endpoint: https://api.data.gov.sg/v1/environment/psi
    parse_field: items[0].update_timestamp
    authority: A_plus_plus_sovereign_NEA_Singapore_Government
    caveat: see_rule_TF_10_sensor_cache_lag
  - endpoint: https://data.gov.sg/datasets/{dataset_id}/view
    parse_field: server_rendered_citation_Retrieved_date
    authority: A_plus_sovereign_server_render_date_only_no_time

fallback_chain_global:
  - https://time.is/{location}
  - https://www.timeanddate.com/worldclock/{location}
  - https://time.nist.gov                      # NIST Internet Time Service
  - https://time.cloudflare.com                # Cloudflare Roughtime over HTTP
  - https://www.npl.co.uk/time                 # UK National Physical Laboratory

forbidden_sources:
  - ip2location.com
  - whoer.net
  - iplocation.net
  - any_IP_geolocation_service

note_on_NTP:
  protocol: NTP_port_123_UDP
  status: not_reachable_from_assistant_chat_runtime
  status_in_claude_code_terminal: reachable_via_sntp_or_ntpdate
  upstream_sync: all_HTTP_fallbacks_are_NTP_synced_at_source

note_on_web_fetch_in_assistant_chat:
  observed_behavior: cached_HTML_returned_not_live_clock_widget
  cause: fetcher_does_not_execute_JavaScript_clocks_render_client_side
  consequence: time_is_and_timeanddate_HTML_responses_can_be_days_or_months_stale
  reliable_when: endpoint_returns_server_generated_timestamp_in_static_HTML_or_JSON
```

**Rule TF-1:** Anchor time MUST be fetched on the first response of each session.

**Rule TF-2:** Subsequent responses increment by elapsed turns using local clock arithmetic from the anchor.

**Rule TF-3:** Re-fetch is REQUIRED when:
- session exceeds 30 minutes since last anchor, OR
- session crosses local midnight in the resolved time zone

**Rule TF-4:** IP geolocation services are PROHIBITED for time resolution. They infer location from network metadata and may leak builder location.

**Rule TF-5:** If primary and all fallback sources fail, Claude Code MUST surface the failure to the Human Lead and ask for a manually stated time before proceeding.

**Rule TF-6:** Claude Code MUST execute live time fetch on the FIRST RESPONSE of every new session, regardless of any prior serial numbers visible in conversation context. Conversational continuity is not a substitute for time fetch. The first response is defined as: the first reply Claude Code generates after a session start, a context window reload, or a session resumption from saved state.

**Rule TF-7 (Self-Correction Protocol):** When a prior serial number in the same session is found to have drifted from live time by more than 5 minutes, Claude Code MUST:
1. Stop further work
2. Surface the drift to the Human Lead with the format: `Drift detected: prior serial (№ X - <stamp>) vs live (№ X - <corrected-stamp>). Drift: <N> minutes. Re-anchoring.`
3. Log a correction entry in `doc/Journal/` with the prior incorrect stamp, the corrected stamp, and the cause (e.g. midnight crossing not refetched, anchor never set, conversational drift)
4. Re-anchor `last_anchor_time` in `.serial-state.yml`
5. Use the corrected time for all subsequent serial numbers in the session

**Rule TF-8:** When the Human Lead provides a time stamp directly in conversation (per §5.1 step 1), that user-stated time becomes the authoritative anchor IF AND ONLY IF no live sovereign fetch is available. When a live sovereign fetch is available and disagrees with user-stated time by more than 5 minutes, surface the discrepancy and ask the Human Lead which to seal as anchor. Source label in `.serial-state.yml` is set to `user_stated_device` or `nea_data_gov_sg` accordingly.

**Rule TF-9 (Runtime-Aware Fallback):** Claude operates in two distinct runtimes with different fetch capabilities:

```yaml
runtime_A_claude_code_terminal:
  fetch_method: shell_curl_or_sntp
  primary: curl -s https://api.data.gov.sg/v1/environment/air-temperature | jq .items[0].timestamp
  fallback_1: curl -s https://worldtimeapi.org/api/timezone/Asia/Singapore | jq .datetime
  fallback_2: sntp -t 5 time.nist.gov
  fallback_3: sntp -t 5 time.cloudflare.com
  fallback_4: ntpdate -q sg.pool.ntp.org
  triangulation_required_when: any_two_sources_disagree_by_more_than_60_seconds
  user_stated_required_when: all_above_fail
  expected_success_rate: high

runtime_B_assistant_chat:
  fetch_method: web_fetch_with_URL_whitelist
  constraint: fetcher_only_accepts_URLs_pasted_by_user_or_returned_in_search_results
  primary: ask_human_lead_to_paste_the_URL_in_chat_then_fetch
  fallback_1: parse_server_rendered_date_from_data_gov_sg_or_similar_static_HTML_pages
  fallback_2: ask_human_lead_for_current_device_time
  observed_failure_modes:
    - web_search_snippets_are_cached_can_be_days_old
    - web_fetch_returns_static_HTML_not_JS_rendered_clocks
    - container_bash_clock_is_sandboxed_and_unreliable
    - assistant_training_priors_drift_by_days_or_weeks
  authoritative_source: user_stated_device_clock_OR_user_pasted_API_endpoint
  expected_success_rate: medium - requires_user_collaboration

decision_tree:
  if runtime == claude_code_terminal:
    apply_runtime_A_chain
  elif runtime == assistant_chat:
    apply_runtime_B_chain
    if all_fail:
      label_anchor user_stated_required_due_to_runtime_constraint
```

**Rule TF-10 (Sensor Cache Lag Awareness):** When consuming sovereign sensor APIs (NEA, MOM weather stations, similar), Claude Code MUST distinguish:
- `timestamp` field: time of the **most recent sensor reading** (lags real time when sensor is cached, throttled, or paused)
- `update_timestamp` or `lastUpdatedAt` field: time the **API or dataset was last refreshed** (lags real time by API refresh interval)
- Server-rendered page citation: time the **HTTP request was processed** (closest to real time of any field returned)

When using sensor APIs as time sources, prefer the **server response Date header** over any payload field. When server Date header is unavailable, prefer the freshest field (`update_timestamp` over `timestamp`). Treat all payload timestamps as **lower bounds** on current time, never upper bounds.

---

## 6. VERSION CONTROL RULES

### 6.1 Version Format

Semantic versioning with underscore in filenames, dot in document body and code:

```
filename:  2_0_5
in-doc:    2.0.5
```

### 6.2 Version Bump Decision Rules

```yaml
bump_decision:
  major:
    triggers:
      - breaking_API_change
      - data_source_replacement
      - architecture_rewrite
    confirmation_required: human_lead

  minor:
    triggers:
      - new_feature_added
      - data_redaction_across_data_embedded_UI
      - tool_rename
      - new_data_source_integration
      - identity_change
    confirmation_required: human_lead

  patch:
    triggers:
      - bug_fix
      - copy_change
      - prompt_tweak
      - dependency_pin_update
    confirmation_required: human_lead_optional
```

### 6.3 Decision Rules - Project A Lineage (takearoundabout.com)

```yaml
rules:
  R001:
    name: redaction_across_data_embedded_UI
    if: organisation_names_replaced_throughout_data_embedded_dashboard
    then: bump_minor_not_patch
    rationale: redaction_changes_public_identity_warrants_version_identity_change
    source: builder-framework Session 6 28-03-26
    confirmation: human_lead_required

  R002:
    name: sed_cascade_corruption
    if: sed_replacement_with_overlapping_numeric_or_token_pairs_executed_in_sequence
    then: restore_from_last_known_good_zip_before_continuing
    rationale: cascading_substitutions_corrupt_originals_silently
    source: builder-framework v2 build day 23-03-26
    confirmation: human_lead_required_for_restore

  R003:
    name: multi_file_version_consistency
    if: version_bump_triggered
    then: update_all_of [App.jsx_line_1, index.html_title, README.md_heading_and_version]
    rationale: redaction_passes_on_one_file_do_not_cover_others
    source: builder-framework Session 6 28-03-26
    confirmation: human_lead_review_diff

  R004:
    name: plural_before_singular_sed
    if: sed_replacement_with_plural_singular_pair
    then: execute_plural_form_first
    example: UNIONS_to_FORCES_before_UNION_to_FORCE
    rationale: singular_first_double_hits_plural_producing_FORCESS
    source: builder-framework Session 6 28-03-26
    confirmation: residual_count_must_verify_zero_before_packaging

  R005:
    name: grep_before_packaging
    if: deployment_zip_about_to_be_created
    then: grep_for_critical_globals_in_App.jsx
    list: [C, LEVELS, PERSONA_CONFIG, claudeCall, extractJSON, searchOccupations, getSkills, rateSkills, getEscoSkills, escoUri, escoDescription, reuseLevel, altLabels]
    rationale: chat_compaction_silently_removes_module_level_constants
    source: builder-lens v2 build day 23-03-26
    confirmation: missing_constant_blocks_packaging

  R006:
    name: vite_v5_jsx_async_arrow
    if: multi_line_async_arrow_function_used_as_JSX_prop
    then: extract_to_named_function_above_return_statement
    rationale: vite_v5_esbuild_rejects_multi_line_async_arrow_in_JSX_props
    source: builder-framework v2 24-03-26
    confirmation: not_required_pattern_is_deterministic

  R007:
    name: non_ASCII_in_JSX
    if: em_dash_or_en_dash_or_dagger_or_triangle_or_arrow_in_JSX_string_literal
    then: replace_with_ASCII_equivalent_before_packaging
    rationale: esbuild_parse_failure_even_inside_quoted_strings
    source: builder-framework wfg-plans Session 4 26-03-26
    confirmation: not_required_pattern_is_deterministic

  R008:
    name: vercel_MIME_error_root_cause
    if: vercel_serves_text_html_MIME_for_javascript_request
    then: diagnose_npm_run_build_locally_first
    do_not: modify_vercel.json_routing_until_local_build_passes
    rationale: MIME_error_is_downstream_symptom_of_failed_build_not_routing_config
    source: builder-framework wfg-plans Session 4 26-03-26
    confirmation: human_lead_review_build_log

  R009:
    name: deploy_zip_filename_stability
    if: project_uses_terminal_deploy_workflow_with_fixed_filename
    then: never_serialise_zip_filename_with_version_or_date
    rationale: lead_runs_terminal_commands_must_not_retype_filenames
    source: builder-framework Section 8 wfg-plans Session 5 26-03-26
    confirmation: human_lead_required_to_change_zip_filename

  R010:
    name: document_update_method
    if: documentation_update_required
    then: unpack_then_append_XML_then_repack
    do_not: regenerate_document_from_scratch
    rationale: regeneration_loses_styles_fonts_paragraph_formatting
    source: builder-framework Session 6 28-03-26
    confirmation: human_lead_review_diff
```

**Rule V-1:** Every version bump MUST be reviewed and explicitly confirmed by the Human Lead before commit, except where a rule above marks confirmation as `not_required`.

**Rule V-2:** When a rule fires (`if` clause matches), Claude Code MUST surface the rule ID, the trigger condition, the prescribed action, and request confirmation before executing - except where `confirmation: not_required`.

**Rule V-3:** New decision rules added during a session MUST be appended to §6.3 with a unique R### ID, source attribution, and confirmation gate.

---

## 7. UPKEEP TRIGGERS

```yaml
on_session_open:
  - read doc/CLAUDE.md
  - read doc/.serial-state.yml
  - fetch anchor time per §5.2 (Rule TF-6 mandatory, Rule TF-9 selects runtime chain)
  - ask Human Lead: "Which project? Confirm date and time SGT UTC+8 (or stated zone)."
  - read latest version of: builder, persona, register, journal, technical, feature
  - confirm build file state: head -1 App.jsx and wc -l App.jsx (where applicable)

on_build_complete:
  - increment build counter in doc/.serial-state.yml
  - generate serial number per §3
  - append entry to doc/Journal/journal-<version>-<date>.md
  - update doc/Register/register-<version>-<date>.md if open items changed
  - run §6.3 rule check
  - prompt Human Lead for confirmation gates

on_session_close:
  - append session entry to doc/Journal with HDR block
  - update doc/Builder/builder-<version>-<date>.md if new patterns observed
  - update doc/Persona/persona-<version>-<date>.md if capability ratings changed
  - move superseded files to doc/Archive/
  - commit with serial-numbered commit message

on_document_update:
  - read prior version
  - append delta with serial number
  - never overwrite prior content
  - commit with rule R010 method (unpack-append-repack equivalent for .md is preserve-then-append)
```

**Rule U-1:** Claude Code MUST NOT skip any trigger step. If a step fails, surface the failure and stop.

**Rule U-2:** Every upkeep action MUST produce an audit trail entry in `doc/Journal/`.

---

## 8. CONFIRMATION GATES

```yaml
gates:
  G1_version_bump:
    surface_to: human_lead
    format: "Rule <R-ID> fired: <trigger>. Prescribed: <action>. Confirm? (yes/no/modify)"
    on_no: ask_human_lead_for_alternative
    on_modify: capture_modification_and_log_in_Journal
    on_yes: execute_and_log

  G2_destructive_action:
    triggers:
      - file_deletion
      - archive_move
      - sed_cascade_replacement
      - dependency_removal
    surface_to: human_lead
    format: "About to <action> on <target>. Reason: <reason>. Confirm? (yes/no)"
    default: no

  G3_new_decision_rule:
    triggers:
      - pattern_observed_three_or_more_times_in_session
      - human_lead_states_new_preference
    surface_to: human_lead
    format: "Propose new rule R<next-id>: <description>. Add to CLAUDE.md? (yes/no/modify)"

  G4_external_API_call_with_cost:
    triggers:
      - call_to_paid_API
      - call_that_consumes_quota
    surface_to: human_lead
    format: "About to call <API> with estimated cost <X>. Confirm? (yes/no)"
    default: no
```

**Rule G-1:** When a gate is in `default: no` state, silence is treated as no.

**Rule G-2:** Confirmation responses are logged in `doc/Chat/` with the serial number of the exchange.

---

## 9. DOCUMENT TYPE INDEX

| Type | Purpose | Update frequency | Confirmation gate |
|---|---|---|---|
| `builder` | Lens, framework, persona - how the build is conducted | per session if patterns change | G3 for new patterns |
| `persona` | Living capability profile of Human Lead | per session if ratings change | G3 |
| `feature` | Full and summary feature documentation | per minor or major version bump | G1 |
| `technical` | Stack, functions, token budgets, build constraints | per minor or major version bump | G1 |
| `legal` | Disclaimer, data sources, jurisdiction notes | per legal change only | G1 + human_lead_legal_review |
| `journal` | Chronological build record with HDR blocks | per build, per session close | none (append-only) |
| `register` | Open items, known issues, deferred, decisions | per session if items change | none (append-only) |
| `chat` | Serial-numbered chat exchange log | per chat reply | none (append-only) |

---

## 10. HEADER BLOCK TEMPLATE FOR JOURNAL ENTRIES

```
[HDR] #NNN | HH:MM:SS TZ DD-M-YY | vN.N.N | NNNkb | N,NNN lines
[INTENT] One line - business purpose of this update
[DELTA] Bullet per change - one line each
[RISK] Low / Med / High + one-line reason
[STATUS] ALPHA / BETA / STABLE
[TEST] One line per testable item
[NEXT] One clear action required from Lead
[ADVICE] Prompt technique name + one-line reason
```

**Rule H-1:** Every journal entry MUST use this block.

**Rule H-2:** HDR counter resets per chat session. Cumulative counter is the serial number per §3.

---

## 11. VIOLATION HANDLING

```yaml
on_rule_violation:
  step_1: stop_immediately
  step_2: surface_to_human_lead with rule_id, observed_state, prescribed_state
  step_3: do_not_proceed_until_resolution
  step_4: log_violation_in_Journal_with_serial_number

resolution_options:
  - human_lead_corrects_state_then_resume
  - human_lead_modifies_rule_via_G3
  - human_lead_grants_one_time_exception_logged_in_Journal
```

**Rule X-1:** Exceptions granted via `one_time_exception` MUST be logged with rule ID, reason, and serial number. Three exceptions to the same rule trigger automatic G3 to revisit the rule.

---

## 12. BOOTSTRAP CHECKLIST FOR NEW PROJECT

When this template is adopted by a new project, Claude Code MUST execute in order:

1. Replace `<project-name>` placeholders with the actual project name. **Confirm name with Human Lead first.**
2. Create `doc/` at project root.
3. Create the sub-folder structure under `doc/` per §1.
4. Create `doc/.serial-state.yml` with all counters at 0.
5. Create the first journal entry with serial number 1.
6. Ask Human Lead to confirm time zone per §5.1.
7. Fetch anchor time per §5.2 (Rule TF-6 mandatory, Rule TF-9 selects runtime).
8. Ask Human Lead which decision rules in §6.3 apply to this project. Some are Project A specific.
9. Commit `doc/CLAUDE.md` and folder structure with serial-numbered commit message.

---

## 13. AMENDMENT PROCEDURE

```yaml
amendment:
  who_can_propose: [human_lead, claude_code]
  approval_required: human_lead
  log_location: doc/Journal/
  log_format: serial_numbered_entry_with_diff
  versioning:
    contract_version_in_section_0_bumps_per_amendment_using_section_6_rules
```

**Rule A-1:** Amendments to `CLAUDE.md` itself bump the contract version in §0 per the same rules in §6.

**Rule A-2:** The prior `CLAUDE.md` moves to `doc/Archive/CLAUDE-<prior-version>-<date>.md` before the new version is committed.

---

## 14. END OF CONTRACT

```yaml
file_end_marker: CLAUDE_MD_v0_0_4_END
checksum_required: false_for_v0_0_4
```

---

## 15. WORKED EXAMPLE - TIME ANCHOR TRIANGULATION (27 Apr 2026 Session)

This section preserves a real triangulation episode from the v0.0.1 -> v0.0.3 evolution as a teaching artefact. Future sessions should read it before assuming any time stamp is correct.

### 15.1 The Drift Cascade

| Response | Source | Stamp Claimed | Actual Drift from Truth |
|---|---|---|---|
| 1-3 | Claude assistant priors | 28-04 '26 22:38 SGT | +1 day, +15 hours |
| 4 (user) | User-stated device clock | 29-04 '26 07:11 SGT | +2 days |
| 5 | Web search snippet cache | 27-04 '26 (multiple) | 0 days for date |
| 6 | data.gov.sg page citation | 27-04 '26 (date only) | 0 days |
| 7 | time.is web_fetch (cached HTML) | 22-04 '26 20:58 SGT | -5 days |
| 8 | timeanddate.com web_fetch (cached HTML) | 10-02 '26 12:16 SGT | -76 days |
| 11 | api.data.gov.sg/v1/environment/air-temperature | 25-04 '26 10:15 SGT | -2 days (sensor cache lag, see TF-10) |
| 12 | api.data.gov.sg/v1/environment/psi | 16-04 '26 13:00 SGT | -11 days (sensor cache lag) |
| 13 (user) | User-stated device clock + sovereign date | 27-04 '26 07:29 SGT | 0 (anchor sealed) |

### 15.2 What Each Source Actually Returned

```yaml
assistant_priors:
  reason_for_drift: training_data_distribution_does_not_anchor_to_session_start
  lesson: never_use_priors_as_time_anchor_TF_6_must_fire

user_stated_first_attempt:
  reason_for_drift: human_can_misstate_or_use_planned_future_time
  lesson: user_stated_is_authoritative_only_when_no_sovereign_fetch_available_TF_8

web_search_snippets:
  reason_for_observation: search_engine_indexes_pages_periodically_snippets_carry_index_time
  lesson: search_snippets_indicate_approximate_recency_only

data_gov_sg_page_citation:
  reason_for_accuracy: server_renders_Retrieved_date_at_HTTP_response_time
  lesson: server_rendered_dates_in_static_HTML_are_high_confidence_for_DATE
  caveat: provides_date_only_no_time_of_day

time_is_web_fetch:
  reason_for_drift: page_displays_current_time_via_JavaScript_static_HTML_shows_last_crawl_time
  lesson: any_clock_widget_rendered_client_side_is_invisible_to_web_fetch

timeanddate_web_fetch:
  reason_for_drift: same_as_time_is_with_an_older_cache
  lesson: confirms_pattern_is_systemic_not_a_one_off

nea_air_temperature_API:
  reason_for_drift: sensor_or_cache_layer_lagged_2_days
  lesson: sensor_API_payload_timestamp_is_lower_bound_on_now_not_now_itself_TF_10

nea_psi_API:
  reason_for_drift: hourly_refresh_window_plus_cache_lag
  lesson: hourly_APIs_are_unsuitable_for_minute_precision_anchoring_TF_10

user_stated_device_clock_final:
  reason_for_accuracy: NTP_synced_iOS_or_macOS_or_Android_clock_at_glance_moment
  lesson: when_all_else_fails_or_is_uncertain_user_device_glance_is_authoritative
```

### 15.3 The Sealed Anchor

```yaml
sealed_anchor:
  iso_8601: 2026-04-27T07:29:00+08:00
  utc: 2026-04-26T23:29:00Z
  date_authority: data.gov.sg sovereign page citation (two pages converged)
  time_authority: user_stated_device_clock (response 13)
  combined_confidence: A_plus_for_date_A_for_time_within_1_minute
  iana_zone: Asia/Singapore
  utc_offset: +08:00
  dst: not_observed
  weekday: Monday
```

### 15.4 Rules Distilled From This Episode

- **TF-6 fires unconditionally on first response.** Skipping it caused the entire cascade.
- **TF-7 self-correction worked once invoked.** It surfaced the drift after response 5 and reset the trajectory.
- **TF-9 runtime distinction is essential.** Assistant chat cannot replicate Claude Code terminal fetch capability.
- **TF-10 sensor cache lag is a category of drift that does not exist in pure time-service APIs.** Mixing the two without TF-10 awareness produces false confidence in stale readings.
- **User-pasted URLs unlock the fetcher.** Path B from response 8 turned a blocked endpoint into a working one in a single message.
- **Date and time of day are independent signals with different best sources.** Date is reliably extracted from server-rendered HTML; time of day requires either NTP-synced API or user device glance.

### 15.5 What To Do Next Time

```yaml
on_first_response_of_session:
  step_1: check_runtime
  step_2_if_claude_code:
    execute: curl https://api.data.gov.sg/v1/environment/air-temperature 2>/dev/null
    parse: items[0].timestamp
    triangulate_against: curl https://worldtimeapi.org/api/timezone/Asia/Singapore 2>/dev/null | jq .datetime
    if_disagree_more_than_60_seconds: ask_human_lead
  step_2_if_assistant_chat:
    request_human_lead_paste_URL: "Please paste https://api.data.gov.sg/v1/environment/air-temperature in your next message so I can fetch it."
    if_human_pastes: fetch_and_use_with_TF_10_caveat
    if_human_states_time_directly: use_with_TF_8_authority
    do_not: rely_on_priors_or_search_snippets_or_cached_HTML_clock_widgets
  step_3: write_anchor_to_serial_state.yml
  step_4: emit_serial_number_with_anchor_in_first_response
```

---

> **For Human Readers:** This file is intentionally written for machine parsing first. The structure is rigid because Claude Code reads it on every session start and must produce deterministic behaviour. If you find a rule unclear or unhelpful, propose an amendment via §13. Rules exist to protect the build trail, not to slow you down. §15 is included specifically because experiencing a drift cascade once is informative; experiencing it twice is failure to learn.

---

## 16. SUPPLEMENTARY FOLDERS — codified during the soleat v0.60 arc

> **Status:** Added in contract v0.0.4 (15-05 '26). The eight folder templates in §1 remain canonical for any project adopting the convention. The three folders below are project-discovered patterns that proved their value across the soleat v0.59 → v0.60 arc and are codified here so other projects can inherit them with the same structural guarantees.

### 16.1 `vault/<version>/` — frozen reproducible snapshots

```yaml
vault_protocol:
  purpose: rollback_safety + reproducibility + audit_trail
  cadence: every_8_to_12_versions OR on_milestone OR on_operator_request
  layout:
    vault/v<MAJOR>.<MINOR>.<PATCH>/
      VAULT_README.md           # required — headline + arc + boot instructions
      <full mirror of repo>     # all source + docs + tests
  exclusions:                   # strict — never include
    - node_modules/             # root + every nested
    - .git/                     # history lives in parent repo
    - vault/                    # nested vaults forbidden (recursion)
    - public/<tma>/assets/      # regenerable build artefacts; index.html + images kept
    - .claude/settings.local.json # local session state
    - .env, *.log               # secrets + transient logs (.env.example IS kept)
    - tmp/                      # transient working scratch
    - migration_audit.log       # per-run audit, not source-of-truth
  vault_readme_required_sections:
    - headline_blurb            # "Frozen reproducible snapshot of <project> at vN.N.N — …"
    - captured_timestamp
    - exclusion_list            # verbatim per above
    - file_count_and_size       # "~610 files at ~38 MB"
    - boot_instructions         # `cp -a vault/<v> /tmp/<project>-<v> && cd … && npm install`
    - arc_table                 # version → headline → PR for every version in the arc since the prior vault
```

**Rule V-1:** Vault snapshots are append-only — a prior vault is never deleted or rewritten.

**Rule V-2:** The `[KNOWN GAPS]` block of any Journal entry that creates a new vault MUST log whether the prior vault is being superseded (if so, link to the closure rationale) or kept (if so, why both exist).

**Rule V-3:** A vault snapshot's filesystem state may legitimately omit a self-referential journal addendum entry that documents the vault itself — the snapshot can't reasonably contain the meta-entry that describes its own existence. The omission MUST be recorded in the vault's commit message + the journal addendum's `[KNOWN GAPS]`.

### 16.2 `doc/third-party.yaml` — external dependency manifest

```yaml
third_party_yaml:
  purpose: surface_external_APIs_and_integrations_for_team_visibility
  consumers:
    - vibe-journal `3rd Party` tab (see §18)
    - legal §2 "Data Sources & Attribution" table cross-reference
    - operator-side budget-cap planning (DF-55 style)
  schema:
    apis:
      - name: string            # e.g. "Places API (New) v1"
        vendor: string          # e.g. "Google"
        purpose: string         # short prose
        key_env_var: string     # e.g. "GOOGLE_MAPS_API_KEY"
        docs_url: string
        status: active | dormant | deprecated
        daily_cap: integer | null
        notes: string
    integrations:
      - name: string
        kind: string             # messaging | data-store | hosting | …
        purpose: string
        docs_url: string
        status: active | …
        notes: string
```

**Rule T-1:** A project that uses any paid third-party API SHOULD maintain `doc/third-party.yaml`. If a manifest exists, the formal Legal §2 "Data Sources & Attribution" table SHOULD be derivable from it (or cross-reference it).

### 16.3 `.vibe-journal/` — the project-agnostic Vibe Journal framework

```yaml
vibe_journal_framework:
  location: <repo-root>/.vibe-journal/
  purpose: emit_a_static_multi-tab_HTML_knowledge_surface_for_team_visibility
  scope: project-agnostic; works on any repo following the §1 eight-folder convention + §16.1 vault + §16.2 third-party manifest
  CLI:
    init: vibe-journal init           # scaffold vibe-journal.config.yaml
    regen: vibe-journal regen         # parse doc/ + vault/ + third-party.yaml → emit static site
    serve: vibe-journal serve         # local preview on port 5478
  output_modes:
    multi-file:
      destination: dist/vibe-journal/
      structure: index.html + style.css + app.js + data/<type>.ndjson × 10 + data/manifest.json
      suits: local dev / `vibe-journal serve`
    bundled:                          # config keys `bundled_html` + `bundled_json`
      destination: project-specific (e.g. public/doc/ for soleat)
      structure: 1 self-contained HTML (CSS + JS inlined) + 1 JSON blob ({ manifest, data })
      suits: tightly-controlled Express whitelist serving (e.g. soleat.net /doc/vibe-journal.html)
  see_section: 18                     # full design + tab layout
```

---

## 17. OPERATIONAL PATTERNS — seven codifications from the soleat v0.59 → v0.60 arc

> **Status:** Added in contract v0.0.4. These patterns proved their value across ~150 PRs and are codified so other projects inherit them with the same expectations.

### 17.1 Reproduce-by-reference (the doc-system scalability pattern)

When an AU-1 / AU-3 doc (Feature / Technical / Register / Legal / Builder / Persona) reaches its 5th-or-later versioned file, **reproducing prior content verbatim by inlining** balloons every new file to thousands of lines. The pattern that proved viable across soleat's v0.60.157 / v0.60.169 / v0.60.171 / v0.60.172 catch-ups:

```markdown
> _(reproduced verbatim from `<prior-versioned-file>.md` — every section
> below the marker is unchanged unless §7 Amendments says otherwise.)_
```

**Rule R-1:** "Reproduce-by-reference" is AU-1 / AU-3 compliant *only if* the prior file is preserved in the same `doc/<Folder>/` directory (so the reference resolves). If the prior file is archived to `doc/Archive/`, the reference MUST point at the archive path.

**Rule R-2:** The new file MUST still contain its own §7 Amendments table with any new amendments for the current version.

### 17.2 Operator-supplied-copy paste convention

When the operator pastes user-facing copy verbatim into chat (e.g. for `/legal` or `/privacy`):

1. The new copy lands in `i18n.js` (or equivalent) **exactly as pasted** — no agent rewording.
2. Every supported locale is translated paragraph-for-paragraph (chip labels track existing `filter.*` strings; tone matches the prior translation's register).
3. The prior copy is preserved **as superseded** in the same versioned Legal record file per AU-7.
4. Deprecated env-var placeholders (e.g. `{operator}`) are dropped from the i18n string but recorded as L-Notes in the Legal record so future maintainers don't waste time chasing why the env var no longer takes effect.

### 17.3 Doc-system catch-up cadence

Journal updates are per-PR (already a Standing Rule). Feature / Technical / Register / Persona files batch:

| Cadence | Trigger |
|---|---|
| **Per arc milestone** | Every ~10-15 versions OR at the close of a coherent arc (e.g. "the Cuisine TMA v2 page-history arc"). |
| **At session wrap** | Operator says "Officially we can stop here" / "Append documents" — sweep cross-cutting doc-types so they don't drift past the Journal. |

**Rule C-1:** No code-touching version should land without the Journal entry. Feature / Technical / Register may lag up to one arc milestone behind without violation.

### 17.4 Admin-merge pattern for CI infrastructure failures

When CI fails systematically (every job returns failure in < 5 s with no execution, all jobs in the same run, the workflow file is unchanged, and local preflight is clean):

1. Diagnose first via an **empty-content PR off main** (zero file changes). If that also fails, the failure is GitHub-side; if it passes, the failure is on the original branch.
2. If GitHub-side, admin-merge the original PR with the failure context recorded in the commit message — *"CI infra failing in 3-4 s with no execution per PR #<diagnostic> diagnostic; local preflight clean."*
3. Surface in PR #<merge>'s body so reviewers see the diagnostic chain.

**Rule M-1:** Admin-merge is permitted only when (a) local preflight is clean AND (b) diagnostic PR confirms infrastructure failure. Never as a routine shortcut.

### 17.5 Cross-team onboarding sequence

A new team member adopting the convention reads in order:

1. Repo-root `CLAUDE.md` — standing rules + project orchestration.
2. `doc/CLAUDE.md` — lean orchestrator + folder template index.
3. `doc/CLAUDE-FULL.md` (this file) — full contract.
4. Latest `doc/Builder/builder-…md` — patterns the project has discovered.
5. Latest `doc/Persona/persona-…md` — operator's capability profile + working style.
6. `doc/.serial-state.yml` — current counters + last anchor.
7. Most-recent `doc/Journal/journal-…md` — what just shipped + status.
8. `doc/Register/register-…md` — Open / Deferred / Decisions sections.

**Rule O-1:** A bootstrap session (per §12) MUST surface this sequence in the welcome message so new joiners onboard the same way every time.

### 17.6 Standing-rules registry

Operator-set rules that bind future sessions live in the repo-root `CLAUDE.md` (NOT scattered across journals). The pattern: each rule has a one-liner header, an operator quote attributing the source, and a journal back-reference for full context.

**Example** (Soleat's per-PR Journal rule, lifted verbatim into `CLAUDE.md`):

```markdown
## Standing rule — keep `doc/Journal/` current per-PR

After opening any PR, and after a PR merges, record it in the Journal.
[ … full rule body … ]

This rule was set by the operator: *"Update the Journal every time a
new PR is created and done."* (Recorded as decision-gate G3 in
`journal-0_60_144-13_05_26-0900.md`.)
```

**Rule SR-1:** New standing rules require operator approval (per G3). They MUST quote the operator's words verbatim + reference the journal entry that captured the decision.

### 17.7 Version-aware vault-prior-known-good

When a refactor is risky (mass file rename, framework migration, security gate addition), the most recent `vault/v<N>/` snapshot is the rollback target. Two-step pattern:

1. **Before the refactor**, take a fresh vault snapshot (§16.1) if the prior snapshot is more than ~5 versions stale.
2. **In the refactor PR's body**, name the vault that's the rollback target. If something post-merge breaks production, the operator can `cp -a vault/v<N>/ /tmp/rollback-<N> && cd … && npm install && railway up` to get back to known-good in minutes.

---

## 18. THE VIBE JOURNAL FRAMEWORK — 5-row tabbed knowledge surface

> **Status:** Added in contract v0.0.4. Codifies the project-agnostic Vibe Journal framework lifted from Soleat (v0.60.173 / PR #420) so other projects can adopt the same tab layout, parser conventions, and bundled-output deployment pattern.

### 18.1 Tab layout (canonical 5-row spec)

```
Row 1:  📊 Dashboard | PR        | Register   | 3rd Party
Row 2:  Technical    | Feature
Row 3:  Legal        | Vault
Row 4:  Journal
Row 5:  Builder      | Persona
```

The `|` separators are visible in the rendered nav (per operator request). Each tab badges its record count alongside the label.

**v0.0.4 amendment (Soleat v0.60.186, PR #435).** The original layout (above, before this amendment) was a 5-row / 9-tab spec; **📊 Dashboard** was added as the FIRST chip in row 1 to restore the 10 insight panels + Lessons block from the legacy `doc/VibeCodingRecord/generate.mjs` output without losing the v0.60.180 rich PR cards. Dashboard re-uses the PR record set (no separate parser); the renderer enriches each row client-side with category / area / version / day / module-buckets / rework-of and renders the panels described in §18.2 below.

### 18.2 Data source per tab

| Tab | Source | Renderer behaviour |
|---|---|---|
| 📊 Dashboard | re-uses the PR record set (no separate parser); enriched client-side with category / area / version / day / module-buckets / rework-of | 6 KPI cards + 10 `<details>` insight panels (Likely rework · Churn by feature · Churn by module · PRs per release · Category mix · 📈 PRs over time · 🪶 Small/low-effort · 🔁 Indecision · 🧠 Behavioural patterns · 🧩 Hard parts) + 9-entry 📚 Lessons list distilled from `.claude/skills/gia-preflight/SKILL.md` |
| PR | `doc/VibeCodingRecord/data/prs.ndjson` → `gh` CLI → `git log` (priority order) | table: # / title / state / author / merged-or-updated / files |
| Register | latest `doc/Register/register-*.md` | latest only; each `##` section as a card |
| 3rd Party | `doc/third-party.yaml` (§16.2) + optional GitHub issues via `gh` | tables: APIs / Integrations / Issues |
| Technical | latest `doc/Technical/technical-*.md` | section cards |
| Feature | latest `doc/Feature/feature-*.md` | section cards |
| Legal | latest `doc/Legal/legal-*.md` | section cards |
| Vault | every `vault/v*/VAULT_README.md` (§16.1) | newest first; headline + arc table + boot block |
| Journal | every `doc/Journal/journal-*.md`, split by `[HDR]` blocks | one card per HDR block, newest first |
| Builder | latest `doc/Builder/builder-*.md` | section cards |
| Persona | latest `doc/Persona/persona-*.md` | section cards |

### 18.3 Output modes

```yaml
multi_file_mode:
  destination: dist/vibe-journal/
  emits: index.html + style.css + app.js + data/<type>.ndjson × 10 + data/manifest.json
  suits: local dev preview (`vibe-journal serve`)

bundled_mode:
  config_keys: [bundled_html, bundled_json, bundled_json_url]
  destination: project-specific
  emits: 1 self-contained HTML (inlined CSS + JS) + 1 JSON blob
        ({ manifest, data: { <type>: [...] } })
  suits: tightly-controlled Express whitelist serving
```

### 18.4 Soleat reference deployment

Soleat serves the bundled HTML + JSON from `public/doc/` at `/doc/vibe-journal.html` (Express whitelist at `index.js:7753` + `VIBE_JOURNAL_KEY` gate at line 7767). Regen flow: `cd .vibe-journal && node bin/vibe-journal.mjs regen --config examples/soleat-deploy/config.yaml`. Output overwrites the prior `public/doc/vibe-journal.html` + `public/doc/vibe-journal.json` from the legacy `doc/VibeCodingRecord/` single-page generator.

### 18.5 Adoption checklist for a new project

1. Copy `.vibe-journal/` from a reference project (e.g. soleat).
2. `cd .vibe-journal && npm install` (one-time).
3. `node bin/vibe-journal.mjs init` → scaffold `vibe-journal.config.yaml`.
4. Edit the config: point at your `doc/`, `vault/`, `doc/third-party.yaml` paths.
5. `node bin/vibe-journal.mjs regen` → emit static site.
6. Deploy: copy `dist/vibe-journal/` to any static host OR configure bundled mode for an in-app route.

**Rule VJ-1:** A project that adopts `.vibe-journal/` MUST regen on every push to `main` (manually, via postinstall hook, or via CI). Stale data is worse than no data — it suggests the surface is reliable when it isn't.
