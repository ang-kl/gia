#!/usr/bin/env bash
# scripts/visual-docker.sh - v0.62.996 (v0.63 plan, phase 1)
#
# Run the phone snapshots (visual/) inside Playwright's official image, the same image CI's `visual` job uses,
# so the browser and the fonts match the committed baselines. Spec:
# doc/Feature/2026-11-26-v063-phase1-phone-snapshots.spec.md, D-1.
#
#   scripts/visual-docker.sh             run both suites against the baselines
#   scripts/visual-docker.sh --update    rewrite the baselines (look at every changed image before committing)
#   scripts/visual-docker.sh <args...>   any other arguments go to `playwright test`
#
# Needs: Docker, `npm install` done, and the apps built (`npm run build`), because the suites photograph
# public/<app>/. The image tag must match @playwright/test in package.json (__tests__/visual-pins.test.js).
set -euo pipefail

IMAGE="mcr.microsoft.com/playwright:v1.63.0-noble"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

args=("$@")
if [ "${1:-}" = "--update" ]; then
  args=(--update-snapshots "${@:2}")
fi

exec docker run --rm --ipc=host \
  -v "$ROOT":/work -w /work \
  -e CI=1 \
  "$IMAGE" \
  npx playwright test "${args[@]}"
