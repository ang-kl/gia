#!/bin/bash

# Read the JSON input from stdin
input=$(cat)

# Check if stop hook is already active (recursion prevention)
stop_hook_active=$(echo "$input" | jq -r '.stop_hook_active')
if [[ "$stop_hook_active" = "true" ]]; then
  exit 0
fi

# Check if we're in a git repository - bail if not
if ! git rev-parse --git-dir >/dev/null 2>&1; then
  exit 0
fi

# Bail if there's no remote to push to. Every error path below asks the user
# to "push to the remote branch" — meaningless without a remote, and
# unsatisfiable if signing also requires a source. This case arises when CCR
# was launched against a local repo with no github remote (sources=[]) and
# the container's cwd has a leftover .git from a cached resume.
if [[ -z "$(git remote)" ]]; then
  exit 0
fi

# Check for uncommitted changes (both staged and unstaged)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "There are uncommitted changes in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

# Check for untracked files that might be important
untracked_files=$(git ls-files --others --exclude-standard)
if [[ -n "$untracked_files" ]]; then
  echo "There are untracked files in the repository. Please commit and push these changes to the remote branch." >&2
  exit 2
fi

# ---------------------------------------------------------------------------
# gia: this file is the harness's ~/.claude/stop-hook-git-check.sh with ONE
# block replaced — the "unpushed commits" check at the bottom. Everything
# above that block is byte-identical to the harness copy vendored at
# __tests__/fixtures/stop-hook-git-check.harness.sh, and a test asserts it.
#
# The harness copy is re-provisioned from /opt/env-runner/environment-manager
# on every container start, so it cannot be edited in place: it is installed
# over the harness copy by scripts/install-stop-hook.sh, which the repo's
# .claude/settings.json runs at SessionStart. See journal [AMD-216].
#
# TWO DEFECTS in the original block, both measured on 07-09 '26:
#   1. It counted `origin/<branch>..HEAD`. After every squash-merge restart
#      the remote branch tip is a dead line content-identical to main, so
#      main's own squash commit is counted as "unpushed": it reported 2 when
#      exactly 1 commit was on no remote ref at all.
#   2. It exited 2 for ANY unpushed commit. D-210 (CLAUDE.md) requires a
#      merge record — subject `[AMD-n] …` — to stay unpushed until
#      substantive work carries it, so the hook and the standing rule
#      disagreed on every stop.
# ---------------------------------------------------------------------------
current_branch=$(git branch --show-current)
if [[ -n "$current_branch" ]]; then
  # Check for local commits that GitHub will show as "Unverified": either no
  # signature at all, or a committer email other than noreply@anthropic.com
  # (the identity CCR's signing key is registered to). Only run when commit
  # signing is configured.
  #
  # Signature presence is tested via the raw gpgsig/gpgsig-sha256 header,
  # NOT %G?. CCR/BYOC configure SSH signing (gpg.format=ssh, /tmp/code-sign;
  # byoc.go:754-758) but never set gpg.ssh.allowedSignersFile, so %G?
  # reports 'N' for correctly SSH-signed commits — see
  # api-go/ccr/e2e/byoc/scenario_sign_commit_test.go:117 and
  # antique/cmd/aq/git.go listUnsignedCommits for the same rationale.
  #
  # Scope to commits that are on NO remote ref ($upstream..HEAD would sweep
  # in teammates' already-published commits whenever this branch was cut
  # from a feature branch and has no same-named remote yet —
  # github.com/anthropics/claude-code#69586). Only run when
  # origin/$current_branch resolves (env-manager managed flow:
  # createLocalBranch → UpdateRemoteTrackingBranch, git.go:2496). Not
  # origin/HEAD: a single-branch/shallow clone onto a non-default branch
  # has origin/HEAD but no ref covering the agent's branch's base, so
  # 'HEAD --not --remotes' would sweep in teammates' published commits.
  # Env-manager's SHA-pinned init+fetch checkouts (git.go:2079-2081)
  # don't set origin/$current_branch either, and a later 'git fetch
  # origin main' doesn't set it, so those shapes skip (previously
  # \$upstream=origin/HEAD failed to resolve there and this block
  # silently no-op'd — preserve that). This also skips agent-created
  # branches ('git checkout -b fix-xyz') in full clones — a deliberate
  # false-negative window, traded for never re-introducing an origin/HEAD
  # fallback whose destructive rewrite advice on shallow/single-branch
  # clones is the bug this gate fixes (#69586).
  if [[ "$(git config --type=bool commit.gpgsign 2>/dev/null)" == "true" ]] &&
     git rev-parse -q --verify "origin/$current_branch" >/dev/null 2>&1; then
    local_count="$(git rev-list HEAD --not --remotes --count 2>/dev/null)"
    if [[ -n "$local_count" && "$local_count" -gt 0 ]]; then
      unverifiable=""
      while read -r sha ce; do
        if [[ "$ce" != "noreply@anthropic.com" ]] ||
           ! git cat-file commit "$sha" 2>/dev/null | sed '/^$/q' | grep -qE '^gpgsig(-sha256)? '; then
          unverifiable+="${sha:0:7} $ce"$'\n'
        fi
      done < <(git log --format='%H %ce' HEAD --not --remotes 2>/dev/null)
      if [[ -n "$unverifiable" ]]; then
        # Derive a safe rebase boundary: the parent of the oldest local-only
        # commit, falling back to --root when it has none. Only advise the
        # range rebase when local-only history is a linear chain on top of
        # the boundary — rebase replays the whole <boundary>..HEAD range,
        # not the 'on no remote' set, so a non-linear graph (e.g. after
        # 'git merge origin/main') would replay+reset-author the published
        # commits brought in by the merge.
        oldest_local="$(git rev-list HEAD --not --remotes 2>/dev/null | tail -1)"
        if git rev-parse -q --verify "$oldest_local^" >/dev/null 2>&1; then
          rebase_onto="$oldest_local^"
          range_count="$(git rev-list "$rebase_onto..HEAD" --count 2>/dev/null)"
        else
          rebase_onto="--root"
          range_count="$(git rev-list HEAD --count 2>/dev/null)"
        fi
        echo "There are commit(s) on branch '$current_branch' that GitHub will show as Unverified (missing signature, or committer email is not noreply@anthropic.com):" >&2
        printf '%s' "$unverifiable" >&2
        if [[ "$range_count" == "$local_count" ]]; then
          echo "Please run 'git config user.email noreply@anthropic.com && git config user.name Claude', then 'git commit --amend --no-edit --reset-author' for the tip commit, or 'git rebase --exec \"git commit --amend --no-edit --reset-author\" $rebase_onto' for earlier commits, then push." >&2
        else
          echo "Please run 'git config user.email noreply@anthropic.com && git config user.name Claude', then 'git commit --amend --no-edit --reset-author' for each listed commit (local history is non-linear, so a range rebase would rewrite published commits), then push." >&2
        fi
        exit 2
      fi
    fi
  fi

  # Baseline: every remote ref, not the stale same-named branch ref — the
  # same set the signing block above already uses. A best-effort fetch of
  # main first, so a squash merge that happened since the last fetch is
  # visible (scripts/prepush-guard.mjs hook mode does the same).
  git fetch origin main --quiet >/dev/null 2>&1 || true
  held_count=0
  pending=""
  while read -r sha subject; do
    [[ -z "$sha" ]] && continue
    # D-210: a held merge record is identified by its SUBJECT starting with
    # `[AMD-<n>]`. Anchored at the start — a code commit that merely mentions
    # a record in its subject is still code.
    if [[ "$subject" =~ ^\[AMD-[0-9]+\] ]]; then
      held_count=$((held_count + 1))
    else
      pending+="${sha:0:7} ${subject}"$'\n'
    fi
  done < <(git log --format='%H %s' HEAD --not --remotes 2>/dev/null)
  pending_count=$(printf '%s' "$pending" | grep -c .)
  if [[ "$pending_count" -gt 0 ]]; then
    echo "There are $pending_count unpushed commit(s) on branch '$current_branch'. Please push these changes to the remote repository." >&2
    printf '%s' "$pending" >&2
    if [[ "$held_count" -gt 0 ]]; then
      echo "($held_count held merge record(s) with a [AMD-n] subject are not counted, per D-210; they ride this push.)" >&2
    fi
    exit 2
  fi
  # Only held records (or nothing) are unpushed: stay quiet, per D-210 and
  # the operator's instruction in §3,362·D. The cost — a held record lives
  # in this container alone until substantive work carries it — is
  # documented in CLAUDE.md under D-210 and was paid on 07-09 '26.
fi

exit 0
