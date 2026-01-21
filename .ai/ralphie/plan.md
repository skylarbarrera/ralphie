# Plan: T004 - Implement Learnings Capture with Auto-Upgrades

## Goal
Implement learnings storage system that automatically captures fixes when tasks fail then pass, including auto-generated tests and rule suggestions.

## Task ID
T004

## Files to Create/Modify

### Create:
- `.ralphie/learnings/` directory structure
- `~/.ralphie/learnings/` global directory
- `src/learnings/manager.ts` - Core learnings management
- `src/learnings/types.ts` - Types and schemas
- `src/learnings/templates.ts` - YAML frontmatter templates
- Example learning files for documentation

### Modify:
- `src/commands/run.ts` - Track task status, inject learning prompts
- `src/utils/iteration-prompt.ts` - Add learning documentation instructions
- `src/commands/init.ts` - Create global ~/.ralphie/ on first run (if not already done)

## Tests to Write
- Unit tests for learnings manager (create, read, search)
- Unit tests for category detection (build-errors, test-failures, etc.)
- Unit tests for global vs local decision logic
- Integration test: simulate failed→passed task, verify learning created
- Test YAML frontmatter parsing and validation

## Implementation Steps

1. **Define types and schemas**
   - Learning interface with frontmatter fields
   - Category enum
   - YAML schema validation

2. **Create learnings manager**
   - `createLearning()` - Save learning with proper category
   - `searchLearnings()` - Search by keywords/tags
   - `decideLearningScope()` - Determine global vs local
   - Ensure directories exist

3. **Update init command**
   - Create `~/.ralphie/learnings/` if missing
   - Create `.ralphie/learnings/` in project

4. **Track task status in run command**
   - Store previous task status
   - Detect failed→passed transitions
   - Inject learning prompt into next iteration

5. **Create learning prompt template**
   - Instructions for documenting the fix
   - Auto-generate test that would catch bug
   - Suggest rule addition to `.claude/ralphie.md`
   - YAML frontmatter format

6. **Write tests**

## Exit Criteria
- ✓ `.ralphie/learnings/` and `~/.ralphie/learnings/` directories created
- ✓ Learning manager can create, read, and search learnings
- ✓ YAML frontmatter validated with required fields
- ✓ When task fails then passes, next iteration prompt includes learning instructions
- ✓ All tests pass
- ✓ Verify command passes: After simulating failed→passed task, `.ralphie/learnings/` contains new learning file
