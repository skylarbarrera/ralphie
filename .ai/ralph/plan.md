## Goal
Implement iteration loop in App.tsx to run N iterations sequentially with final summary.

## Files
- src/App.tsx - add iteration loop logic, iteration state management, final summary display
- src/hooks/useClaudeStream.ts - may need to expose reset/restart capability
- tests/App.test.tsx - add tests for iteration loop and summary

## Tests
- App restarts claude for each iteration up to N
- Iteration counter increments correctly
- Final summary shows after all iterations complete
- Early exit on error stops iteration loop
- Component displays correct iteration number during run

## Exit Criteria
- App runs N iterations sequentially (waits for each to complete)
- Final summary displays after all iterations
- Tests pass with good coverage
- Changes committed
