# Current Task Plan

This file is overwritten at the start of each iteration.

**Purpose:** Define scope BEFORE implementation to prevent scope creep.

---

## Goal
Extract tool categorization and icons into a dedicated configurable module.

## Files
- src/lib/tool-categories.ts - new module with tool mapping, categories, icons, display helpers
- src/lib/state-machine.ts - refactor to import from tool-categories.ts
- tests/tool-categories.test.ts - unit tests for the new module

## Tests
- Test default tool category mappings (Read→read, Edit→write, etc.)
- Test getToolIcon returns correct icons for each category/state
- Test getToolDisplayName extracts meaningful names from tool inputs
- Test getCategoryVerb returns correct verbs
- Test unknown tools default to 'meta' category

## Exit Criteria
- tool-categories.ts exports: TOOL_CATEGORIES, ToolCategory, getToolCategory, getToolIcon, getCategoryVerb, getToolDisplayName
- Icons defined: ◐ read, ✎ write, ⚡ command, ○ meta, ✓ done, ✗ error
- state-machine.ts imports and uses tool-categories.ts (no duplication)
- Tests pass with 80%+ coverage
- Changes committed
