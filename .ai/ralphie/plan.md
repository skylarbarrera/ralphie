# Phase 7: Tests and Documentation

## Goal
Complete v1.0 by adding tests for new skill/spec functionality and updating documentation to reflect new commands and skill installation workflow.

## Files to Change
- tests/lib/spec-generator.test.ts (add integration test for review loop)
- README.md (document skill installation and new commands)
- SPEC.md (mark Phase 7 as complete)
- STATE.txt (append completion entry)
- .ai/ralphie/index.md (append commit entry)

## Tests to Add
1. Integration test: Full autonomous spec generation with review loop
   - Test that review-spec skill is called
   - Test that refinement happens when review fails
   - Test that loop exits after maxAttempts
2. Test that skill directory structure works for npx add-skill
   - Verify skills/*/SKILL.md have correct frontmatter
   - Verify skills can be parsed by add-skill format

## Exit Criteria
- All existing tests pass (617)
- New integration test added for spec generation with review loop
- README updated with:
  - npx add-skill installation instructions
  - ralphie spec command documentation (interactive, --auto, --headless)
  - --harness flag documentation
  - verify skill usage guidance
- No TypeScript errors
- Committed with clear message
