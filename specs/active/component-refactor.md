# Component Refactoring

Goal: Improve separation of concerns by splitting App.tsx and cli.tsx into focused, single-responsibility modules.

## Context

App.tsx (446 lines) contains 3 components and helper functions that should be separate:
- `AppInner` - UI rendering component
- `App` - wrapper with harness stream hook
- `IterationRunner` - orchestration logic with spec loading

cli.tsx (496 lines) mixes concerns:
- CLI argument parsing
- Prompt constants (80+ lines)
- Command execution logic

This refactor improves maintainability without changing behavior.

## Tasks

### T001: Extract failure context helpers
- Status: passed
- Size: S

**Deliverables:**
- `src/lib/failure-context.ts` with `buildFailureContext` and `formatToolInput`
- Functions moved from App.tsx
- Exports properly typed

**Verify:** `npm run type-check`

---

### T002: Extract IterationView component
- Status: passed
- Size: S

**Deliverables:**
- `src/components/IterationView.tsx` with the `AppInner` component renamed to `IterationView`
- Single-responsibility: renders one iteration's UI
- Props interface exported

**Verify:** `npm run type-check`

---

### T003: Extract IterationRunner component
- Status: pending
- Size: M

**Deliverables:**
- `src/IterationRunner.tsx` with the `IterationRunner` component
- Handles spec loading, iteration orchestration, completion detection
- App.tsx becomes thin wrapper re-exporting components

**Verify:** `npm run type-check`

---

### T004: Extract prompt constants
- Status: pending
- Size: S

**Deliverables:**
- `src/lib/prompts.ts` with `DEFAULT_PROMPT` and `GREEDY_PROMPT`
- Constants exported for use by cli.tsx and tests
- No behavior change

**Verify:** `npm run type-check`

---

### T005: Extract interactive run command
- Status: pending
- Size: S

**Deliverables:**
- `src/commands/run-interactive.ts` with `executeRun` function
- cli.tsx imports and calls it
- Cleaner separation of CLI parsing from execution

**Verify:** `npm run type-check`

---

### T006: Verify all tests pass
- Status: pending
- Size: S

**Deliverables:**
- All 613 tests still pass
- No behavior changes
- Import paths updated in tests if needed

**Verify:** `npm test`

---

## Acceptance Criteria

- WHEN refactoring is complete, THEN all tests pass unchanged
- WHEN App.tsx is read, THEN it is under 100 lines
- WHEN cli.tsx is read, THEN prompt constants are imported, not inline
- WHEN new files are created, THEN each has a single responsibility

## Notes

<!-- AI updates this section during implementation -->
