#!/bin/bash
#
# Spec Generation Prompt Testing Workflow
#
# This script helps run before/after comparisons of spec generation prompts.
#
# Usage:
#   ./test-workflow.sh before   # Stash changes, run tests with OLD prompts
#   ./test-workflow.sh after    # Restore changes, run tests with NEW prompts
#   ./test-workflow.sh compare  # Compare before vs after results
#   ./test-workflow.sh full     # Run complete workflow (before + after + compare)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Files that contain the prompt changes
PROMPT_FILES=(
  "skills/create-spec/SKILL.md"
  "src/lib/spec-generator.ts"
)

case "$1" in
  before)
    echo "=== BEFORE: Testing with OLD prompts ==="

    # Check if there are changes to stash
    if git diff --quiet "${PROMPT_FILES[@]}" 2>/dev/null; then
      echo "No changes detected in prompt files. Make changes first or use 'full' workflow."
      exit 1
    fi

    # Stash the current changes
    echo "Stashing current prompt changes..."
    git stash push -m "prompt-test-stash" -- "${PROMPT_FILES[@]}"

    # Run tests
    echo "Running tests with OLD prompts..."
    npx tsx .ai/prompt-tests/run-tests.ts --phase before

    echo ""
    echo "BEFORE tests complete. Now run: $0 after"
    ;;

  after)
    echo "=== AFTER: Testing with NEW prompts ==="

    # Check if stash exists
    STASH_REF=$(git stash list | grep "prompt-test-stash" | head -1 | cut -d: -f1)
    if [ -z "$STASH_REF" ]; then
      echo "No stashed changes found. Did you run 'before' first?"
      echo "If changes are already applied, just run the tests:"
      echo "  npx tsx .ai/prompt-tests/run-tests.ts --phase after"
      exit 1
    fi

    # Restore the stashed changes
    echo "Restoring prompt changes from stash..."
    git stash pop "$STASH_REF"

    # Rebuild if needed
    echo "Rebuilding..."
    npm run build 2>/dev/null || true

    # Run tests
    echo "Running tests with NEW prompts..."
    npx tsx .ai/prompt-tests/run-tests.ts --phase after

    echo ""
    echo "AFTER tests complete. Now run: $0 compare"
    ;;

  compare)
    echo "=== COMPARING BEFORE vs AFTER ==="
    npx tsx .ai/prompt-tests/run-tests.ts --compare
    ;;

  full)
    echo "=== FULL WORKFLOW: before + after + compare ==="

    # Check if there are changes
    if git diff --quiet "${PROMPT_FILES[@]}" 2>/dev/null; then
      echo "No changes detected in prompt files. Make changes first."
      exit 1
    fi

    # Stash changes
    echo "Step 1/4: Stashing prompt changes..."
    git stash push -m "prompt-test-stash" -- "${PROMPT_FILES[@]}"

    # Run BEFORE tests
    echo ""
    echo "Step 2/4: Running BEFORE tests..."
    npx tsx .ai/prompt-tests/run-tests.ts --phase before

    # Restore changes
    echo ""
    echo "Step 3/4: Restoring prompt changes..."
    STASH_REF=$(git stash list | grep "prompt-test-stash" | head -1 | cut -d: -f1)
    git stash pop "$STASH_REF"

    # Rebuild
    npm run build 2>/dev/null || true

    # Run AFTER tests
    echo ""
    echo "Step 4/4: Running AFTER tests..."
    npx tsx .ai/prompt-tests/run-tests.ts --phase after

    # Compare
    echo ""
    echo "=== COMPARISON ==="
    npx tsx .ai/prompt-tests/run-tests.ts --compare
    ;;

  clean)
    echo "=== CLEANING UP ==="
    rm -rf /tmp/ralphie-test
    rm -f .ai/prompt-tests/results/*.json
    echo "Cleaned test directories and results"
    ;;

  *)
    echo "Spec Generation Prompt Testing Workflow"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  before   Stash current changes, test with OLD prompts"
    echo "  after    Restore changes, test with NEW prompts"
    echo "  compare  Compare before vs after results"
    echo "  full     Run complete workflow (before + after + compare)"
    echo "  clean    Clean up test directories and results"
    echo ""
    echo "Example workflow:"
    echo "  1. Make changes to skills/create-spec/SKILL.md"
    echo "  2. Run: $0 full"
    echo ""
    echo "Or step by step:"
    echo "  1. Make changes to prompt files"
    echo "  2. Run: $0 before"
    echo "  3. Run: $0 after"
    echo "  4. Run: $0 compare"
    ;;
esac
