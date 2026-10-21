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
  version: 0.0.3
  owner: <human-lead-name>
  reader_primary: claude-code
  reader_secondary: human-lead
  template_neutral: true
  last_updated: 27-04 '26 07:29 SGT
  last_anchor_source: user_stated_device_clock_after_data_gov_sg_date_triangulation
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
file_end_marker: CLAUDE_MD_v0_0_3_END
checksum_required: false_for_v0_0_3
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
