# Plan: T001 - Restructure to .ralphie/ folder

## Goal
Restructure project from `specs/` and `STATE.txt` to new `.ralphie/` directory structure with global `~/.ralphie/` support.

## Task ID
T001

## Files to Create/Modify
**Create:**
- `MIGRATION.md` - AI-assisted migration guide
- `.ralphie/` directory structure
- `.ralphie/llms.txt` - Architecture decisions template
- Global `~/.ralphie/` directory structure

**Modify:**
- `src/init.ts` - Update initialization logic
- `src/config.ts` - Add path resolution for new structure
- `src/generate-spec.ts` - Update path references
- `src/run.ts` - Update path references
- `templates/` files - Update template paths
- All test files referencing old paths
- `README.md` - Document new structure

## Tests
- Unit tests for path resolution
- Integration test: `ralphie init` creates `.ralphie/` structure
- Integration test: Global `~/.ralphie/` created on first run
- Integration test: Old structure detection shows migration message
- Verify all existing tests pass with new paths

## Exit Criteria
- ✅ `ralphie init` in fresh dir creates `.ralphie/specs/active/`, `.ralphie/learnings/`, `.ralphie/llms.txt`
- ✅ Global `~/.ralphie/` created with `learnings/` and `settings.json`
- ✅ Old structure detection shows user-friendly message pointing to MIGRATION.md
- ✅ All path references updated throughout codebase
- ✅ All tests pass
- ✅ MIGRATION.md provides clear instructions for AI-assisted migration
