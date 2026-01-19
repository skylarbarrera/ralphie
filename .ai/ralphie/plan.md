# Plan: T008 - Manual E2E testing

## Goal
Manually verify that the interactive UI works correctly with V2 spec format

## Task ID
T008

## Files
- Create: `specs/active/test-migration.md` (temporary test spec)
- Will be deleted after verification

## Tests
Manual verification of:
1. Create test V2 spec in specs/active/test-migration.md
2. Run `ralphie run` (interactive mode)
3. Verify task ID shows in UI header
4. Verify completion is detected when task status changes
5. Clean up test spec after

## Exit Criteria
- Task ID (T001) displays correctly in the interactive UI
- Runner detects when tasks are completed
- Test spec is cleaned up after verification
- Task status updated to "passed" in spec
