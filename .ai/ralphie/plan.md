# Plan: T001 - Extract failure context helpers

## Goal
Extract failure context helper functions from App.tsx into a dedicated module.

## Task ID
T001

## Files
- **Create:** `src/lib/failure-context.ts` - New module for failure context helpers
- **Modify:** `src/App.tsx` - Remove helper functions, import from new module
- **Potentially modify:** Test files that import from App.tsx (if any)

## Tests
- Run type check to ensure imports and types are correct
- Existing tests should continue passing (no behavior change)

## Exit Criteria
1. `buildFailureContext` and `formatToolInput` functions moved to `src/lib/failure-context.ts`
2. Functions are properly typed with exported interfaces/types if needed
3. App.tsx imports and uses functions from new module
4. `npm run type-check` passes
5. No behavior changes - pure refactor
