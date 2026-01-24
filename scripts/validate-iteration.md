# Ralphie Iteration Validation Prompt

This prompt is used by the Stop hook to validate that a Ralphie iteration completed successfully before allowing the next iteration to begin.

## Usage

This file is referenced by Claude Code's Stop hook with `type: prompt`. When Ralphie completes an iteration, Claude Code reads this prompt and validates the iteration output.

## Validation Prompt

You are validating whether a Ralphie iteration completed successfully. Ralphie is an autonomous coding assistant that follows a strict protocol for each iteration.

### Validation Checklist

Check each of the following criteria. An iteration is ONLY valid if ALL criteria are met:

#### 1. Task Implementation
- [ ] Code changes were made that address the SPEC task
- [ ] The implementation follows the plan in `.ai/ralphie/plan.md`
- [ ] No placeholder or incomplete code was left in the codebase

#### 2. Tests Pass
- [ ] Tests were run (look for `npm test` or `npx vitest` output)
- [ ] All tests passed (no failures in test output)
- [ ] New tests were added for new functionality (unless docs-only change)

#### 2.5. Test Coverage Verified
- [ ] Coverage check was run (look for coverage report in output)
- [ ] Coverage meets >80% threshold for new code
- [ ] Coverage report shows no critical gaps in test coverage

#### 3. Type Check Passes
- [ ] Type check was run (look for `npm run type-check` or `tsc` output)
- [ ] No type errors were reported
- [ ] Or the project doesn't use TypeScript (skip if not applicable)

#### 4. Commit Made
- [ ] A git commit was created (look for `git commit` output)
- [ ] Commit message follows conventional commit format (feat/fix/refactor/test/docs/chore)
- [ ] Commit message is descriptive and matches the work done

#### 5. Index Updated
- [ ] `.ai/ralphie/index.md` was updated with a new entry
- [ ] Entry includes: SHA, files changed, test count (if applicable), notes, next hint
- [ ] Entry is appended at the end of the file

#### 6. SPEC Updated (if task completed)
- [ ] The completed task checkbox was marked with `[x]` in SPEC.md
- [ ] Only ONE task was completed (Ralphie does one task per iteration)

#### 7. STATE Updated (if task completed)
- [ ] STATE.txt was updated with a progress entry
- [ ] Entry includes: date, summary, files/tests, commit reference

### Output Format

Respond with a JSON object in this exact format:

```json
{
  "valid": true | false,
  "checks": {
    "task_implemented": true | false,
    "tests_passed": true | false,
    "coverage_verified": true | false,
    "type_check_passed": true | false,
    "commit_made": true | false,
    "index_updated": true | false,
    "spec_updated": true | false,
    "state_updated": true | false
  },
  "issues": [
    "Description of first issue (if any)",
    "Description of second issue (if any)"
  ],
  "summary": "One-line summary of validation result"
}
```

### Decision Rules

**VALID** - All of the following must be true:
- `task_implemented` is true
- `tests_passed` is true (or N/A for docs-only changes)
- `coverage_verified` is true (or N/A for docs-only changes)
- `type_check_passed` is true (or N/A for non-TypeScript projects)
- `commit_made` is true
- `index_updated` is true

**INVALID** - If any of the above core checks fail.

### Example Outputs

**Valid iteration:**
```json
{
  "valid": true,
  "checks": {
    "task_implemented": true,
    "tests_passed": true,
    "coverage_verified": true,
    "type_check_passed": true,
    "commit_made": true,
    "index_updated": true,
    "spec_updated": true,
    "state_updated": true
  },
  "issues": [],
  "summary": "Iteration completed successfully: feat(auth): add JWT token refresh"
}
```

**Invalid iteration - tests failed:**
```json
{
  "valid": false,
  "checks": {
    "task_implemented": true,
    "tests_passed": false,
    "coverage_verified": false,
    "type_check_passed": true,
    "commit_made": false,
    "index_updated": false,
    "spec_updated": false,
    "state_updated": false
  },
  "issues": [
    "3 tests failed in auth.test.ts",
    "Coverage not verified due to test failures",
    "No commit was made due to test failures",
    "index.md was not updated"
  ],
  "summary": "Iteration failed: tests did not pass"
}
```

**Invalid iteration - no commit:**
```json
{
  "valid": false,
  "checks": {
    "task_implemented": true,
    "tests_passed": true,
    "coverage_verified": true,
    "type_check_passed": true,
    "commit_made": false,
    "index_updated": false,
    "spec_updated": false,
    "state_updated": false
  },
  "issues": [
    "Implementation appears complete but no git commit was made",
    "index.md was not updated with new entry"
  ],
  "summary": "Iteration incomplete: no commit made"
}
```

### Special Cases

1. **Documentation-only changes**: `tests_passed` and `coverage_verified` can be considered true if no code changes require testing
2. **Non-TypeScript projects**: `type_check_passed` can be considered true if project doesn't use TypeScript
3. **Partial implementation**: If only part of a batched task was completed, mark as INVALID - Ralphie should complete the full batched checkbox
4. **Multiple tasks completed**: If more than one SPEC task was marked complete, note this as an issue (Ralphie should do ONE task per iteration)
5. **Coverage not applicable**: For changes to test files only, configuration files, or documentation, `coverage_verified` can be true even without running coverage

### Context to Examine

When validating, look at:
- The conversation output for test/type-check results
- Git output showing commit hash and message
- File operations on `.ai/ralphie/index.md`
- File operations on `SPEC.md` and `STATE.txt`
- Any error messages or failures in tool outputs
