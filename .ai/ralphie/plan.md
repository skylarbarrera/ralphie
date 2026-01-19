# Plan: T005 Extract interactive run command

## Goal
Extract executeRun function from cli.tsx to src/commands/run-interactive.ts

## Task ID
T005

## Files
- **Create:** `src/commands/run-interactive.ts` - export executeRun function
- **Modify:** `src/cli.tsx` - import and call executeRun from new module

## Tests
- No new tests needed (pure refactor)
- Existing tests should continue to pass
- Type check must pass

## Exit Criteria
1. `src/commands/run-interactive.ts` exists with executeRun function
2. `src/cli.tsx` imports from new module and calls it
3. All logic moved (validation, branch creation, prompt resolution, render, signal handling)
4. `npm run type-check` passes
5. No behavior changes
