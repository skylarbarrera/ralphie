# Plan: T002 - Extract IterationView component

## Goal
Extract the AppInner component from App.tsx and rename it to IterationView in a dedicated file.

## Task ID
T002

## Files
- **Create:** `src/components/IterationView.tsx` - New component file with AppInner renamed to IterationView
- **Modify:** `src/App.tsx` - Remove AppInner component, import IterationView from new file
- **Potentially modify:** Test files that reference AppInner (if any)

## Tests
- Run type check to ensure component exports and props are correct
- Existing tests should continue passing (no behavior change)

## Exit Criteria
1. AppInner component moved to `src/components/IterationView.tsx` and renamed to IterationView
2. Props interface (AppInnerProps → IterationViewProps) exported from new file
3. App.tsx imports and uses IterationView component
4. `npm run type-check` passes
5. No behavior changes - pure refactor
