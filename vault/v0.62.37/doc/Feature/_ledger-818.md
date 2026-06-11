(№ 53 - 02-06 '26 17:45 SGT)


# `_ledger-818.md` — per-PR ledger, all 797 merged PRs ≤ #818

> **Companion to** `feature-0_61_312-02_06_26-1745.md` (the canonical spec @ PR #818 / v0.61.312 / sha `207f1e63`).
> **Scope:** every merged PR with `number ≤ 818` (797 rows). PRs #819-#821 are out of scope per operator brief.
> **Status legend:** `FOLDED` — folded into a spec section. `SKIPPED-<reason>` — not folded; reason in Notes column. **Zero PENDING.**

| # | PR Title | Status | Folded into / Skip-reason |
|---|---|---|---|
| 1 | Phase 1 setup: spec doc, env template, gitignore | SKIPPED-doc-only | doc-only |
| 2 | Phase 2 V1: Vibe Sensor — RSS-driven /lunch command | FOLDED | §M Removed Features (retired-vibe) |
| 3 | Vibe Sensor: require both CBD and food keywords | FOLDED | §M Removed Features (retired-vibe) |
| 5 | Tighten Vibe filter: require both CBD and food keywords | FOLDED | §M Removed Features (retired-vibe) |
| 6 | Phase 2.5: replace RSS Vibe Sensor with Google Places | FOLDED | §M Removed Features (retired-vibe) |
| 7 | Webhooks + venue cards on /lunch + README refresh | FOLDED | §D-C Recognised venues |
| 8 | chore(doc): bootstrap CLAUDE.md orchestrator compliance | SKIPPED-doc-only | doc-only |
| 9 | Phase 3a: Gemini Sanctuary Summary on /lunch | FOLDED | §K Data / APIs / Gemini |
| 10 | Phase 3bc: /eat (time + location aware) + Telegram Web App | FOLDED | §M Removed Features (retired-surface) |
| 11 | v0.4.1: Place-ID deep links for venue cards + TWA markers | FOLDED | §D-C Recognised venues |
| 12 | v0.4.2: Maps URL Schema for iPadOS Universal Link compatibility | FOLDED | §G Menu TMA + TMA misc |
| 13 | v0.4.3: Google Maps app deep-link probe + install fallback (iOS) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 14 | v0.5.0: AdvancedMarker name-on-pin + greedy gestures + chat inline buttons | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 15 | v0.5.1: Filter out closed / non-operational venues | FOLDED | §D-C Recognised venues |
| 16 | v0.6.0: soleat rebrand + /drink + /groceries + Topic Gatekeeper | FOLDED | §M Removed Features (retired-surface) |
| 17 | v0.7.0: Type-a-place geocoding path + 200 m radius + prompt copy | FOLDED | §D.2 LocationField + autocomplete + recents |
| 18 | v0.8.0: Walking-minute re-rank via Routes API computeRouteMatrix | FOLDED | §K Places API integration |
| 19 | v0.8.1: Fail-fast pickValidated + handleNoResults helper (interpretation A) | FOLDED | §M Removed Features (retired-pipeline) |
| 20 | v0.9.0: Redis Vault — sync importer + vault-first runtime for /eat /drink | FOLDED | §M Removed Features (retired-surface) |
| 21 | v0.10.0: Processing lock + Hidden Sanctuary + review gate + TMA polish | FOLDED | §G Menu TMA + TMA misc |
| 22 | v0.10.1: bot.on('location') immediate-ack reorder (spec §1) | SKIPPED-doc-only | doc-only |
| 23 | v0.11.0: Radial expansion + sharper consultant + Vault buffer + cheerio importer | FOLDED | §M Removed Features (retired-vibe) |
| 24 | v0.12.0: /ver command — version + upstream API health probes | FOLDED | §H Owner / Oversight tools |
| 25 | v0.12.1: TWA Map ID env-driven via /maps-key | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 26 | v0.13.0: Universal ack + Location Validation Gate + 2000m radial ceiling | FOLDED | §D.2 LocationField + autocomplete + recents |
| 27 | v0.14.0: Gemini 3 Pro default + GOOGLE_API_KEY support + Approach cues | FOLDED | §K Data / APIs / Gemini |
| 28 | v0.14.1: Default Gemini model → gemini-2.5-pro | FOLDED | §K Data / APIs / Gemini |
| 29 | v0.15.0: Vault import (JSON+KMZ) + 500m Vault + 2km Hidden Sanctuary | SKIPPED-vault-snapshot | vault-snapshot |
| 30 | v0.15.1: Default Gemini model → gemini-2.5-flash | FOLDED | §K Data / APIs / Gemini |
| 31 | v0.16.0: Adopt Places googleMapsLinks (authoritative Maps URLs) | FOLDED | §K Places API integration |
| 32 | v0.17.0: Places generativeSummary (Gemini overview + attribution) | FOLDED | §K Data / APIs / Gemini |
| 33 | v0.18.0: Durger-King-style menu + /cuisine /weather /transport /carpark /grocery | FOLDED | §D Cuisine TMA / discovery |
| 34 | v0.18.1: DATA_GOV_SG_API_KEY auth header + /ver probe row | FOLDED | §H Owner / Oversight tools |
| 36 | v0.18.2: Real-time weather via data.gov.sg v2 + richer /weather reply | FOLDED | §F.4 Weather |
| 38 | v0.19.0: 24h location cache + 200m-first picks + nearest bus stops | FOLDED | §F Transport / Train / Bus / Carpark |
| 39 | v0.19.1: Weather v2→v1 fallback + diagnostic logging | FOLDED | §F.4 Weather |
| 40 | v0.20.0: Nearest MRT + network crowd + /transport refresh + /cuisine keyboard | FOLDED | §D Cuisine TMA / discovery |
| 41 | v0.20.1 + v0.21.0: slash dedup, /status removed, traffic in /transport, /ver shows deploy time | FOLDED | §F Transport / Train / Bus / Carpark |
| 42 | v0.21.1: remove per-pick 📍 Open Map button | FOLDED | §M Removed Features (retired-copy) |
| 43 | v0.21.2: exponential backoff on Gemini 429/503 | FOLDED | §K Data / APIs / Gemini |
| 44 | v0.22.0: Cuisine Picker TMA (Vite + React + Tailwind, 15-pick search, 4 preset combos) | FOLDED | §D Cuisine TMA / discovery |
| 45 | v0.22.1: Cuisine TMA Search button hotfix (auto-detect on mount) | FOLDED | §D Cuisine TMA / discovery |
| 46 | v0.23.0: Cuisine TMA major redesign (sliders, 70-cuisine accordion, queue tolerance, live prompt preview) | FOLDED | §D Cuisine TMA / discovery |
| 47 | v0.24.0: /surprise — one hidden gem 1.5–3 km away (rating ≥ 4.3, &lt; 50 reviews, dishes + booking) | FOLDED | §D Hidden Gems / open-hours |
| 48 | v0.25.0: Buddy Level 1 — share-a-pick via t.me deep link | FOLDED | §M Removed Features (retired-surface) |
| 49 | v0.25.1: menu cleanup (drop /eat, /cuisine default) + TMA Search diagnostics | FOLDED | §M Removed Features (retired-surface) |
| 50 | v0.26.0: Reason–Fetch–Refine pipeline (vault-grounded draft + per-cluster context + consistency filter) | FOLDED | §M Removed Features (retired-surface) |
| 51 | v0.26.1: TMA↔backend bridge audit (CORS + /api/diag ping + chat receipt + connectivity badge) | FOLDED | §G Menu TMA + TMA misc |
| 52 | v0.26.2: single 📍 Google Maps button per Sanctuary card (drop 🚗/🔍/👋) | FOLDED | §D.5 Signals (crowd / footfall / rarity / sanctuary) |
| 53 | v0.26.3: dual-channel TMA bridge (fetch primary + sendData fallback + full simulation logging) | FOLDED | §G Menu TMA + TMA misc |
| 54 | v0.26.4: TMA force-fire (CBD default, sync banner, 6s timeout, 💬 Chat escape) | FOLDED | §G Menu TMA + TMA misc |
| 55 | v0.26.5: Diagnostics behind long-press on connectivity badge | FOLDED | §K.x Observability |
| 56 | v0.27.0: 60s per-chat pick cache (~80% cost cut on tap-spam) | FOLDED | §M Removed - Reason-Fetch-Refine pipeline |
| 57 | v0.27.1: /share command — re-expose buddy share via slash, not per-pick button | FOLDED | §G.x Clipboard / Share / Picks |
| 58 | v0.27.2: i18n cuisine labels (zh / ms / ta) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 59 | v0.28.0: migrate Menu TMA to React/Vite (item 8 — menu only; map intentionally deferred) | FOLDED | §G Menu TMA + TMA misc |
| 60 | v0.28.1: CLAUDE.md folder template skeletons (closes Open #10) | SKIPPED-doc-only | doc-only |
| 61 | v0.28.2: /admin/sync-vault auth-gated endpoint (closes Open #17) | FOLDED | §M Removed Features (retired-surface) |
| 62 | v0.29.0: MRT in pipeline + cache-bust headers + visible bundle version | FOLDED | §F Transport / Train / Bus / Carpark |
| 63 | v0.29.1: /admin/test-pipeline black-box trace + 5-tap Diagnostics fallback | FOLDED | §M Removed Features (retired-surface) |
| 64 | v0.29.2: visible 🔧 Debug button in Header (replaces hidden long-press) | FOLDED | §K bug-fixes / misc |
| 65 | v0.29.3: TMA fetch timeout 6s → 25s (root cause of "/cuisine closes so fast") | FOLDED | §D Cuisine TMA / discovery |
| 66 | v0.30.0: free-text NL chat search (any language) via Gemini intent classifier | FOLDED | §C Free-text chat pipeline |
| 67 | v0.30.1: /admin/test-pipeline accepts nl_text + specialRequest (single-curl NL test) | FOLDED | §M Removed Features (retired-surface) |
| 68 | v0.30.2: Pro→Flash fallback + /surprise relaxation + location-update intent + 15-min staleness + TMA coords | FOLDED | §D Hidden Gems / open-hours |
| 69 | v0.30.3: parallel validates + TMA→Redis sync + Google Search grounding + GEOSPATIAL_CULINARY_ANALYST template | FOLDED | §G Menu TMA + TMA misc |
| 70 | v0.30.4: /log on verbose mode + GROUNDING_ENABLED safety flag | FOLDED | §H Owner / Oversight tools |
| 71 | v0.30.5: NL location_override + geocode-anchor + Reason 0-candidate fallback | FOLDED | §D.2 LocationField + autocomplete + recents |
| 72 | v0.30.6: cuisines authoritative + server-side chain filter (fix off-cuisine + Coffee Bean leakage) | FOLDED | §K Express server / rate limit |
| 73 | v0.30.7: prompt-templates/test-prompts.md — 16-category test matrix | SKIPPED-doc-only | doc-only |
| 74 | v0.30.8: voice input via Gemini Flash audio (item H) | FOLDED | §K Data / APIs / Gemini |
| 75 | v0.30.9: Cloud Map ID hygiene — boot warning + setup walkthrough (item L) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 76 | v0.31.0: Buddy Level 2 — live solo-dining match (closes item I) | FOLDED | §M Removed Features (retired-surface) |
| 77 | v0.31.1 — slash autocomplete trim + /transport sub-menu | FOLDED | §F Transport / Train / Bus / Carpark |
| 78 | v0.31.2 — fix Gemini grounding+JSON 400 (root cause of D406 timeout) | FOLDED | §K Data / APIs / Gemini |
| 79 | v0.32.0 — request store + two-stage Gemini + TMA poll + map fix + /surprise rebuild | FOLDED | §D Hidden Gems / open-hours |
| 80 | v0.33.0 — /hawker command (33-centre curated dataset + sub-menu) | FOLDED | §E Hawker TMA |
| 81 | v0.34.0 — recog:venue:* schema + Gemini-drafted seed via /admin | FOLDED | §D-C Recognised venues |
| 82 | v0.34.1 — buddy state ambient indicator (footer + /ver row) | FOLDED | §H Owner / Oversight tools |
| 83 | v0.35.0 — /recognised + /heritage-food slash commands | FOLDED | §D-C Recognised venues |
| 84 | v0.36.0 — carpark-as-footfall A/B test (FOOTFALL_PROXY_ENABLED env) | FOLDED | §F Transport / Train / Bus / Carpark |
| 85 | v0.34.2 — TMA reverse-geocode + denial banner + starter soleat logo | FOLDED | §D.2 LocationField + autocomplete + recents |
| 86 | v0.37.0 — polish + telemetry batch (logo + footfall counter + /recognised filter + walk-time + inline detect-error) | FOLDED | §D-C Recognised venues |
| 87 | v0.38.0 — Hawker NEA scrape + Hawker TMA + chat-side carpark enrichment | FOLDED | §E Hawker TMA |
| 88 | v0.39.0 — multi-stop Google Maps container + tighter stale threshold + debug echo | FOLDED | §K bug-fixes / misc |
| 89 | v0.39.1 — extractJsonArray tolerates object-wrapped shapes | FOLDED | §K Data / APIs / Gemini |
| 91 | v0.39.3 — /ver build sha + TMA lang in payload + surprise lenient parse | FOLDED | §D Hidden Gems / open-hours |
| 92 | v0.40.0 → v0.43.0 — Anthropic migration, pipeline inversion, operational hygiene | FOLDED | §K Data / APIs / Gemini |
| 93 | v0.42.0 → v0.43.0 — operational hygiene + 3 bug fixes + cleanup | FOLDED | §K bug-fixes / misc |
| 94 | v0.44.0 — hidden /p power-user query relay (Claude / Gemini / Search / Maps) | FOLDED | §M Removed Features (retired-surface) |
| 95 | v0.44.1 — /p d (data.gov.sg dataset search) + visible no-cache marker | FOLDED | §M Removed Features (retired-surface) |
| 96 | v0.44.2 — fix /p d 404 + /p m iOS Maps deep-link + SGT temporal context | FOLDED | §M Removed Features (retired-surface) |
| 97 | v0.45.0 — centralised maps-url helper + /p m multi-marker link | FOLDED | §M Removed Features (retired-surface) |
| 98 | v0.46.0 — invert /eat /drink /groceries pipelines (Places-first) | FOLDED | §M Removed Features (retired-surface) |
| 99 | v0.47.0 — /picks (24h list) + relax /surprise gates | FOLDED | §D Hidden Gems / open-hours |
| 100 | v0.47.1 — /surprise gates per Human Lead spec + fix hardcoded message | FOLDED | §D Hidden Gems / open-hours |
| 101 | v0.48.0 — /hawker live closure list (web_search) + /surprise rewrite (12 gems, multi-signal, type diversity) | FOLDED | §D Hidden Gems / open-hours |
| 102 | v0.48.1 — NEA scrape URL fix + share-link hyperlink + /surprise → 5 | FOLDED | §D Hidden Gems / open-hours |
| 103 | v0.48.2 — Maps URL fix + multi-marker map button + NEA prompt strengthen | FOLDED | §F.4 Weather |
| 104 | v0.49.0 — canonical 125-hawker-centre vault from NEA PDF | FOLDED | §F.4 Weather |
| 105 | v0.50.0 — MD-file vault with 5-region segmentation + browse UI | FOLDED | §D.7 Region modes |
| 106 | v0.51.0 — Hitachi-style /transport TMA + per-line MRT disruption parser | FOLDED | §F Transport / Train / Bus / Carpark |
| 107 | v0.52.0 — /hawker simplification + NEA LLM fetch + /transport location + /heritage_food removal + /recognised Michelin SG | FOLDED | §D-C Recognised venues |
| 108 | v0.53.0 + v0.54.0 — Cuisine TMA v2 / /recognised LLM / /hawker direct-to-TMA / By-region tab | FOLDED | §D Cuisine TMA / discovery |
| 109 | v0.54.0 + v0.54.1 — /hawker direct-to-TMA + by-region tab + location dead-end fix | FOLDED | §E Hawker TMA |
| 110 | v0.55.0 — Gemini-backed "Tell Gia" + hardened NL guardrails | FOLDED | §K Data / APIs / Gemini |
| 111 | v0.56.0 — /hawker single-tap + Tell Gia tightened + bus prune + cmd menu cleanup + /recognised hardening | FOLDED | §D-C Recognised venues |
| 112 | v0.56.1 — background location + dismissable keyboard + /location + per-station crowd + plain-English network | FOLDED | §F Transport / Train / Bus / Carpark |
| 113 | v0.56.2 — explicit Search button on /cuisine TMA (kills auto-debounce race) | FOLDED | §D Cuisine TMA / discovery |
| 114 | v0.56.3 — /recognised: 4 curated SG list URLs (drops LLM query) | FOLDED | §D-C Recognised venues |
| 115 | v0.56.4 — disable /api/hawker/closures LLM probe (stops $0.02/hit drain) | FOLDED | §E Hawker TMA |
| 116 | v0.57.0 — remove NEA fetchers + /p hidden power-query (~890 lines deleted) | FOLDED | §M Removed Features (retired-surface) |
| 117 | v0.57.1 — Taxi rebuild + traffic-incidents button + /eat /drink /groceries removed | FOLDED | §M Removed Features (retired-surface) |
| 118 | v0.57.2 — fix /cuisine halal/vegetarian zero-results bug + radius 800m → 1500m | FOLDED | §D Cuisine TMA / discovery |
| 119 | v0.57.3 — /cuisine Singapore-wide + ≤20 min walk + UI re-layout + recent reviews | FOLDED | §D Cuisine TMA / discovery |
| 120 | v0.57.4 — ride-hail /r/<app> redirect + ComfortDelGro Zig rename + soleat icon SVG | FOLDED | §A Surfaces overview / setup |
| 121 | v0.57.5 — fix /cuisine returning hotels/complexes (Places includedType + primaryType deny-list) | FOLDED | §D Cuisine TMA / discovery |
| 122 | v0.57.6 — Taxi/PHD → Incidents + /cuisine "New" default + selection cache | FOLDED | §D Cuisine TMA / discovery |
| 123 | v0.57.7 — /surprise: drop walk-time, surface 1-3 reviewer dishes | FOLDED | §D Hidden Gems / open-hours |
| 124 | v0.57.8 — fix /cuisine returning out-of-Singapore venues (KL leak) | FOLDED | §D Cuisine TMA / discovery |
| 125 | v0.57.8 — /cuisine: SG + JB region toggle, 80km gate, 2 dishes per card | FOLDED | §D Cuisine TMA / discovery |
| 126 | v0.57.9 — wire soleat-icon.png + fix /cuisine SG/JB header layout | FOLDED | §D Cuisine TMA / discovery |
| 127 | v0.57.10 — /cuisine 3 dishes (fix empty) + /surprise Google Maps dialog fix + new icon | FOLDED | §D Cuisine TMA / discovery |
| 128 | v0.57.12 — fix /cuisine returning non-matching cuisines (Ethiopian → Peranakan/Italian) | FOLDED | §D Cuisine TMA / discovery |
| 129 | v0.57.13 / .14 / .15 — cuisine gate refinements + stronger TMA hint contrast + drop Cambodian + enrich textQuery | FOLDED | §G Menu TMA + TMA misc |
| 130 | v0.57.16 + v0.57.17 + v0.57.18 — 🏠 Home-based filter, /hidden + rarity scoring, menu copy tweaks | FOLDED | §D Hidden Gems / open-hours |
| 131 | v0.57.20 — /cuisine: surface rare cuisines + closed-today indicator | FOLDED | §D Cuisine TMA / discovery |
| 132 | v0.57.21 — /privacy command (data, retention & sources) | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 133 | v0.57.22 — fix: 🏠 Home-based chip clipped off right edge of /cuisine QuickFilters | FOLDED | §D Cuisine TMA / discovery |
| 134 | v0.57.23 — /legal hidden command (disclaimer + IMDA + builder credit) | FOLDED | §H Owner / Oversight tools |
| 135 | v0.57.24 — /cuisine TMA: layout + Clear + Home-based search keywords | FOLDED | §D Cuisine TMA / discovery |
| 136 | v0.57.25 — /forgetme self-service erasure + 90-day inactivity auto-purge | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 137 | v0.57.26 — copy refresh: gatekeeper / off-topic / /help reflect actual commands | FOLDED | §M Removed Features (retired-copy) |
| 138 | docs: refresh README for v0.57.x state of the bot | SKIPPED-doc-only | doc-only |
| 139 | v0.57.27 — chat free-text: remove LLM, route directly to Google Places | FOLDED | §C Free-text chat pipeline |
| 140 | v0.57.28 — defensive deleteWebHook before setWebHook | FOLDED | §K Express server / rate limit |
| 141 | v0.57.29 — /hawker title: 'Singapore Hawker Centres & Food Centres (2025). By NEA' | FOLDED | §E Hawker TMA |
| 142 | v0.57.30 — /cuisine Ask Gia: location_override extraction + Claude Haiku 4.5 model | FOLDED | §D Cuisine TMA / discovery |
| 143 | v0.57.31 — LTA carpark crowd chip + 'Copy all to chat' on /cuisine | FOLDED | §D Cuisine TMA / discovery |
| 144 | v0.57.32 — fix: 'Copy all to chat' uses backend POST, not tg.sendData | FOLDED | §G.x Clipboard / Share / Picks |
| 145 | v0.57.33 — fix: 'Copy all' uses /app/map for multi-pin; keep TMA open | FOLDED | §G.x Clipboard / Share / Picks |
| 146 | v0.57.34 — /cuisine: replace 🇲🇾 emoji with Johor state flag icon | FOLDED | §D Cuisine TMA / discovery |
| 147 | v0.57.35 — /cuisine Copy all: add 'Copy / share link' button | FOLDED | §D Cuisine TMA / discovery |
| 148 | v0.57.36 + v0.58.1 — /cuisine: launcher rename, below-map filter strip, default Halal ON, drop walk-20 | FOLDED | §D Cuisine TMA / discovery |
| 149 | v0.58.1 — /cuisine: below-map filter strip, default Halal ON, drop walk-20, active-filter chips | FOLDED | §D Cuisine TMA / discovery |
| 150 | v0.58.2 — /cuisine: 'Search this area' floating map button | FOLDED | §D Cuisine TMA / discovery |
| 151 | v0.58.3 — /cuisine: rename 'Copy / share link' button to clarify tap behaviour | FOLDED | §D Cuisine TMA / discovery |
| 152 | v0.58.4 — /cuisine: warm-start randomised 5-venue loader | FOLDED | §D Cuisine TMA / discovery |
| 153 | v0.58.5 — /cuisine: Tell Gia merges into Active selection (+ Replace instead link) | FOLDED | §D Cuisine TMA / discovery |
| 154 | v0.58.6 — /cuisine: promote price chips to primary row as a Price-▾ dropdown | FOLDED | §D Cuisine TMA / discovery |
| 155 | v0.58.7 — /cuisine: location anchor field with Google Places Autocomplete | FOLDED | §D Cuisine TMA / discovery |
| 156 | v0.58.8 — /cuisine: vertical radius slider on the map's right edge | FOLDED | §D Cuisine TMA / discovery |
| 157 | v0.58.9 — /hidden: blank line between picks when dishes are shown | FOLDED | §D Hidden Gems / open-hours |
| 158 | v0.58.10 — /cuisine: copy-syntax toggle + bot tokeniser for re-runnable commands | FOLDED | §D Cuisine TMA / discovery |
| 159 | v0.58.11 — /cuisine: 2-column cuisine drawer grid + selection-only [N] accent | FOLDED | §D Cuisine TMA / discovery |
| 160 | v0.58.12 — /cuisine: independent twin-drawer heights via flex columns | FOLDED | §D Cuisine TMA / discovery |
| 161 | v0.58.13 — /cuisine: 2-line wrap for long category labels | FOLDED | §D Cuisine TMA / discovery |
| 162 | v0.58.14 — /cuisine: bundled UX fixes (slider out of map, scroll-into-view, new↔open swap, location affordance) | FOLDED | §D Cuisine TMA / discovery |
| 163 | v0.58.15 — /cuisine: map view follows the radius slider (fitBounds includes radius circle) | FOLDED | §D Cuisine TMA / discovery |
| 164 | v0.58.16 — /cuisine: revert v0.58.15 fitBounds-with-radius, drop default-ON filters, add warm-start fallback | FOLDED | §D Cuisine TMA / discovery |
| 165 | v0.58.17 — /cuisine: Tier 1 responsive (let it breathe on tablet/desktop) | FOLDED | §D Cuisine TMA / discovery |
| 166 | v0.58.18 — /cuisine: remove the radius slider entirely | FOLDED | §D Cuisine TMA / discovery |
| 167 | v0.58.19 — Tell Gia hardening: initData auth, per-user rate limit, anchor distance cap | FOLDED | §K Express server / rate limit |
| 168 | v0.58.20 — userLoc resolution: bounded geolocation + server fallback + maxZoom cap + /location no-args | FOLDED | §D.2 LocationField + autocomplete + recents |
| 169 | v0.58.21 — /cuisine + /location: freshness gate (≤30 min) on cached location | FOLDED | §D Cuisine TMA / discovery |
| 170 | v0.59.0 — /cuisine: redesigned layout (collapsible search, Tell-me panel, drill-down cuisine drawer, flag pills) | FOLDED | §D Cuisine TMA / discovery |
| 171 | v0.59.1 — /cuisine: empty-warm-start fallback + drawer compact + merged top card + floating FAB | FOLDED | §D Cuisine TMA / discovery |
| 172 | v0.59.2 — /cuisine: regroup by world region (10 buckets), /location reverse-geocode + share-pin keyboard, TMA cache-first | FOLDED | §D Cuisine TMA / discovery |
| 173 | v0.59.3 — /cuisine: regroup label fix (Common Here ghost) + Plus-Code reverse-geocode skip + search diagnostics | FOLDED | §D Cuisine TMA / discovery |
| 174 | v0.58.22 — /hidden: deterministic C1/C3/C4 + Claude C2/C5 + expanded chain blacklist | FOLDED | §D Hidden Gems / open-hours |
| 175 | v0.58.23 — /cuisine location-status banner + /location always-on Share-pin keyboard | FOLDED | §D Cuisine TMA / discovery |
| 176 | v0.58.24 — Cuisine TMA debug logs + /hidden progress message + status surfacing | FOLDED | §D Cuisine TMA / discovery |
| 177 | v0.58.25 — /location: handle "current" / "now" / "here" / "me" / "my" / "gps" / "device" keywords | FOLDED | §D.2 LocationField + autocomplete + recents |
| 178 | v0.58.26 + v0.58.27 — /cuisine zero-coord + chat-noise + water-catchment + filter auto-search | FOLDED | §D Cuisine TMA / discovery |
| 179 | v0.58.28-31 — /hidden Gemini + Cuisine Picker UI + multi-tenant building filter | FOLDED | §D Cuisine TMA / discovery |
| 180 | v0.58.32 — Tell-Me brand passthrough + /hidden Gemini model fix + prompt revert | FOLDED | §D Hidden Gems / open-hours |
| 181 | v0.58.33 — Gemini 2.x: use googleSearch tool, not googleSearchRetrieval | FOLDED | §K Data / APIs / Gemini |
| 182 | v0.58.34 — /hidden 3-step Gemini fallback chain + raw error surface | FOLDED | §D Hidden Gems / open-hours |
| 183 | v0.58.35 — gemini fallback: drop dead 1.5-pro, use 2.5/2.0/flash-latest | FOLDED | §K Data / APIs / Gemini |
| 184 | v0.58.36 — /hidden: strip Markdown bold + relax chunker regex | FOLDED | §D Hidden Gems / open-hours |
| 185 | v0.58.37 — /hidden: require C1 or C3 + cap reviews at 300 + drop 3 output lines | FOLDED | §D Hidden Gems / open-hours |
| 186 | v0.58.38 — strip Singapore floor-unit numbers from displayed addresses (privacy) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 188 | v0.58.40 — HOTFIX revert v0.58.38 (sanitiser crashing prod) | FOLDED | §K bug-fixes / misc |
| 189 | v0.58.42 — /hidden tool regex + retire 2.0-flash + 503 retry + 180s timeout + copy-syntax | FOLDED | §D Hidden Gems / open-hours |
| 190 | v0.58.44 — /hidden: thinkingBudget=0 + tightened genConfig + flash-only chain + per-attempt deadline | FOLDED | §D Hidden Gems / open-hours |
| 191 | v0.58.45 — /hidden: forbid fabricated Place URLs + scrub "meets Cx" leaks | FOLDED | §D Hidden Gems / open-hours |
| 192 | docs: refresh README + v0.58.45 snapshots in Journal/Register/Feature/Technical/Legal | SKIPPED-doc-only | doc-only |
| 193 | v0.58.46 — /hidden: fix URL mangling + paragraph collapse; broaden leak strip; bold venue name + icons | FOLDED | §D-C Recognised venues |
| 194 | v0.58.47-49 — closed-venue exclude + copy-all inline URLs + multi-map button gating | FOLDED | §D-C Recognised venues |
| 195 | docs(register): close O-1 — cancel address-sanitiser reland | SKIPPED-doc-only | doc-only |
| 196 | vault: freeze v0.58.49 under /vault/v0.58.49/ (full repo mirror sans node_modules) | SKIPPED-vault-snapshot | vault-snapshot |
| 197 | v0.58.50 — standardised T1/T2/T3 venue templates across deliverPicks, copy-all, copy-one | FOLDED | §D-C Recognised venues |
| 198 | v0.58.51 — pick-list spacing + cuisine map hover InfoWindow + click-to-Google-Maps | FOLDED | §D Cuisine TMA / discovery |
| 199 | v0.58.52 — TRANSIT + DRIVE travel times in MapPanel InfoWindow + pick-list templates; anchor pin hover | FOLDED | §F Transport / Train / Bus / Carpark |
| 200 | v0.58.53 — fix MapPanel hover (marker.element → PinElement DOM) + restore copy-all enrichment fields | FOLDED | §K bug-fixes / misc |
| 201 | v0.58.54 — touch-device InfoWindow tap preview + iPad/tablet map height bump | FOLDED | §G Menu TMA + TMA misc |
| 202 | v0.58.55 — French (FR) localisation: TMA UI + Copy-all + Copy-syntax + Chat results + EN/FR flag toggle | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 203 | v0.59.0 — /language command + FR results/LLM + MVP footfall (BestTime) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 204 | vault: v0.58.55 frozen snapshot + i18n EN/FR string-table view | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 205 | v0.59.1 — chat chrome localisation: /weather, /transport, /hawker, /carpark, /forgetme, /start, /language | FOLDED | §E Hawker TMA |
| 206 | v0.59.2 — QuickFilters: tighten chip spacing so all 4 fit on one row | FOLDED | §D Cuisine TMA / discovery |
| 207 | v0.59.3 — transport polish: standardised distance + one-map buttons + Drive→Carpark fix | FOLDED | §F Transport / Train / Bus / Carpark |
| 208 | v0.59.4 — FR completion: vibe-summary fix, /hidden FR, result-card carpark map | FOLDED | §D Hidden Gems / open-hours |
| 209 | v0.59.5 — short command aliases + /hidden review-count verification | FOLDED | §D Hidden Gems / open-hours |
| 210 | v0.59.6 — ensureLocation FR + cuisine drawer FR + result-card distance + /hidden one-map + setMyDescription + BestTime debug | FOLDED | §D Cuisine TMA / discovery |
| 211 | v0.59.7 — /hidden: drop CLOSED_TEMPORARILY/PERMANENTLY venues post-verification | FOLDED | §D-C Recognised venues |
| 212 | v0.59.8 — setMyShortDescription EN + FR (the "About" blurb on the bot profile) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 213 | v0.59.9 — /privacy: third-person voice (Soleat), polite tone, soften buddy ChatID, FR | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 214 | v0.59.10 — hosted /privacy HTTP route (for BotFather Privacy Policy URL) | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 215 | v0.59.11 — /privacy fix: location TTL is 24 hours, not 5 minutes | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 216 | v0.59.12 — LocationField: Enter key anchors top suggestion | FOLDED | §D.2 LocationField + autocomplete + recents |
| 217 | v0.59.13 — FR for /recognised, /share, /buddy + Google Maps buttons (carpark, transport) | FOLDED | §M Removed Features (retired-surface) |
| 218 | v0.59.14 — Cuisine TMA Search button FR + LTA traffic incident TYPE FR | FOLDED | §D Cuisine TMA / discovery |
| 219 | v0.59.15 — Hawker TMA full FR localisation | FOLDED | §E Hawker TMA |
| 220 | v0.59.16 — Telegram command-menu polish (EN + FR) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 221 | v0.59.17 — /cuisine chat reply FR | FOLDED | §D Cuisine TMA / discovery |
| 222 | vault: v0.59.17 frozen snapshot + i18n EN/FR string-table view | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 223 | v0.59.18 — TMA tablet+ font bump (+1pt) + requestFullscreen + cuisine no-auto-search | FOLDED | §G Menu TMA + TMA misc |
| 224 | v0.59.19 — Singaporean cuisine: rotate iconic dishes into Places query | FOLDED | §D Cuisine TMA / discovery |
| 225 | v0.59.20 — cuisine cap 12 + iPad expansion deep-audit fix | FOLDED | §D Cuisine TMA / discovery |
| 226 | v0.59.21 — Cuisine TMA bundle: UX hints + cap 8-16 + dish edits + brand-throttle + Dessert/Fusion | FOLDED | §D Cuisine TMA / discovery |
| 227 | v0.59.22 — Trim duplicative /cuisine prompt copy | FOLDED | §D Cuisine TMA / discovery |
| 228 | v0.59.23 — TMA cap actually 16, single-item categories skip drawer, "what to order" on cards | FOLDED | §G Menu TMA + TMA misc |
| 229 | v0.59.24 — "🍴 Try ·" label normalisation + drinks filter + /hidden card revamp | FOLDED | §D Hidden Gems / open-hours |
| 230 | v0.59.25 — iPad fullscreen telemetry: boot diag + ipados gate + explicit viewport handler | FOLDED | §G Menu TMA + TMA misc |
| 231 | v0.59.26 — fix copy-all overflow + per-chatId Singaporean dish memory | FOLDED | §K bug-fixes / misc |
| 232 | v0.59.27 — replace Singaporean + Dessert dish lists per Human Lead | FOLDED | §D Cuisine TMA / discovery |
| 233 | v0.59.28 — fix rating-row dual-icon + count; defensive TMA init for web.telegram | FOLDED | §G Menu TMA + TMA misc |
| 234 | v0.59.29 — cap copy-all venues at 12 to fit Telegram's 4096-char limit | FOLDED | §D-C Recognised venues |
| 235 | v0.59.30 — auto-fallback to soleat.up.railway.app when soleat.net is unreachable | SKIPPED-ci-only | ci-only |
| 236 | v0.59.31 — /hidden free-text location anchor (200m-3km, with bilingual validation) | FOLDED | §D Hidden Gems / open-hours |
| 237 | v0.59.32 — refresh on repeat clicks + tighter dish-quality filter | FOLDED | §D Cuisine TMA / discovery |
| 238 | v0.59.33 — every search-button click refreshes immediately (no TTL wait) | FOLDED | §D Cuisine TMA / discovery |
| 239 | v0.59.34 — collapse Ethiopian/Kenyan/Nigerian into single "African" entry | FOLDED | §D Cuisine TMA / discovery |
| 240 | v0.59.35 — catalogue restructure (6 removes, 4 adds, +Slavic/EE) + 30s search cache | FOLDED | §D Cuisine TMA / discovery |
| 241 | v0.59.36 — remove Laotian + Timorese; update /cuisine description count | FOLDED | §D Cuisine TMA / discovery |
| 242 | v0.59.38 — European catch + missing flags + cmd-menu count + /language auto hint | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 243 | v0.59.37 — fix /cuisine command-menu count + advertise /language auto | FOLDED | §D Cuisine TMA / discovery |
| 244 | v0.59.39 — /hidden hallucination guard + Telegram menu-button refresh on host switch | FOLDED | §D Hidden Gems / open-hours |
| 245 | v0.59.40 — Codex #244 P2: missing GOOGLE_MAPS_API_KEY → apiError, not null | FOLDED | §K Express server / rate limit |
| 246 | v0.59.41 — dish-tail throttle (kill porridge cluster) + broader Dessert/Fusion picks | FOLDED | §M Removed - Reason-Fetch-Refine pipeline |
| 247 | v0.59.42 — Dessert empty fix + warm-start 5→12 + shuffle on deterministic paths | FOLDED | §K Express server / rate limit |
| 248 | v0.59.43 — refresh on Search click + flush results on TMA close | FOLDED | §G Menu TMA + TMA misc |
| 249 | v0.59.44 — /clip command: filter last 50 cuisine clips by cuisine | FOLDED | §G.x Clipboard / Share / Picks |
| 250 | v0.59.45 — "over 55 cuisines" copy across slash-menu + start intro | FOLDED | §G.x Clipboard / Share / Picks |
| 251 | v0.59.46 — fix: distance-sort was undoing lightShuffle for empty + Dessert paths | FOLDED | §D Cuisine TMA / discovery |
| 252 | v0.59.47 — true Fisher-Yates for empty/Dessert (tier-preserve was pinning ≥4.5★ at top) | FOLDED | §D Cuisine TMA / discovery |
| 253 | v0.59.48 — merge Australian + New Zealand into single "Australasia" cuisine | FOLDED | §D Cuisine TMA / discovery |
| 254 | v0.59.49 — split Australian + New Zealand back, add Australasia, tighten search queries | FOLDED | §D Cuisine TMA / discovery |
| 255 | v0.59.50 — fix /c New Zealand empty + don't cache empty results | FOLDED | §D Cuisine TMA / discovery |
| 256 | v0.59.51 — Clear pill on collapsed Search Criteria header | FOLDED | §D Cuisine TMA / discovery |
| 257 | v0.59.52 — empty-cuisine search rotates seeds (was returning same 3 venues) | FOLDED | §D Cuisine TMA / discovery |
| 258 | v0.59.53 — /hidden: bump max 5→8 + diversify across categories | FOLDED | §D Hidden Gems / open-hours |
| 259 | vault/v0.59.53 — cuisine-search-rotation + /hidden-variety milestone snapshot | FOLDED | §D Hidden Gems / open-hours |
| 260 | doc(v0.59.53) — Journal #103 + Register #104 catch-up since v0.58.49 | SKIPPED-doc-only | doc-only |
| 261 | v0.59.54 — /search conversational finder + goulash dish-prioritization fix | FOLDED | §C Free-text chat pipeline |
| 262 | v0.59.55 — purge stale /share entry from Telegram slash-menu | FOLDED | §G.x Clipboard / Share / Picks |
| 263 | v0.59.58 — /search robustness + technique explainers + dish-precedence fix (rolls up v0.59.56–v0.59.58) | FOLDED | §C Free-text chat pipeline |
| 264 | v0.59.57 — /search cooking-technique explainers (Braisage, Tandoor, Sous Vide, Robata…) | FOLDED | §C Free-text chat pipeline |
| 265 | v0.59.59 — /search render fix: HTML mode + direct Places searchText | FOLDED | §C Free-text chat pipeline |
| 266 | v0.60.0 — /search technique fan-out: origin-first tier ranking + Gemini authenticity validation | FOLDED | §C Free-text chat pipeline |
| 267 | v0.60.1 — drop retired gemini-2.0-flash from search-intent fallback chain | FOLDED | §K Data / APIs / Gemini |
| 268 | v0.60.2 — /search rich card template + progressive feedback (parity with /hidden) | FOLDED | §D Hidden Gems / open-hours |
| 269 | v0.60.3 — add missing FR process-noun aliases (sautage, fumage, grillage, rôtissage, flambage) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 270 | v0.60.4 — R.E.D ambiguity spine: deterministic disambiguateTerm + AMBIGUOUS_DISHES + /s integration | FOLDED | §C Free-text chat pipeline |
| 271 | v0.60.5a — NATION_OVERLAY SG-anchor: 7 cuisines, 306 dishes + 51 shared | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 272 | v0.60.6 — NATION_OVERLAY Foreign Tier-1: 15 cuisines, 424 dishes added | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 273 | v0.60.7 — multi-surface NATION_OVERLAY routing + fix Agemono / dinosaur-Milo bugs | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 274 | v0.60.8 — NATION_OVERLAY Tier-2 Phase 1: 16 cuisines, 509 dishes | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 275 | v0.60.9 — multi-bug hotfix: cuisine/hidden staleness, radius, technique routing, Agemono→Japanese | FOLDED | §D Hidden Gems / open-hours |
| 276 | v0.60.10 — /hidden Claude fallback + retry-on-allDropped fix | FOLDED | §D Hidden Gems / open-hours |
| 277 | v0.60.11 — cuisine-search: restore v0.59.33 always-fresh on every click | FOLDED | §D Cuisine TMA / discovery |
| 278 | v0.60.12 — cooking-methods table: 70 cuisines × 30 methods (~2,100 entries) | FOLDED | §C Free-text chat pipeline |
| 279 | v0.60.14 — ✳️ Michelin List card + per-chatId search dedup + Google-limit tip | FOLDED | §D-C Recognised venues |
| 280 | v0.60.15 — anchor name "Raffles City" (not Downtown Core) + /l now feedback | FOLDED | §D.2 LocationField + autocomplete + recents |
| 281 | v0.60.16 — Michelin / Bib Gourmand annotation row on every venue card | FOLDED | §D-C Recognised venues |
| 282 | v0.60.17 — Michelin star-tier sort + cuisine combo filter + /l error logging | FOLDED | §D-C Recognised venues |
| 283 | v0.60.18 — Michelin cuisine pre-filter + chip/NL disambig + UX subtlety | FOLDED | §D Cuisine TMA / discovery |
| 284 | v0.60.19 — TMA centring on anchored location + /hidden distance-text rewrite | FOLDED | §D Hidden Gems / open-hours |
| 285 | v0.60.20 — Tier-2 Phase 2 (28 cuisines) + Chinese+Michelin expansion + /hidden hang fix | FOLDED | §D-C Recognised venues |
| 286 | v0.60.23 — multi-surface disambig (parent-cuisine fan-out) | FOLDED | §D Cuisine TMA / discovery |
| 287 | v0.60.28 — pagination polish + map page-sync | FOLDED | §D Cuisine TMA / discovery |
| 288 | v0.60.29 — /hidden grounding audit (salvage real venues with fabricated addresses) | FOLDED | §D-C Recognised venues |
| 289 | v0.60.30 — Michelin pagination: sliceCap 12 → 24 | FOLDED | §D-C Recognised venues |
| 290 | v0.60.31 — /hidden distance pre-filter + radius prompt hardening | FOLDED | §D Hidden Gems / open-hours |
| 291 | v0.60.32 — /hidden count rewrite + Michelin cost relief + first-load toast | FOLDED | §D-C Recognised venues |
| 292 | v0.60.33 — /hidden: drop out-of-radius venues from delivered text | FOLDED | §D-C Recognised venues |
| 293 | v0.60.34 — restore Michelin sliceCap 24/28 (pagination renders again) | FOLDED | §D-C Recognised venues |
| 294 | v0.60.35 — urgent Anthropic spend cuts ($30/day → ≤$5/day target) | FOLDED | §K Data / APIs / Gemini |
| 295 | v0.60.37 — command menu rewrite (EN + FR) + new About pane | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 296 | v0.60.39 — Michelin combo cap removed (full SG-table coverage) | FOLDED | §D-C Recognised venues |
| 297 | v0.60.40 — Hawker multi-pin map + label fix | FOLDED | §E Hawker TMA |
| 298 | v0.60.41 — Hawker TMA embedded map (HawkerMapPanel) | FOLDED | §E Hawker TMA |
| 299 | docs(v0.60.41): journal/feature/technical/register catch-up + vault snapshot | SKIPPED-vault-snapshot | vault-snapshot |
| 300 | v0.60.42 — Michelin paginate-40 + tablet TMA polish | FOLDED | §D-C Recognised venues |
| 301 | v0.60.43 — Cuisine Picker UX fixes (pagination continuity + loading label + Clear cleanup + Michelin cuisine label) | FOLDED | §D Cuisine TMA / discovery |
| 302 | v0.60.44 + v0.60.45 — Michelin pagination dedup fix + restaurantType field | FOLDED | §D-C Recognised venues |
| 303 | v0.60.46 — fix Hawker Centre TMA pins (ship hawker-coords.json) | FOLDED | §E Hawker TMA |
| 304 | v0.60.47 — Cuisine TMA initial-UX polish + Hawker Maps mapId fix | FOLDED | §D Cuisine TMA / discovery |
| 305 | v0.60.48 — Menu TMA hub as the chat menu button | FOLDED | §G Menu TMA + TMA misc |
| 306 | v0.60.49 — bump TMA wide-screen cap from 800px to 1280px | FOLDED | §G Menu TMA + TMA misc |
| 307 | v0.60.50 + v0.60.51 — Menu hub rebrand + sectioned layout + FR i18n | FOLDED | §G Menu TMA + TMA misc |
| 308 | v0.60.52 — fix 4 TMA bugs (notebook fullscreen, dispatch, back btn, hawker coords) | FOLDED | §G Menu TMA + TMA misc |
| 309 | v0.60.53 — Hawker enhancements + back-FAB + menu-dispatch diagnostics | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 310 | v0.60.54 — Menu hub: subtler tiles + live train status + hint line | FOLDED | §G Menu TMA + TMA misc |
| 311 | v0.60.55 — Menu hub: 3-col grid + inline TrainPanel + MRT map shortcut | FOLDED | §F Transport / Train / Bus / Carpark |
| 312 | v0.60.56 — fix 502 menu-dispatch + external Google Maps tour URL for hawker | FOLDED | §K bug-fixes / misc |
| 313 | v0.60.57 — transport TMA wide-screen cap (notebook aspect ratio fix) | FOLDED | §G Menu TMA + TMA misc |
| 314 | v0.60.58 — bowl-shape FABs, ⇡ top label, train-panel 2-row layout | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 315 | v0.60.59 — replace hawker closures with stall counts + status (data.gov.sg v2) | FOLDED | §E Hawker TMA |
| 316 | v0.60.60 — fetch-hawker-stalls --from local-file + Google Maps 11-stop cap | FOLDED | §E Hawker TMA |
| 317 | v0.60.61 — Hawker 3-button row + bus stops banded arrivals + /b alias | FOLDED | §F Transport / Train / Bus / Carpark |
| 318 | v0.60.62 — Hawker 4-button row + Menu PNG icons + bus tiles + EN·FR toggle | FOLDED | §G Menu TMA + TMA misc |
| 319 | v0.60.63 — Menu TMA: PNG icons for Search + Bus stops tiles | FOLDED | §F Transport / Train / Bus / Carpark |
| 320 | v0.60.64 — Menu TMA: drop tile PNGs (cuisine, hawker, search, bus) + resize to 89 KB | FOLDED | §G Menu TMA + TMA misc |
| 321 | v0.60.65 — Menu TMA: per-chat menu-button refresh on /start + /menu | FOLDED | §G Menu TMA + TMA misc |
| 322 | v0.60.66 + v0.60.67 — Hawker labels + Menu hero/tile slim + dispatch close + /start rewrite | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 323 | v0.60.71 — Compact menu tiles + empty-load fix + bus-stop popup polish | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 324 | v0.60.72 — Incidents 20 km + train Gmaps links + Causeway/2nd Link cameras + /start trim | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 325 | v0.60.73 + v0.60.74 — Tile inline 56 px + MRT map URL + /causeway rewrite + drop seats suffix | FOLDED | §F Transport / Train / Bus / Carpark |
| 326 | v0.60.75 — Static MRT line headway footer in /transport train | FOLDED | §F Transport / Train / Bus / Carpark |
| 327 | v0.60.76 — Bus-stop popup arrivals fix + MRT station line emojis | FOLDED | §F Transport / Train / Bus / Carpark |
| 328 | v0.60.77 + v0.60.78 — Drop SGTrains attribution + remove MRT Train.png + Menu TMA compact on iPhone | FOLDED | §F Transport / Train / Bus / Carpark |
| 329 | v0.60.79 + v0.60.80 — Menu Tile bump + Cuisine criteria preview | FOLDED | §D Cuisine TMA / discovery |
| 330 | v0.60.81 + v0.60.82 — Train/Bus chat fixes + Cuisine contrast/FABs/combo search | FOLDED | §F Transport / Train / Bus / Carpark |
| 331 | v0.60.83 + v0.60.84 — Aqua FABs + square emoji + pills in header + tighter AND validation | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 332 | v0.60.85 — SG MRT TMA: optional interactive Google Map view (default PNG) | FOLDED | §F Transport / Train / Bus / Carpark |
| 333 | v0.60.86 — MRT TMA: add mapId so AdvancedMarkerElement renders (fix auth overlay) | FOLDED | §F Transport / Train / Bus / Carpark |
| 334 | v0.60.87 — MRT TMA: thread real Map ID from /maps-key (operator's MAP_ID env) | FOLDED | §F Transport / Train / Bus / Carpark |
| 335 | v0.60.88 — Network crowd flip + ⏱️ frequency emoji + TMA line filter | FOLDED | §G Menu TMA + TMA misc |
| 336 | v0.60.89 — Drop network crowd summary line from /transport train | FOLDED | §F Transport / Train / Bus / Carpark |
| 337 | v0.60.90 + v0.60.91 — Cuisine FAB system colors + BackFab inverse colors + z-50 across all TMAs | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 338 | v0.60.92 + v0.60.93 — BackButton dedupe + Train TMA polish (map height + scroll FAB) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 339 | v0.60.94 + v0.60.95 + v0.60.96 — Aqua FABs + standardised text labels + bottom-of-page flip + ⇠ glyph | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 340 | v0.60.97 — Train TMA shrink + ticker bg + 7 days + Cuisine FAB swap + FR audit | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 341 | v0.60.98 — Train TMA titles + ticker label + carpark Title Case | FOLDED | §F Transport / Train / Bus / Carpark |
| 342 | v0.60.99 — Train TMA: All Lines chip + auto-switch + LRT scroll + popup line status | FOLDED | §D Cuisine TMA / discovery |
| 343 | v0.60.102 — revert v0.60.101 cuisine-type labelling | FOLDED | §D Cuisine TMA / discovery |
| 344 | v0.60.103 — uncap traffic incidents + expand checkpoint cameras + drop /causeway | FOLDED | §F Transport / Train / Bus / Carpark |
| 345 | v0.60.105 — shrink + lower FAB buttons across all 4 TMAs | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 346 | v0.60.106 — FR audit pass #2 + v0.60.42→106 catch-up docs + vault snapshot | SKIPPED-vault-snapshot | vault-snapshot |
| 347 | v0.60.107 — lift navigation FABs above the screen edge / home indicator | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 348 | v0.60.108 — "Soleat" not "Gia's" in pick headers + drop per-pick cards on multi-pick | FOLDED | §A Surfaces overview / setup |
| 349 | v0.60.109 + v0.60.110 — /s · /search: investigation + operator-supplied help copy (EN + FR) | FOLDED | §C Free-text chat pipeline |
| 350 | v0.60.111 — /s · /search empty-arg always shows the full instruction | FOLDED | §C Free-text chat pipeline |
| 351 | v0.60.112 — /s search: kind progressive "please wait" + harden cooking-method fan-out | FOLDED | §C Free-text chat pipeline |
| 352 | v0.60.113 — retire /buddy as a user-facing feature (keep backend source) | FOLDED | §M Removed Features (retired-surface) |
| 353 | v0.60.114 + v0.60.115 — /s asado disambiguation + Cuisine dedup-exhaustion terminal state | FOLDED | §C Free-text chat pipeline |
| 354 | v0.60.116–117 — Cuisine search: deep paginated pool + per-chatId accumulating exclusion + auto-escalation to wider query phrasings | FOLDED | §D Cuisine TMA / discovery |
| 355 | docs(v0.60.117): journal/feature/technical/register catch-up (v0.60.107→117) + vault snapshot | SKIPPED-vault-snapshot | vault-snapshot |
| 356 | v0.60.118 — /weather expansion: rain caveat on open-air picks + /weather &lt;area&gt; head-out window + 24h "tonight" line | FOLDED | §F.4 Weather |
| 357 | v0.60.119 — Cuisine TMA: a location picked in Search Criteria locks in (stops reverting to the /location pin / device GPS) | FOLDED | §D Cuisine TMA / discovery |
| 358 | v0.60.120 — Cuisine TMA: picking a location updates the banner label + the bot's /location | FOLDED | §D Cuisine TMA / discovery |
| 359 | v0.60.121 — bus: sort arrivals by ETA in the map InfoWindow + "Plan a route" opens Google Maps directly | FOLDED | §G Menu TMA + TMA misc |
| 360 | v0.60.122–123 — Menu TMA "Hawker Centre, Food Centre" tile + free-text dish search ranks "actually serves it" above the line | FOLDED | §E Hawker TMA |
| 361 | v0.60.124 — free-text dish search: the divider actually fires (STRONG cuisine/dish matches above, bare word-matches below) | FOLDED | §C Free-text chat pipeline |
| 362 | v0.60.125 — free-text dish search: short one-line divider + only name/type self-identifications go above it | FOLDED | §C Free-text chat pipeline |
| 363 | v0.60.126–127 — Cuisine TMA: free-text box feeds the criteria search (Enter inert) + two-line dish-search divider | FOLDED | §D Cuisine TMA / discovery |
| 364 | v0.60.128 — surface a "misrepresented dish" note on free-text searches (chat + Cuisine TMA) | FOLDED | §D Cuisine TMA / discovery |
| 365 | v0.60.129 — cooking-method "did you mean" pivot (chat + Cuisine TMA + /s), merging the operator's cuisine→method reference | FOLDED | §D Cuisine TMA / discovery |
| 366 | docs(v0.60.130): journal/feature/technical/register catch-up (v0.60.118→130) + vault snapshot | SKIPPED-vault-snapshot | vault-snapshot |
| 367 | v0.60.131 — free-text: decline question-shaped queries, steer dessert/drink terms to bakeries/cafés, identity-free search-term log | FOLDED | §M Removed Features (retired-surface) |
| 368 | v0.60.132 — privacy: search-term log retention 30 d → 90 d + Legal/ doc entry | FOLDED | §G.x Legal / Privacy / Forgetme / Start |
| 369 | v0.60.133 — fix: /s + free-text rich cards collapsing to name-only (silence on /s); trim divider dashes | FOLDED | §C Free-text chat pipeline |
| 370 | v0.60.134 — fix: /s goulash dumpling — R.E.D disambiguation runs before Gemini / technique short-circuit / cooking-method pivot | FOLDED | §C Free-text chat pipeline |
| 371 | v0.60.135 — /s + free-text: above/below divider + on-cuisine "Try X" + HTML-escaping; add gia-preflight skill | FOLDED | §C Free-text chat pipeline |
| 372 | v0.60.136 — /s divider actually appears: positive-signal above/below split (name + cuisine-family demonyms), not just confident type-mismatch | FOLDED | §C Free-text chat pipeline |
| 373 | v0.60.137 — /privacy: simplify search-term retention bullet (EN + FR) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 374 | v0.60.138 — /s dish search: bakery/café dishes (quiche, tart, croissant…) keep bakeries/cafés above the divider | FOLDED | §C Free-text chat pipeline |
| 375 | v0.60.139 — free-text chat + /s dish search: immediate "please wait" + 15s/60s updates | FOLDED | §C Free-text chat pipeline |
| 376 | v0.60.140 — Cuisine TMA cards: restore cuisine-type label + review snippet (no LLM) | FOLDED | §D Cuisine TMA / discovery |
| 377 | v0.60.141 — Cuisine TMA: "end" FAB actually closes the Mini App (closeOnly) | FOLDED | §D Cuisine TMA / discovery |
| 378 | docs(v0.60.141): journal/feature/technical/register catch-up (v0.60.131→141) + vault snapshot | SKIPPED-vault-snapshot | vault-snapshot |
| 379 | v0.60.142 — hidden owner-only "Oversight" admin TMA + usage-tracking layer | FOLDED | §G Menu TMA + TMA misc |
| 380 | doc: Vibe-Coding Record — regenerable cross-section of all PRs (#1–#379) | SKIPPED-doc-only | doc-only |
| 381 | v0.60.144 — Vibe Journal: optional shared-key gate (VIBE_JOURNAL_KEY) | SKIPPED-doc-only | doc-only |
| 382 | docs(v0.60.144): Journal catch-up (#379–#381) + standing per-PR Journal rule | SKIPPED-doc-only | doc-only |
| 383 | Vibe Journal: fix sticky inner-table header + add 5 dashboard instruments | SKIPPED-doc-only | doc-only |
| 384 | v0.60.145 — Cuisine TMA: /api/cuisine/copy-all bot.sendMessage try/catch + plain-text retry; tolerate null mapUrl (PR-A of 3) | FOLDED | §D Cuisine TMA / discovery |
| 385 | v0.60.146 — Cuisine TMA: 80-cap session clipboard + ⇠ Prev FAB + multi-cuisine variant escalation (PR-B of 3) | FOLDED | §D Cuisine TMA / discovery |
| 386 | v0.60.147 — Cuisine TMA: Michelin full LLM-narrate parity (vibe + whatToOrder) (PR-C of 3, final) | FOLDED | §D Cuisine TMA / discovery |
| 387 | v0.60.148 — Cuisine TMA: ⇠ Prev FAB visibility fix + /clipboard alias | FOLDED | §D Cuisine TMA / discovery |
| 388 | (№ 117 - 13-05 '26 21:00 SGT) | SKIPPED-doc-only | doc-only |
| 389 | v0.60.149 — Cuisine TMA: Michelin batch 40→12 + walk-through indicator + /clipboard menu + post-80 ↻ Recycle | FOLDED | §D Cuisine TMA / discovery |
| 390 | v0.60.150 — Cuisine TMA: parallelize Michelin Places lookups + 24-h Redis cache + axios 6s→4s (the "later Michelin" HTTP 502 fix) | FOLDED | §D Cuisine TMA / discovery |
| 391 | v0.60.151 — /clipboard per-clip controls: 📋 Copy (plain text) + ✏️ Rename + 🗑 Remove | FOLDED | §G.x Clipboard / Share / Picks |
| 392 | v0.60.152 — distance gate: PR #125's 80 km → 120 km (cuisine TMA + chat free-text) | FOLDED | §D Cuisine TMA / discovery |
| 393 | v0.60.153 — Michelin: dedup fix (drop radius from criteriaHash) + force-warm enrichment cache + 'Curating' UI copy | FOLDED | §D Cuisine TMA / discovery |
| 394 | docs(v0.60.153): v0.60.142 → v0.60.153 doc + vault catch-up | SKIPPED-doc-only | doc-only |
| 395 | v0.60.154 — Cuisine TMA: fix Michelin `[object Object]` + curating copy + left-cluster ⇠/⇢ FABs + client-side page history | FOLDED | §M Removed Features (retired-vibe) |
| 396 | v0.60.155 — Cuisine TMA: inline 💬 layout + [object Object] root-cause kill (WRITE / force-fill / render) + per-criteria seen-set reset on TMA mount | FOLDED | §D Cuisine TMA / discovery |
| 397 | v0.60.156 — Cuisine TMA: unwrap Places v1 `review.text.text` (real `[object Object]` root cause) + `/api/cuisine/copy-one` plain-text retry | FOLDED | §D Cuisine TMA / discovery |
| 398 | v0.60.157 — Cuisine TMA: zero-results auto-retry + 🔄 Reset filters & retry CTA | FOLDED | §D Cuisine TMA / discovery |
| 399 | docs(v0.60.157): v0.60.154 → v0.60.157 doc + persona + vault catch-up (closes DF-29) | SKIPPED-doc-only | doc-only |
| 400 | v0.60.158 — Cuisine TMA Michelin loadingHint copy compression + investigation of Michelin start-state question | FOLDED | §D Cuisine TMA / discovery |
| 401 | v0.60.159 — Cuisine TMA: ResultCard duplicate-dish + font-size fix + lazy session-meta wipe for Michelin start-position bug | FOLDED | §D Cuisine TMA / discovery |
| 402 | v0.60.160 — Cuisine TMA: tighten gated-category post-filter to exclude bare cuisine-name matches in review text (Portuguese precision fix) | FOLDED | §D Cuisine TMA / discovery |
| 403 | v0.60.161 — /log command v2: server-side Railway logging + TMA client telemetry (timing, Redis TTLs, errors) — one toggle, three surfaces | SKIPPED-ci-only | ci-only |
| 404 | v0.60.162 — Cuisine TMA Michelin: fix combo dedup-key inflation + honor resetSeen in handler | FOLDED | §D Cuisine TMA / discovery |
| 405 | v0.60.163 — Cuisine TMA: chunk /copy-all body when > 4096 chars + tighten ResultCard dish-dedup to substring match | FOLDED | §D Cuisine TMA / discovery |
| 407 | v0.60.165 — Cuisine TMA: SG/JB radius defaults rebalanced (SG 50→20 km, JB 18→30 km) + 🐾 pet allowed filter chip (strict allowsDogs + text-query fallback) — supersedes #406 | FOLDED | §D Cuisine TMA / discovery |
| 409 | v0.60.166 — Cuisine TMA: LocationField pick no longer auto-fires search + first-load greyed-off overlay + 🐾 Pet allowed (capital P) | FOLDED | §D Cuisine TMA / discovery |
| 410 | docs(v0.60.166): vault snapshot — v0.60.157 → v0.60.166 catch-up (supersedes closed #408) | SKIPPED-vault-snapshot | vault-snapshot |
| 411 | v0.60.167 — Cuisine API: Telegram-WebApp initData auth chokepoint on /api/cuisine/* (+ 17 unit tests, constant-time hash compare, dev bypass) | SKIPPED-test-only | test-only |
| 412 | v0.60.168 — Cuisine TMA FR copy tweaks: 'Animaux autorisés' + shortened first-load overlay | FOLDED | §D Cuisine TMA / discovery |
| 414 | v0.60.169 — /legal: filter-accuracy + JB-geographic-coverage disclaimers (EN + FR); /legal migrated to i18n | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 415 | v0.60.170 — Cuisine TMA: re-sync setSearchCenter on LocationField pick (fixes map + search locked at original GPS coords) | FOLDED | §D Cuisine TMA / discovery |
| 416 | v0.60.171 — /legal body fully replaced per operator copy (EN supplied + FR translated) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 417 | v0.60.172 — /privacy body fully replaced per operator copy (EN supplied + FR translated; 2 privacy-html tests updated) | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 418 | docs(v0.60.172): Feature/Technical/Register catch-up (v0.60.157 → v0.60.172) + vault snapshot refresh (v0.60.166 → v0.60.172) | SKIPPED-vault-snapshot | vault-snapshot |
| 419 | Gia-WA: scope marker (0.1.0) for the WhatsApp port | SKIPPED-ci-only | ci-only |
| 420 | docs(.vibe-journal): drop project-agnostic Vibe Journal v1 framework into the repo (5-row tab layout per operator spec) | SKIPPED-doc-only | doc-only |
| 421 | v0.60.173 — Cuisine API per-chatId Redis rate limit on 5 hot endpoints (DF-54) + 12 unit tests | SKIPPED-test-only | test-only |
| 422 | v0.60.174 — Cuisine rate-limit cap tuning per operator (60/30/200/100/30 → 500/80/500/500/500 per hr per chat) | FOLDED | §K Express server / rate limit |
| 423 | v0.60.175 — Cuisine rate-limit window 60min → 15min (TTL 3600s → 900s) | FOLDED | §K Express server / rate limit |
| 424 | v0.60.176 — Cuisine rate-limit: warm-start cap 80 → 200 per 15 min | FOLDED | §K Express server / rate limit |
| 425 | v0.60.177 — Vibe Journal live at /doc/vibe-journal.html (5-row tabbed bundle) + CLAUDE-FULL.md v0.0.4 (supplementary folders + 7 operational patterns) | SKIPPED-doc-only | doc-only |
| 427 | v0.60.178 — Vibe Journal UI: sidebar nav + mobile drawer + URL-hash deep links | SKIPPED-doc-only | doc-only |
| 428 | v0.60.179 — petFriendly strict-only: drop "< 3 → keep all" fallback (accuracy > count) | SKIPPED-doc-only | doc-only |
| 429 | v0.60.180 — Vibe Journal: PR rich <details> cards with search + GFM table rendering (#repairs Register/Technical/Feature/Vault tables) | SKIPPED-doc-only | doc-only |
| 430 | v0.60.181 — /s assistance sub-menu (Cooking Methods / Authentic Dishes / Others) with heuristic dish-type tags | FOLDED | §C Free-text chat pipeline |
| 431 | v0.60.182 — UX tweaks (PR A/3): /l confirmation + 🐾 Pet primary chip + /s sub-menu footer hint | FOLDED | §D Cuisine TMA / discovery |
| 432 | v0.60.183 — Venue-card (PR B/3): 🍽️ cuisine-type in /s + Copy-All; new S$/M$ price-range + 🐾 line with FX parens | FOLDED | §D Cuisine TMA / discovery |
| 433 | v0.60.184 — Emoji map pins (PR C/3): ✳️ Michelin / 🐾 Pet / 🍮 Dessert / 🚏 bus-stop / 🅿️ carpark | FOLDED | §D-C Recognised venues |
| 434 | v0.60.185 — Cuisine TMA Michelin walk-through: ▶ → 🔍 glyph fix + page-tap diagnostic logging | FOLDED | §D Cuisine TMA / discovery |
| 435 | v0.60.186 — Vibe Journal: 📊 Dashboard tab restored (10 insight panels + Lessons) without losing the rich PR cards | SKIPPED-doc-only | doc-only |
| 436 | v0.60.187 — Michelin pagination fix: attach michelinDedupKey on the happy path (DF-80 resolved) | FOLDED | §D-C Recognised venues |
| 437 | v0.60.188 — Cuisine TMA: <12-result refresh hint + auto-reset · price-tier chips inline (kill popover-in-popover) | FOLDED | §D Cuisine TMA / discovery |
| 438 | v0.60.189 — /s cuisine picker: exclude umbrella catch-all slugs + raise min-items threshold to 3 | FOLDED | §D Cuisine TMA / discovery |
| 439 | Gia-WA: commit the WhatsApp-port build plan as Gia-WA/BUILD-PLAN.md (handoff doc for fresh Claude Code session on ang-kl/Gia-WA) | SKIPPED-doc-only | doc-only |
| 441 | v0.60.191 — Cuisine TMA: in-app card price-range + 🐾 line · first-🔍-tap 6-venue cap (with Codex auto-reset fix) | FOLDED | §D Cuisine TMA / discovery |
| 442 | v0.60.192 — Cuisine TMA Michelin Copy-All template parity (T1 revert + ✳️ annotation + price/pet enrichment) | FOLDED | §D Cuisine TMA / discovery |
| 443 | v0.60.193 — /s sub-menu prune · Michelin annotation helper (DF-91) · CLAUDE-FULL §18.1 Dashboard · Vibe Journal bundle regen (DF-83) | FOLDED | §D-C Recognised venues |
| 444 | v0.60.194 — Michelin pagination: suppress autoReset + <12 hint while michelinRemaining is set | FOLDED | §D-C Recognised venues |
| 445 | v0.60.195 — Michelin: drop 24-h Places-cache + drop seen-set pagination → always return top 12 fresh | FOLDED | §D-C Recognised venues |
| 446 | v0.60.196 — Michelin hotfix: restore slugify (P0 500 from v0.60.195) + dish denylist + LLM-narrate filter | FOLDED | §D-C Recognised venues |
| 447 | v0.60.197 — DF-87 close: populate sanctuaryRead on every search-response venue | FOLDED | §D-C Recognised venues |
| 448 | v0.60.198 — Michelin walk-through restored (criteriaHash-scoped seen-set, 1h idle TTL) | FOLDED | §D Cuisine TMA / discovery |
| 449 | v0.60.199 — Michelin chip SG-flag label + JB-region disable | FOLDED | §D Cuisine TMA / discovery |
| 450 | DF cleanup pass — drop speculative + close observational (doc-only) | SKIPPED-doc-only | doc-only |
| 451 | v0.60.200 — strip dead Michelin code (DF-95 + DF-96) + unbreak back-FAB clipboard latent bug | FOLDED | §D-C Recognised venues |
| 452 | v0.60.201 — Cuisine TMA: result-hint text + chip rename + ♿️ marker + Crowd-row move + Michelin walk slug→entryKey fix (P0) | FOLDED | §D Cuisine TMA / discovery |
| 453 | v0.60.202 — /start intro adds /l /location · location-saved hint drops /hidden | FOLDED | §D Hidden Gems / open-hours |
| 454 | v0.60.203 — weather "2h" → "2 hours" · Menu tile 64→80 px · TMA load-speed audit | FOLDED | §F.4 Weather |
| 455 | v0.60.204 — TMA static-bundle cache headers (DF-105 close) | FOLDED | §G Menu TMA + TMA misc |
| 456 | v0.60.205 — CI: tighten syntax-check scope (2028 → 115) · add diagnostics · split build step | SKIPPED-ci-only | ci-only |
| 457 | v0.60.206 — /s help-text rewrite · "possible eateries" status · immediate search ack | FOLDED | §C Free-text chat pipeline |
| 458 | v0.60.207 — Train/Cuisine/Hawker TMA polish: title · CCL6 dates · dark-mode fixes · hawker InfoWindow rework | FOLDED | §D Cuisine TMA / discovery |
| 459 | v0.60.208 — /s cooking-method card: flag title + Gemini explainer + real-dish Try line | FOLDED | §C Free-text chat pipeline |
| 460 | v0.60.209 — Try-line dish-only guard (shared denylist) + 2-field Sanctuary read | FOLDED | §D.5 Signals (crowd / footfall / rarity / sanctuary) |
| 461 | v0.60.210 — DF-111 /hidden Try-line dish guard + DF-109 train-map panel FR | FOLDED | §D Hidden Gems / open-hours |
| 462 | v0.60.211 — DF-110: single-query technique/ingredient search header | FOLDED | §C Free-text chat pipeline |
| 463 | v0.60.212 — DF backlog closure (DF-84/100/101/103/106) | SKIPPED-doc-only | doc-only |
| 464 | v0.60.213 — TMA footers: standardised "Experimental" tag line + Cuisine how-to line | FOLDED | §G Menu TMA + TMA misc |
| 465 | v0.60.214 — documentation consolidation: six standalone master documents | SKIPPED-doc-only | doc-only |
| 466 | v0.60.215 — TMA footer border + build-version fix + freetext-decline copy | FOLDED | §C Free-text chat pipeline |
| 467 | v0.60.216 — free-text food-relatedness gate + venue intent | FOLDED | §D-C Recognised venues |
| 468 | v0.60.217 — TMA footer: no border, font +1pt, full tag text restored | FOLDED | §G Menu TMA + TMA misc |
| 469 | v0.60.218 — weather-emoji vocabulary + /w rework | FOLDED | §F.4 Weather |
| 470 | v0.60.219 — TMA weather summary (web TMAs) + Cuisine-title swap | FOLDED | §F.4 Weather |
| 471 | v0.60.220 — transport-chat polish: map-TMA copy, station button, chat weather footer | FOLDED | §F Transport / Train / Bus / Carpark |
| 472 | v0.60.221 — drop the blank line above the 🌿 Sanctuary block | FOLDED | §D.5 Signals (crowd / footfall / rarity / sanctuary) |
| 473 | v0.60.222 — Try line → 🍲 (standardised) + venue-name dish guard + Menu footer trim | FOLDED | §D-C Recognised venues |
| 474 | v0.60.223 — Copy-card field order + the missing fields | FOLDED | §M Removed Features (retired-copy) |
| 475 | v0.60.224 — Map pins: Cuisine white-bg glyph pins + Hawker tiny pins | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 477 | v0.60.225 — TMA 🍲 Try ·: Gemini dish extraction from 4-5★ reviews + regex fallback | FOLDED | §K Data / APIs / Gemini |
| 478 | v0.60.226 — Cuisine TMA speed: regex-first dish sourcing + per-venue Gemini cache | FOLDED | §D Cuisine TMA / discovery |
| 479 | v0.60.227 — Hawker TMA map pins: 25px + &quot;NEW&quot; badge | FOLDED | §E Hawker TMA |
| 480 | v0.60.228 — Free-text: silence guard on decline path + transport-query redirect | FOLDED | §C Free-text chat pipeline |
| 481 | v0.60.229 — Cuisine/Hawker map pins → 18px dots + curated directory-building filter | FOLDED | §E Hawker TMA |
| 482 | v0.60.230 — Build E 5a–5d: Train TMA line polylines + tiny station dots | FOLDED | §F Transport / Train / Bus / Carpark |
| 483 | v0.60.231 — Build E 5e: data.gov.sg station-exit ingestion script | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 484 | v0.60.232 — Build E 5e: real LTA line geometry (fetcher + map rewire) | FOLDED | §F Transport / Train / Bus / Carpark |
| 485 | v0.60.233–0.61.0 — map geometry/pin fixes + Singapore GeoJSON overlay layers | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 486 | v0.61.1 — fix LRT station data + close the Circle Line loop | FOLDED | §F Transport / Train / Bus / Carpark |
| 487 | v0.62.0 — Healthier Choice + inside-a-building rows on eatery results | FOLDED | §J Venue rendering |
| 488 | v0.63.0 — expandable maps + Transport overlays + live carpark layer | FOLDED | §F Transport / Train / Bus / Carpark |
| 489 | v0.63.1 — custom map-control stack + Transport Overview reposition | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 490 | v0.64.0 — overlay UX: radius limiting, exits + train layers, attraction enrichment | FOLDED | §F Transport / Train / Bus / Carpark |
| 491 | v0.65.0 — hawker-centre nearby transit (station + bus stops) | FOLDED | §F Transport / Train / Bus / Carpark |
| 492 | v0.66.0 — train-line redraw (Chaikin-smoothed derived geometry) | FOLDED | §F Transport / Train / Bus / Carpark |
| 493 | v0.66.1 — OpenStreetMap / Overpass MRT-line-geometry fetcher | FOLDED | §F Transport / Train / Bus / Carpark |
| 494 | v0.61.8 — renumber the journal arc to a single 0.61.x PATCH sequence | SKIPPED-doc-only | doc-only |
| 495 | v0.61.9 — map polish: zoom row, square station pins, per-layer overlay radius | FOLDED | §F Transport / Train / Bus / Carpark |
| 496 | v0.61.10 — rich map pins + realtime crowd & accidents | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 497 | v0.61.12 — cuisine result emphasis on the train overlay | FOLDED | §D Cuisine TMA / discovery |
| 498 | docs: regenerate VibeCodingRecord ledger through PR #497 | SKIPPED-doc-only | doc-only |
| 500 | v0.61.14 — transport focused-line panel: station picker + 6 km station-focus map | FOLDED | §F Transport / Train / Bus / Carpark |
| 501 | v0.61.15 — remove the Cuisine map "Search this area" button | FOLDED | §D Cuisine TMA / discovery |
| 502 | v0.61.16 — map control buttons + Transport station-detail view | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 503 | v0.61.17 — Cuisine + Hawker train-overlay station-detail view | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 504 | v0.61.19 — clickable bus-stop arrivals + hawker-centre surrounding amenities | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 505 | v0.61.20 — amenity-pin refinements: deeper zoom, declutter, clickable popups | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 506 | v0.61.21 — unify amenity rendering so station-tap pins always appear | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 507 | v0.61.22 — theme-aware Google-map popup cards + close affordances | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 508 | v0.61.23 — standardised taxi pins + Nearby↔Details overlay-radius slider | FOLDED | §F Transport / Train / Bus / Carpark |
| 509 | v0.61.24 — exit feature Part A: line-coloured exit-code pins + Exit Template | FOLDED | §F Transport / Train / Bus / Carpark |
| 510 | v0.61.25 — /v owner builder-command menu | FOLDED | §H Owner / Oversight tools |
| 511 | v0.61.26 — station-scoped Exits/Taxis chips; remove Nearby↔Details slider | FOLDED | §D Cuisine TMA / discovery |
| 512 | v0.61.27 — /transport train: nearest-stations show the station code | FOLDED | §F Transport / Train / Bus / Carpark |
| 513 | v0.61.28 — Exit Template Part B: nearby attractions | FOLDED | §F Transport / Train / Bus / Carpark |
| 514 | docs: v0.61.28 master-doc + vault refresh and VibeCodingRecord catch-up (#498–#513) | SKIPPED-doc-only | doc-only |
| 515 | v0.61.29 — Cuisine TMA: move editable location field above the map | FOLDED | §D Cuisine TMA / discovery |
| 517 | Map-controls redesign — Google Map ↗ standard + Clinics/Police layers (v0.61.31→v0.61.32) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 518 | Phase G — in-map map controls for Transport + Hawker (v0.61.33) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 519 | /ver admin keyboard + /privacy & /legal copy rewrite (v0.61.34→v0.61.35) | FOLDED | §H Owner / Oversight tools |
| 520 | Unified in-map controls + working Colour toggle across 3 TMAs (v0.61.36) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 521 | Map nav buttons + /oversight label + base-map-only greyscale (v0.61.37) | FOLDED | §H Owner / Oversight tools |
| 522 | Colour nav button + dark-mode /transport link + Clinic/Pharmacy label (v0.61.38) | FOLDED | §F Transport / Train / Bus / Carpark |
| 523 | Clinic/Pharmacy 💊 pin + structured popup + Places hours-fetch script (v0.61.39) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 524 | docs: record PR #523 merge in Journal #243 + re-anchor serial state | SKIPPED-doc-only | doc-only |
| 525 | v0.61.39: clinic opening hours — Google Places data run (1017/1193) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 526 | 🏥 Hospital layer + clinic "+" pin + colour-toggle / quick-toggle restyle (v0.61.40–41) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 527 | docs: record PR #526 merge in Journal #244 + #245 | SKIPPED-doc-only | doc-only |
| 528 | v0.61.42: enable the Bus Stop overlay layer | FOLDED | §F Transport / Train / Bus / Carpark |
| 529 | docs: record PR #528 merge in Journal #246 | SKIPPED-doc-only | doc-only |
| 530 | v0.61.43: expand Singapore street/building abbreviations for display | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 531 | docs: record PR #530 merge in Journal #247 | SKIPPED-doc-only | doc-only |
| 532 | v0.61.44: redesign the bus-stop map popup | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 533 | docs: record PR #532 merge in Journal #248 | SKIPPED-doc-only | doc-only |
| 534 | Cuisine greyscale fix + 🎨 Colour-button icon contrast (v0.61.45–46) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 535 | docs: record PR #534 merge in Journal #249 + #250 | SKIPPED-doc-only | doc-only |
| 536 | Fixed popup palette + clinic-hours coverage tuning (v0.61.47–48) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 537 | v0.61.49: attraction 📌 pin, remove exit door glyph, Michelin ✴️ pin | FOLDED | §D-C Recognised venues |
| 538 | docs: record PR #537 merge in Journal #253 | SKIPPED-doc-only | doc-only |
| 539 | v0.61.50: Cuisine location-field search trigger + loading overlay rework | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 540 | docs: record PR #539 merge in Journal #254 | SKIPPED-doc-only | doc-only |
| 541 | v0.61.51: map-control tidy (CR1 / 2 / 3 / 7 / 8 / 9) | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 542 | docs: Journal #255 + VibeCodingRecord catch-up (PRs #514–#541) | SKIPPED-doc-only | doc-only |
| 543 | v0.61.52: CR4 bus-stop de-emphasis away from map focus | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 544 | docs: record PR #543 merge in Journal #256 | SKIPPED-doc-only | doc-only |
| 545 | v0.61.53: CR5 v1 — zoom-aware station pins + train polyline opacity | FOLDED | §F Transport / Train / Bus / Carpark |
| 546 | docs: record PR #545 merge in Journal #257 | SKIPPED-doc-only | doc-only |
| 547 | v0.61.54: CR4 v2 multi-focus bus de-emphasis + CR10 Police pin colour | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 548 | docs: record PR #547 merge in Journal #258 | SKIPPED-doc-only | doc-only |
| 549 | v0.61.55: CR6 Phase 1 — station info data layer | FOLDED | §F Transport / Train / Bus / Carpark |
| 550 | docs: record PR #549 merge in Journal #259 | SKIPPED-doc-only | doc-only |
| 551 | v0.61.56: CR6 Phase 2a — bus services per exit (static-data build) | FOLDED | §A Surfaces overview / setup |
| 552 | docs: record PR #551 merge in Journal #260 | SKIPPED-doc-only | doc-only |
| 553 | docs: VibeCodingRecord catch-up (PRs #542–#552) | SKIPPED-doc-only | doc-only |
| 554 | v0.61.57: CR6 Phase 3 — station info card UI | FOLDED | §F Transport / Train / Bus / Carpark |
| 555 | docs: record PR #554 merge in Journal #261 | SKIPPED-doc-only | doc-only |
| 556 | v0.61.58: CR5 v2 — selected-station polyline emphasis | FOLDED | §F Transport / Train / Bus / Carpark |
| 557 | docs: record PR #556 merge in Journal #262 | SKIPPED-doc-only | doc-only |
| 558 | v0.61.59: move Colour pill into the quick row + fix OFF-state palette | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 559 | v0.61.60: CR6 station info card — operator template redesign | FOLDED | §F Transport / Train / Bus / Carpark |
| 560 | v0.61.61: /transport Train reply — operator layout tweak | FOLDED | §F Transport / Train / Bus / Carpark |
| 561 | docs: record PR #560 merge in Journal #265 | SKIPPED-doc-only | doc-only |
| 562 | v0.61.62: HOTFIX — /healthz crash blanking all 3 TMAs | FOLDED | §H Owner / Oversight tools |
| 563 | docs: record PR #562 hotfix merge in Journal #266 | SKIPPED-doc-only | doc-only |
| 564 | v0.61.63–64: nearest-bus-stop enrichment + bus-popup legibility fix | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 565 | v0.61.66: Colour pill text, bus-stop pin flash, larger pin text | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 566 | v0.61.67: CR6 Phase 2b — first/last-train timings in the station card | FOLDED | §F Transport / Train / Bus / Carpark |
| 567 | v0.61.68: station-card bus stops + Colour pill text/position | FOLDED | §F Transport / Train / Bus / Carpark |
| 568 | v0.61.69: 24-hour places fetch pipeline | FOLDED | §M Removed - Reason-Fetch-Refine pipeline |
| 569 | v0.61.70: map UI redesign — toggles, pins, flashes | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 570 | v0.61.71: rework /transport nearest-bus-stops message layout | FOLDED | §F Transport / Train / Bus / Carpark |
| 571 | docs: v0.61.73 Journal entry + UI/Google_Map_Design.MD | SKIPPED-doc-only | doc-only |
| 572 | v0.61.74: Bus menu title + Train nearest-stations radius fix | FOLDED | §F Transport / Train / Bus / Carpark |
| 573 | v0.61.75: Menu hub FAB always shows "End" | FOLDED | §G Menu TMA + TMA misc |
| 574 | v0.61.76: station-info link — normalised name lookup | FOLDED | §F Transport / Train / Bus / Carpark |
| 575 | v0.61.76: vault snapshot + fresh master document set | SKIPPED-vault-snapshot | vault-snapshot |
| 576 | v0.61.77: map controls — move ⋯ menu left, brighter/larger nav buttons | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 577 | v0.61.77: SBS Transit station-info deep links | FOLDED | §F Transport / Train / Bus / Carpark |
| 578 | docs: Journal catch-up — entries #278-281 | SKIPPED-doc-only | doc-only |
| 579 | v0.61.84–87: bus-stop parity, wake prompt, map tap fixes, train overlay | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 580 | docs: v0.61.86/.87 Journal entries (PR #579 follow-up) | SKIPPED-doc-only | doc-only |
| 581 | v0.61.89: zoom readout + camera-control parity across the 3 TMA maps | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 582 | v0.61.90: train overlay — per-TMA zoom tiers | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 583 | v0.61.90: vault snapshot — vault/v0.61.90/ | SKIPPED-vault-snapshot | vault-snapshot |
| 584 | v0.61.91: cuisine map refinements — train tiers, droplet pins | FOLDED | §D Cuisine TMA / discovery |
| 585 | v0.61.92: train-overlay overlap-aware rendering + map chrome | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 586 | v0.61.93: stop map auto-zoom-out, zoom-readout location button, /l codes | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 587 | v0.61.94: resolve persistent train-marker label overlap | FOLDED | §F Transport / Train / Bus / Carpark |
| 588 | v0.61.95: keep train lines coloured in monochrome mode | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 589 | v0.61.96: shrink the embedded-map zoom indicator | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 590 | v0.61.97: zoom-tier rendering for the amenity overlays | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 591 | v0.61.98: fix the Transport-map station tap needing repeated taps | FOLDED | §F Transport / Train / Bus / Carpark |
| 592 | v0.61.99: widen station-detail bus/taxi range, show all taxi points | FOLDED | §F Transport / Train / Bus / Carpark |
| 593 | v0.61.100: /app/map — top-edge toggles, zoom pin, train stations, carpark case | FOLDED | §F Transport / Train / Bus / Carpark |
| 594 | v0.61.101: /app/map — wire the inert dropdown to overlay layers | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 595 | v0.61.102: faint telescope zoom readout + bus-stop zoom tiers | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 596 | v0.61.103: fix monochrome train lines still showing grey | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 597 | v0.61.104: bus-tier revision, /app/map layer parity, zoom-readout tweak | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 598 | v0.61.105: carpark overlay marker zoom-size ladder + overlap demotion | FOLDED | §F Transport / Train / Bus / Carpark |
| 599 | v0.61.106: /app/map train stations — mirror the Hawker TMA tier algorithm | FOLDED | §E Hawker TMA |
| 600 | v0.61.107: Cuisine map re-frames to results on every search | FOLDED | §D Cuisine TMA / discovery |
| 601 | v0.61.113: Cuisine free-text — keep typed dish alongside inferred cuisine chip | FOLDED | §D Cuisine TMA / discovery |
| 602 | v0.61.109: attraction overlay enrichment + map zoom-effects doc | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 603 | v0.61.110: Cuisine map zoom ceiling, larger info-card text, drop map glyph | FOLDED | §D Cuisine TMA / discovery |
| 604 | v0.61.112: readable map popups, transport zoom-hang fix, working Attractions overlay | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 606 | v0.61.114: Cuisine map — z11 lock + centroid centre | FOLDED | §D Cuisine TMA / discovery |
| 607 | v0.61.115: Attractions / Carpark zoom tiers — spec slice 1 | FOLDED | §F Transport / Train / Bus / Carpark |
| 608 | v0.61.116: Attractions / Carpark cluster engine — spec slice 2 | FOLDED | §M Removed Features (retired-vibe) |
| 610 | docs: v0.61.116 vault snapshot | SKIPPED-vault-snapshot | vault-snapshot |
| 611 | docs: v0.61.116 vault PR #610 journal STATUS post-merge update | SKIPPED-doc-only | doc-only |
| 612 | v0.61.117: Carpark popup duplicate "Google Map ↗" link fix | FOLDED | §F Transport / Train / Bus / Carpark |
| 613 | docs: v0.61.112 journal STATUS post-merge update (3rd attempt — supersedes closed #605 + #609) | SKIPPED-doc-only | doc-only |
| 614 | docs: v0.61.117 journal STATUS post-merge update | SKIPPED-doc-only | doc-only |
| 615 | v0.61.118: Attractions ⚝ readability + cluster threshold/tile tune | FOLDED | §M Removed Features (retired-vibe) |
| 616 | docs: v0.61.118 journal STATUS post-merge update | SKIPPED-doc-only | doc-only |
| 617 | v0.61.119: attractions visible, zoom-hang fix, zoom-readout circle, station-on-top | FOLDED | §I Google-map micro-details (overlays / pins / popups) |
| 619 | v0.61.118: chat free-text — whitelist <cuisine>+<food noun> queries | FOLDED | §C Free-text chat pipeline |
| 620 | v0.61.121: chat free-text — place-anchored search + 'top nearby' button | FOLDED | §C Free-text chat pipeline |
| 621 | v0.61.122: /location — quick-pick STB precincts + JB + Putrajaya | FOLDED | §D.2 LocationField + autocomplete + recents |
| 622 | v0.61.123: Menu TMA — location anchor field + disable SG-only tiles | FOLDED | §G Menu TMA + TMA misc |
| 623 | v0.61.124: anchor completion — 7 items (TMA region/cap, outside-zone, count format, auto-suggest, locsearch, autocomplete, disabled note) | FOLDED | §D.7 Region modes |
| 624 | docs: v0.61.120-124 journal catch-up + register increment | SKIPPED-doc-only | doc-only |
| 625 | v0.61.125: Menu TMA — Location section, region-aware geocode, font bump | FOLDED | §G Menu TMA + TMA misc |
| 626 | v0.61.126: Cuisine TMA — Fruits + Durian exclusive special modes | FOLDED | §D Cuisine TMA / discovery |
| 627 | v0.61.127: docs — fix Create_2_buttons.MD spec, Putrajaya not Sarawak | SKIPPED-doc-only | doc-only |
| 628 | docs: v0.61.125-127 journal catch-up + register increment | SKIPPED-doc-only | doc-only |
| 629 | v0.61.128: docs — VibeCodingRecord ledger catch-up PRs #553–#627 | SKIPPED-doc-only | doc-only |
| 630 | v0.61.129: Cuisine TMA — Tell-me place anchor (O-20) + Fruits/Durian radius widening (O-23) | FOLDED | §D Cuisine TMA / discovery |
| 631 | v0.61.130: Cuisine TMA — UI pills surface v0.61.129 O-20 + O-23 | FOLDED | §D Cuisine TMA / discovery |
| 632 | v0.61.131: Cuisine TMA — pill reorder + extract v0.61.129 O-20/O-23 helpers + 33 inline tests | FOLDED | §D Cuisine TMA / discovery |
| 633 | v0.61.132: docs — Register increment closes O-20 + O-23; logs D-61.129 + D-61.130 | SKIPPED-doc-only | doc-only |
| 634 | v0.61.133: docs — VibeCodingRecord ledger catch-up PRs #628–#633 | SKIPPED-doc-only | doc-only |
| 635 | v0.61.134: Cuisine TMA — Michelin path threads v0.61.129 place anchor + post-strip freeText | FOLDED | §D Cuisine TMA / discovery |
| 636 | v0.61.135: docs — Technical doc incremental: O-22 iCloud-Drive workaround pattern | SKIPPED-doc-only | doc-only |
| 637 | v0.61.136: docs — Register drops O-24 (Sarawak/Petra Jaya anchor) per operator decision | SKIPPED-doc-only | doc-only |
| 638 | v0.61.137: docs — Register retracts O-24 as typo-derived non-item (corrects v0.61.136 'Deferred' misclassification) | SKIPPED-doc-only | doc-only |
| 639 | v0.61.138: branding fix — user-facing 'Gia' → 'Soleat' | FOLDED | §K bug-fixes / misc |
| 640 | v0.61.139: Menu TMA — anchored-at format "<street> + <building> + (<postal>)" via Places addressComponents | FOLDED | §G Menu TMA + TMA misc |
| 641 | v0.61.140: wake-from-idle 2-step rewrite — request_location → rich comparison + 3 buttons + /l helper | FOLDED | §D.2 LocationField + autocomplete + recents |
| 642 | v0.61.141: Cuisine TMA — Fruits/Durian/Durian Pastry as chips in 'Dessert, Fruits' group; symmetric mutex with Dessert + all other cuisines | FOLDED | §D Cuisine TMA / discovery |
| 643 | v0.61.142: Cuisine TMA — durian chip uses operator PNG icon (per-slug imgFlag override) | FOLDED | §D Cuisine TMA / discovery |
| 644 | v0.61.143: docs — VibeCodingRecord ledger catch-up PRs #634–#643 | SKIPPED-doc-only | doc-only |
| 645 | v0.61.144: docs — Register logs D-61.140 (wake 2-step) / D-61.141 (special-mode chips + mutex) / D-61.142 (per-slug imgFlag) | SKIPPED-doc-only | doc-only |
| 646 | v0.61.145: Cuisine TMA — special-mode name-dedup (fixes Golden Moments duplicates) + group-card emojis (🍨 / 🍉 / 🥮) | FOLDED | §D Cuisine TMA / discovery |
| 647 | v0.61.146: Cuisine TMA — durian chip swaps v0.61.142 PNG for operator JPEG (IMG_2180) | FOLDED | §D Cuisine TMA / discovery |
| 648 | v0.61.147: docs — VibeCodingRecord ledger catch-up PRs #644–#647 | SKIPPED-doc-only | doc-only |
| 649 | v0.61.148: docs — fresh master pass for Register + Technical (v0.61.84-147 arc); Feature deferred | SKIPPED-doc-only | doc-only |
| 650 | v0.61.149: Cuisine TMA — durian variety alias coverage + halal auto-off in special mode (PR 1/2) | FOLDED | §D Cuisine TMA / discovery |
| 651 | v0.61.150: CI hotfix — update cuisines-vault.test.js for v0.61.141 dessert-group additions | SKIPPED-ci-only | ci-only |
| 652 | v0.61.151: Cuisine TMA — nationality review-language priority + (<flag> translated) tagging (PR 2/2) | FOLDED | §D Cuisine TMA / discovery |
| 653 | v0.61.152: translate-review helper + chat-side render — closes v0.61.151 "translated" half-implementation | FOLDED | §B.x i18n / setMyCommands / setMyDescription |
| 654 | v0.61.153: docs — VibeCodingRecord ledger catch-up PRs #648-#653 | SKIPPED-doc-only | doc-only |
| 655 | v0.61.154: translate enrichment — Michelin path + chat /cuisine + DRY helper | FOLDED | §D Cuisine TMA / discovery |
| 656 | v0.61.155: location-mode classifier (PR 1/5 of 10-rule location spec) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 657 | v0.61.156: set_location + feature gate + no-nag (PR 2/5 of 10-rule location spec) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 658 | v0.61.157: boundary drift + single re-prompt (PR 3/5 of 10-rule location spec) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 659 | v0.61.158: carpark outside SG via Places + cuisine overlay backend (PR 4/5) | FOLDED | §F Transport / Train / Bus / Carpark |
| 660 | v0.61.159: Putrajaya UI button + train default + scope-guard (PR 5/5 — FINAL) | FOLDED | §F Transport / Train / Bus / Carpark |
| 661 | v0.61.160: Cuisine TMA LocationField — drop 2.5s auto-close + idempotent same-coord pick | FOLDED | §D Cuisine TMA / discovery |
| 662 | v0.61.161: progressive nearby widening for cuisine search | FOLDED | §D Cuisine TMA / discovery |
| 663 | v0.61.162: body.anchored flag bypasses lightShuffle gate for anchored cuisine searches | FOLDED | §D Cuisine TMA / discovery |
| 664 | v0.61.163: cuisine search cap 12→19; Results (X/Y) header; friendlier zero-state | FOLDED | §D Cuisine TMA / discovery |
| 665 | v0.61.164: Periodical count-history data layer (14 items, no UI yet) | FOLDED | §D.x Fruits / Periodical mode |
| 666 | v0.61.165: /ver Periodical sub-menu (PR 2/3 — UI for the v0.61.164 data layer) | FOLDED | §H Owner / Oversight tools |
| 667 | v0.61.166: Periodical cadence + 6h scheduler tick (PR 3/3 — closes the admin lever) | FOLDED | §D.x Fruits / Periodical mode |
| 668 | v0.61.167: autoResetOnLowCount — never auto-reset on a firstBatch response | FOLDED | §D Cuisine TMA / discovery |
| 669 | v0.61.168: Cuisine TMA carpark map LAYER non-SG wiring | FOLDED | §D Cuisine TMA / discovery |
| 670 | v0.61.169: live count templates + /api/cuisine/counts endpoint | FOLDED | §D Cuisine TMA / discovery |
| 671 | v0.61.170: TMA counter rewrite (24/12 split, cap 100, range labels) | FOLDED | §G Menu TMA + TMA misc |
| 672 | v0.61.171: chat free-text — seen-set + 🔍 for more button + recycle | FOLDED | §C Free-text chat pipeline |
| 673 | v0.61.172: fix v0.61.166 recountTrainStations + recountTrainLines schema mismatch | FOLDED | §K bug-fixes / misc |
| 674 | v0.61.173: cuisine-venue-counts standalone module + CLI runner (48 cuisines, manual) | FOLDED | §D-C Recognised venues |
| 675 | v0.61.174: TMA counter redesign + speech-bubble flash hint (5s) | FOLDED | §G Menu TMA + TMA misc |
| 676 | v0.61.175: Periodical owner UI — cadence in buttons + Set all off + Run now | FOLDED | §D.x Fruits / Periodical mode |
| 677 | v0.61.176: visible running-version chip on /ver + Periodical menu | FOLDED | §D Cuisine TMA / discovery |
| 679 | v0.61.177: cuisine-venue-counts chat trigger + Redis persistence | FOLDED | §D-C Recognised venues |
| 680 | v0.61.178: {cuisine-venues} placeholder in /start marketing copy | FOLDED | §D-C Recognised venues |
| 681 | v0.61.179: 60-second debounce on chat-side Cuisine Venues Recount | FOLDED | §D Cuisine TMA / discovery |
| 682 | v0.61.180: disable Cuisine TMA 🔍 FAB on pool exhaustion | FOLDED | §D Cuisine TMA / discovery |
| 683 | v0.61.181: smart tile-search to break Places 60-cap (9 SG + 6 JB tiles) | FOLDED | §D.7 Region modes |
| 684 | v0.61.182: cuisine TMA footer build-time chip | FOLDED | §D Cuisine TMA / discovery |
| 685 | v0.61.183: per-cuisine detail dump on cv:menu | FOLDED | §H Owner / Oversight tools |
| 686 | v0.61.184: data quality — resync mrt-coords.json _meta | FOLDED | §F Transport / Train / Bus / Carpark |
| 687 | v0.61.185: MY-PUT → OTHER rename + Putrajaya 20km cap + region-aware search | FOLDED | §D.7 Region modes |
| 688 | v0.61.186: Cuisine TMA re-fetches user-location on visibility change | FOLDED | §D Cuisine TMA / discovery |
| 689 | v0.61.187: Cuisine + Menu TMA LocationField — suppress UI when anchor is OTHER | FOLDED | §G Menu TMA + TMA misc |
| 690 | v0.61.188: OTHER LocationField — keep typing, suppress dropdowns | FOLDED | §D.2 LocationField + autocomplete + recents |
| 691 | v0.61.189: revert LocationField OTHER-suppression (full) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 692 | v0.61.190: Cuisine TMA result-panel title on two lines | FOLDED | §D Cuisine TMA / discovery |
| 693 | v0.61.191: OTHER country picker + Places search-by-country + confirmation list | FOLDED | §D.2 LocationField + autocomplete + recents |
| 694 | v0.61.192: Menu TMA OTHER picker mirrors v0.61.191 | FOLDED | §G Menu TMA + TMA misc |
| 695 | v0.61.193: SG-only cuisine chip gating (fruits/durian/durian-pastry locked when region != SG) | FOLDED | §D Cuisine TMA / discovery |
| 696 | v0.61.194: Catmull-Rom smoothing for LRT lines (BPL/SLRT/PLRT) | FOLDED | §F Transport / Train / Bus / Carpark |
| 697 | v0.61.195: /location chat command — 17-country picker + country-aware geocoding | FOLDED | §D.2 LocationField + autocomplete + recents |
| 698 | v0.61.196: TMA <-> chat country-pref sync via shared Redis key | FOLDED | §G Menu TMA + TMA misc |
| 699 | v0.61.197: recent-locations LRU + /lrecent chat drawer (10 entries) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 700 | v0.61.198: JB hybrid filter + first-batch-only nearby-widen (fixes "12 then 0" pagination) | FOLDED | §D Cuisine TMA / discovery |
| 701 | v0.61.199: place-search 400 diagnostic + friendly OTHER-picker error copy | FOLDED | §K Places API integration |
| 702 | v0.61.200: /location country hints + 17-entry quick-pick with Others | FOLDED | §D.2 LocationField + autocomplete + recents |
| 703 | v0.61.201: OTHER picker — Places + Geocoding parallel merge, 6 fuzzy matches | FOLDED | §D.2 LocationField + autocomplete + recents |
| 704 | v0.61.202: grouped /location quick-pick — 6 top-level buttons + 2 SG submenus | FOLDED | §D.2 LocationField + autocomplete + recents |
| 705 | v0.61.203: TMA region auto-flip — close all four mount paths | FOLDED | §D.7 Region modes |
| 706 | v0.61.204: Johor + Putrajaya state-flag assets — TMA region pill only | FOLDED | §D.7 Region modes |
| 707 | v0.61.205: Putrajaya flag PNG on OTHER region pill (IOI anchor only) | FOLDED | §D.7 Region modes |
| 708 | v0.61.206: stamp region='OTHER' at setUserLocation when coarse gate trips | FOLDED | §D.7 Region modes |
| 709 | v0.61.207: smart place label + skip SG area-text filter for OTHER region | FOLDED | §D.7 Region modes |
| 710 | v0.61.208: custom country dropdown (closed flag+CC, open flag+Name) | FOLDED | §D.7 Region modes |
| 711 | v0.61.208: vault snapshot (1114 files, 163 MB) | SKIPPED-vault-snapshot | vault-snapshot |
| 712 | v0.61.209: Menu TMA country-pref sync + WP-state abbreviation | FOLDED | §G Menu TMA + TMA misc |
| 713 | v0.61.210: per-country fuzzy text filter for OTHER cuisine search | FOLDED | §D Cuisine TMA / discovery |
| 714 | v0.61.211: keyboard nav for custom country dropdown (both TMAs) | FOLDED | §D.7 Region modes |
| 715 | v0.61.212: place-search variance test scaffolding (1700 tests, operator-run) | FOLDED | §K Places API integration |
| 716 | v0.61.213: /ver place-search variance test button | FOLDED | §H Owner / Oversight tools |
| 717 | v0.61.214: psv:/cv: callback messageId ReferenceError hotfix | FOLDED | §K bug-fixes / misc |
| 718 | v0.61.215: variance test field mask fix + chat error reporting | FOLDED | §K bug-fixes / misc |
| 719 | v0.61.216: city-preset variance buttons + /training command + Klang Valley venues | FOLDED | §M Removed Features (retired-surface) |
| 720 | v0.61.217: drop unknown includedRegionCodes from Places searchText (fixes 50/50 400) | FOLDED | §K Places API integration |
| 721 | v0.61.218: /training city aliases (KL → Kuala Lumpur) + round-robin emission | FOLDED | §M Removed Features (retired-surface) |
| 722 | v0.61.219: Cuisine TMA OTHER-region overlay disable + 'Closed now' prefix | FOLDED | §D Cuisine TMA / discovery |
| 723 | v0.61.220: Catmull-Rom curves for all 6 MRT lines (stations stay on the line) | FOLDED | §F Transport / Train / Bus / Carpark |
| 724 | v0.61.221: add SG at the bottom of Menu TMA country dropdown | FOLDED | §G Menu TMA + TMA misc |
| 725 | v0.61.222: OTHER picker — non-Latin fail-open + Places-path null fix | FOLDED | §D.7 Region modes |
| 726 | v0.61.223: Menu TMA — always-visible quick-pick + flag dropdown mirrors anchor country | FOLDED | §G Menu TMA + TMA misc |
| 727 | v0.61.224: Cuisine TMA map recenters to detected place anchor on free-text search | FOLDED | §D Cuisine TMA / discovery |
| 728 | v0.61.225: Durian + Durian Pastry full operator catalogues (41 + 41) | FOLDED | §D Cuisine TMA / discovery |
| 730 | v0.61.227: Menu TMA cascading city dropdown (16 countries / 133 cities; MY = 15 capitals) | FOLDED | §G Menu TMA + TMA misc |
| 731 | v0.61.228: Cuisine TMA cascading city dropdown (mirrors v0.61.227 Menu TMA) | FOLDED | §D Cuisine TMA / discovery |
| 732 | v0.61.229: Durian/Durian-Pastry correction — ACCEPT primaryType + variety-extract only + variance CLI | FOLDED | §D.x Fruits / Periodical mode |
| 733 | v0.61.230: /s chat search picks up the anchor's country (regionCode derived from loc) | FOLDED | §C Free-text chat pipeline |
| 734 | v0.61.231: notebook aspect ratio — TMA caps 1280 → 1600 + remove Transport 960px double-cap | FOLDED | §G Menu TMA + TMA misc |
| 735 | v0.61.232: social-profile row (re-ship from closed PR #729 on current main) | FOLDED | §J Venue rendering |
| 736 | v0.61.233: city dropdown — shortform code closed (BKK / KUL / …), scrollable open, free-text input usable | FOLDED | §C Free-text chat pipeline |
| 737 | v0.61.234: rare-cuisine fixes — drop Australasia catch-all + Georgian keywords/override + sparse-coverage hint | FOLDED | §D Cuisine TMA / discovery |
| 738 | v0.61.235: widen Durian/Durian-Pastry ACCEPT primaryType lists from variance data | FOLDED | §D.x Fruits / Periodical mode |
| 739 | v0.61.236: Cuisine TMA OTHER picker — compact resting pill (collapse to one-line after a city pick) | FOLDED | §D Cuisine TMA / discovery |
| 740 | v0.61.237: auto-fire search after OTHER city / JB place pick (explicit-anchor runSearch) | FOLDED | §D.7 Region modes |
| 741 | v0.61.238: Cuisine TMA — tryServerCache flips region → SG when cached anchor is SG (was sticky on OTHER) | FOLDED | §D Cuisine TMA / discovery |
| 742 | v0.61.239: first-load cap 24 → 5 (curated first impression instead of 48/84 cumulative) | FOLDED | §D Cuisine TMA / discovery |
| 743 | v0.61.240: combo criteria line under result title + #DCEBFF selected category cards | FOLDED | §D Cuisine TMA / discovery |
| 744 | v0.61.241: location pill — speech-bubble suffix + OTHER city-pick no-auto-fire | FOLDED | §K bug-fixes / misc |
| 745 | v0.61.242: IATA city-code reference table + cities.js audit (no behavior change) | FOLDED | §D.7 Region modes |
| 746 | v0.61.243: GPS auto-detect on mount → snap to nearest IATA city (+ Gemini fallback) | FOLDED | §K Data / APIs / Gemini |
| 747 | v0.61.244: JB/OTHER picks don't auto-fire + 6s idle "Tap 🔍" reminder | FOLDED | §D.7 Region modes |
| 748 | v0.61.245: docs — VibeCodingRecord ledger catch-up PRs #654-#747 (94 PRs) | SKIPPED-doc-only | doc-only |
| 749 | v0.61.246: open-hours — currently-open closing time + same-day reopen | FOLDED | §D Hidden Gems / open-hours |
| 750 | v0.61.247: revert v0.61.241 location-suffix speech bubble + mt-7 gap | FOLDED | §K bug-fixes / misc |
| 751 | v0.61.248: Menu TMA layout — compact dropdowns + persist selection + 🔍 inside boundary | FOLDED | §G Menu TMA + TMA misc |
| 752 | v0.61.249: Menu TMA GPS auto-detect → snap to nearest IATA city (port of v0.61.243) | FOLDED | §G Menu TMA + TMA misc |
| 753 | v0.61.250: country → capital auto-pick (both TMAs) | FOLDED | §G Menu TMA + TMA misc |
| 754 | v0.61.251: cities.js nearest-by-distance sync — close the HK / Sibu "— —" gap | FOLDED | §D.7 Region modes |
| 755 | v0.61.252: Putrajaya bug — prefer curated cities.js entry name over IATA canonical | FOLDED | §D.7 Region modes |
| 756 | v0.61.253: Cuisine TMA LocationField — 2-row layout + flag prefix + 🔝 meta | FOLDED | §D Cuisine TMA / discovery |
| 757 | v0.61.254: Menu TMA — collapse location card to single compact pill (like Cuisine TMA) | FOLDED | §D Cuisine TMA / discovery |
| 758 | v0.61.255: Halal chip → حلال bold green + Durian → Durian Fruits + DurianPastry seasonal note | FOLDED | §D Cuisine TMA / discovery |
| 760 | v0.61.256: Menu picker — expanded-when-anchored fix + DAJ→CJJ sync + 'Unnamed' label guard | FOLDED | §K bug-fixes / misc |
| 761 | v0.61.257: Durian + Durian Pastry precision — strong-haystack-only + strict-name gate | FOLDED | §D.x Fruits / Periodical mode |
| 763 | v0.61.258: durian-variance.js — JSON output + Kuala Lumpur region | FOLDED | §D.x Fruits / Periodical mode |
| 764 | v0.61.259: GitHub Actions automation + Markdown table for durian variance | SKIPPED-ci-only | ci-only |
| 765 | v0.61.260: Durian variance moved to /ver inline button (server uses Railway env var) | SKIPPED-ci-only | ci-only |
| 766 | v0.61.261: Durian variance baseline — 70.6% cross-region precision (v0.61.257 validated) | FOLDED | §D.x Fruits / Periodical mode |
| 768 | v0.61.262: Durian precision/recall — restaurant accept + recency reviews + coverage expansion | FOLDED | §D.x Fruits / Periodical mode |
| 769 | v0.61.263: durian variance archive — DURIAN 83.4% ✅, DURIAN_PASTRY 18.0% ⚠️ | FOLDED | §D.x Fruits / Periodical mode |
| 770 | v0.61.264: Gemini cross-check for durian variance kept-venue list | FOLDED | §D-C Recognised venues |
| 771 | v0.61.265: LocationField — no-country labels + 'Unnamed' fix + region-clear (both TMAs) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 772 | v0.61.266: Cuisine TMA honors Menu-set anchor label | FOLDED | §D Cuisine TMA / discovery |
| 773 | v0.61.267: OTHER picker uses JB-style autocomplete-on-keystroke | FOLDED | §D.7 Region modes |
| 774 | v0.61.268: Location — JB focus-points (Southkey/CBD) + OTHER GPS revert on city-clear | FOLDED | §D.7 Region modes |
| 775 | v0.61.269: Menu TMA OTHER → autocomplete + deprecate place-search-by-country | FOLDED | §G Menu TMA + TMA misc |
| 776 | v0.61.270: Phase 2 SSOT — writer parity + country round-trip | FOLDED | §A Surfaces overview / setup |
| 777 | v0.61.271: Phase 3 backend API sync — countryCode end-to-end + drop SG suffix default | FOLDED | §K bug-fixes / misc |
| 778 | v0.61.272: Phase 4 — Globalize Niche Cuisines (delete SG_ONLY_SLUGS) | FOLDED | §A Surfaces overview / setup |
| 779 | v0.61.273: first-paint '__NONE__' sentinel (Phase 1 audit A1) | FOLDED | §A Surfaces overview / setup |
| 780 | v0.61.274: mount-time location coherence modal (Cuisine + Menu) | FOLDED | §D.2 LocationField + autocomplete + recents |
| 781 | v0.61.275: Plan B — cached Gemini labels → cuisine-search post-filter | FOLDED | §K Data / APIs / Gemini |
| 782 | v0.61.276: JB-coords coherence — server sanity + client modal + graceful filter exit | FOLDED | §D.7 Region modes |
| 783 | v0.61.277: JB chip + pill auto-anchor + modal ref reset | FOLDED | §D Cuisine TMA / discovery |
| 784 | v0.61.278: CI hygiene + JB→OTHER fallback toast | SKIPPED-ci-only | ci-only |
| 785 | v0.61.279: O-26 threshold extract + O-27 Menu __NONE__ parity + O-28 dead-route delete | FOLDED | §D.2 LocationField + autocomplete + recents |
| 786 | v0.61.280: Michelin in OTHER — strip + sparse notice (O-31) | FOLDED | §D-C Recognised venues |
| 787 | v0.61.281: 5-chip JB focus row + 8s suffix auto-hide | FOLDED | §D Cuisine TMA / discovery |
| 788 | v0.61.282: online verify-then-cache for OTHER + JSON seed script | FOLDED | §D.7 Region modes |
| 789 | v0.61.283: fix durian-variance placeId loss — Plan B cache now populated | FOLDED | §D.x Fruits / Periodical mode |
| 790 | v0.61.284: halal-active contrast + tap-to-search hint visibility | FOLDED | §D Cuisine TMA / discovery |
| 791 | v0.61.285: NLB-sourced fun-facts modal during cuisine-search wait | FOLDED | §D.x Fun-facts modal |
| 792 | v0.61.286: FunFactModal dark-mode border contrast | FOLDED | §D.x Fun-facts modal |
| 793 | v0.61.287: Register O-37 (iCloud-stale-checkout risk) + branch cleanup | SKIPPED-doc-only | doc-only |
| 794 | v0.61.288: durian-variance-runner.js placeId carry (v0.61.283 follow-up) | FOLDED | §D.x Fruits / Periodical mode |
| 795 | v0.61.289: CI empty-blob guardrail (O-37) + Slavic/EE variance (O-32) | SKIPPED-ci-only | ci-only |
| 796 | v0.61.290: fun-facts JSON → JS module port (fixes silent vitest fail) | SKIPPED-test-only | test-only |
| 797 | v0.61.291: cuisine-tag priority in fun-fact selector | FOLDED | §D.x Fun-facts modal |
| 798 | v0.61.292: Removed Features RF-12 → RF-15 (clears 4 KNOWN-GAPS) | SKIPPED-doc-only | doc-only |
| 799 | v0.61.293: unify variance modules — CLI becomes thin wrapper around runner | FOLDED | §D.x Fruits / Periodical mode |
| 800 | v0.61.294: auto-warming Gemini cache extended to fruits mode | FOLDED | §D.x Fruits / Periodical mode |
| 801 | v0.61.295: Phase 2A fun-facts — 12 MY/regional facts (40 → 52) | FOLDED | §A Surfaces overview / setup |
| 802 | v0.61.296: Phase 2B fun-fact chat surface — separate "💡" reply on /c | FOLDED | §A Surfaces overview / setup |
| 803 | v0.61.297: anti-repeat variety + FunFactModal stacking fix | FOLDED | §D.x Fun-facts modal |
| 804 | v0.61.298: Romanian seed expansion (slavic-ee-variance, 68 → ~120+) | FOLDED | §D.7 Region modes |
| 805 | v0.61.299: extend D703e/f Gemini cache to 7 Slavic/EE cuisines | FOLDED | §K Data / APIs / Gemini |
| 806 | v0.61.300: Slavic/EE seed-tuning — native-language generic phrases | FOLDED | §D.7 Region modes |
| 807 | v0.61.301: master Register refresh @ v0.61.300 | SKIPPED-doc-only | doc-only |
| 808 | v0.61.302: unit tests for durian-variance-runner (closes O-41) | SKIPPED-test-only | test-only |
| 809 | v0.61.303: Gemini cache extended to 21 more cuisines (East Asian + South Asian + European) | FOLDED | §K Data / APIs / Gemini |
| 810 | v0.61.304: Menu TMA visibility-rehydrate + tile-navigate hash-preserve | FOLDED | §G Menu TMA + TMA misc |
| 811 | v0.61.305: in-TMA recents drawer + LRU cap 20 + auto-fire flip | FOLDED | §G Menu TMA + TMA misc |
| 812 | v0.61.306: doc upkeep — feature RF-16 + post-merge confirmations | SKIPPED-doc-only | doc-only |
| 813 | v0.61.307: /cost owner-gated API-spend tracker | FOLDED | §H Owner / Oversight tools |
| 814 | v0.61.308: vault snapshot (1296 files, 178 MB) | SKIPPED-vault-snapshot | vault-snapshot |
| 815 | v0.61.309: chat /cuisine → Places-first; LLM-invents-names path retired | FOLDED | §D Cuisine TMA / discovery |
| 816 | v0.61.310: wire Cuisine + Hawker TMA maps to MAP_ID env | FOLDED | §E Hawker TMA |
| 817 | v0.61.311: flip Cuisine TMA region pill on LocationField pick | FOLDED | §D Cuisine TMA / discovery |
| 818 | v0.61.312: owner-gate /hidden (Hidden Gems flow) | FOLDED | §D Hidden Gems / open-hours |

---

## Summary by status

| Status | Count |
|---|---|
| FOLDED | 696 |
| SKIPPED-doc-only | 74 |
| SKIPPED-vault-snapshot | 14 |
| SKIPPED-ci-only | 9 |
| SKIPPED-test-only | 4 |
| **TOTAL** | **797** |

## Summary by spec section (FOLDED only)

| Spec section | PR count |
|---|---|
| §D Cuisine TMA / discovery | 178 |
| §F Transport / Train / Bus / Carpark | 64 |
| §I Google-map micro-details (overlays / pins / popups) | 63 |
| §G Menu TMA + TMA misc | 49 |
| §D-C Recognised venues | 42 |
| §D Hidden Gems / open-hours | 35 |
| §M Removed Features | 34 |
| §C Free-text chat pipeline | 32 |
| §D.2 LocationField + autocomplete + recents | 25 |
| §D.7 Region modes | 23 |
| §K Data / APIs / Gemini | 20 |
| §E Hawker TMA | 17 |
| §B.x i18n / setMyCommands / setMyDescription | 15 |
| §K.x Bug-fixes & hotfixes | 15 |
| §D.x Fruits / Periodical mode | 14 |
| §H Owner / Oversight tools | 13 |
| §F.4 Weather | 8 |
| §K Express server / rate limit | 8 |
| §A Surfaces overview / setup | 8 |
| §G.x Legal / Privacy / Forgetme / Start | 8 |
| §G.x Clipboard / Share / Picks | 7 |
| §K Places API integration | 5 |
| §D.x Fun-facts modal | 4 |
| §D.5 Signals (crowd / footfall / rarity / sanctuary) | 3 |
| §M Removed - Reason-Fetch-Refine pipeline | 3 |
| §J Venue rendering | 2 |
| §K.x Observability | 1 |
| **TOTAL FOLDED** | **696** |
