#!/bin/bash
set -e

# Linting Loop
# ==============
# Runs Ralph to fix linting errors one at a time.
#
# Usage:
#   ./examples/linting-loop.sh 30           # Run 30 iterations
#   LINTER="pylint src/" ./examples/linting-loop.sh 20  # Custom linter
#
# What it does:
#   - Runs your linter to find errors
#   - Fixes one error at a time
#   - Stops when all errors are fixed

ITERATIONS=${1:-20}
LINTER=${LINTER:-"npm run lint"}

echo "Running linting loop"
echo "  Iterations: $ITERATIONS"
echo "  Linter: $LINTER"
echo ""

ralph run -n "$ITERATIONS" -p "You are fixing linting errors.

1. Run the linter: ${LINTER}
2. Pick ONE error or warning to fix
3. Fix it by modifying the code
4. Run the linter again to verify
5. Commit with message: fix: resolve lint error in <file>

Only fix ONE error at a time.
When there are no more errors, output <promise>COMPLETE</promise>."
