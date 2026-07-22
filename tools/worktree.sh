#!/usr/bin/env bash
#
# worktree.sh — create/enter a per-app git worktree so each chat works in isolation.
#
# One chat == one app == one worktree on branch app/<app>. See CLAUDE.md
# ("Working in worktrees — one chat, one app") for the why. Worktrees live as siblings of the
# root clone: ~/Documents/Projects/servicenow-worktrees/<app>.
#
# Usage:  tools/worktree.sh <app>          e.g. tools/worktree.sh packager
# Prints the worktree path on stdout (all status goes to stderr) so it's safe to `cd "$(...)"`.

set -euo pipefail

app="${1:-}"
if [ -z "$app" ]; then
  echo "usage: tools/worktree.sh <app>  (e.g. packager, standards, glide-studio)" >&2
  exit 2
fi

root="$(git rev-parse --show-toplevel)"
# The root clone lives at .../servicenow; put worktrees at .../servicenow-worktrees/<app>.
parent="$(dirname "$root")"
wt="$parent/servicenow-worktrees/$app"
branch="app/$app"

if [ -d "$wt" ]; then
  echo "worktree already exists: $wt (branch $branch)" >&2
  echo "$wt"
  exit 0
fi

mkdir -p "$parent/servicenow-worktrees"
git fetch origin main --quiet

if git show-ref --verify --quiet "refs/heads/$branch"; then
  echo "branch $branch exists — checking it out in a new worktree" >&2
  git worktree add "$wt" "$branch" >&2
else
  echo "creating branch $branch from origin/main" >&2
  git worktree add "$wt" -b "$branch" origin/main >&2
fi

echo "ready: $wt (branch $branch)" >&2
echo "launch this app's chat from that directory." >&2
echo "$wt"
