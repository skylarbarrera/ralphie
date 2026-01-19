# Plan: T006 + T007 - Legacy spec handling and integration tests

## Goal
Add visual legacy spec warning to IterationRunner UI and comprehensive integration tests for V2 spec system.

## Task IDs
- T006 (S): Handle legacy spec gracefully
- T007 (M): Add integration tests for IterationRunner V2

## Files

### T006
- `src/App.tsx` - Add state for legacy warning, pass to AppInner, render warning UI

### T007
- `tests/App.test.tsx` - Add integration tests for IterationRunner with V2 specs

## Tests

### T006
- Manual: Verify type-check passes
- Manual: Visual check that warning appears in UI for legacy spec

### T007
- `npm test tests/App.test.tsx`
- Tests: V2 spec loading, task ID display, completion detection, legacy warning

## Exit Criteria

### T006
- [ ] IterationRunner tracks legacy warning state
- [ ] Legacy warning UI renders in header/status area
- [ ] Warning text: "Legacy SPEC format - upgrade recommended"
- [ ] Type check passes
- [ ] Task status updated to passed in spec

### T007
- [ ] Integration tests cover V2 spec loading
- [ ] Integration tests verify task ID display
- [ ] Integration tests check completion detection
- [ ] Integration tests verify legacy warning appears
- [ ] All tests pass (`npm test tests/App.test.tsx`)
- [ ] Type check passes
- [ ] Task status updated to passed in spec
