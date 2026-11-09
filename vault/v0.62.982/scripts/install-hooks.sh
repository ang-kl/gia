#!/bin/sh
# scripts/install-hooks.sh — O-219
#
# .git/hooks/ is NOT version-controlled, so a hook committed to the repo
# protects nobody until it is installed. This installs it, and is idempotent.
#
#   sh scripts/install-hooks.sh
#
# Installs pre-push -> scripts/prepush-guard.mjs, which blocks a fast-forward
# push onto a branch whose PR has already been squash-merged (X-20, X-22,
# X-23, X-31 — four occurrences in one arc, every one of which SUCCEEDED at
# the git level while the work never reached main).
set -e

ROOT=$(git rev-parse --show-toplevel)
HOOK_DIR="$ROOT/$(git rev-parse --git-path hooks | sed "s|^$ROOT/||")"
mkdir -p "$HOOK_DIR"
TARGET="$HOOK_DIR/pre-push"

if [ -e "$TARGET" ] && ! grep -q 'prepush-guard' "$TARGET" 2>/dev/null; then
  # Never clobber someone else's hook silently — that is the destructive
  # version of the very problem this guards.
  echo "pre-push hook already exists and is not ours: $TARGET" >&2
  echo "Inspect it and add this line yourself if you want both:" >&2
  echo "  node \"\$(git rev-parse --show-toplevel)/scripts/prepush-guard.mjs\"" >&2
  exit 1
fi

cat > "$TARGET" <<'HOOK'
#!/bin/sh
# installed by scripts/install-hooks.sh — O-219
exec node "$(git rev-parse --show-toplevel)/scripts/prepush-guard.mjs"
HOOK
chmod +x "$TARGET"
echo "installed: $TARGET"
echo "check the current branch any time with:"
echo "  node scripts/prepush-guard.mjs --check"
