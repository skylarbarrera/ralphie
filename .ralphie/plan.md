# Plan for T004: Enforce test coverage in iteration loop

## Goal
Add mandatory test requirements to the iteration loop, ensuring all generated code includes tests with >80% coverage before tasks can be marked as passed.

## Task ID
T004

## Files to Create/Modify
- `.ralphie/prompts/iteration.md` - Add test requirements to iteration instructions
- `.ralphie/agents/test-validator.md` - Create agent to validate test coverage
- Update relevant orchestration logic if needed

## Tests
- Verify iteration prompt includes explicit test requirements
- Verify test validation happens before task can be marked passed
- Test that coverage threshold (>80%) is enforced
- Integration test: Run iteration without tests and verify it fails

## Exit Criteria
- [ ] Iteration prompt explicitly requires tests for all deliverables
- [ ] Task cannot be marked "passed" without tests
- [ ] Coverage validation runs automatically
- [ ] Coverage threshold >80% enforced
- [ ] Verify command confirms tests and coverage check run
