#!/bin/bash
# scripts/install-stop-hook.sh — install the repo's stop hook over the
# harness copy. Runs at SessionStart via .claude/settings.json, and by hand.
#
# The harness rewrites ~/.claude/stop-hook-git-check.sh from
# /opt/env-runner/environment-manager on every container start, so the fix
# in scripts/stop-hook-git-check.sh has to be re-applied each time. Outside
# a harness container (no target file) this is a no-op. Idempotent: an
# already-identical target is left alone.
set -u
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
src="$here/stop-hook-git-check.sh"
dst="${STOP_HOOK_TARGET:-$HOME/.claude/stop-hook-git-check.sh}"
[[ -f "$src" ]] || { echo "[install-stop-hook] missing $src" >&2; exit 1; }
[[ -f "$dst" ]] || exit 0
if cmp -s "$src" "$dst"; then exit 0; fi
cp "$src" "$dst" && chmod +x "$dst" && echo "[install-stop-hook] installed $src -> $dst"
