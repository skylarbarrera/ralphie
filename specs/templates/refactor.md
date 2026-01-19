# Refactor: Component/Module Name

Goal: Improve code quality of [target] without changing external behavior.

## Context

**Why refactor:** What's wrong with the current code?
**Target scope:** Which files/modules are being refactored
**Constraints:** What must remain unchanged (APIs, behavior, etc.)

## Tasks

### T001: Audit current implementation
- Status: pending
- Size: S

**Deliverables:**
- Document current code structure
- Identify specific issues to address
- List files to modify

**Verify:** Audit documented in Notes section

---

### T002: Refactor core logic
- Status: pending
- Size: M

**Deliverables:**
- Improved code structure
- Better naming/organization
- Reduced complexity or duplication
- No behavior changes

**Verify:** `npm test` passes with same coverage

---

### T003: Update related code
- Status: pending
- Size: S

**Deliverables:**
- Update callers if signatures changed
- Update imports if files moved
- Update types if interfaces changed

**Verify:** `npm run type-check` passes

---

### T004: Verify no regressions
- Status: pending
- Size: S

**Deliverables:**
- All existing tests pass
- Manual verification of key flows
- Performance not degraded

**Verify:** `npm test && npm run type-check` passes

---

## Acceptance Criteria

- WHEN running test suite, THEN all tests pass
- WHEN comparing before/after behavior, THEN external behavior unchanged
- WHEN reviewing code, THEN identified issues are resolved

## Notes

<!-- AI updates this section during implementation -->

### Current Issues
<!-- List specific code smells/issues -->

### Refactoring Approach
<!-- Document strategy -->
