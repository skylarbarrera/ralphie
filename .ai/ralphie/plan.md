# Plan: App.tsx V2 Migration - Batch 1

## Goal
Implement getTaskForIterationV2 function and update App.tsx imports to use V2 spec parser

## Task IDs
- T001 (M): Create getTaskForIterationV2 function
- T002 (S): Add spec-parser-v2 unit tests
- T003 (S): Update App.tsx imports

## Files to Create/Modify
- `src/lib/spec-parser-v2.ts` - Add getTaskForIterationV2 function
- `tests/spec-parser-v2.test.ts` - Add 5 unit tests for new function
- `src/App.tsx` - Update imports from V1 to V2

## Tests
- Unit tests for getTaskForIterationV2:
  - Returns first pending task when iteration=1
  - Returns first pending task when iteration=2 (ignores iteration)
  - Returns null when all tasks are passed/failed
  - Returns in_progress task if one exists
  - taskText includes title and first deliverable
- Verify commands:
  - `npm test -- spec-parser-v2`
  - `npm test tests/spec-parser-v2.test.ts`
  - `npm run type-check`

## Exit Criteria
- getTaskForIterationV2 function exists and returns correct shape
- Function returns first pending/in_progress task (ignores iteration number)
- 5 unit tests pass
- App.tsx imports use V2 functions
- Type check passes
- All 3 task statuses updated to passed in spec
