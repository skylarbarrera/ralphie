#!/bin/bash
set -e

# Refactor Loop
# ===============
# Runs Ralph to clean up code duplication and improve structure.
#
# Usage:
#   ./examples/refactor-loop.sh 15          # Run 15 iterations
#   DETECTOR="jscpd ." ./examples/refactor-loop.sh 10  # Custom detector
#
# What it does:
#   - Finds duplicate or messy code
#   - Extracts shared utilities
#   - Runs tests to verify nothing breaks

ITERATIONS=${1:-15}
DETECTOR=${DETECTOR:-"jscpd ."}

echo "Running refactor loop"
echo "  Iterations: $ITERATIONS"
echo "  Detector: $DETECTOR"
echo ""

ralph run -n "$ITERATIONS" -p "You are refactoring code to reduce duplication.

1. Run duplication detection: ${DETECTOR}
2. Find ONE instance of duplicated code
3. Extract it into a shared utility or helper
4. Update all places that used the duplicated code
5. Run tests to verify nothing broke
6. Commit with message: refactor: extract <function> from <files>

Only refactor ONE duplication at a time.
When no duplications are found, output <promise>COMPLETE</promise>."
