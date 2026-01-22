# Plan: T007 - Create code quality validation test suite

## Goal
Create comprehensive test suite to validate that Ralphie outputs senior engineer-level code quality.

## Task ID
T007

## Files to Create/Modify
- `tests/code-quality/typescript-auth.test.ts` - Test TypeScript auth feature generation
- `tests/code-quality/python-validation.test.ts` - Test Python validation generation
- `tests/code-quality/bad-code-improvement.test.ts` - Test improvement of existing bad code
- `tests/code-quality/test-helpers.ts` - Shared helper functions for quality checks
- `tests/code-quality/fixtures/` - Test fixtures and sample projects
- Update `vitest.config.ts` if needed for test matching

## Tests
The test suite itself IS the deliverable. It will validate:

1. **TypeScript Auth Feature Test**
   - Uses recommended library (e.g., Passport.js, JWT libraries)
   - Proper separation (routes, services, models)
   - TypeScript interfaces defined
   - Tests included
   - No security issues

2. **Python Validation Test**
   - Uses Pydantic
   - Type hints included
   - Tests with pytest
   - Proper validation structure

3. **Bad Code Improvement Test**
   - Doesn't copy tech debt
   - Improves architecture
   - Uses better patterns

## Quality Checks
Each test will programmatically verify:
- File structure matches expected patterns
- Required dependencies are present
- Code contains expected interfaces/types
- Security best practices followed
- Tests are included for generated code

## Exit Criteria
- [ ] `npm test -- code-quality` runs successfully
- [ ] All three test scenarios pass
- [ ] Tests verify library choices, separation of concerns, types, tests, and security
- [ ] Test results are documented
- [ ] Full test suite passes
- [ ] Type checks pass
- [ ] Task status updated to passed
- [ ] Changes committed with T007 prefix
