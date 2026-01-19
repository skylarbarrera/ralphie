# Bug Fix: Issue Title

Goal: Fix the bug where [describe the incorrect behavior].

## Context

**Observed behavior:** What's happening now (the bug)
**Expected behavior:** What should happen instead
**Reproduction steps:** How to trigger the bug
**Affected areas:** Which parts of the system are impacted

## Tasks

### T001: Investigate root cause
- Status: pending
- Size: S

**Deliverables:**
- Identify the source of the bug
- Document findings in Notes section
- Determine fix approach

**Verify:** Root cause documented below

---

### T002: Implement fix
- Status: pending
- Size: M

**Deliverables:**
- Code change that fixes the bug
- No regressions in existing functionality
- Follows existing code patterns

**Verify:** `npm test` passes

---

### T003: Add regression test
- Status: pending
- Size: S

**Deliverables:**
- Test that fails without the fix
- Test that passes with the fix
- Test covers edge cases if applicable

**Verify:** `npm test -- bug-name` passes

---

## Acceptance Criteria

- WHEN reproducing the original bug steps, THEN correct behavior occurs
- WHEN running test suite, THEN all tests pass including new regression test

## Notes

<!-- AI updates this section during implementation -->

### Investigation Findings
<!-- Document root cause here -->

### Fix Approach
<!-- Document chosen solution here -->
