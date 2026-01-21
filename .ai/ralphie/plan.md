# Plan: Migrate Ralphie Repository to .ralphie/ Structure

## Goal
Migrate the Ralphie repository itself from old structure (specs/, .ai/ralphie/, STATE.txt) to new .ralphie/ structure following MIGRATION.md.

## Task ID
Post-T001/T005 cleanup - applying the new structure to Ralphie's own repository

## Files to Create/Modify

### Create:
- `.ralphie/` directory structure:
  - `.ralphie/specs/` (move from specs/)
  - `.ralphie/memory/` (move from .ai/ralphie/)
  - `.ralphie/learnings/` with subdirectories
  - `.ralphie/state.txt` (move from STATE.txt)
  - `.ralphie/llms.txt` (new template)

### Move:
- `specs/*` → `.ralphie/specs/`
- `STATE.txt` → `.ralphie/state.txt`

### Keep as-is:
- `.ai/ralphie/` - Development-specific memory (index.md, plan.md)
- This directory is for Ralphie development, not part of official Ralphie structure

### Update:
- `.gitignore` - add `.ralphie/state.txt`
- prompts.ts - update references from `STATE.txt` to `.ralphie/state.txt`
- Documentation references to specs/ → .ralphie/specs/

### Delete:
- `specs/` directory (after moving contents)
- `STATE.txt` (after moving to .ralphie/)

## Tests
- Run full test suite: `npm test`
- Run type check: `npm run type-check`
- Verify structure: `ls -la .ralphie/`
- Verify memory files: `ls -la .ralphie/memory/`
- Verify no broken references to old paths

## Exit Criteria
1. `.ralphie/` directory exists with complete structure
2. `specs/` content moved to `.ralphie/specs/` (using git mv)
3. `STATE.txt` moved to `.ralphie/state.txt` (using git mv)
4. `.ralphie/llms.txt` created with template
5. `.ralphie/learnings/` directories created
6. Old `specs/` directory removed
7. Old `STATE.txt` removed
8. `.gitignore` updated
9. All tests pass (verify no broken references)
10. Type check passes
11. Prompts updated to reference .ralphie/state.txt
