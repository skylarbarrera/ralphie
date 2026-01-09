#!/bin/bash
set -e

# Test Coverage Loop
# ====================
# Runs Ralph to improve test coverage until a target is met.
#
# Usage:
#   ./examples/test-coverage-loop.sh 20       # Run 20 iterations, default 80% target
#   ./examples/test-coverage-loop.sh 20 90    # Run 20 iterations, 90% target
#
# What it does:
#   - Finds files with low test coverage
#   - Writes tests for uncovered code
#   - Stops when target coverage is reached

ITERATIONS=${1:-10}
TARGET=${2:-80}

echo "Running test coverage loop"
echo "  Iterations: $ITERATIONS"
echo "  Target: ${TARGET}%"
echo ""

ralph run -n "$ITERATIONS" -p "You are improving test coverage.

1. Run the test coverage tool (jest --coverage, pytest --cov, etc.)
2. Find the file or function with the lowest coverage
3. Write tests for uncovered code paths
4. Run tests to verify they pass
5. Commit with message: test: add coverage for <file>

Target: ${TARGET}% coverage.
Only add tests for ONE file at a time.
When coverage reaches ${TARGET}%, output <promise>COMPLETE</promise>."
