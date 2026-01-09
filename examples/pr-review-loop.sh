#!/bin/bash
set -e

# PR Review Loop
# ================
# Runs Ralph to work through SPEC tasks, creating a PR for each one.
# Useful for teams that want code review before merging.
#
# Usage:
#   ./examples/pr-review-loop.sh 10         # Run 10 iterations
#
# What it does:
#   - Creates a branch for each task
#   - Implements the task
#   - Opens a GitHub PR for review
#   - Returns to main branch
#
# Requirements:
#   - GitHub CLI (gh) must be installed: https://cli.github.com
#   - Repository must have a GitHub remote

ITERATIONS=${1:-10}

# Check requirements
if ! command -v gh &> /dev/null; then
  echo "Error: GitHub CLI (gh) is required"
  echo "Install: https://cli.github.com"
  exit 1
fi

if ! git remote get-url origin &> /dev/null; then
  echo "Error: No git remote 'origin' found"
  echo "Add one: git remote add origin <url>"
  exit 1
fi

MAIN_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "Running PR review loop"
echo "  Iterations: $ITERATIONS"
echo "  Main branch: $MAIN_BRANCH"
echo ""

ralph run -n "$ITERATIONS" -p "You are implementing SPEC tasks with PRs for review.

1. Read SPEC.md and find the next incomplete task
2. Create a feature branch: git checkout -b feature/<task-name>
3. Implement the task with tests
4. Commit with a clear message
5. Push: git push -u origin HEAD
6. Create PR: gh pr create --title '<task>' --body '<summary>'
7. Switch back: git checkout ${MAIN_BRANCH}
8. Update STATE.txt with the PR link

Only do ONE task per iteration.
When SPEC is complete, output <promise>COMPLETE</promise>."
