# Plan: T004 Extract prompt constants

## Goal
Extract DEFAULT_PROMPT and GREEDY_PROMPT from cli.tsx to src/lib/prompts.ts

## Task ID
T004

## Files
- **Create:** `src/lib/prompts.ts` - export DEFAULT_PROMPT and GREEDY_PROMPT constants
- **Modify:** `src/cli.tsx` - import prompts from new module, remove inline constants

## Tests
- No new tests needed (pure refactor)
- Existing tests should continue to pass
- Type check must pass

## Exit Criteria
1. `src/lib/prompts.ts` exists with both exported constants
2. `src/cli.tsx` imports from `src/lib/prompts.ts`
3. All inline prompt constants removed from cli.tsx
4. `npm run type-check` passes
5. No behavior changes
