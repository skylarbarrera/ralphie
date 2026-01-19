# Plan: T003 - Extract IterationRunner component

## Goal
Extract the IterationRunner component from App.tsx to a dedicated file, making App.tsx a thin wrapper.

## Task ID
T003

## Files
- **Create:** `src/IterationRunner.tsx` - New file with IterationRunner component and helper functions
- **Modify:** `src/App.tsx` - Remove IterationRunner, re-export it and supporting types from new file
- **Potentially modify:** Test files that import IterationRunner (if any)

## Tests
- Run type check to ensure exports and imports are correct
- Existing tests should continue passing (no behavior change)

## Exit Criteria
1. IterationRunner component moved to `src/IterationRunner.tsx`
2. Helper functions (formatDuration, aggregateStats) moved with IterationRunner
3. IterationRunnerProps interface exported from new file
4. App.tsx becomes thin wrapper that re-exports IterationRunner and related components
5. All tests pass and type check succeeds
6. No behavior changes - pure refactor
