# vibe-journal

Project-agnostic knowledge-surface generator for projects that follow the **CLAUDE-FULL.md folder-template convention** (Builder / Persona / Feature / Technical / Legal / Journal / Chat / Register + `vault/<version>/` snapshots + optional `third-party.yaml`).

Output: a **static multi-tab HTML site** any team member can browse. No backend required — drop the output behind any static host or reverse-proxy auth.

> Lives inside the `gia` repo at `.vibe-journal/` so it travels with the project. Project-agnostic — lift it out to its own repo any time with `cp -a .vibe-journal /elsewhere/vibe-journal && cd /elsewhere/vibe-journal && npm install`.

## Quickstart (inside gia)

```bash
cd .vibe-journal
npm install                                              # one-time
node bin/vibe-journal.mjs regen --config examples/soleat-gia/config.yaml
node bin/vibe-journal.mjs serve --config examples/soleat-gia/config.yaml --port 5478
# open http://localhost:5478
```

## What you get (v1)

Five rows of tabs, surfacing every doc type the convention defines plus two new operator-requested surfaces (Vault, 3rd Party):

```
Row 1:  PR        | Register   | 3rd Party
Row 2:  Technical | Feature
Row 3:  Legal     | Vault
Row 4:  Journal
Row 5:  Builder   | Persona
```

Each tab is rendered from `data/<doc-type>.ndjson` which the parsers emit from your project's `doc/` folder.

## Install

```bash
git clone <this repo> ~/vibe-journal
cd ~/vibe-journal
npm install
npm link        # makes `vibe-journal` available globally
```

## Use in your project

```bash
cd ~/my-project
vibe-journal init            # writes vibe-journal.config.yaml
vibe-journal regen           # parses doc/ + vault/ + 3rd-party manifest → emits dist/vibe-journal/
vibe-journal serve           # local preview on http://localhost:5478
```

Deploy: copy `dist/vibe-journal/` to any static host (GitHub Pages, Netlify, S3 + CloudFront, Railway static, etc.) or commit to a `gh-pages` branch.

## Config (`vibe-journal.config.yaml`)

```yaml
project:
  name: My Project
  repo: org/repo
  doc_root: doc/
  vault_root: vault/

output: dist/vibe-journal/

sources:
  pr:
    enabled: true
    github_repo: org/repo
  register: { glob: "doc/Register/register-*.md" }
  third_party:
    sources:
      - { type: yaml, path: doc/third-party.yaml }
      - { type: github-issues, repo: org/repo, state: all }
  technical:  { glob: "doc/Technical/technical-*.md" }
  feature:    { glob: "doc/Feature/feature-*.md" }
  legal:      { glob: "doc/Legal/legal-*.md" }
  vault:      { glob: "vault/*/VAULT_README.md" }
  journal:    { glob: "doc/Journal/journal-*.md", hdr_format: "[HDR]" }
  builder:    { glob: "doc/Builder/builder-*.md" }
  persona:    { glob: "doc/Persona/persona-*.md" }
```

Run `vibe-journal init` to scaffold this with sensible defaults.

## Convention assumed

This tool assumes your project follows the eight-folder template documented in [CLAUDE-FULL.md](https://github.com/<your-org>/<your-repo>/blob/main/doc/CLAUDE-FULL.md) (the "Soleat doc system"). Specifically:

- One versioned file per doc type per major-milestone: `<type>-<MAJOR_MINOR_PATCH>-<dd_mm_yy-hhmm>.md`.
- Journal entries use `[HDR]` blocks per [doc/Journal/Journal.md](https://github.com/<your-org>/<your-repo>/blob/main/doc/Journal/Journal.md) skeleton.
- AU-1 / AU-3 append-only: vibe-journal parses ALL versioned files and lets you filter by version.
- AU-7 amendments live in §7 of each file; rendered with a "see amendments" badge.
- `vault/<version>/VAULT_README.md` follows the standard structure (file count, exclusions, boot instructions, arc table).
- `doc/third-party.yaml` (optional, project-defined) — see [examples/](examples/) for the schema.

If your project doesn't follow this convention, write a custom parser in `lib/parsers/<doc-type>.mjs` and plug it via `sources.<type>.parser: custom`.

## Example

```bash
npm run demo            # regens against the included Soleat (ang-kl/gia) example
npm run demo:serve      # preview
```

## Roadmap

v1 (this release): all 10 tabs render from parsed ndjson; static HTML; client-side tab switching; no auth (deploy behind reverse-proxy auth if needed).

v2 (planned): full-text search (lunr.js); GitHub Actions CI auto-regen; per-team-member key allowlist; DAG view of versioned-file dependencies.

## License

MIT (or your team's preference — update before publishing).
