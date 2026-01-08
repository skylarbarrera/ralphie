## Goal
Create `src/lib/colors.ts` with Claude Code color scheme (cyan, green, yellow, red, magenta).

## Files
- src/lib/colors.ts - new file with color constants and helpers
- tests/colors.test.ts - unit tests for color module

## Tests
- Test that all color constants are exported and have valid values
- Test getStatusColor() returns correct colors for success/error/warning/pending states
- Test getToolCategoryColor() returns correct colors for read/write/command/meta categories
- Test colors are valid chalk-compatible values

## Exit Criteria
- Color module exports all colors from PRD color scheme table
- Helper functions for getting colors by status/category
- All tests pass with 100% coverage
- Changes committed
